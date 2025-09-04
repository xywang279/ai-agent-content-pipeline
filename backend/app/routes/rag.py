from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.rag_service import rag_service
from fastapi.responses import StreamingResponse
import io
import urllib.parse
import re
from pydantic import BaseModel
from pydantic import BaseModel


router = APIRouter(prefix="/rag", tags=["rag"])


class QueryRequest(BaseModel):
    question: str
    top_k: Optional[int] = 5


@router.post("/kb/{kb_name}/upload")
async def rag_upload(kb_name: str, file: UploadFile = File(...)):
    try:
        result = await rag_service.upload_to_kb(kb_name, file)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "上传失败"))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"知识库上传失败: {str(e)}")


@router.get("/kb/{kb_name}/status")
async def rag_status(kb_name: str):
    try:
        return rag_service.status(kb_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"知识库状态查询失败: {str(e)}")


@router.post("/kb/{kb_name}/query")
async def rag_query(kb_name: str, body: QueryRequest):
    try:
        return rag_service.query(kb_name, body.question, body.top_k or 5)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"知识库检索失败: {str(e)}")


@router.get("/kb/{kb_name}/docs")
async def rag_docs(kb_name: str):
    try:
        return {"kb": kb_name, "documents": rag_service.list_documents(kb_name)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"知识库文档列表失败: {str(e)}")


@router.delete("/kb/{kb_name}/docs/{file_name}")
async def rag_delete_doc(kb_name: str, file_name: str, keep_file: bool = False):
    try:
        return rag_service.delete_document(kb_name, file_name, keep_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除文档失败: {str(e)}")


@router.post("/kb/{kb_name}/rebuild")
async def rag_rebuild(kb_name: str):
    try:
        return rag_service.rebuild_index(kb_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重建索引失败: {str(e)}")


@router.get("/kb/{kb_name}/docs/{file_name}/preview")
async def rag_preview(kb_name: str, file_name: str, max_len: int = 1200):
    try:
        return rag_service.preview_document(kb_name, file_name, max_len=max_len)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预览失败: {str(e)}")


@router.post("/kb/{kb_name}/docs/{file_name}/summarize")
async def rag_summarize(kb_name: str, file_name: str):
    try:
        return await rag_service.summarize_document(kb_name, file_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成摘要失败: {str(e)}")


@router.get("/kb/{kb_name}/docs/{file_name}/segments")
async def rag_segments(kb_name: str, file_name: str, page: int = 1, page_size: int = 1, basis: str = "auto"):
    try:
        return rag_service.get_segments_paginated(kb_name, file_name, page=page, page_size=page_size, basis=basis)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分段失败: {str(e)}")


@router.get("/kb/{kb_name}/docs/{file_name}/download")
async def rag_download(kb_name: str, file_name: str, format: str = "txt"):
    try:
        data = rag_service.export_full_text(kb_name, file_name, as_markdown=(format == "md"))
        buf = io.BytesIO(data)
        ext = 'md' if format == 'md' else 'txt'
        filename = f"{file_name}.{ext}"
        # Ensure ASCII-only header via RFC5987 filename*
        quoted = urllib.parse.quote(filename)
        fallback = re.sub(r"[^A-Za-z0-9._-]", "_", filename)
        media = "text/markdown; charset=utf-8" if ext == 'md' else "text/plain; charset=utf-8"
        return StreamingResponse(
            buf,
            media_type=media,
            headers={
                "Content-Disposition": f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quoted}"
            },
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")


@router.get("/kb/{kb_name}/docs/{file_name}/summary/export")
async def rag_export_summary(kb_name: str, file_name: str, format: str = "txt"):
    try:
        summary = await rag_service.summarize_document(kb_name, file_name)
        data = rag_service.export_summary_text(summary, as_markdown=(format == "md"))
        buf = io.BytesIO(data)
        ext = 'md' if format == 'md' else 'txt'
        filename = f"{file_name}.summary.{ext}"
        quoted = urllib.parse.quote(filename)
        fallback = re.sub(r"[^A-Za-z0-9._-]", "_", filename)
        media = "text/markdown; charset=utf-8" if ext == 'md' else "text/plain; charset=utf-8"
        return StreamingResponse(
            buf,
            media_type=media,
            headers={
                "Content-Disposition": f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quoted}"
            },
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出摘要失败: {str(e)}")


class IngestExistingRequest(BaseModel):
    file_path: str
    file_name: str


@router.post("/kb/{kb_name}/ingest_existing")
async def rag_ingest_existing(kb_name: str, body: IngestExistingRequest):
    try:
        return rag_service.ingest_file_path(kb_name, body.file_path, body.file_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"加入知识库失败: {str(e)}")


# ===== KB Management =====
class KBCreate(BaseModel):
    name: str

class KBRename(BaseModel):
    new_name: str


@router.get("/kb")
async def kb_list():
    return {"kbs": rag_service.list_kbs()}


@router.post("/kb")
async def kb_create(body: KBCreate):
    try:
        return rag_service.create_kb(body.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建知识库失败: {str(e)}")


@router.delete("/kb/{kb_name}")
async def kb_delete(kb_name: str):
    try:
        return rag_service.delete_kb(kb_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除知识库失败: {str(e)}")


@router.post("/kb/{kb_name}/rename")
async def kb_rename(kb_name: str, body: KBRename):
    try:
        return rag_service.rename_kb(kb_name, body.new_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (ValueError, FileExistsError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重命名知识库失败: {str(e)}")
