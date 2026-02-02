"""Pattern matching for rhyme search.

Pattern syntax:
- * : Any length (0 or more phonemes)
- _ : Any single phoneme (consonant + vowel pair)
- Phoneme characters: Direct match (e.g., a, i, u, e, o for vowels; k, s, t, etc. for consonants)

Examples:
- *ua     : Ends with u-a vowel pattern (suffix match)
- kusa*   : Starts with "kusa" (prefix match)
- *_u_a   : Any consonant + u, any consonant + a at the end
- ku_a    : "ku" followed by any consonant + "a"
"""

import logging
from dataclasses import dataclass

from app.services.phoneme import Phoneme, extract_phonemes_detailed, hiragana_to_katakana
from app.services.rhyme import IndexEntry

logger = logging.getLogger(__name__)


@dataclass
class ParsedPhonemePattern:
    """Parsed single phoneme pattern element"""

    consonant: str | None  # None = any, "" = no consonant, "k" etc = specific
    vowel: str | None  # None = any, "a" etc = specific


@dataclass
class ParsedPattern:
    """Parsed pattern"""

    prefix_wildcard: bool  # Starts with *
    suffix_wildcard: bool  # Ends with *
    phoneme_patterns: list[ParsedPhonemePattern]  # Pattern elements between wildcards


class PatternMatcher:
    """Pattern-based rhyme matcher."""

    # Consonant characters (in patterns, these represent consonants)
    CONSONANTS = frozenset("kgsztdnhbpmyrwfcjqNQ")

    # Multi-character consonants (sh, ch, ts) are handled separately in parse()

    # Consonants that can combine with 'y' to form youon (拗音)
    # e.g., ky (きゃ), gy (ぎゃ), ny (にゃ), hy (ひゃ), by (びゃ), py (ぴゃ), my (みゃ), ry (りゃ)
    # Note: sh, ch, j already represent palatalized sounds and don't take additional 'y'
    YOUON_BASE_CONSONANTS = frozenset("kgnhbpmr")

    # Pure vowels (can appear without a consonant)
    PURE_VOWELS = frozenset("aiueo")

    # All vowel characters (n is the vowel value for ん, only valid after consonant N)
    VOWELS = frozenset("aiueon")

    def parse(self, pattern: str) -> ParsedPattern:
        """Parse a pattern string into a ParsedPattern structure.

        Args:
            pattern: Pattern string (e.g., "*_u_a", "ku*", "*kusa*")

        Returns:
            ParsedPattern with parsed structure
        """
        prefix_wildcard = pattern.startswith("*")
        suffix_wildcard = pattern.endswith("*")

        # Remove wildcards from ends
        core = pattern.strip("*")
        if not core:
            return ParsedPattern(
                prefix_wildcard=prefix_wildcard,
                suffix_wildcard=suffix_wildcard,
                phoneme_patterns=[],
            )

        phoneme_patterns: list[ParsedPhonemePattern] = []
        i = 0
        while i < len(core):
            char = core[i]

            if char == "_":
                # Check if followed by a vowel
                if i + 1 < len(core) and core[i + 1] in self.VOWELS:
                    # _ + vowel = any consonant + specific vowel
                    phoneme_patterns.append(ParsedPhonemePattern(consonant=None, vowel=core[i + 1]))
                    i += 2
                else:
                    # Just _ = any single phoneme
                    phoneme_patterns.append(ParsedPhonemePattern(consonant=None, vowel=None))
                    i += 1

            elif char in self.CONSONANTS:
                # Consonant - check for following vowel or wildcard
                consonant = char
                # Handle multi-character consonants
                if i + 1 < len(core):
                    next_char = core[i + 1]
                    if char == "s" and next_char == "h":
                        consonant = "sh"
                        i += 1
                    elif char == "c" and next_char == "h":
                        consonant = "ch"
                        i += 1
                    elif char == "t" and next_char == "s":
                        consonant = "ts"
                        i += 1
                    elif next_char == "y" and char in self.YOUON_BASE_CONSONANTS:
                        # 拗音: ky, gy, ny, hy, by, py, my, ry
                        consonant = char + "y"
                        i += 1

                i += 1
                # Check for vowel after consonant
                if i < len(core) and core[i] in self.VOWELS:
                    vowel = core[i]
                    i += 1
                    phoneme_patterns.append(ParsedPhonemePattern(consonant=consonant, vowel=vowel))
                elif i < len(core) and core[i] == "_":
                    # Consonant + any vowel
                    phoneme_patterns.append(ParsedPhonemePattern(consonant=consonant, vowel=None))
                    i += 1
                else:
                    # Consonant only (match any vowel)
                    phoneme_patterns.append(ParsedPhonemePattern(consonant=consonant, vowel=None))

            elif char in self.PURE_VOWELS:
                # Pure vowel only (no consonant) - aiueo only, not 'n'
                phoneme_patterns.append(ParsedPhonemePattern(consonant="", vowel=char))
                i += 1

            else:
                logger.warning(f"Unknown character in pattern: {char!r}")
                i += 1

        return ParsedPattern(
            prefix_wildcard=prefix_wildcard,
            suffix_wildcard=suffix_wildcard,
            phoneme_patterns=phoneme_patterns,
        )

    def match(self, candidate: IndexEntry, parsed: ParsedPattern) -> tuple[bool, int]:
        """Check if a candidate matches the pattern.

        Args:
            candidate: Index entry to check
            parsed: Parsed pattern

        Returns:
            Tuple of (matches: bool, score: int)
        """
        if not parsed.phoneme_patterns:
            # Empty pattern with wildcards matches everything
            if parsed.prefix_wildcard or parsed.suffix_wildcard:
                return True, 50
            return False, 0

        # Extract candidate's phonemes
        candidate_phonemes = extract_phonemes_detailed(candidate.reading)
        if not candidate_phonemes:
            return False, 0

        pattern_len = len(parsed.phoneme_patterns)
        candidate_len = len(candidate_phonemes)

        # Check if pattern can possibly match
        if not parsed.prefix_wildcard and not parsed.suffix_wildcard:
            # Exact length match required
            if candidate_len != pattern_len:
                return False, 0
            return self._match_at_position(candidate_phonemes, parsed.phoneme_patterns, 0)

        if parsed.prefix_wildcard and parsed.suffix_wildcard:
            # Pattern can appear anywhere
            for start in range(candidate_len - pattern_len + 1):
                matches, score = self._match_at_position(
                    candidate_phonemes, parsed.phoneme_patterns, start
                )
                if matches:
                    return True, score

        elif parsed.suffix_wildcard:
            # Pattern must match at start
            if candidate_len < pattern_len:
                return False, 0
            return self._match_at_position(candidate_phonemes, parsed.phoneme_patterns, 0)

        else:
            # parsed.prefix_wildcard: Pattern must match at end
            if candidate_len < pattern_len:
                return False, 0
            start = candidate_len - pattern_len
            return self._match_at_position(candidate_phonemes, parsed.phoneme_patterns, start)

        return False, 0

    def _match_at_position(
        self,
        candidate_phonemes: list[Phoneme],
        pattern: list[ParsedPhonemePattern],
        start: int,
    ) -> tuple[bool, int]:
        """Check if pattern matches at a specific position.

        Returns:
            Tuple of (matches: bool, score: int)
            Score is based on how specific the match is (0-100)
        """
        score = 100
        exact_matches = 0
        total_checks = 0

        for i, p in enumerate(pattern):
            if start + i >= len(candidate_phonemes):
                return False, 0

            cand = candidate_phonemes[start + i]

            # Check consonant
            if p.consonant is not None:
                total_checks += 1
                if p.consonant != cand.consonant:
                    return False, 0
                exact_matches += 1

            # Check vowel
            if p.vowel is not None:
                total_checks += 1
                if p.vowel != cand.vowel:
                    return False, 0
                exact_matches += 1

        # Calculate score based on match specificity
        if total_checks > 0:
            # More specific patterns get higher scores
            specificity = exact_matches / (len(pattern) * 2)  # max 2 checks per phoneme
            score = int(50 + 50 * specificity)

        return True, score


