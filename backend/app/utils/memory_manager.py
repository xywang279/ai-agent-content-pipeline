from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
import os

class MemoryManager:
    def __init__(self, persist_dir="faiss_index"):
        self.embeddings = HuggingFaceEmbeddings( model_name="shibing624/text2vec-base-chinese")
        self.persist_dir = persist_dir
        self.vectorstore = None

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

    def add_texts(self, texts):
        docs = [Document(page_content=t) for t in texts]
        if self.vectorstore is None:
        # 首次创建
            self.vectorstore = FAISS.from_documents(docs, self.embeddings)
        else:
            self.vectorstore.add_documents(docs)
        
        self.vectorstore.save_local(self.persist_dir)

    def search(self, query, k=5):
        if self.vectorstore is None:
            self.create_or_load()
        return self.vectorstore.similarity_search(query, k=k)
