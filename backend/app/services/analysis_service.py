from typing import Dict
from app.services.file_service import FileService


_fs = FileService()


async def analyze(extracted: Dict, file_info: Dict) -> Dict:
    """Reuse existing FileService.analyze_content for consistent behavior."""
    return await _fs.analyze_content(extracted, file_info)

