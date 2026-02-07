import importlib.util
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.models.schemas import IndexUpdateResponse, PatternAnalyzeResponse
from app.services.phoneme import is_hiragana
from app.services.rhyme import get_rhyme_index
from app.services.search_utils import analyze_reading as _analyze_reading

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rhyme", tags=["rhyme"])


@router.get("/analyze", response_model=PatternAnalyzeResponse)
def analyze_reading(reading: str = Query(..., min_length=1)) -> PatternAnalyzeResponse:
    """Analyze hiragana reading and return phoneme information."""
    if not is_hiragana(reading):
        raise HTTPException(
            status_code=400,
            detail="Reading must be hiragana only",
        )

    try:
        return _analyze_reading(reading)
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}") from e


def _import_build_index():
    """Import build_index module using importlib to avoid sys.path manipulation."""
    script_path = Path(__file__).parent.parent.parent / "scripts" / "build_index.py"
    spec = importlib.util.spec_from_file_location("build_index", script_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load module from {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@router.post("/update-index", response_model=IndexUpdateResponse)
def update_index_endpoint(
    download: bool = Query(default=False, description="NEologdシードデータを再ダウンロードするか"),
) -> IndexUpdateResponse:
    """インデックスを差分更新する（新規単語のみ追加）"""
    try:
        build_index = _import_build_index()

        if download:
            success = build_index.download_neologd_seed()
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail="NEologdシードデータのダウンロードに失敗しました",
                )

        result = build_index.update_index(settings.index_path)

        # インデックスキャッシュをクリア
        get_rhyme_index.cache_clear()

        if result["added"] == 0:
            message = "新しい単語はありませんでした"
        else:
            message = f"{result['added']}件の新しい単語を追加しました"

        return IndexUpdateResponse(
            added=result["added"],
            total=result["total"],
            message=message,
        )

    except ImportError as e:
        logger.exception("Failed to import build_index module")
        raise HTTPException(
            status_code=500,
            detail=f"build_indexモジュールのインポートに失敗: {e}",
        ) from e
    except Exception as e:
        logger.exception("Index update failed")
        raise HTTPException(
            status_code=500,
            detail=f"インデックス更新に失敗: {e}",
        ) from e
