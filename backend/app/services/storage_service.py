import os
from typing import Dict, List
from fastapi import UploadFile
from app.config import KB_UPLOADS_DIR


def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def kb_dir(kb_name: str) -> str:
    path = os.path.join(KB_UPLOADS_DIR, kb_name)
    _ensure_dir(path)
    return path


def save_to_kb(kb_name: str, file: UploadFile) -> str:
    """Save an UploadFile to KB folder and return absolute path."""
    folder = kb_dir(kb_name)
    save_path = os.path.join(folder, file.filename)
    content = file.file.read() if hasattr(file, 'file') else None
    if content is None or len(content) == 0:
        # Fallback to await read in async context caller; but try .read()
        content = getattr(file, 'read', lambda: b"")()
    with open(save_path, "wb") as f:
        f.write(content)
    return save_path


def list_kb_files(kb_name: str) -> List[Dict]:
    folder = kb_dir(kb_name)
    if not os.path.exists(folder):
        return []
    items = []
    for name in sorted(os.listdir(folder)):
        fpath = os.path.join(folder, name)
        if not os.path.isfile(fpath):
            continue
        try:
            created = int(os.path.getctime(fpath))
        except Exception:
            created = None
        items.append({
            "file_name": name,
            "size": os.path.getsize(fpath),
            "created": created,
            "path": fpath,
        })
    return items


def delete_kb_file(kb_name: str, file_name: str) -> bool:
    fpath = os.path.join(kb_dir(kb_name), file_name)
    if os.path.exists(fpath) and os.path.isfile(fpath):
        try:
            os.remove(fpath)
            return True
        except Exception:
            return False
    return False
