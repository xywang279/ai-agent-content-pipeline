from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
import os

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ai_agent.db")

# 创建引擎
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False  # 生产环境设为 False
)

# 创建会话
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建作用域会话
ScopedSession = scoped_session(SessionLocal)

# 基础模型
Base = declarative_base()

def get_db():
    """获取数据库会话"""
    db = ScopedSession()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """初始化数据库"""
    # 导入所有模型
    from app import models
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print("数据库表已创建")