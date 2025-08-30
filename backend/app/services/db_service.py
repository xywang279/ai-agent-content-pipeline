from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, text
from fastapi import Depends
from typing import List, Optional
from app.models import Conversation, Message
from datetime import datetime
from app.database import get_db
import uuid
import json
class DatabaseService:
    def __init__(self, db: Session):
        self.db = db
    
    # 对话相关操作
    def create_conversation(self, title: str = "新对话", user_id: Optional[str] = None) -> Conversation:
        """创建新对话"""
        conversation = Conversation(
            title=title,
            user_id=user_id
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """获取对话"""
        return self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
    
    def get_conversations(self, user_id: Optional[str] = None, limit: int = 100) -> List[Conversation]:
        """获取对话列表"""
        query = self.db.query(Conversation).filter(Conversation.is_active == True)
        if user_id:
            query = query.filter(Conversation.user_id == user_id)
        
        return query.order_by(desc(Conversation.updated_at)).limit(limit).all()
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """更新对话标题"""
        conversation = self.get_conversation(conversation_id)
        if conversation:
            conversation.title = title
            conversation.updated_at = datetime.now()
            self.db.commit()
            return True
        return False
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话（软删除）"""
        conversation = self.get_conversation(conversation_id)
        if conversation:
            conversation.is_active = False
            self.db.commit()
            return True
        return False
    
    def get_conversation_preview(self, conversation_id: str) -> str:
        """获取对话预览"""
        # 获取最后一条消息
        last_message = self.db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .order_by(desc(Message.created_at))\
            .first()
        
        if last_message:
            content = last_message.content
            return content[:50] + "..." if len(content) > 50 else content
        return ""
    
    def generate_smart_title(self, conversation_id: str, first_message: str) -> str:
        """智能生成对话标题"""
        title = self._extract_title_from_message(first_message)
        self.update_conversation_title(conversation_id, title)
        return title
    
    def _extract_title_from_message(self, message: str) -> str:
        """从消息中提取标题"""
        message = message.strip()
        
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
    
    # 消息相关操作
    def add_message(self, conversation_id: str, role: str, content: str, 
                   tool_call: Optional[dict] = None, user_id: Optional[str] = None) -> Message:
        """添加消息"""
        # 获取消息序列号
        message_count = self.db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .count()
        
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_call=tool_call,
            sequence=message_count + 1
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # 更新对话的更新时间
        conversation = self.get_conversation(conversation_id)
        if conversation:
            conversation.updated_at = datetime.now()
            self.db.commit()
            
            # 如果是第一条消息且标题是默认的，智能生成标题
            if message_count == 0 and conversation.title == "新对话":
                self.generate_smart_title(conversation_id, content)
        
        return message
    
    def get_messages(self, conversation_id: str, limit: int = 1000) -> List[Message]:
        """获取对话消息"""
        return self.db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .order_by(asc(Message.sequence))\
            .limit(limit)\
            .all()
    
    def clear_conversation_messages(self, conversation_id: str) -> bool:
        """清空对话消息"""
        self.db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .delete()
        self.db.commit()
        return True
    
    # 文件相关操作
    def create_file_record(self, conversation_id: str, file_name: str, file_path: str, 
                          file_size: int, file_format: str, file_info: dict = None,
                          analysis_data: dict = None, insights: str = None) -> dict:
        """创建文件记录"""
        try:
            file_id = str(uuid.uuid4())
            created_at = datetime.now()
            
            # 安全的 JSON 序列化
            def safe_json_dump(data):
                try:
                    return json.dumps(data, ensure_ascii=False) if data else None
                except (TypeError, ValueError):
                    return None  # 如果序列化失败，返回 None

            file_info_json = safe_json_dump(file_info)
            analysis_data_json = safe_json_dump(analysis_data)
            
            sql = '''
            INSERT INTO file_records 
            (id, conversation_id, file_name, file_path, file_size, file_format, 
             file_info, analysis_data, insights, created_at, updated_at, is_active)
            VALUES (:id, :conversation_id, :file_name, :file_path, :file_size, :file_format, 
                    :file_info, :analysis_data, :insights, :created_at, :updated_at, :is_active)
            '''
            
            # 参数传递为字典
            params = {
                "id": file_id,
                "conversation_id": conversation_id,
                "file_name": file_name,
                "file_path": file_path,
                "file_size": file_size,
                "file_format": file_format,
                "file_info": file_info_json,
                "analysis_data": analysis_data_json,
                "insights": insights,
                "created_at": created_at,
                "updated_at": created_at,
                "is_active": True
            }
            
            # 执行插入操作
            self.db.execute(text(sql), params)
            self.db.commit()
            
            return {
                "id": file_id,
                "conversation_id": conversation_id,
                "file_name": file_name,
                "file_path": file_path,
                "file_size": file_size,
                "file_format": file_format,
                "file_info": file_info,
                "analysis_data": analysis_data,
                "insights": insights,
                "created_at": created_at.isoformat(),
                "updated_at": created_at.isoformat(),
                "is_active": True
            }
        except Exception as e:
            self.db.rollback()
            raise Exception(f"创建文件记录失败: {str(e)}")
    def get_files_by_conversation(self, conversation_id: str, limit: int = 100) -> List[dict]:
        """根据对话ID获取文件列表"""
        try:
            sql = f'''
            SELECT id, conversation_id, file_name, file_path, file_size, file_format,
                file_info, analysis_data, insights, created_at, updated_at, is_active
            FROM file_records 
            WHERE conversation_id = :conversation_id AND is_active = 1 
            ORDER BY created_at DESC 
            LIMIT {limit}
            '''
            
            results = self.db.execute(text(sql), {"conversation_id": conversation_id}).fetchall()
            files = []

            for result in results:
                def safe_json_load(val):
                    if not val:
                        return None
                    try:
                        return json.loads(val)
                    except json.JSONDecodeError:
                        return {"raw": val}
                
                files.append({
                    "id": result[0],
                    "conversation_id": result[1],
                    "file_name": result[2],
                    "file_path": result[3],
                    "file_size": result[4],
                    "file_format": result[5],
                    "file_info": safe_json_load(result[6]),
                    "analysis_data": safe_json_load(result[7]),
                    "insights": result[8],
                    "created_at": result[9].isoformat() if hasattr(result[9], "isoformat") else str(result[9]),
                    "updated_at": result[10].isoformat() if hasattr(result[10], "isoformat") else str(result[10]),
                    "is_active": bool(result[11]) if result[11] is not None else True
                })
            
            return files
        except Exception as e:
            raise Exception(f"获取文件列表失败: {str(e)}")
        
    def get_file_by_id(self, file_id: str) -> Optional[dict]:
        """根据文件ID获取文件记录"""
        try:
            sql = '''
            SELECT id, conversation_id, file_name, file_path, file_size, file_format,
                   file_info, analysis_data, insights, created_at, updated_at, is_active
            FROM file_records 
            WHERE id = ? AND is_active = 1
            '''
            
            result = self.db.execute(text(sql), (file_id,)).fetchone()
            
            if result:
                try:
                    file_info = json.loads(result[6]) if result[6] else None
                    analysis_data = json.loads(result[7]) if result[7] else None
                except:
                    file_info = result[6]
                    analysis_data = result[7]
                
                return {
                    "id": result[0],
                    "conversation_id": result[1],
                    "file_name": result[2],
                    "file_path": result[3],
                    "file_size": result[4],
                    "file_format": result[5],
                    "file_info": file_info,
                    "analysis_data": analysis_data,
                    "insights": result[8],
                    "created_at": result[9].isoformat() if result[9] else None,
                    "updated_at": result[10].isoformat() if result[10] else None,
                    "is_active": bool(result[11]) if result[11] is not None else True
                }
            
            return None
        except Exception as e:
            raise Exception(f"获取文件记录失败: {str(e)}")
    def delete_file_record(self, file_id: str) -> bool:
        """删除文件记录（软删除）"""
        try:
            sql = "UPDATE file_records SET is_active = 0 WHERE id = ?"
            result = self.db.execute(text(sql), (file_id,))
            self.db.commit()
            return result.rowcount > 0
        except Exception as e:
            self.db.rollback()
            raise Exception(f"删除文件记录失败: {str(e)}")

# 依赖注入函数
def get_db_service(db: Session = Depends(get_db)):
    return DatabaseService(db)