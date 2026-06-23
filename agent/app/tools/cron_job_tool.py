from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import re
from typing import Any, Literal

import httpx

from ..config import Settings
from ..schemas import MedicineBrief, MemberBrief

TaskType = Literal["medicine", "temperature", "cabinet"]
ScheduleType = Literal["cron", "every", "at"]

REMINDER_KEYWORDS = ("提醒", "定时", "每天", "每隔", "每周", "闹钟")
MEDICINE_KEYWORDS = ("吃药", "服药", "用药", "吃", "服用")
TEMPERATURE_KEYWORDS = ("体温", "量温", "测温", "发烧")
CABINET_KEYWORDS = ("药箱", "过期", "库存", "补药", "快没", "缺药", "少了")
CONFIRM_WORDS = {"确认", "确定", "可以", "好的", "好", "设置吧", "帮我设置", "是的"}


@dataclass
class ReminderPlan:
    task_type: TaskType
    title: str
    schedule_type: ScheduleType
    timezone: str
    medicine_id: str | None = None
    medicine_name: str | None = None
    member_id: str | None = None
    member_name: str | None = None
    dosage: str | None = None
    times: list[str] | None = None
    every_seconds: int | None = None
    run_at: str | None = None
    cron_expression: str | None = None
    next_run_at: str | None = None
    missing_fields: list[str] | None = None

    def payload(self) -> dict[str, Any]:
        return {
            "taskType": self.task_type,
            "medicineId": self.medicine_id,
            "medicineName": self.medicine_name,
            "memberId": self.member_id,
            "memberName": self.member_name,
            "dosage": self.dosage,
            "times": self.times or [],
        }


def is_confirmation(text: str) -> bool:
    normalized = re.sub(r"\s+", "", text.strip())
    return normalized in CONFIRM_WORDS or normalized.startswith("确认")


def is_reminder_intent(text: str, medicines: list[MedicineBrief] | None = None) -> bool:
    compact = text.strip()
    if any(keyword in compact for keyword in REMINDER_KEYWORDS):
        return True
    if any(keyword in compact for keyword in TEMPERATURE_KEYWORDS + CABINET_KEYWORDS):
        return True
    return any(medicine.name in compact for medicine in medicines or [])


def is_supported_reminder(text: str, medicines: list[MedicineBrief] | None = None) -> bool:
    compact = text.strip()
    if any(keyword in compact for keyword in TEMPERATURE_KEYWORDS + CABINET_KEYWORDS):
        return True
    if any(keyword in compact for keyword in MEDICINE_KEYWORDS):
        return True
    return any(medicine.name in compact for medicine in medicines or [])


def build_plan_from_text(
    *,
    text: str,
    medicines: list[MedicineBrief],
    members: list[MemberBrief],
    session_id: str,
    user_id: str | None,
    household_id: str | None,
    now: str | None,
    timezone_name: str,
) -> ReminderPlan:
    current = _parse_now(now)
    task_type = _detect_task_type(text, medicines)
    medicine = _match_medicine(text, medicines) if task_type == "medicine" else None
    member = _match_member(text, members)
    dosage = _extract_dosage(text)
    schedule = _extract_schedule(text, current, timezone_name)
    title = _build_title(task_type, medicine.name if medicine else None)
    missing: list[str] = []

    if task_type == "medicine" and not medicine:
        missing.append("药品名称")
    if not schedule:
        missing.append("提醒时间")

    plan = ReminderPlan(
        task_type=task_type,
        title=title,
        schedule_type=schedule["type"] if schedule else "cron",
        timezone=timezone_name,
        medicine_id=medicine.id if medicine else None,
        medicine_name=medicine.name if medicine else _extract_medicine_name(text),
        member_id=member.id if member else None,
        member_name=member.display_name if member else None,
        dosage=dosage,
        times=schedule.get("times") if schedule else None,
        every_seconds=schedule.get("everySeconds") if schedule else None,
        run_at=schedule.get("runAt") if schedule else None,
        cron_expression=schedule.get("cronExpression") if schedule else None,
        next_run_at=schedule.get("nextRunAt") if schedule else None,
        missing_fields=missing,
    )
    if not plan.next_run_at and plan.run_at:
        plan.next_run_at = plan.run_at
    if not plan.medicine_name and plan.task_type == "medicine":
        plan.medicine_name = _extract_medicine_name(text)
    return plan


