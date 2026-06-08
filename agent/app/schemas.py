"""与 NestJS 对齐的 DTO。字段名使用 camelCase 与 TS 侧一致。"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OtcType = Literal["OTC", "RX"]


class _CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class MedicineBrief(_CamelModel):
    id: str
    name: str
    otc: OtcType
    indication: str
    contraindication: str | None = None
    adverse_reaction: str | None = Field(default=None, alias="adverseReaction")
    dosage: str | None = None
    search_score: float | None = Field(default=None, alias="searchScore")
    search_source: str | None = Field(default=None, alias="searchSource")


class UserProfile(_CamelModel):
    age: int | None = None
    gender: str | None = None
    allergies: str | None = None
    chronic_diseases: str | None = Field(default=None, alias="chronicDiseases")
    medication_history: str | None = Field(default=None, alias="medicationHistory")


class Recommend(_CamelModel):
    medicine_id: str = Field(alias="medicineId")
    name: str
    otc: OtcType
    indication: str
    reason: str
    warnings: list[str] = Field(default_factory=list)


class TraceStep(_CamelModel):
    node_name: str = Field(alias="nodeName")
    input: dict[str, Any]
    output: dict[str, Any]
    llm_model: str | None = Field(default=None, alias="llmModel")
    token_in: int | None = Field(default=None, alias="tokenIn")
    token_out: int | None = Field(default=None, alias="tokenOut")
    latency_ms: int = Field(alias="latencyMs")
    error: str | None = None


class ConsultRequest(_CamelModel):
    session_id: str = Field(alias="sessionId")
    question: str
    medicines: list[MedicineBrief] = Field(default_factory=list)
    user_profile: UserProfile | None = Field(default=None, alias="userProfile")
    allow_rx_recommendation: bool = Field(default=False, alias="allowRxRecommendation")


class ConsultResponse(_CamelModel):
    answer: str
    recommends: list[Recommend]
    disclaimer: str
    traces: list[TraceStep]


class ParsedSymptoms(_CamelModel):
    symptoms: list[str]
    severity: Literal["mild", "moderate", "severe", "unknown"] = "unknown"
    duration: str | None = None
    population_hints: list[str] = Field(default_factory=list, alias="populationHints")
    emergency: bool = False
    """是否为急症信号（自伤/呼吸困难/意识障碍等），命中则跳过常规链路。"""
