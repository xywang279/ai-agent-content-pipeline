from typing import List, Dict, Optional
from datetime import datetime
import uuid

class ConversationManager:
    def __init__(self):
        # 使用内存存储，生产环境建议使用数据库
        self.conversations = {}  # {conversation_id: {messages: [], title: str, created_at: datetime}}
    
    def create_conversation(self, title: Optional[str] = None) -> str:
        """创建新对话"""
        conversation_id = str(uuid.uuid4())
        self.conversations[conversation_id] = {
            "id": conversation_id,
            "title": title or "新对话",
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        return conversation_id
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """获取对话"""
        return self.conversations.get(conversation_id)
    
    def get_all_conversations(self) -> List[Dict]:
        """获取所有对话列表"""
        return list(self.conversations.values())
    
    def add_message(self, conversation_id: str, message: Dict) -> bool:
        """添加消息到对话"""
        if conversation_id not in self.conversations:
            return False
        
        self.conversations[conversation_id]["messages"].append(message)
        self.conversations[conversation_id]["updated_at"] = datetime.now().isoformat()
        return True
    
    def get_messages(self, conversation_id: str) -> List[Dict]:
        """获取对话消息"""
        if conversation_id not in self.conversations:
            return []
        return self.conversations[conversation_id]["messages"]
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """更新对话标题"""
        if conversation_id not in self.conversations:
            return False
        self.conversations[conversation_id]["title"] = title
        self.conversations[conversation_id]["updated_at"] = datetime.now().isoformat()
        return True
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            return True
        return False

# 全局对话管理器实例
conversation_manager = ConversationManager()