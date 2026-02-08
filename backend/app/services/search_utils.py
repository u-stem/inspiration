"""Utility functions for rhyme search routing."""

from app.models.schemas import PatternAnalyzeResponse, Phoneme
from app.services.phoneme import (
    analyze_hiragana,
    extract_phonemes,
    hiragana_to_katakana,
    katakana_to_hiragana,
)


def word_priority(word: str) -> tuple[int, int]:
    """Calculate word priority for sorting (kanji preferred, shorter preferred)."""
    has_kanji = any("\u4e00" <= c <= "\u9fff" for c in word)
    has_hiragana = any("\u3040" <= c <= "\u309f" for c in word)
    has_katakana = any("\u30a0" <= c <= "\u30ff" for c in word)
    noise_symbols = (
        "()（）「」『』【】・#＃&＆@＠!！?？*＊%％^＾~〜_＿+=<>《》-－―─—.．:：;；,'\"'、。○●☆★♪♯♭"
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


def extract_patterns(parsed) -> tuple[str | None, str | None, bool, bool]:
    """Extract vowel and consonant patterns from parsed pattern for SQL pre-filtering.

    Returns:
        Tuple of (vowel_pattern, consonant_pattern, is_prefix, is_suffix)
    """
    if not parsed.phoneme_patterns:
        return None, None, False, False

    vowels = []
    consonants = []
    has_vowel_wildcard = False
    has_consonant_wildcard = False

    for p in parsed.phoneme_patterns:
        if p.vowel is not None:
            if has_vowel_wildcard:
                break
            vowels.append(p.vowel)
        else:
            has_vowel_wildcard = True
            if vowels:
                break

        # Skip empty consonants as DB stores only non-empty consonants
        if p.consonant is not None and not has_vowel_wildcard:
            if p.consonant:
                consonants.append(p.consonant)
        else:
            has_consonant_wildcard = True

    is_suffix = parsed.prefix_wildcard and not parsed.suffix_wildcard  # *pattern
    is_prefix = not parsed.prefix_wildcard and parsed.suffix_wildcard  # pattern*

    vowel_pattern = "-".join(vowels) if vowels else None
    consonant_pattern = "-".join(consonants) if consonants and not has_consonant_wildcard else None

    return vowel_pattern, consonant_pattern, is_prefix, is_suffix


def analyze_reading(reading: str) -> PatternAnalyzeResponse:
    """Analyze hiragana reading and return phoneme info."""
    katakana = hiragana_to_katakana(reading)
    phonemes_raw = extract_phonemes(katakana)
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