def build_pattern_from_reading(
    reading: str,
    fix_consonants: list[bool] | None = None,
    fix_vowels: list[bool] | None = None,
    position: str = "suffix",
) -> str:
    """Build a pattern string from hiragana reading.

    Args:
        reading: Hiragana reading
        fix_consonants: List of booleans indicating which consonants to fix (None = all fixed)
        fix_vowels: List of booleans indicating which vowels to fix (None = all fixed)
        position: "prefix", "suffix", or "contains"

    Returns:
        Pattern string
    """
    katakana = hiragana_to_katakana(reading)
    phonemes = extract_phonemes_detailed(katakana)

    if fix_consonants is None:
        fix_consonants = [True] * len(phonemes)
    if fix_vowels is None:
        fix_vowels = [True] * len(phonemes)

    parts = []
    for i, phoneme in enumerate(phonemes):
        cons_fixed = fix_consonants[i] if i < len(fix_consonants) else True
        vowel_fixed = fix_vowels[i] if i < len(fix_vowels) else True

        if not cons_fixed and not vowel_fixed:
            parts.append("_")
        elif cons_fixed and vowel_fixed:
            # Both fixed
            cons = phoneme.consonant or ""
            vowel = phoneme.vowel or ""
            parts.append(cons + vowel)
        elif cons_fixed:
            # Consonant fixed, vowel any
            cons = phoneme.consonant or ""
            parts.append(cons + "_" if cons else "_")
        else:
            # Vowel fixed, consonant any
            vowel = phoneme.vowel or ""
            parts.append("_" + vowel if vowel else "_")

    pattern_core = "".join(parts)

    if position == "prefix":
        return pattern_core + "*"
    elif position == "suffix":
        return "*" + pattern_core
    else:  # contains
        return "*" + pattern_core + "*"
