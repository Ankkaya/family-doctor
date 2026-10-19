"""Read-only tool; authorization is supplied by backend, never by the model."""

from __future__ import annotations

from typing import Literal

import httpx
from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..config import Settings
from ..schemas import MedicineBrief


class CabinetToolCall(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    tool: Literal["search_household_cabinet", "none"]
    mode: Literal["name", "symptom", "inventory"]
    names: list[str] = Field(max_length=10)
    symptoms: str = Field(max_length=1000)

    @model_validator(mode="after")
    def check_arguments(self):
        if self.tool == "search_household_cabinet":
            if self.mode == "name" and (
                not self.names
                or self.symptoms.strip()
                or any(not name.strip() or len(name) > 100 for name in self.names)
            ):
                raise ValueError("药名查询需要完整药名，不接受症状回退")
            if self.mode == "symptom" and (self.names or not self.symptoms.strip()):
                raise ValueError("症状查询不能同时指定药名")
            if self.mode == "inventory" and (self.names or self.symptoms.strip()):
                raise ValueError("库存列表不能混入药名或症状")
        elif self.names or self.symptoms.strip() or self.mode != "name":
            raise ValueError("不调用工具时不能携带查询参数")
        return self


async def search_household_cabinet(
    *, settings: Settings, scope: str, call: CabinetToolCall
) -> list[MedicineBrief]:
    if call.tool != "search_household_cabinet":
        return []
    if not scope:
        raise ValueError("药箱查询缺少会话授权")
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{settings.backend_base_url.rstrip('/')}/agent-data/cabinet/search",
            headers={"x-agent-token": settings.agent_internal_token},
            json={
                "scope": scope,
                "mode": call.mode,
                "names": call.names,
                "symptoms": call.symptoms,
            },
        )
    if not response.is_success:
        if response.status_code == 403:
            raise ValueError("药箱查询授权已失效，请重新发起问诊")
        if response.status_code == 503:
            raise ValueError("药箱语义检索未配置或 Embedding 服务暂不可用")
        raise ValueError("药箱查询失败，请稍后重试")
    data = response.json()
    if isinstance(data, dict):
        data = data.get("data")
    if not isinstance(data, list):
        raise ValueError("药箱查询返回格式无效")
    return [MedicineBrief.model_validate(item) for item in data]
