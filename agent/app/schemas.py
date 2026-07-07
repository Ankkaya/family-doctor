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


class MemberBrief(_CamelModel):
    id: str
    display_name: str = Field(alias="displayName")
    user_id: str | None = Field(default=None, alias="userId")
    role: str | None = None


class ConversationMessageBrief(_CamelModel):
    role: Literal["USER", "ASSISTANT"]
    content: str


class HistoryMessage(_CamelModel):
    role: Literal["USER", "ASSISTANT"]
    content: str
    created_at: str | None = Field(default=None, alias="createdAt")


class SessionSummary(_CamelModel):
    chief_complaint: str | None = Field(default=None, alias="chiefComplaint")
    symptoms: list[str] = Field(default_factory=list)
    duration: str | None = None
    risk_flags: list[str] = Field(default_factory=list, alias="riskFlags")
    mentioned_medicines: list[str] = Field(default_factory=list, alias="mentionedMedicines")
    rejected_medicines: list[str] = Field(default_factory=list, alias="rejectedMedicines")
    recommended_medicines: list[str] = Field(default_factory=list, alias="recommendedMedicines")
    temporary_user_facts: list[str] = Field(default_factory=list, alias="temporaryUserFacts")
    unresolved_questions: list[str] = Field(default_factory=list, alias="unresolvedQuestions")
    last_topic: str | None = Field(default=None, alias="lastTopic")
    suggested_status: Literal["active", "resolved", "stale", "closed"] = Field(
        default="active",
        alias="suggestedStatus",
    )


class Recommend(_CamelModel):
    medicine_id: str = Field(alias="medicineId")
    name: str
    otc: OtcType
    indication: str
    reason: str
    warnings: list[str] = Field(default_factory=list)


class RiskReviewItem(_CamelModel):
    medicine_id: str = Field(alias="medicineId")
    suitable: bool
    reason: str
    reject_reason: str | None = Field(default=None, alias="rejectReason")
    warnings: list[str] = Field(default_factory=list)


class RiskReviewOutput(_CamelModel):
    items: list[RiskReviewItem] = Field(default_factory=list)


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
    user_id: str | None = Field(default=None, alias="userId")
    household_id: str | None = Field(default=None, alias="householdId")
    medicines: list[MedicineBrief] = Field(default_factory=list)
    members: list[MemberBrief] = Field(default_factory=list)
    history: list[ConversationMessageBrief] = Field(default_factory=list)
    user_profile: UserProfile | None = Field(default=None, alias="userProfile")
    history_messages: list[HistoryMessage] = Field(default_factory=list, alias="historyMessages")
    session_summary: SessionSummary | None = Field(default=None, alias="sessionSummary")
    conversation_status: Literal["active", "resolved", "stale", "closed"] = Field(
        default="active",
        alias="conversationStatus",
    )
    allow_rx_recommendation: bool = Field(default=False, alias="allowRxRecommendation")
    timezone: str = "Asia/Shanghai"
    now: str | None = None


class ConsultResponse(_CamelModel):
    answer: str
    recommends: list[Recommend]
    disclaimer: str
    session_summary: SessionSummary | None = Field(default=None, alias="sessionSummary")
    traces: list[TraceStep]


class ImageInput(_CamelModel):
    filename: str
    mime_type: str = Field(alias="mimeType")
    data_base64: str = Field(alias="dataBase64")


class RecognizeMedicineImagesRequest(_CamelModel):
    images: list[ImageInput] = Field(default_factory=list)


class RecognizeMedicineImagesResponse(_CamelModel):
    name: str | None = None
    aliases: list[str] = Field(default_factory=list)
    otc: OtcType | None = None
    indication: str | None = None
    contraindication: str | None = None
    adverse_reaction: str | None = Field(default=None, alias="adverseReaction")
    dosage: str | None = None
    barcode: str | None = None
    approval_number: str | None = Field(default=None, alias="approvalNumber")
    manufacturer: str | None = None
    expire_at: str | None = Field(default=None, alias="expireAt")
    confidence: float | None = None
    raw_text: str | None = Field(default=None, alias="rawText")
    warnings: list[str] = Field(default_factory=list)


class ParsedSymptoms(_CamelModel):
    symptoms: list[str]
    severity: Literal["mild", "moderate", "severe", "unknown"] = "unknown"
    duration: str | None = None
    population_hints: list[str] = Field(default_factory=list, alias="populationHints")
    emergency: bool = False
    """是否为急症信号（自伤/呼吸困难/意识障碍等），命中则跳过常规链路。"""
