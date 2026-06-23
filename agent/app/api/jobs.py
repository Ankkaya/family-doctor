from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from ..tools.cron_job_tool import CronJobTool

router = APIRouter()


class ExecuteJobRequest(BaseModel):
    job_id: str = Field(alias="jobId")
    household_id: str | None = Field(default=None, alias="householdId")
    task_type: Literal["medicine", "temperature", "cabinet"] = Field(alias="taskType")
    title: str
    payload: dict[str, Any] = Field(default_factory=dict)


@router.post("/jobs/execute")
async def execute_job(payload: ExecuteJobRequest, request: Request) -> dict[str, Any]:
    tool = CronJobTool(request.app.state.settings)
    dedupe_key = f"{payload.job_id}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    try:
        result = await _execute(payload, tool)
        await tool.write_execution(
            job_id=payload.job_id,
            status="success",
            result=result,
            dedupe_key=dedupe_key,
        )
        return result
    except Exception as exc:  # noqa: BLE001
        await tool.write_execution(
            job_id=payload.job_id,
            status="failed",
            result={},
            error_message=str(exc),
            dedupe_key=dedupe_key,
        )
        raise


@router.post("/jobs/expired-medicine-check")
async def execute_expired_medicine_check(request: Request) -> dict[str, Any]:
    tool = CronJobTool(request.app.state.settings)
    return await tool.execute_expired_medicine_check()


async def _execute(payload: ExecuteJobRequest, tool: CronJobTool) -> dict[str, Any]:
    if payload.task_type == "cabinet" and payload.payload.get("systemTask") == "expired_medicine_check":
        expired = await tool.execute_expired_medicine_check(household_id=payload.household_id)
        count = expired["expiredCount"]
        notification = "药箱过期检查完成，暂无过期药品。" if count == 0 else f"药箱中发现 {count} 个过期药品，请及时处理。"
        return {
            "notificationTitle": "药品过期检查",
            "notificationBody": notification,
            **expired,
        }

    if payload.task_type == "medicine":
        medicine = payload.payload.get("medicineName") or "药品"
        dosage = payload.payload.get("dosage")
        body = f"该服用{medicine}了" + (f"：{dosage}" if dosage else "。")
        return {
            "notificationTitle": payload.title,
            "notificationBody": body,
            "actions": ["taken", "snooze", "skip"],
        }

    if payload.task_type == "temperature":
        return {
            "notificationTitle": payload.title,
            "notificationBody": "该量体温并记录结果了。",
            "actions": ["recorded", "snooze", "skip"],
        }

    return {
        "notificationTitle": payload.title,
        "notificationBody": "药箱提醒已触发，请打开 App 查看。",
    }
