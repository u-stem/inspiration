from app.services.pattern import PatternMatcher
from app.services.search_utils import extract_patterns, word_priority


class TestWordPriority:
    def test_kanji_only_highest_priority(self) -> None:
        priority = word_priority("東京")
        assert priority[0] > 0

    def test_symbol_lowest_priority(self) -> None:
        priority = word_priority("☆東京☆")
        assert priority[0] == -2

    def test_digit_low_priority(self) -> None:
        priority = word_priority("123")
        assert priority[0] == -1

    def test_shorter_preferred(self) -> None:
        p1 = word_priority("東")
        p2 = word_priority("東京都")
        assert p1[0] >= p2[0]


class TestExtractPatterns:
    def test_suffix_pattern(self) -> None:
        matcher = PatternMatcher()
        parsed = matcher.parse("*kusa")
        vowel, consonant, is_prefix, is_suffix = extract_patterns(parsed)
        assert vowel == "u-a"
        assert is_suffix is True
        assert is_prefix is False

    def test_prefix_pattern(self) -> None:
        matcher = PatternMatcher()
        parsed = matcher.parse("kusa*")
        vowel, consonant, is_prefix, is_suffix = extract_patterns(parsed)
        assert vowel == "u-a"
        assert is_prefix is True
        assert is_suffix is False
