import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api.consult import router as consult_router
from .api.health import router as health_router
from .api.jobs import router as jobs_router
from .api.medicine import router as medicine_router
from .config import get_settings
from .graph.builder import build_graph
from .llm.provider import get_llm_provider
from .services.due_job_scheduler import run_due_job_scheduler
from .services.system_expiry_scheduler import run_system_expiry_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    llm = get_llm_provider(settings)
    graph = build_graph(llm=llm, disclaimer=settings.disclaimer)
    stream_graph = build_graph(llm=llm, disclaimer=settings.disclaimer, include_render=False)
    app.state.llm = llm
    app.state.graph = graph
    app.state.stream_graph = stream_graph
    app.state.settings = settings
    due_job_task = asyncio.create_task(run_due_job_scheduler(settings))
    expiry_task = asyncio.create_task(run_system_expiry_scheduler(settings))
    app.state.due_job_task = due_job_task
    app.state.system_expiry_task = expiry_task
    try:
        yield
    finally:
        due_job_task.cancel()
        expiry_task.cancel()
        await asyncio.gather(due_job_task, expiry_task, return_exceptions=True)


def create_app() -> FastAPI:
    app = FastAPI(
        title="family-doctor-agent",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(health_router, prefix="/agent", tags=["health"])
    app.include_router(consult_router, prefix="/agent", tags=["consult"])
    app.include_router(jobs_router, prefix="/agent", tags=["jobs"])
    app.include_router(medicine_router, prefix="/agent", tags=["medicine"])
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
