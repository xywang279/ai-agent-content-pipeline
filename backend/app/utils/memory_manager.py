# app/utils/memory_manager.py
from typing import List, Optional
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
import os

class MemoryManager:
    def __init__(self, persist_dir="faiss_index"):
        self.embeddings = HuggingFaceEmbeddings( model_name="shibing624/text2vec-base-chinese")
        self.persist_dir = persist_dir
        self.vectorstore = None
        self.splitter = RecursiveCharacterTextSplitter(
                        chunk_size=800,
                        chunk_overlap=120,
                        separators=["\n\n", "\n", "。", "！", "？", ";", " "]
                        )

    def create_or_load(self):
        if os.path.exists(self.persist_dir) and os.listdir(self.persist_dir):
        # 加载本地索引时允许反序列化
            self.vectorstore = FAISS.load_local(
                self.persist_dir,
                self.embeddings,
                allow_dangerous_deserialization=True
            )
        else:
            self.vectorstore = None
        return self.vectorstore
    def _ensure_store(self):
        if self.vectorstore is None:
            self.create_or_load()
        
    def add_texts(self, texts):
        self._ensure_store()
        docs = [Document(page_content=t) for t in texts]
        if not docs:
            return
        # 切块后再入库
        chunks = self.splitter.split_documents(docs)

        if self.vectorstore is None:
        # 首次创建
            self.vectorstore = FAISS.from_documents(docs, self.embeddings)
        else:
            self.vectorstore.add_documents(chunks)
        
        self.vectorstore.save_local(self.persist_dir)

    def add_urls(self, urls: List[str]):
        urls = [u for u in urls if u and u.strip()]
        if not urls:
            return
        loader = WebBaseLoader(urls)
        docs = loader.load()
        texts = [d.page_content for d in docs]
        self.add_texts(texts)

    def search(self, query, k=5):
        self._ensure_store()
        if self.vectorstore is None:
            return []
        return self.vectorstore.similarity_search(query, k=k)
    
    def as_retriever(self, k: int = 5):
        self._ensure_store()
        if self.vectorstore is None:
            return None
        return self.vectorstore.as_retriever(search_kwargs={"k": k})
