import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.schemas import (
    PatternRhymeResult,
    PatternSearchRequest,
    PatternSearchResponse,
    Phoneme,
    SortOrder,
)
from app.services.pattern import PatternMatcher
from app.services.phoneme import (
    extract_phonemes,
    is_hiragana,
    katakana_to_hiragana,
)
from app.services.rhyme import get_rhyme_index
from app.services.search_utils import analyze_reading, extract_patterns, word_priority
from app.services.similarity import calculate_similarity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rhyme", tags=["rhyme-search"])


def _get_index():
    return get_rhyme_index(settings.index_path)


@router.post("/search", response_model=PatternSearchResponse)
def search_rhymes(request: PatternSearchRequest) -> PatternSearchResponse:
    """Pattern-based rhyme search.

    Accepts hiragana reading and a pattern string.
    Pattern syntax:
    - * : Any length (0 or more phonemes)
    - _ : Any single phoneme
    - Direct phoneme chars: a, i, u, e, o for vowels; k, s, t, etc. for consonants
    """
    if not is_hiragana(request.reading):
        raise HTTPException(
            status_code=400,
            detail="Reading must be hiragana only",
        )

    try:
        index = _get_index()
        matcher = PatternMatcher()
        parsed = matcher.parse(request.pattern)

        input_analysis = analyze_reading(request.reading)

        vowel_pattern, consonant_pattern, is_prefix, is_suffix = extract_patterns(parsed)

        candidates = index.search_by_pattern(
            vowel_pattern=vowel_pattern,
            consonant_pattern=consonant_pattern,
            prefix=is_prefix,
            suffix=is_suffix,
            limit=settings.max_pattern_search_candidates,
        )

        matches: list[tuple[int, tuple[int, int], Any]] = []  # (score, priority, entry)

        for entry in candidates:
            if request.mora_min is not None and entry.mora_count < request.mora_min:
                continue
            if request.mora_max is not None and entry.mora_count > request.mora_max:
                continue

            is_match, score = matcher.match(entry, parsed)
            if is_match:
                priority = word_priority(entry.word)
                matches.append((score, priority, entry))

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

        results = []
        for score, _, entry in page_matches:
            phonemes_raw = extract_phonemes(entry.reading)
            phonemes = [
                Phoneme(
                    consonant=p.consonant,
                    vowel=p.vowel or "",
                    display=katakana_to_hiragana(p.display),
                )
                for p in phonemes_raw
                if p.vowel is not None or p.consonant == "Q"
            ]
            similarity = calculate_similarity(
                input_vowels=input_analysis.vowel_pattern,
                input_consonants=input_analysis.consonant_pattern,
                result_vowels=entry.vowels,
                result_consonants=entry.consonants,
                input_mora=len(input_analysis.phonemes),
                result_mora=entry.mora_count,
            )
            results.append(
                PatternRhymeResult(
                    word=entry.word,
                    reading=katakana_to_hiragana(entry.reading),
                    phonemes=phonemes,
                    vowel_pattern=entry.vowels,
                    consonant_pattern=entry.consonants,
                    mora_count=entry.mora_count,
                    score=score,
                    similarity_score=similarity,
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
        raise HTTPException(status_code=500, detail="Search failed") from e
