import os

from minisweagent.models.litellm_model import LitellmModel


def build_model() -> LitellmModel:
    api_key = os.environ.get("NRP_API_KEY")
    api_base = os.environ.get(
        "NRP_API_BASE",
        "https://ellm.nrp-nautilus.io/v1",
    )
    model_name = os.environ.get(
        "NRP_MODEL",
        "gpt-oss",
    )

    if not api_key:
        raise ValueError(
            "NRP_API_KEY environment variable is not set"
        )

    return LitellmModel(
        model_name=f"openai/{model_name}",
        model_kwargs={
            "api_key": api_key,
            "api_base": api_base,
        },
        cost_tracking="ignore_errors",
    )