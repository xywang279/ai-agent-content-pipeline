import os
import io
from typing import Dict, List
from fastapi import UploadFile
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

from app.utils.llm_helper import llm_helper
from app.services import storage_service, extraction_service, chunking_service
from app.services.index_service import index_service
from app.config import KB_UPLOADS_DIR, KB_VECTOR_DIR


class RAGService:
    def __init__(self):
        self.kb_root = KB_UPLOADS_DIR
        self.vector_root = KB_VECTOR_DIR
        os.makedirs(self.kb_root, exist_ok=True)
        os.makedirs(self.vector_root, exist_ok=True)
        # 复用现有 FileService 支持格式
        from app.services.file_service import file_service as _fs
        self.supported_formats = _fs.supported_formats

    def _kb_dir(self, kb_name: str) -> str:
        return storage_service.kb_dir(kb_name)

    def _vs_dir(self, kb_name: str) -> str:
        return index_service._vs_dir(kb_name)  # type: ignore

    # ===== KB Management =====
    def list_kbs(self) -> List[Dict]:
        kbs = []
        if not os.path.exists(self.kb_root):
            return kbs
        for name in sorted(os.listdir(self.kb_root)):
            kb_dir = os.path.join(self.kb_root, name)
            if not os.path.isdir(kb_dir):
                continue
            files = [f for f in os.listdir(kb_dir) if os.path.isfile(os.path.join(kb_dir, f))]
            size = 0
            for f in files:
                try:
                    size += os.path.getsize(os.path.join(kb_dir, f))
                except Exception:
                    pass
            chunks = index_service.total_chunks(name)
            kbs.append({"name": name, "documents": len(files), "chunks": chunks, "size": size})
        return kbs

    def create_kb(self, kb_name: str) -> Dict:
        if not kb_name or any(c in kb_name for c in "\\/:*?\"<>|"):
            raise ValueError("非法的知识库名称")
        os.makedirs(self._kb_dir(kb_name), exist_ok=True)
        os.makedirs(self._vs_dir(kb_name), exist_ok=True)
        return {"success": True, "name": kb_name}

    def delete_kb(self, kb_name: str) -> Dict:
        import shutil
        kb_dir = os.path.join(self.kb_root, kb_name)
        vs_dir = os.path.join(self.vector_root, kb_name)
        ok = True
        try:
            if os.path.exists(kb_dir):
                shutil.rmtree(kb_dir, ignore_errors=True)
            if os.path.exists(vs_dir):
                shutil.rmtree(vs_dir, ignore_errors=True)
        except Exception:
            ok = False
        return {"success": ok, "name": kb_name}

    def rename_kb(self, old_name: str, new_name: str) -> Dict:
        if not new_name or any(c in new_name for c in "\\/:*?\"<>|"):
            raise ValueError("非法的新名称")
        old_kb = os.path.join(self.kb_root, old_name)
        old_vs = os.path.join(self.vector_root, old_name)
        new_kb = os.path.join(self.kb_root, new_name)
        new_vs = os.path.join(self.vector_root, new_name)
        if not os.path.exists(old_kb):
            raise FileNotFoundError("知识库不存在")
        if os.path.exists(new_kb):
            raise FileExistsError("目标名称已存在")
        os.rename(old_kb, new_kb)
        if os.path.exists(old_vs):
            os.rename(old_vs, new_vs)
        else:
            os.makedirs(new_vs, exist_ok=True)
        return {"success": True, "old": old_name, "new": new_name}

    async def upload_to_kb(self, kb_name: str, file: UploadFile) -> Dict:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in self.supported_formats:
            return {"success": False, "error": f"不支持的文件格式: {ext}"}
        # Save
        save_path = storage_service.save_to_kb(kb_name, file)
        # Extract + chunk
        extracted = extraction_service.extract(save_path)
        full_text = chunking_service.text_from_extracted(extracted)
        docs = chunking_service.chunk_from_text(full_text, kb_name, file.filename)
        # Upsert
        index_service.upsert_docs(kb_name, docs)
        return {"success": True, "file_name": file.filename, "kb": kb_name, "chunks": len(docs), "size": os.path.getsize(save_path)}

    def status(self, kb_name: str) -> Dict:
        try:
            count = index_service.total_chunks(kb_name)
            return {"kb": kb_name, "doc_chunks": count, "ready": True}
        except Exception:
            return {"kb": kb_name, "doc_chunks": 0, "ready": False}

    def query(self, kb_name: str, question: str, top_k: int = 5) -> Dict:
        retriever = index_service.retriever(kb_name, top_k)
        prompt_str = """
你是一个检索增强问答助手。请严格依据提供的知识片段回答问题。
若无法从知识片段中得到答案，回复："根据现有知识无法回答该问题"。

上下文：
{context}

问题：{question}
"""
        chain = RetrievalQA.from_chain_type(
            llm=llm_helper.llm,
            chain_type="stuff",
            retriever=retriever,
            chain_type_kwargs={
                "prompt": PromptTemplate(template=prompt_str, input_variables=["context", "question"]) 
            },
            return_source_documents=True
        )
        result = chain({"query": question})
        return {
            "answer": result.get("result", ""),
            "sources": [{"content": d.page_content[:300], "metadata": d.metadata} for d in result.get("source_documents", [])]
        }

    def list_documents(self, kb_name: str) -> List[Dict]:
        files = []
        for item in storage_service.list_kb_files(kb_name):
            files.append({
                "file_name": item["file_name"],
                "size": item["size"],
                "created": item["created"],
                "chunks": index_service.count_file_chunks(kb_name, item["file_name"]),
            })
        return files

    def delete_document(self, kb_name: str, file_name: str, keep_file: bool = False) -> Dict:
        removed_vectors = index_service.delete_file(kb_name, file_name)
        removed_file = True
        if not keep_file:
            removed_file = storage_service.delete_kb_file(kb_name, file_name)
        return {"success": True, "kb": kb_name, "file": file_name, "removed_file": removed_file, "removed_vectors": removed_vectors}

    def rebuild_index(self, kb_name: str) -> Dict:
        index_service.rebuild(kb_name)
        total_files = 0
        total_chunks = 0
        for item in storage_service.list_kb_files(kb_name):
            try:
                extracted = extraction_service.extract(item["path"])
                text = chunking_service.text_from_extracted(extracted)
                docs = chunking_service.chunk_from_text(text, kb_name, item["file_name"])
                index_service.upsert_docs(kb_name, docs)
                total_files += 1
                total_chunks += len(docs)
            except Exception:
                continue
        return {"success": True, "kb": kb_name, "files": total_files, "chunks": total_chunks}

    def ingest_file_path(self, kb_name: str, file_path: str, file_name: str) -> Dict:
        """Ingest an existing file on disk into a KB (used for joining chat files to KB)."""
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise FileNotFoundError("文件不存在")
        extracted = extraction_service.extract(file_path)
        text = chunking_service.text_from_extracted(extracted)
        docs = chunking_service.chunk_from_text(text, kb_name, file_name)
        index_service.upsert_docs(kb_name, docs)
        return {"success": True, "kb": kb_name, "file": file_name, "chunks": len(docs)}

    def preview_document(self, kb_name: str, file_name: str, max_len: int = 1200) -> Dict:
        kb_dir = self._kb_dir(kb_name)
        fpath = os.path.join(kb_dir, file_name)
        if not os.path.exists(fpath) or not os.path.isfile(fpath):
            raise FileNotFoundError("文档不存在")
        extracted = extraction_service.extract(fpath)
        full_text = extracted.get("full_text") or ""
        if not full_text:
            parts: List[str] = []
            for p in extracted.get("pages", []) or []:
                parts.append(p.get("content", ""))
            for p in extracted.get("paragraphs", []) or []:
                parts.append(p.get("content", ""))
            for s in extracted.get("slides", []) or []:
                parts.append(s.get("content", ""))
            full_text = "\n".join(parts)
        snippet = full_text[:max_len]
        meta = {
            "paragraphs": len(extracted.get("paragraphs", [])),
            "pages": len(extracted.get("pages", [])),
            "slides": len(extracted.get("slides", [])),
            "has_tables": bool(extracted.get("tables")),
            "total_length": len(full_text),
        }
        return {"file": file_name, "kb": kb_name, "preview": snippet, "meta": meta}

    async def summarize_document(self, kb_name: str, file_name: str) -> Dict:
        kb_dir = self._kb_dir(kb_name)
        fpath = os.path.join(kb_dir, file_name)
        if not os.path.exists(fpath) or not os.path.isfile(fpath):
            raise FileNotFoundError("文档不存在")
        extracted = extraction_service.extract(fpath)
        try:
            size = os.path.getsize(fpath)
            ext = os.path.splitext(fpath)[1].lower()
        except Exception:
            size, ext = None, None
        file_info = {"file_name": file_name, "file_size": size, "file_format": ext}
        from app.services.analysis_service import analyze
        analysis = await analyze(extracted, file_info)
        return {
            "file": file_name,
            "kb": kb_name,
            "statistics": analysis.get("statistics", {}),
            "keywords": analysis.get("keywords", []),
            "summaries": analysis.get("summaries", {}),
        }

    def _extract_all_text(self, kb_name: str, file_name: str) -> str:
        kb_dir = self._kb_dir(kb_name)
        fpath = os.path.join(kb_dir, file_name)
        if not os.path.exists(fpath) or not os.path.isfile(fpath):
            raise FileNotFoundError("文档不存在")
        extracted = extraction_service.extract(fpath)
        full_text = extracted.get("full_text") or ""
        if not full_text:
            parts: List[str] = []
            for p in extracted.get("pages", []) or []:
                parts.append(p.get("content", ""))
            for p in extracted.get("paragraphs", []) or []:
                parts.append(p.get("content", ""))
            for s in extracted.get("slides", []) or []:
                parts.append(s.get("content", ""))
            full_text = "\n".join(parts)
        return full_text

    def get_segments(self, kb_name: str, file_name: str, basis: str = "auto") -> Dict:
        kb_dir = self._kb_dir(kb_name)
        fpath = os.path.join(kb_dir, file_name)
        if not os.path.exists(fpath) or not os.path.isfile(fpath):
            raise FileNotFoundError("文档不存在")
        extracted = extraction_service.extract(fpath)
        segments: List[str] = []
        if basis == "pages" or (basis == "auto" and extracted.get("pages")):
            segments = [p.get("content", "") for p in extracted.get("pages", [])]
        elif basis == "paragraphs" or (basis == "auto" and extracted.get("paragraphs")):
            segments = [p.get("content", "") for p in extracted.get("paragraphs", [])]
        elif basis == "slides" or (basis == "auto" and extracted.get("slides")):
            segments = [s.get("content", "") for s in extracted.get("slides", [])]
        else:
            text = extracted.get("full_text") or ""
            if not text:
                text = self._extract_all_text(kb_name, file_name)
            segments = [s.strip() for s in text.split("\n\n") if s.strip()]
        return {"total": len(segments), "segments": segments}

    def get_segments_paginated(self, kb_name: str, file_name: str, page: int = 1, page_size: int = 1, basis: str = "auto") -> Dict:
        all_seg = self.get_segments(kb_name, file_name, basis=basis)
        total = all_seg["total"]
        if page_size <= 0:
            page_size = 1
        pages = (total + page_size - 1) // page_size if total else 1
        page = max(1, min(page, pages))
        start = (page - 1) * page_size
        end = start + page_size
        items = all_seg["segments"][start:end]
        return {"page": page, "page_size": page_size, "total": total, "pages": pages, "items": items}

    def export_full_text(self, kb_name: str, file_name: str, as_markdown: bool = False) -> bytes:
        text = self._extract_all_text(kb_name, file_name)
        content = text
        if as_markdown:
            content = f"# {file_name}\n\n" + text
        return content.encode("utf-8")

    def export_summary_text(self, summary: Dict, as_markdown: bool = False) -> bytes:
        lines: List[str] = []
        title = f"文档摘要 - {summary.get('file', '')}"
        if as_markdown:
            lines.append(f"# {title}")
        else:
            lines.append(title)
        stats = summary.get("statistics", {})
        lines.append(f"字数: {stats.get('character_count', '-')}, 段落: {stats.get('paragraph_count', '-')}")
        sums = summary.get("summaries", {})
        if sums.get("summary_100"):
            lines.append("")
            lines.append("【100字摘要】")
            lines.append(sums.get("summary_100", ""))
        if sums.get("summary_300"):
            lines.append("")
            lines.append("【300字摘要】")
            lines.append(sums.get("summary_300", ""))
        if sums.get("llm_summary"):
            lines.append("")
            lines.append("【LLM摘要】")
            lines.append(sums.get("llm_summary", ""))
        text = "\n".join(lines)
        return text.encode("utf-8")


rag_service = RAGService()
