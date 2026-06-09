from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request

from ..schemas import RecognizeMedicineImagesRequest, RecognizeMedicineImagesResponse

router = APIRouter()

PROMPT_PATH = Path(__file__).resolve().parents[2] / "prompts" / "medicine_recognize.v1.md"
RECOGNIZE_SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8").strip()


@router.post(
    "/medicine/recognize-images",
    response_model=RecognizeMedicineImagesResponse,
    response_model_by_alias=True,
)
async def recognize_medicine_images(
    payload: RecognizeMedicineImagesRequest,
    request: Request,
) -> RecognizeMedicineImagesResponse:
    llm = request.app.state.llm
    result = await llm.structured_with_images(
        system=RECOGNIZE_SYSTEM_PROMPT,
        user=(
            "请识别这些药盒、说明书或瓶身图片中的药品信息。"
            "多张图片之间要交叉校验，无法确认的字段返回 null 或空数组，不要编造。"
        ),
        images=[
            {
                "url": f"data:{image.mime_type};base64,{image.data_base64}",
            }
            for image in payload.images
        ],
        schema=RecognizeMedicineImagesResponse,
    )
    return result
