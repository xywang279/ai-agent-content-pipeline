from typing import List, Dict, Optional
from datetime import datetime
from app.services.db_service import DatabaseService
from app.database import SessionLocal

class ConversationManagerUseSql:
    def __init__(self):
        # 使用数据库服务
        self.db_service = None
    
    def _get_db_service(self):
        """获取数据库服务实例"""
        if not self.db_service:
            db = SessionLocal()
            self.db_service = DatabaseService(db)
        return self.db_service
    
    def create_conversation(self, title: Optional[str] = None) -> str:
        """创建新对话"""
        db_service = self._get_db_service()
        conversation = db_service.create_conversation(title or "新对话")
        return conversation.id
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """获取对话"""
        db_service = self._get_db_service()
        conversation = db_service.get_conversation(conversation_id)
        if conversation:
            conv_dict = conversation.to_dict()
            # 添加消息列表
            messages = db_service.get_messages(conversation_id)
            conv_dict["messages"] = [msg.to_dict() for msg in messages]
            return conv_dict
        return None
    
    def get_all_conversations(self) -> List[Dict]:
        """获取所有对话列表"""
        db_service = self._get_db_service()
        conversations = db_service.get_conversations()
        return [conv.to_dict() for conv in conversations]
    
    def add_message(self, conversation_id: str, message: Dict) -> bool:
        """添加消息到对话"""
        db_service = self._get_db_service()
        try:
            db_service.add_message(
                conversation_id=conversation_id,
                role=message["role"],
                content=message["content"],
                tool_call=message.get("tool_call")
            )
            return True
        except Exception as e:
            print(f"添加消息失败: {e}")
            return False
    
    def get_messages(self, conversation_id: str) -> List[Dict]:
        """获取对话消息"""
        db_service = self._get_db_service()
        messages = db_service.get_messages(conversation_id)
        return [msg.to_dict() for msg in messages]
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """更新对话标题"""
        db_service = self._get_db_service()
        return db_service.update_conversation_title(conversation_id, title)
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        db_service = self._get_db_service()
        return db_service.delete_conversation(conversation_id)
    
    def get_conversation_preview(self, conversation_id: str) -> Optional[str]:
        """获取对话预览"""
        db_service = self._get_db_service()
        return db_service.get_conversation_preview(conversation_id)

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
    
    def extract_report_info(self, conversation_id: str) -> Dict:
        """从对话中提取报告信息"""
        messages = self.get_messages(conversation_id)
        
        report_info = {
            "topic": "",
            "requirements": [],
            "data_points": [],
            "conclusions": [],
            "raw_content": ""
        }
        
        # 分析对话内容，提取报告要素
        for message in messages:
            if message["role"] == "user":
                content = message["content"].lower()
                report_info["raw_content"] += f"用户: {message['content']}\n"
                
                # 提取主题
                if not report_info["topic"]:
                    if any(keyword in content for keyword in ["报告", "分析", "研究", "总结"]):
                        # 从消息中提取主题
                        report_info["topic"] = self._extract_topic(message["content"])
                
                # 提取需求
                if any(keyword in content for keyword in ["需要", "要求", "希望", "想要"]):
                    report_info["requirements"].append(message["content"])
                
                # 提取数据点
                if any(keyword in content for keyword in ["数据", "统计", "数字", "百分比"]):
                    report_info["data_points"].append(message["content"])
                
                # 提取结论观点
                if any(keyword in content for keyword in ["结论", "总结", "认为", "觉得"]):
                    report_info["conclusions"].append(message["content"])
            
            elif message["role"] == "assistant":
                report_info["raw_content"] += f"助手: {message['content']}\n"
        
        # 如果没有明确主题，使用对话标题
        if not report_info["topic"]:
            conversation = self.get_conversation(conversation_id)
            if conversation:
                report_info["topic"] = conversation.get("title", "未命名报告")
        
        return report_info
        
    def _extract_topic(self, content: str) -> str:
        """从内容中提取主题"""
        # 简单的主题提取逻辑
        keywords = ["关于", "有关", "针对", "对于"]
        for keyword in keywords:
            if keyword in content:
                start_idx = content.find(keyword) + len(keyword)
                # 提取后面的内容作为主题
                topic = content[start_idx:].strip()
                if topic:
                    return topic[:50] + "..." if len(topic) > 50 else topic
        
        # 如果没有找到关键词，返回前30个字符
        return content[:30] + "..." if len(content) > 30 else content
# 全局对话管理器实例
conversation_manager = ConversationManagerUseSql()