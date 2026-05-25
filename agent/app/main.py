from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api.consult import router as consult_router
from .api.health import router as health_router
from .config import get_settings
from .graph.builder import build_graph
from .llm.provider import get_llm_provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    llm = get_llm_provider(settings)
    graph = build_graph(llm=llm, disclaimer=settings.disclaimer)
    app.state.llm = llm
    app.state.graph = graph
    app.state.settings = settings
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="family-doctor-agent",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(health_router, prefix="/agent", tags=["health"])
    app.include_router(consult_router, prefix="/agent", tags=["consult"])
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        log_level=settings.app_log_level,
        reload=False,
    )
