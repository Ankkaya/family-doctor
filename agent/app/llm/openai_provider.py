"""OpenAI 兼容 Provider。DeepSeek 使用同一 SDK，只需改 base_url。"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class OpenAICompatProvider:
    def __init__(self, *, api_key: str, base_url: str, model: str) -> None:
        if not api_key:
            raise RuntimeError("LLM api_key is empty; set the API key for the configured LLM provider")
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def chat(self, *, system: str, user: str) -> str:
        resp = await self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
        )
        return (resp.choices[0].message.content or "").strip()

    async def chat_stream(self, *, system: str, user: str) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            stream=True,
        )
        async for event in stream:
            delta = event.choices[0].delta.content
            if delta:
                yield delta

    async def structured(self, *, system: str, user: str, schema: type[T]) -> T:
        """以 JSON mode 拿结构化输出。生产环境可改为 function calling 或 Responses API。"""
        sys_with_schema = (
            f"{system}\n\n"
            "请严格以 JSON 返回，字段遵循以下 JSON Schema：\n"
            f"{json.dumps(schema.model_json_schema(), ensure_ascii=False)}"
        )
        resp = await self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": sys_with_schema},
                {"role": "user", "content": user},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        return schema.model_validate_json(raw)

    async def structured_with_images(
        self,
        *,
        system: str,
        user: str,
        images: list[dict[str, str]],
        schema: type[T],
    ) -> T:
        sys_with_schema = (
            f"{system}\n\n"
            "请严格以 JSON 返回，字段遵循以下 JSON Schema：\n"
            f"{json.dumps(schema.model_json_schema(), ensure_ascii=False)}"
        )
        user_content: list[dict[str, object]] = [
            {
                "type": "text",
                "text": user,
            }
        ]
        user_content.extend(
            {
                "type": "image_url",
                "image_url": {
                    "url": image["url"],
                },
            }
            for image in images
        )
        resp = await self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": sys_with_schema},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        return schema.model_validate_json(raw)
