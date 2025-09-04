import os
from typing import List, Tuple

from app.config import OCR_ENABLED, OCR_LANGS, PDF_OCR_DPI, POPPLER_PATH, TESSERACT_CMD

# Lazy imports to avoid hard dependency when OCR is disabled
try:
    import pytesseract  # type: ignore
    from pdf2image import convert_from_path  # type: ignore
except Exception:  # pragma: no cover
    pytesseract = None  # type: ignore
    convert_from_path = None  # type: ignore


def _ensure_ocr_ready() -> None:
    if not OCR_ENABLED:
        raise RuntimeError("OCR is disabled by configuration")
    if pytesseract is None or convert_from_path is None:
        raise RuntimeError("OCR dependencies are not installed (pytesseract/pdf2image)")
    # Optional: set explicit tesseract path if provided
    if TESSERACT_CMD:
        try:
            import pytesseract as _pt
            _pt.pytesseract.tesseract_cmd = TESSERACT_CMD
        except Exception:
            pass


def ocr_pdf_to_text(pdf_path: str, dpi: int = None, langs: str = None) -> Tuple[str, List[str]]:
    """OCR a (scanned) PDF into text.
    Returns (full_text, page_texts).
    """
    _ensure_ocr_ready()
    dpi = dpi or PDF_OCR_DPI
    langs = langs or OCR_LANGS

    pages = convert_from_path(pdf_path, dpi=dpi, poppler_path=POPPLER_PATH or None)  # type: ignore
    page_texts: List[str] = []
    for img in pages:
        txt = pytesseract.image_to_string(img, lang=langs)  # type: ignore
        page_texts.append(txt.strip())
    full_text = "\n".join(page_texts)
    return full_text, page_texts

