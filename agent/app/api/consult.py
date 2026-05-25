from fastapi import APIRouter, Request

from ..schemas import ConsultRequest, ConsultResponse

router = APIRouter()


@router.post("/consult", response_model=ConsultResponse, response_model_by_alias=True)
async def consult(payload: ConsultRequest, request: Request) -> ConsultResponse:
    graph = request.app.state.graph
    result = await graph.ainvoke(
        {
            "session_id": payload.session_id,
            "question": payload.question,
            "medicines": payload.medicines,
            "allow_rx_recommendation": payload.allow_rx_recommendation,
            "traces": [],
        }
    )
    return ConsultResponse(
        answer=result["answer"],
        recommends=result["recommends"],
        disclaimer=result["disclaimer"],
        traces=result["traces"],
    )
