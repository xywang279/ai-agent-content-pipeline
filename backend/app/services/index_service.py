import os
from typing import Dict, List, Optional
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from app.config import KB_VECTOR_DIR as VECTOR_DIR, EMBEDDING_MODEL


class IndexService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    def _vs_dir(self, kb: str) -> str:
        path = os.path.join(VECTOR_DIR, kb)
        os.makedirs(path, exist_ok=True)
        return path

    def _db(self, kb: str) -> Chroma:
        return Chroma(embedding_function=self.embeddings, persist_directory=self._vs_dir(kb))

    def upsert_docs(self, kb: str, docs: List[Document]) -> Dict:
        vs_dir = self._vs_dir(kb)
        if os.path.exists(os.path.join(vs_dir, "chroma.sqlite3")):
            db = self._db(kb)
            db.add_documents(docs)
            db.persist()
        else:
            db = Chroma.from_documents(docs, embedding=self.embeddings, persist_directory=vs_dir)
            db.persist()
        return {"chunks": len(docs)}

    def delete_file(self, kb: str, file_name: str) -> bool:
        try:
            db = self._db(kb)
            db.delete(where={"kb": kb, "file": file_name})
            db.persist()
            return True
        except Exception:
            return False

    def retriever(self, kb: str, k: int = 5):
        db = self._db(kb)
        return db.as_retriever(search_type="mmr", search_kwargs={"k": max(1, k)})

    def total_chunks(self, kb: str) -> int:
        try:
            db = self._db(kb)
            return getattr(db._collection, "count", lambda: 0)() or 0
        except Exception:
            return 0

    def count_file_chunks(self, kb: str, file_name: str) -> int:
        try:
            db = self._db(kb)
            got = db._collection.get(where={"kb": kb, "file": file_name}, include=["metadatas"])  # type: ignore
            ids = got.get("ids", []) if isinstance(got, dict) else []
            return len(ids)
        except Exception:
            return 0

    def rebuild(self, kb: str):
        vs_dir = self._vs_dir(kb)
        if os.path.exists(vs_dir):
            for root, dirs, files in os.walk(vs_dir, topdown=False):
                for n in files:
                    try:
                        os.remove(os.path.join(root, n))
                    except Exception:
                        pass
                for d in dirs:
                    try:
                        os.rmdir(os.path.join(root, d))
                    except Exception:
                        pass


index_service = IndexService()
