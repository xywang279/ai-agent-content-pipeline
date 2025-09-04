from typing import Dict
from app.services.file_service import FileService  # reuse existing robust extractors
from app.config import OCR_ENABLED
from app.services.ocr_service import ocr_pdf_to_text
import os


_fs = FileService()


def extract(path: str) -> Dict:
    """Extract text and structured content from file path.
    - Primary: delegate to existing FileService extractors
    - Fallback: if PDF and no text extracted, run OCR (if enabled)
    """
    data = _fs.extract_content(path)
    try:
        ext = os.path.splitext(path)[1].lower()
        full_text = (data or {}).get("full_text") or ""
        if OCR_ENABLED and ext == ".pdf" and len(full_text.strip()) == 0:
            ocr_text, page_texts = ocr_pdf_to_text(path)
            # merge into original structure
            data = data or {}
            data["full_text"] = ocr_text
            # if pages not present, create from OCR
            if not data.get("pages") and page_texts:
                data["pages"] = [{"page_number": i + 1, "content": t} for i, t in enumerate(page_texts)]
    except Exception:
        # If OCR fails, return original data silently
        pass
    return data
