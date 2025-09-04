from typing import List, Dict
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document


DEFAULT_SEPARATORS = [
    "\n\n", "\n", "。", "！", "？", ". ", "! ", "? ", "。", ".", "!", "?", " "
]


def preprocess_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.replace('\r', '')
    while '\n\n\n' in cleaned:
        cleaned = cleaned.replace('\n\n\n', '\n\n')
    cleaned = "\n".join(line.strip() for line in cleaned.split('\n'))
    return cleaned


def chunk_from_text(text: str, kb: str, file_name: str, chunk_size: int = 800, chunk_overlap: int = 150,
                    separators: List[str] = None, dedup: bool = True) -> List[Document]:
    processed = preprocess_text(text or "")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators or DEFAULT_SEPARATORS,
    )
    raw_chunks = splitter.split_text(processed)
    if dedup:
        seen, chunks = set(), []
        for c in raw_chunks:
            h = hash(c)
            if h in seen:
                continue
            seen.add(h)
            chunks.append(c)
    else:
        chunks = raw_chunks
    docs = [Document(page_content=c, metadata={"kb": kb, "file": file_name}) for c in chunks]
    return docs


def text_from_extracted(extracted: Dict) -> str:
    full = extracted.get("full_text") or ""
    if full:
        return full
    parts: List[str] = []
    for p in extracted.get("pages", []) or []:
        parts.append(p.get("content", ""))
    for p in extracted.get("paragraphs", []) or []:
        parts.append(p.get("content", ""))
    for s in extracted.get("slides", []) or []:
        parts.append(s.get("content", ""))
    return "\n".join(parts)