def confirmation_text(plan: ReminderPlan) -> str:
    target = f"为{plan.member_name}" if plan.member_name else "为你"
    if plan.schedule_type == "every" and plan.every_seconds:
        schedule = f"每 {plan.every_seconds // 3600} 小时"
    elif plan.schedule_type == "at" and plan.run_at:
        schedule = _format_datetime_for_user(plan.run_at)
    else:
        schedule = f"每天 {'、'.join(plan.times or [])}"

    if plan.task_type == "medicine":
        dosage = f"，{plan.dosage}" if plan.dosage else ""
        return f"请确认：我将{target}设置{schedule} 提醒服用{plan.medicine_name}{dosage}。回复“确认”后我会创建。"
    if plan.task_type == "temperature":
        return f"请确认：我将{target}设置{schedule} 量体温提醒。回复“确认”后我会创建。"
    return f"请确认：我将设置{schedule} 药箱维护提醒：{plan.title}。回复“确认”后我会创建。"


def missing_fields_text(fields: list[str]) -> str:
    return f"还需要补充：{'、'.join(fields)}。请告诉我后，我再帮你设置。"


def build_idempotency_key(session_id: str, user_id: str | None, plan: ReminderPlan) -> str:
    raw = "|".join(
        [
            session_id,
            user_id or "",
            plan.task_type,
            plan.medicine_id or plan.medicine_name or "",
            ",".join(plan.times or []),
            str(plan.every_seconds or ""),
            plan.run_at or "",
        ]
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class CronJobTool:
    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.backend_base_url.rstrip("/")
        self._token = settings.agent_internal_token

    async def create_job(
        self,
        *,
        plan: ReminderPlan,
        user_id: str | None,
        household_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "userId": user_id,
            "householdId": household_id,
            "memberId": plan.member_id,
            "type": plan.schedule_type,
            "taskType": plan.task_type,
            "title": plan.title,
            "status": "enabled",
            "cronExpression": plan.cron_expression,
            "everySeconds": plan.every_seconds,
            "runAt": plan.run_at,
            "timezone": plan.timezone,
            "payload": plan.payload(),
            "source": "user_agent",
            "idempotencyKey": idempotency_key,
            "nextRunAt": plan.next_run_at,
        }
        return await self._request("POST", "/agent-data/cron-jobs", json=payload)

    async def execute_expired_medicine_check(self, *, household_id: str | None = None) -> dict[str, Any]:
        params = {"householdId": household_id} if household_id else None
        items = await self._request("GET", "/agent-data/cabinet/expired", params=params)
        return {
            "expiredCount": len(items),
            "items": items,
        }

    async def list_due_jobs(self, *, now: str) -> list[dict[str, Any]]:
        return await self._request("GET", "/agent-data/cron-jobs/due", params={"now": now})

    async def update_job_schedule(
        self,
        *,
        job_id: str,
        status: Literal["enabled", "disabled", "expired"] | None = None,
        next_run_at: str | None = None,
    ) -> dict[str, Any]:
        return await self._request(
            "PATCH",
            f"/agent-data/cron-jobs/{job_id}/schedule",
            json={
                "status": status,
                "nextRunAt": next_run_at,
            },
        )

    async def write_execution(
        self,
        *,
        job_id: str,
        status: Literal["success", "failed", "skipped"],
        result: dict[str, Any] | None = None,
        error_message: str | None = None,
        dedupe_key: str | None = None,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"/agent-data/cron-jobs/{job_id}/executions",
            json={
                "status": status,
                "finishedAt": datetime.now(timezone.utc).isoformat(),
                "result": result or {},
                "errorMessage": error_message,
                "dedupeKey": dedupe_key,
            },
        )

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = kwargs.pop("headers", {})
        if self._token:
            headers["x-agent-token"] = self._token
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.request(method, f"{self._base_url}{path}", headers=headers, **kwargs)
            response.raise_for_status()
            return response.json()


def _detect_task_type(text: str, medicines: list[MedicineBrief]) -> TaskType:
    if any(keyword in text for keyword in TEMPERATURE_KEYWORDS):
        return "temperature"
    if any(keyword in text for keyword in CABINET_KEYWORDS):
        return "cabinet"
    return "medicine"


def _match_medicine(text: str, medicines: list[MedicineBrief]) -> MedicineBrief | None:
    for medicine in medicines:
        if medicine.name and medicine.name in text:
            return medicine
    for medicine in medicines:
        short_name = re.sub(r"(胶囊|片|颗粒|口服液|缓释|分散片)$", "", medicine.name)
        if short_name and short_name in text:
            return medicine
    return None


def _match_member(text: str, members: list[MemberBrief]) -> MemberBrief | None:
    for member in members:
        if member.display_name and member.display_name in text:
            return member
    return None


def _extract_dosage(text: str) -> str | None:
    match = re.search(r"(一次[^，。；\s]+|每次[^，。；\s]+)", text)
    return match.group(1) if match else None


def _extract_medicine_name(text: str) -> str | None:
    match = re.search(r"(?:吃|服用|服药|用药)([^，。；\s]+)", text)
    return match.group(1) if match else None


def _extract_schedule(text: str, now: datetime, timezone_name: str) -> dict[str, Any] | None:
    interval = re.search(r"每\s*(\d+)\s*个?小时", text)
    if interval:
        hours = int(interval.group(1))
        return {
            "type": "every",
            "everySeconds": hours * 3600,
            "nextRunAt": (now + timedelta(hours=hours)).isoformat(),
        }

    times = _extract_times(text)
    if "明天" in text or "今晚" in text or "今天" in text:
        hour = int(times[0].split(":")[0]) if times else _default_hour(text)
        minute = int(times[0].split(":")[1]) if times else 0
        day = now.date() + (timedelta(days=1) if "明天" in text else timedelta(days=0))
        run_at = datetime(day.year, day.month, day.day, hour, minute, tzinfo=now.tzinfo)
        if "今晚" in text and run_at <= now:
            run_at += timedelta(days=1)
        return {
            "type": "at",
            "runAt": run_at.isoformat(),
            "nextRunAt": run_at.isoformat(),
        }

    if "每天" in text or "早晚" in text or len(times) > 0:
        if not times:
            times = ["08:00", "20:00"] if "早晚" in text else [f"{_default_hour(text):02d}:00"]
        hours = ",".join(str(int(item.split(":")[0])) for item in times)
        minutes = {int(item.split(":")[1]) for item in times}
        minute = minutes.pop() if len(minutes) == 1 else 0
        first = _next_daily_time(now, times)
        return {
            "type": "cron",
            "times": times,
            "cronExpression": f"{minute} {hours} * * *",
            "nextRunAt": first.isoformat(),
        }

    return None


def _extract_times(text: str) -> list[str]:
    if "早中晚" in text:
        return ["08:00", "12:00", "20:00"]
    if "早晚" in text:
        return ["08:00", "20:00"]
    times: list[str] = []
    for match in re.finditer(r"\b(\d{1,2})[:：](\d{1,2})\b", text):
        hour = int(match.group(1))
        minute = int(match.group(2))
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            times.append(f"{hour:02d}:{minute:02d}")
    for match in re.finditer(r"(\d{1,2})(?:[:：](\d{1,2}))?\s*点", text):
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        if "下午" in text or "晚上" in text or "今晚" in text:
            if hour < 12:
                hour += 12
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            times.append(f"{hour:02d}:{minute:02d}")
    return sorted(set(times))


def _default_hour(text: str) -> int:
    if "早" in text or "上午" in text:
        return 8
    if "中午" in text:
        return 12
    if "晚" in text or "下午" in text:
        return 20
    return 9


def _next_daily_time(now: datetime, times: list[str]) -> datetime:
    candidates = []
    for item in times:
        hour, minute = [int(part) for part in item.split(":")]
        candidate = datetime(now.year, now.month, now.day, hour, minute, tzinfo=now.tzinfo)
        if candidate <= now:
            candidate += timedelta(days=1)
        candidates.append(candidate)
    return min(candidates)


def _build_title(task_type: TaskType, medicine_name: str | None) -> str:
    if task_type == "medicine":
        return f"服用{medicine_name or '药品'}"
    if task_type == "temperature":
        return "量体温"
    return "药箱维护提醒"


def _parse_now(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc).astimezone()
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _format_datetime_for_user(value: str) -> str:
    dt = datetime.fromisoformat(value)
    return dt.strftime("%Y-%m-%d %H:%M")
