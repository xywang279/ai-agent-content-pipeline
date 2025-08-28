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
        # 添加了智能标题生成逻辑
        if len(self.conversations[conversation_id]["messages"]) == 1 and self.conversations[conversation_id]["title"] == "新对话":
            self.generate_smart_title(conversation_id)
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
    
    def get_conversation_preview(self, conversation_id: str) -> Optional[str]:
        """获取对话预览（最后一条消息）"""
        conversation = self.conversations.get(conversation_id)
        if not conversation or not conversation["messages"]:
            return ""
        
        last_message = conversation["messages"][-1]
        content = last_message.get("content", "")
        # 截取前50个字符作为预览
        return content[:50] + "..." if len(content) > 50 else content
    def generate_smart_title(self, conversation_id: str) -> str:
        """智能生成对话标题"""
        conversation = self.conversations.get(conversation_id)
        if not conversation or not conversation["messages"]:
            return "新对话"
        
        # 获取第一条用户消息
        first_user_message = None
        for msg in conversation["messages"]:
            if msg["role"] == "user":
                first_user_message = msg["content"]
                break
        
        if not first_user_message:
            return "新对话"
        
        # 智能标题生成逻辑
        title = self._extract_title_from_message(first_user_message)
        self.conversations[conversation_id]["title"] = title
        return title
    
    def _extract_title_from_message(self, message: str) -> str:
        """从消息中提取标题"""
        # 移除多余的空格和换行
        message = message.strip()
        
        # 如果消息很短，直接用作标题
        if len(message) <= 20:
            return message
        
        # 常见的标题关键词
        title_keywords = [
            "如何", "怎么", "为什么", "是什么", "介绍", "说明", "解释",
            "写一篇", "写一个", "生成", "创建", "制作", "设计",
            "帮忙", "请帮我", "帮我", "需要", "想要", "想了解"
        ]
        
        # 检查是否包含标题关键词
        for keyword in title_keywords:
            if keyword in message:
                # 提取关键词后的关键信息
                keyword_index = message.find(keyword)
                if keyword_index >= 0:
                    start_index = max(0, keyword_index)
                    end_index = min(len(message), start_index + 30)
                    title_candidate = message[start_index:end_index].strip()
                    if len(title_candidate) > 5:
                        return title_candidate[:20] + "..." if len(title_candidate) > 20 else title_candidate
        
        # 如果没有找到关键词，提取前20个字符
        title = message[:20].strip()
        if len(message) > 20:
            title += "..."
        
        return title
# 全局对话管理器实例
conversation_manager = ConversationManager()