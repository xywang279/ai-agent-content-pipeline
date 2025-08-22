# app/routes/memory.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.agents.memory_agent import agent_chat

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
def chat(req: ChatRequest):
    response = agent_chat(req.message)
    return {"response": response}
