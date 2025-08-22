# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from app.routes import content
# from app.routes import publish

# app = FastAPI(title="AI Agent 内容创作流水线")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"]
# )

# app.include_router(content.router, prefix="/api/content", tags=["Content"])
# app.include_router(publish.router, prefix="/api/publish", tags=["Publish"])
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes.chat import router as chat_router
from app.utils.llm_helper import llm_helper

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时的初始化操作
    print("正在启动 AI Agent...")
    
    yield
    
    # 关闭时的清理操作
    print("正在关闭 AI Agent...")

# 创建 FastAPI 应用
app = FastAPI(
    title="AI Agent",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应该指定具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    #allow_websocket_origin=["*"]
)

# 包含 API 路由
app.include_router(chat_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "AI Agent API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )