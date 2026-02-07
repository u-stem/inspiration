import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.schemas import (
    EnglishRhymeResult,
    EnglishSearchRequest,
    EnglishSearchResponse,
    SortOrder,
)
from app.services.english_rhyme import get_english_rhyme_index
from app.services.pattern import PatternMatcher
from app.services.phoneme import is_hiragana
from app.services.search_utils import analyze_reading, extract_patterns
from app.services.similarity import calculate_similarity

logger = logging.getLogger(__name__)

# Pattern search retrieves candidates before detailed matching
MAX_PATTERN_SEARCH_CANDIDATES = 100000

router = APIRouter(prefix="/rhyme", tags=["rhyme"])


def _get_english_index():
    return get_english_rhyme_index(settings.english_index_path)


def _calculate_english_match_score(entry, parsed) -> int:
    """Calculate match score for an English entry against a parsed pattern.

    Uses vowel pattern matching similar to Japanese matcher.
    """
    entry_vowels = entry.vowels.split("-") if entry.vowels else []

    pattern_vowels = []
    for p in parsed.phoneme_patterns:
        if p.vowel is not None:
            pattern_vowels.append(p.vowel)

    if not pattern_vowels:
        return 0

    # Check suffix match (most common for rhymes)
    if parsed.prefix_wildcard and not parsed.suffix_wildcard:
        # *pattern - match at end
        if len(entry_vowels) < len(pattern_vowels):
            return 0

        entry_suffix = entry_vowels[-len(pattern_vowels) :]
        match_count = sum(
            1 for e, p in zip(entry_suffix, pattern_vowels, strict=True) if e == p or p is None
        )

        if match_count == len(pattern_vowels):
            return min(100, 50 + match_count * 10)
        return 0

    # Check prefix match
    if not parsed.prefix_wildcard and parsed.suffix_wildcard:
        # pattern* - match at start
        if len(entry_vowels) < len(pattern_vowels):
            return 0

        entry_prefix = entry_vowels[: len(pattern_vowels)]
        match_count = sum(
            1 for e, p in zip(entry_prefix, pattern_vowels, strict=True) if e == p or p is None
        )

        if match_count == len(pattern_vowels):
            return min(100, 50 + match_count * 10)
        return 0

    # Exact match
    if not parsed.prefix_wildcard and not parsed.suffix_wildcard:
        if len(entry_vowels) != len(pattern_vowels):
            return 0

        match_count = sum(
            1 for e, p in zip(entry_vowels, pattern_vowels, strict=True) if e == p or p is None
        )
        if match_count == len(pattern_vowels):
            return 100
        return 0

    # Contains match
    if parsed.prefix_wildcard and parsed.suffix_wildcard:
        # *pattern* - contains
        for i in range(len(entry_vowels) - len(pattern_vowels) + 1):
            entry_slice = entry_vowels[i : i + len(pattern_vowels)]
            match_count = sum(
                1 for e, p in zip(entry_slice, pattern_vowels, strict=True) if e == p or p is None
            )
            if match_count == len(pattern_vowels):
                return min(100, 40 + match_count * 10)
        return 0

    return 0


@router.post("/search/english", response_model=EnglishSearchResponse)
def search_english_rhymes(request: EnglishSearchRequest) -> EnglishSearchResponse:
    """Search for English words that rhyme with Japanese input.

    Accepts hiragana reading and a pattern string.
    Returns English words with matching vowel patterns.
    """
    if not is_hiragana(request.reading):
        raise HTTPException(
            status_code=400,
            detail="Reading must be hiragana only",
        )

    try:
        english_index = _get_english_index()
        matcher = PatternMatcher()
        parsed = matcher.parse(request.pattern)

        input_analysis = analyze_reading(request.reading)

        vowel_pattern, consonant_pattern, is_prefix, is_suffix = extract_patterns(parsed)

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
            if request.mora_min is not None and entry.syllable_count < request.mora_min:
                continue
            if request.mora_max is not None and entry.syllable_count > request.mora_max:
                continue

            score = _calculate_english_match_score(entry, parsed)
            if score > 0:
                matches.append((score, entry.word, entry))

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

        results = []
        for score, _, entry in page_matches:
            similarity = calculate_similarity(
                input_vowels=input_analysis.vowel_pattern,
                input_consonants=input_analysis.consonant_pattern,
                result_vowels=entry.vowels,
                result_consonants=entry.consonants,
                input_mora=len(input_analysis.phonemes),
                result_mora=entry.syllable_count,
            )
            results.append(
                EnglishRhymeResult(
                    word=entry.word,
                    pronunciation=entry.pronunciation,
                    katakana=entry.katakana,
                    vowel_pattern=entry.vowels,
                    consonant_pattern=entry.consonants,
                    syllable_count=entry.syllable_count,
                    score=score,
                    similarity_score=similarity,
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
