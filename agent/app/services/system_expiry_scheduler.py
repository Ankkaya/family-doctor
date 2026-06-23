from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
import logging

from ..config import Settings
from ..tools.cron_job_tool import CronJobTool

logger = logging.getLogger(__name__)


async def run_system_expiry_scheduler(settings: Settings) -> None:
    if not settings.system_expiry_check_enabled:
        logger.info("system expiry check scheduler disabled")
        return

    tool = CronJobTool(settings)
    while True:
        delay = _seconds_until_next_run(settings.system_expiry_check_hour)
        await asyncio.sleep(delay)
        try:
            result = await tool.execute_expired_medicine_check()
            logger.info("system expiry check completed: %s expired medicines", result.get("expiredCount"))
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("system expiry check failed: %s", exc)
            await asyncio.sleep(60)


def _seconds_until_next_run(hour: int) -> float:
    now = datetime.now().astimezone()
    normalized_hour = min(max(hour, 0), 23)
    target = now.replace(hour=normalized_hour, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return max((target - now).total_seconds(), 1)
