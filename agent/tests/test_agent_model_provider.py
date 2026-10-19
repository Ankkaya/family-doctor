from app.llm.openai_provider import OpenAICompatProvider


def test_native_main_model_disables_sdk_retries_and_reuses_client():
    provider = OpenAICompatProvider(
        api_key="unit-test-key", base_url="http://localhost:9999/v1", model="configured-model"
    )
    model = provider.agent_model()
    assert model.max_retries == 0
    assert model.model_name == "configured-model"
    assert provider.agent_model() is model
