import logging
from collections import defaultdict

from fastapi import APIRouter, HTTPException
from sudachipy import SplitMode

from app.models.schemas import (
    LyricsAnalyzeRequest,
    LyricsAnalyzeResponse,
    LyricsRhymeGroup,
    LyricsWord,
)
from app.services.phoneme import analyze_hiragana, katakana_to_hiragana
from app.services.tokenizer import get_tokenizer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lyrics", tags=["lyrics"])

EXCLUDED_POS = {"助詞", "助動詞", "記号", "空白", "補助記号"}

# Minimum vowel suffix length to consider as a rhyme
_MIN_RHYME_SUFFIX = 2


def _get_vowel_suffix(vowel_pattern: str, length: int = _MIN_RHYME_SUFFIX) -> str:
    """Extract the last N vowels from a pattern like 'o-u-o-u' → 'o-u'."""
    parts = vowel_pattern.split("-") if vowel_pattern else []
    if len(parts) < length:
        return ""
    return "-".join(parts[-length:])


def _find_rhyme_groups(words: list[LyricsWord]) -> list[LyricsRhymeGroup]:
    """Find groups of words that share the same vowel suffix (rhyme)."""
    suffix_to_words: dict[str, list[str]] = defaultdict(list)

    for word in words:
        if not word.vowel_pattern:
            continue
        suffix = _get_vowel_suffix(word.vowel_pattern)
        if suffix:
            suffix_to_words[suffix].append(word.surface)

    groups = []
    for suffix, group_words in suffix_to_words.items():
        if len(group_words) >= 2:
            groups.append(LyricsRhymeGroup(vowel_suffix=suffix, words=group_words))

    groups.sort(key=lambda g: len(g.words), reverse=True)
    return groups


@router.post("/analyze", response_model=LyricsAnalyzeResponse)
def analyze_lyrics(request: LyricsAnalyzeRequest) -> LyricsAnalyzeResponse:
    """Analyze lyrics text and extract words with vowel patterns.

    Uses SplitMode.B (middle units) for balanced granularity:
    - Proper nouns stay intact (東京, not 東+京)
    - Compound verbs stay intact (追いかける, not 追う+かける)
    - But over-merged tokens are split (東京の空 → 東京, の, 空)
    """
    try:
        tokenizer = get_tokenizer()
        tokens = tokenizer.tokenize(request.text, split_mode=SplitMode.B)

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
                logger.debug("Phoneme analysis failed for %s", token.surface)
                vowel_pattern = ""

            words.append(
                LyricsWord(
                    surface=token.surface,
                    reading=reading_hiragana,
                    dictionary_form=token.dictionary_form,
                    vowel_pattern=vowel_pattern,
                    pos=token.pos,
                )
            )

        rhyme_groups = _find_rhyme_groups(words)

        return LyricsAnalyzeResponse(
            words=words,
            rhyme_groups=rhyme_groups,
            total_words=len(tokens),
            unique_words=len(words),
        )
    except Exception as e:
        logger.exception("Lyrics analysis failed")
        raise HTTPException(status_code=500, detail="Analysis failed") from e
