from __future__ import annotations

from typing import Protocol, TypeVar

from pydantic import BaseModel

from ..config import Settings

T = TypeVar("T", bound=BaseModel)


class LLMProvider(Protocol):
    model: str

    async def chat(self, *, system: str, user: str) -> str: ...

    async def structured(self, *, system: str, user: str, schema: type[T]) -> T: ...

    async def structured_with_images(
        self,
        *,
        system: str,
        user: str,
        images: list[dict[str, str]],
        schema: type[T],
    ) -> T: ...


def get_llm_provider(settings: Settings) -> LLMProvider:
    if settings.llm_provider == "openai":
        from .openai_provider import OpenAICompatProvider

        return OpenAICompatProvider(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.llm_model,
        )
    if settings.llm_provider == "deepseek":
        from .openai_provider import OpenAICompatProvider

        return OpenAICompatProvider(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model=settings.llm_model or "deepseek-chat",
        )
    raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
