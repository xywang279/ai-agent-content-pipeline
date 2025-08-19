from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import content
from app.routes import publish

app = FastAPI(title="AI Agent 内容创作流水线")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(publish.router, prefix="/api/publish", tags=["Publish"])
