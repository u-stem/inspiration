import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import LyricsAnalyzeRequest, LyricsAnalyzeResponse, LyricsWord
from app.services.phoneme import analyze_hiragana, katakana_to_hiragana
from app.services.tokenizer import get_tokenizer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lyrics", tags=["lyrics"])

EXCLUDED_POS = {"助詞", "助動詞", "記号", "空白", "補助記号"}


@router.post("/analyze", response_model=LyricsAnalyzeResponse)
def analyze_lyrics(request: LyricsAnalyzeRequest) -> LyricsAnalyzeResponse:
    """Analyze lyrics text and extract words with vowel patterns."""
    try:
        tokenizer = get_tokenizer()
        tokens = tokenizer.tokenize(request.text)

        words: list[LyricsWord] = []
        seen: set[str] = set()

        for token in tokens:
            if token.pos in EXCLUDED_POS:
                continue
            if token.surface in seen:
                continue
            seen.add(token.surface)

            reading_hiragana = katakana_to_hiragana(token.reading)
            try:
                analysis = analyze_hiragana(reading_hiragana)
                vowel_pattern = analysis.vowels
            except Exception:
                vowel_pattern = ""

            words.append(
                LyricsWord(
                    surface=token.surface,
                    reading=reading_hiragana,
                    vowel_pattern=vowel_pattern,
                    pos=token.pos,
                )
            )

        return LyricsAnalyzeResponse(
            words=words,
            total_words=len(tokens),
            unique_words=len(words),
        )
    except Exception as e:
        logger.exception("Lyrics analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}") from e
