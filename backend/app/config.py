import os
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
WECHAT_APPID = os.getenv("WECHAT_APPID")
WECHAT_SECRET = os.getenv("WECHAT_SECRET")
BASE_URL = os.getenv("BASE_URL", "https://api.deepseek.com/v1")

# RAG / Files config
KB_UPLOADS_DIR = os.getenv("KB_UPLOADS_DIR", "./kb_uploads")
KB_VECTOR_DIR = os.getenv("KB_VECTOR_DIR", "./kb_vectorstores")
UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "shibing624/text2vec-base-chinese")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))

# OCR
OCR_ENABLED = os.getenv("OCR_ENABLED", "true").lower() in ("1", "true", "yes")
OCR_LANGS = os.getenv("OCR_LANGS", "chi_sim+eng")
PDF_OCR_DPI = int(os.getenv("PDF_OCR_DPI", "200"))
# Optional: specify paths when needed
POPPLER_PATH = os.getenv("POPPLER_PATH", "")  # e.g. C:\\poppler-23.08.0\\Library\\bin on Windows
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "")  # e.g. C:\\Program Files\\Tesseract-OCR\\tesseract.exe

# Retrieval fusion
CONV_TOPK = int(os.getenv("CONV_TOPK", "3"))
KB_TOPK = int(os.getenv("KB_TOPK", "2"))
INCLUDE_SOURCES = os.getenv("INCLUDE_SOURCES", "true").lower() in ("1", "true", "yes")
