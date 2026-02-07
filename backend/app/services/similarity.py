"""Similarity scoring between input and result rhyme patterns."""

# Scoring weights
_VOWEL_WEIGHT = 0.60
_CONSONANT_WEIGHT = 0.25
_MORA_WEIGHT = 0.15


def _weighted_sequence_match(a: list[str], b: list[str]) -> float:
    """Compare two sequences from the end with increasing weight toward the suffix.

    Rhymes depend heavily on the ending, so later elements get higher weight.
    Returns a score between 0.0 and 1.0.
    """
    if not a or not b:
        return 1.0 if (not a and not b) else 0.0

    max_len = max(len(a), len(b))
    # Pad shorter sequence from the front so endings align
    padded_a = [""] * (max_len - len(a)) + a
    padded_b = [""] * (max_len - len(b)) + b

    total_weight = 0.0
    matched_weight = 0.0

    for i in range(max_len):
        # Weight increases linearly toward the end: position 0 gets weight 1, last gets max_len
        weight = i + 1
        total_weight += weight
        if padded_a[i] == padded_b[i] and padded_a[i] != "":
            matched_weight += weight

    if total_weight == 0.0:
        return 0.0
    return matched_weight / total_weight


def _sequence_match(a: list[str], b: list[str]) -> float:
    """Simple ratio of matching elements (position-wise, end-aligned).

    Returns a score between 0.0 and 1.0.
    """
    if not a or not b:
        return 1.0 if (not a and not b) else 0.0

    max_len = max(len(a), len(b))
    padded_a = [""] * (max_len - len(a)) + a
    padded_b = [""] * (max_len - len(b)) + b

    matches = sum(1 for x, y in zip(padded_a, padded_b, strict=True) if x == y and x != "")
    return matches / max_len


def calculate_similarity(
    input_vowels: str,
    input_consonants: str,
    result_vowels: str,
    result_consonants: str,
    input_mora: int,
    result_mora: int,
) -> float:
    """Calculate similarity score between input and result rhyme patterns.

    Scoring weights:
    - Vowel match (suffix-weighted): 60%
    - Consonant match: 25%
    - Mora count match: 15%

    Returns: float between 0.0 and 1.0
    """
    v_a = input_vowels.split("-") if input_vowels else []
    v_b = result_vowels.split("-") if result_vowels else []

    c_a = input_consonants.split("-") if input_consonants else []
    c_b = result_consonants.split("-") if result_consonants else []

    vowel_score = _weighted_sequence_match(v_a, v_b)
    consonant_score = _sequence_match(c_a, c_b)

    if input_mora == 0 and result_mora == 0:
        mora_score = 1.0
    elif input_mora == 0 or result_mora == 0:
        mora_score = 0.0
    else:
        mora_score = 1.0 - abs(input_mora - result_mora) / max(input_mora, result_mora)

    total = (
        vowel_score * _VOWEL_WEIGHT
        + consonant_score * _CONSONANT_WEIGHT
        + mora_score * _MORA_WEIGHT
    )

    return min(1.0, max(0.0, total))
