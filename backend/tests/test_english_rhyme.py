"""Tests for English rhyme index."""

from dataclasses import dataclass

import pytest

from app.routers.english import _calculate_english_match_score
from app.services.english_rhyme import EnglishRhymeIndex, get_english_rhyme_index

# Path to the English rhyme index
INDEX_PATH = "data/english_rhyme_index.db"


@dataclass
class FakeEntry:
    vowels: str
    consonants: str = ""


@dataclass
class FakeParsed:
    phoneme_patterns: list
    prefix_wildcard: bool = False
    suffix_wildcard: bool = False


@dataclass
class FakePhoneme:
    vowel: str | None
    consonant: str | None = None


class TestCalculateEnglishMatchScore:
    """Unit tests for _calculate_english_match_score."""

    def test_suffix_match_returns_positive_score(self) -> None:
        entry = FakeEntry(vowels="a-i-u")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel="i"), FakePhoneme(vowel="u")],
            prefix_wildcard=True,
            suffix_wildcard=False,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score > 0

    def test_suffix_mismatch_returns_zero(self) -> None:
        entry = FakeEntry(vowels="a-i-u")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel="o"), FakePhoneme(vowel="e")],
            prefix_wildcard=True,
            suffix_wildcard=False,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score == 0

    def test_prefix_match_returns_positive_score(self) -> None:
        entry = FakeEntry(vowels="a-i-u")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel="a"), FakePhoneme(vowel="i")],
            prefix_wildcard=False,
            suffix_wildcard=True,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score > 0

    def test_exact_match_returns_100(self) -> None:
        entry = FakeEntry(vowels="a-i")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel="a"), FakePhoneme(vowel="i")],
            prefix_wildcard=False,
            suffix_wildcard=False,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score == 100

    def test_exact_match_wrong_length_returns_zero(self) -> None:
        entry = FakeEntry(vowels="a-i-u")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel="a"), FakePhoneme(vowel="i")],
            prefix_wildcard=False,
            suffix_wildcard=False,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score == 0

    def test_contains_match_returns_positive_score(self) -> None:
        entry = FakeEntry(vowels="a-i-u-e")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel="i"), FakePhoneme(vowel="u")],
            prefix_wildcard=True,
            suffix_wildcard=True,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score > 0

    def test_no_pattern_vowels_returns_zero(self) -> None:
        entry = FakeEntry(vowels="a-i")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel=None, consonant="k")],
            prefix_wildcard=True,
            suffix_wildcard=False,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score == 0

    def test_entry_too_short_for_pattern_returns_zero(self) -> None:
        entry = FakeEntry(vowels="a")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel="a"), FakePhoneme(vowel="i")],
            prefix_wildcard=True,
            suffix_wildcard=False,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score == 0

    def test_score_capped_at_100(self) -> None:
        entry = FakeEntry(vowels="a-i-u-e-o-a-i-u-e-o")
        parsed = FakeParsed(
            phoneme_patterns=[FakePhoneme(vowel=v) for v in "aiueoaiueo"],
            prefix_wildcard=False,
            suffix_wildcard=False,
        )
        score = _calculate_english_match_score(entry, parsed)
        assert score <= 100


@pytest.fixture
def english_index() -> EnglishRhymeIndex:
    """Get English rhyme index for testing."""
    try:
        return get_english_rhyme_index(INDEX_PATH)
    except FileNotFoundError:
        pytest.skip("English rhyme index not built yet")


class TestEnglishRhymeIndex:
    def test_search_by_vowels_suffix(self, english_index: EnglishRhymeIndex) -> None:
        """Test searching by vowel suffix pattern."""
        # Search for words ending with "o-u" vowel pattern (like "go", "show")
        results = english_index.search_by_vowels("o-u", limit=10)
        assert len(results) > 0

        # All results should end with "o-u" vowels
        for entry in results:
            assert entry.vowels.endswith("o-u")

    def test_search_by_vowels_prefix(self, english_index: EnglishRhymeIndex) -> None:
        """Test searching by vowel prefix pattern."""
        # Search for words starting with "a-i" vowel pattern
        results = english_index.search_by_vowels_prefix("a-i", limit=10)
        assert len(results) > 0

        for entry in results:
            assert entry.vowels.startswith("a-i")

    def test_search_exact_vowels(self, english_index: EnglishRhymeIndex) -> None:
        """Test exact vowel pattern match."""
        # Search for single-syllable "i" words
        results = english_index.search_exact_vowels("i", limit=10)
        assert len(results) > 0

        for entry in results:
            assert entry.vowels == "i"

    def test_search_tokyo_pattern(self, english_index: EnglishRhymeIndex) -> None:
        """Test searching for words matching 'tokyo' vowel pattern."""
        # tokyo has vowel pattern "o-u-o-u" (o-u, o-u diphthongs)
        results = english_index.search_by_vowels("o-u-o-u", limit=50)

        # Should find some results (maybe "tokyo" itself if in dictionary)
        # Note: Not all dictionaries have "tokyo"
        words = [r.word for r in results]
        print(f"Found words with o-u-o-u pattern: {words[:10]}")

    def test_search_rhyme_words(self, english_index: EnglishRhymeIndex) -> None:
        """Test finding rhyming words for common patterns."""
        # Search for words rhyming with "light" (a-i pattern suffix)
        results = english_index.search_by_vowels("a-i", limit=20)
        words = [r.word for r in results]

        # Should find words like "right", "night", "fight", etc.
        print(f"Words ending with 'a-i' vowels: {words}")
        assert len(results) > 0

    def test_entry_has_katakana(self, english_index: EnglishRhymeIndex) -> None:
        """Test that entries have katakana approximation."""
        results = english_index.search_by_vowels("o-u", limit=5)
        assert len(results) > 0

        for entry in results:
            # Katakana should not be empty
            assert entry.katakana, f"Entry {entry.word} has no katakana"

    def test_get_total_count(self, english_index: EnglishRhymeIndex) -> None:
        """Test getting total entry count."""
        count = english_index.get_total_count()
        # CMU dictionary has about 130k entries
        assert count > 100000, f"Expected > 100k entries, got {count}"

    def test_search_by_pattern_suffix(self, english_index: EnglishRhymeIndex) -> None:
        """Test generic pattern search with suffix matching."""
        results = english_index.search_by_pattern(
            vowel_pattern="i",
            suffix=True,
            limit=10,
        )
        assert len(results) > 0

        for entry in results:
            assert entry.vowels.endswith("i")

    def test_search_by_pattern_with_consonants(self, english_index: EnglishRhymeIndex) -> None:
        """Test pattern search including consonants."""
        results = english_index.search_by_pattern(
            vowel_pattern="a",
            consonant_pattern="k",
            prefix=True,
            limit=10,
        )
        # Should find words starting with "k" consonant and "a" vowel
        # like "cat", "can", etc.
        assert len(results) > 0
