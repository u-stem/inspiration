import importlib.util
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.models.schemas import (
    EnglishRhymeResult,
    EnglishSearchRequest,
    EnglishSearchResponse,
    IndexUpdateResponse,
    PatternAnalyzeResponse,
    PatternRhymeResult,
    PatternSearchRequest,
    PatternSearchResponse,
    Phoneme,
)
from app.services.english_rhyme import get_english_rhyme_index
from app.services.pattern import PatternMatcher
from app.services.phoneme import (
    analyze_hiragana,
    extract_phonemes_detailed,
    hiragana_to_katakana,
    is_hiragana,
    katakana_to_hiragana,
)
from app.services.rhyme import get_rhyme_index

logger = logging.getLogger(__name__)

# Pattern search retrieves candidates before detailed matching
MAX_PATTERN_SEARCH_CANDIDATES = 100000

router = APIRouter(prefix="/rhyme", tags=["rhyme"])


def _get_index():
    return get_rhyme_index(settings.index_path)


def _get_english_index():
    return get_english_rhyme_index(settings.english_index_path)


def _analyze_reading(reading: str) -> PatternAnalyzeResponse:
    """Analyze hiragana reading and return phoneme info."""
    katakana = hiragana_to_katakana(reading)
    phonemes_raw = extract_phonemes_detailed(katakana)
    analysis = analyze_hiragana(reading)

    phonemes = [
        Phoneme(
            consonant=p.consonant,
            vowel=p.vowel or "",
            display=katakana_to_hiragana(p.display),
        )
        for p in phonemes_raw
        if p.vowel is not None or p.consonant == "Q"
    ]

    return PatternAnalyzeResponse(
        reading=reading,
        phonemes=phonemes,
        vowel_pattern=analysis.vowels,
        consonant_pattern=analysis.consonants,
    )


def _word_priority(word: str) -> tuple[int, int]:
    """Calculate word priority for sorting (kanji preferred, shorter preferred)."""
    has_kanji = any("\u4e00" <= c <= "\u9fff" for c in word)
    has_hiragana = any("\u3040" <= c <= "\u309f" for c in word)
    has_katakana = any("\u30a0" <= c <= "\u30ff" for c in word)
    noise_symbols = (
        "()（）「」『』【】・#＃&＆@＠!！?？*＊%％^＾~〜_＿"
        "+=<>《》-－―─—.．:：;；,'\"'、。○●☆★♪♯♭"
    )
    has_symbol = any(c in noise_symbols for c in word)
    has_digit = any(c.isdigit() for c in word)
    has_alpha = any(c.isascii() and c.isalpha() for c in word)

    length_penalty = -len(word)

    if has_symbol:
        return (-2, length_penalty)
    if has_digit or has_alpha:
        return (-1, length_penalty)

    if has_kanji and not has_hiragana and not has_katakana:
        type_priority = 5
    elif has_kanji and has_hiragana and not has_katakana:
        type_priority = 4
    elif has_hiragana and not has_katakana:
        type_priority = 3
    elif has_kanji or has_hiragana:
        type_priority = 2
    else:
        type_priority = 1

    if type_priority > 1:
        if len(word) == 1:
            type_priority += 5
        elif len(word) <= 3:
            type_priority += 2

    return (type_priority, length_penalty)


def _extract_patterns(parsed) -> tuple[str | None, str | None, bool, bool]:
    """Extract vowel and consonant patterns from parsed pattern for SQL pre-filtering.

    Returns:
        Tuple of (vowel_pattern, consonant_pattern, is_prefix, is_suffix)
    """
    if not parsed.phoneme_patterns:
        return None, None, False, False

    # Extract vowels and consonants
    vowels = []
    consonants = []
    has_vowel_wildcard = False
    has_consonant_wildcard = False

    for p in parsed.phoneme_patterns:
        # Handle vowels
        if p.vowel is not None:
            if has_vowel_wildcard:
                break  # Stop at first wildcard
            vowels.append(p.vowel)
        else:
            has_vowel_wildcard = True
            if vowels:
                break

        # Handle consonants (only if vowel is also fixed)
        # Skip empty consonants as DB stores only non-empty consonants
        if p.consonant is not None and not has_vowel_wildcard:
            if p.consonant:  # Only add non-empty consonants
                consonants.append(p.consonant)
        else:
            has_consonant_wildcard = True

    is_suffix = parsed.prefix_wildcard and not parsed.suffix_wildcard  # *pattern
    is_prefix = not parsed.prefix_wildcard and parsed.suffix_wildcard  # pattern*

    vowel_pattern = "-".join(vowels) if vowels else None
    # Only use consonant pattern if all consonants are fixed (no wildcards)
    consonant_pattern = "-".join(consonants) if consonants and not has_consonant_wildcard else None

    return vowel_pattern, consonant_pattern, is_prefix, is_suffix


