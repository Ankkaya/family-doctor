from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import logging
from typing import Any

from ..api.jobs import ExecuteJobRequest, _execute
from ..config import Settings
from ..tools.cron_job_tool import CronJobTool

logger = logging.getLogger(__name__)


async def run_due_job_scheduler(settings: Settings) -> None:
    tool = CronJobTool(settings)
    while True:
        try:
            now = datetime.now(timezone.utc)
            jobs = await tool.list_due_jobs(now=now.isoformat())
            for job in jobs:
                await _run_one(job, tool, now)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("due job scheduler tick failed: %s", exc)
        await asyncio.sleep(30)


async def _run_one(job: dict[str, Any], tool: CronJobTool, now: datetime) -> None:
    job_id = str(job["id"])
    request = ExecuteJobRequest.model_validate(
        {
            "jobId": job_id,
            "householdId": job.get("householdId"),
            "taskType": job.get("taskType"),
            "title": job.get("title") or "定时任务",
            "payload": job.get("payload") or {},
        }
    )
    dedupe_key = f"{job_id}:{now.strftime('%Y%m%d%H%M')}"
    try:
        result = await _execute(request, tool)
        await tool.write_execution(job_id=job_id, status="success", result=result, dedupe_key=dedupe_key)
        next_run_at, status = _next_schedule(job, now)
        await tool.update_job_schedule(job_id=job_id, status=status, next_run_at=next_run_at)
    except Exception as exc:  # noqa: BLE001
        await tool.write_execution(
            job_id=job_id,
            status="failed",
            result={},
            error_message=str(exc),
            dedupe_key=dedupe_key,
        )
        logger.warning("due job %s failed: %s", job_id, exc)


def _next_schedule(job: dict[str, Any], now: datetime) -> tuple[str | None, str]:
    job_type = job.get("type")
    if job_type == "at":
        return None, "expired"
    if job_type == "every":
        seconds = int(job.get("everySeconds") or 3600)
        return (now + timedelta(seconds=seconds)).isoformat(), "enabled"
    if job_type == "cron":
        return _next_cron_time(str(job.get("cronExpression") or ""), now).isoformat(), "enabled"
    return None, "expired"


def _next_cron_time(expression: str, now: datetime) -> datetime:
    parts = expression.split()
    if len(parts) < 2:
        return now + timedelta(days=1)
    minute = int(parts[0])
    hours = [int(item) for item in parts[1].split(",") if item.strip().isdigit()]
    if not hours:
        hours = [9]
    candidates = []
    for hour in hours:
        candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if candidate <= now:
            candidate += timedelta(days=1)
        candidates.append(candidate)
    return min(candidates)
