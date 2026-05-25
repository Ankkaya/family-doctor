from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import Settings


def test_default_llm_provider_uses_real_model_provider() -> None:
    settings = Settings(_env_file=None)

    assert settings.llm_provider == "openai"


def test_mock_llm_provider_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)