@router.post("/search", response_model=PatternSearchResponse)
def search_rhymes(request: PatternSearchRequest) -> PatternSearchResponse:
    """Pattern-based rhyme search.

    Accepts hiragana reading and a pattern string.
    Pattern syntax:
    - * : Any length (0 or more phonemes)
    - _ : Any single phoneme
    - Direct phoneme chars: a, i, u, e, o for vowels; k, s, t, etc. for consonants
    """
    # Validate input is hiragana
    if not is_hiragana(request.reading):
        raise HTTPException(
            status_code=400,
            detail="Reading must be hiragana only",
        )

    try:
        index = _get_index()
        matcher = PatternMatcher()
        parsed = matcher.parse(request.pattern)

        # Get input analysis
        input_analysis = _analyze_reading(request.reading)

        # Extract patterns for SQL pre-filtering
        vowel_pattern, consonant_pattern, is_prefix, is_suffix = _extract_patterns(parsed)

        # Search with SQL pre-filtering
        candidates = index.search_by_pattern(
            vowel_pattern=vowel_pattern,
            consonant_pattern=consonant_pattern,
            prefix=is_prefix,
            suffix=is_suffix,
            limit=MAX_PATTERN_SEARCH_CANDIDATES,
        )

        matches: list[tuple[int, tuple[int, int], Any]] = []  # (score, priority, entry)

        for entry in candidates:
            is_match, score = matcher.match(entry, parsed)
            if is_match:
                priority = _word_priority(entry.word)
                matches.append((score, priority, entry))

        # Sort by relevance (priority first, then score)
        from app.models.schemas import SortOrder

        if request.sort == SortOrder.RELEVANCE:
            matches.sort(key=lambda x: (x[1][0], x[1][1], x[0]), reverse=True)
        elif request.sort == SortOrder.READING_ASC:
            matches.sort(key=lambda x: x[2].reading)
        elif request.sort == SortOrder.READING_DESC:
            matches.sort(key=lambda x: x[2].reading, reverse=True)
        elif request.sort == SortOrder.MORA_ASC:
            matches.sort(key=lambda x: (x[2].mora_count, x[2].reading))
        elif request.sort == SortOrder.MORA_DESC:
            matches.sort(key=lambda x: (-x[2].mora_count, x[2].reading))

        total = len(matches)
        page_matches = matches[request.offset : request.offset + request.limit]

        # Convert to response format
        results = []
        for score, _, entry in page_matches:
            phonemes_raw = extract_phonemes_detailed(entry.reading)
            phonemes = [
                Phoneme(
                    consonant=p.consonant,
                    vowel=p.vowel or "",
                    display=katakana_to_hiragana(p.display),
                )
                for p in phonemes_raw
                if p.vowel is not None or p.consonant == "Q"
            ]
            results.append(
                PatternRhymeResult(
                    word=entry.word,
                    reading=katakana_to_hiragana(entry.reading),
                    phonemes=phonemes,
                    vowel_pattern=entry.vowels,
                    consonant_pattern=entry.consonants,
                    mora_count=entry.mora_count,
                    score=score,
                )
            )

        page = (request.offset // request.limit) + 1
        total_pages = (total + request.limit - 1) // request.limit if total > 0 else 1

        return PatternSearchResponse(
            input=input_analysis,
            pattern=request.pattern,
            results=results,
            total=total,
            page=page,
            per_page=request.limit,
            total_pages=total_pages,
        )

    except Exception as e:
        logger.exception("Search failed")
        raise HTTPException(status_code=500, detail=f"Search failed: {e}") from e


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


@router.post("/search/english", response_model=EnglishSearchResponse)
def search_english_rhymes(request: EnglishSearchRequest) -> EnglishSearchResponse:
    """Search for English words that rhyme with Japanese input.

    Accepts hiragana reading and a pattern string.
    Returns English words with matching vowel patterns.
    """
    # Validate input is hiragana
    if not is_hiragana(request.reading):
        raise HTTPException(
            status_code=400,
            detail="Reading must be hiragana only",
        )

    try:
        english_index = _get_english_index()
        matcher = PatternMatcher()
        parsed = matcher.parse(request.pattern)

        # Get input analysis
        input_analysis = _analyze_reading(request.reading)

        # Extract patterns for SQL pre-filtering
        vowel_pattern, consonant_pattern, is_prefix, is_suffix = _extract_patterns(parsed)

        # Search English index
        candidates = english_index.search_by_pattern(
            vowel_pattern=vowel_pattern,
            consonant_pattern=consonant_pattern,
            prefix=is_prefix,
            suffix=is_suffix,
            limit=MAX_PATTERN_SEARCH_CANDIDATES,
        )

        # Score and filter matches
        matches: list[tuple[int, str, Any]] = []  # (score, word, entry)

        for entry in candidates:
            # Create a simple entry-like object for the matcher
            # We use vowels and consonants directly
            score = _calculate_english_match_score(entry, parsed)
            if score > 0:
                matches.append((score, entry.word, entry))

        # Sort by score (higher is better), then alphabetically
        from app.models.schemas import SortOrder

        if request.sort == SortOrder.RELEVANCE:
            matches.sort(key=lambda x: (-x[0], x[1]))
        elif request.sort == SortOrder.READING_ASC:
            matches.sort(key=lambda x: x[1])
        elif request.sort == SortOrder.READING_DESC:
            matches.sort(key=lambda x: x[1], reverse=True)
        elif request.sort == SortOrder.MORA_ASC:
            matches.sort(key=lambda x: (x[2].syllable_count, x[1]))
        elif request.sort == SortOrder.MORA_DESC:
            matches.sort(key=lambda x: (-x[2].syllable_count, x[1]))

        total = len(matches)
        page_matches = matches[request.offset : request.offset + request.limit]

        # Convert to response format
        results = []
        for score, _, entry in page_matches:
            results.append(
                EnglishRhymeResult(
                    word=entry.word,
                    pronunciation=entry.pronunciation,
                    katakana=entry.katakana,
                    vowel_pattern=entry.vowels,
                    consonant_pattern=entry.consonants,
                    syllable_count=entry.syllable_count,
                    score=score,
                )
            )

        page = (request.offset // request.limit) + 1
        total_pages = (total + request.limit - 1) // request.limit if total > 0 else 1

        return EnglishSearchResponse(
            input=input_analysis,
            pattern=request.pattern,
            results=results,
            total=total,
            page=page,
            per_page=request.limit,
            total_pages=total_pages,
        )

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail="English rhyme index not available. Please build it first.",
        ) from e
    except Exception as e:
        logger.exception("English search failed")
        raise HTTPException(status_code=500, detail=f"Search failed: {e}") from e


def _calculate_english_match_score(entry, parsed) -> int:
    """Calculate match score for an English entry against a parsed pattern.

    Uses vowel pattern matching similar to Japanese matcher.
    """
    entry_vowels = entry.vowels.split("-") if entry.vowels else []

    # Extract pattern vowels
    pattern_vowels = []
    for p in parsed.phoneme_patterns:
        if p.vowel is not None:
            # Handle diphthongs (e.g., "a-i" as single pattern element)
            pattern_vowels.append(p.vowel)

    if not pattern_vowels:
        return 0

    # Check suffix match (most common for rhymes)
    if parsed.prefix_wildcard and not parsed.suffix_wildcard:
        # *pattern - match at end
        if len(entry_vowels) < len(pattern_vowels):
            return 0

        # Check if entry ends with pattern
        entry_suffix = entry_vowels[-len(pattern_vowels):]
        match_count = sum(
            1 for e, p in zip(entry_suffix, pattern_vowels, strict=True)
            if e == p or p is None
        )

        if match_count == len(pattern_vowels):
            # Full match - score based on pattern length
            return min(100, 50 + match_count * 10)
        return 0

    # Check prefix match
    if not parsed.prefix_wildcard and parsed.suffix_wildcard:
        # pattern* - match at start
        if len(entry_vowels) < len(pattern_vowels):
            return 0

        entry_prefix = entry_vowels[:len(pattern_vowels)]
        match_count = sum(
            1 for e, p in zip(entry_prefix, pattern_vowels, strict=True)
            if e == p or p is None
        )

        if match_count == len(pattern_vowels):
            return min(100, 50 + match_count * 10)
        return 0

    # Exact match
    if not parsed.prefix_wildcard and not parsed.suffix_wildcard:
        if len(entry_vowels) != len(pattern_vowels):
            return 0

        match_count = sum(
            1 for e, p in zip(entry_vowels, pattern_vowels, strict=True)
            if e == p or p is None
        )
        if match_count == len(pattern_vowels):
            return 100
        return 0

    # Contains match
    if parsed.prefix_wildcard and parsed.suffix_wildcard:
        # *pattern* - contains
        for i in range(len(entry_vowels) - len(pattern_vowels) + 1):
            entry_slice = entry_vowels[i:i + len(pattern_vowels)]
            match_count = sum(
                1 for e, p in zip(entry_slice, pattern_vowels, strict=True)
                if e == p or p is None
            )
            if match_count == len(pattern_vowels):
                return min(100, 40 + match_count * 10)
        return 0

    return 0
