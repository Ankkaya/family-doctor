from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

AGENT_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=AGENT_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_log_level: str = "info"

    llm_provider: Literal["openai", "deepseek"] = "openai"
    llm_model: str = "gpt-4o-mini"

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"

    disclaimer: str = Field(
        default="本回复为 AI 参考建议，不构成医疗诊断。症状持续或加重请尽快就医。"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
