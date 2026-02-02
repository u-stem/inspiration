import pytest

from app.services.pattern import PatternMatcher, build_pattern_from_reading
from app.services.phoneme import (
    analyze,
    analyze_hiragana,
    extract_phonemes_detailed,
    hiragana_to_katakana,
    is_hiragana,
)
from app.services.rhyme import IndexEntry, RhymeIndex


class TestPhoneme:
    def test_analyze_katakana(self) -> None:
        result = analyze("トウキョウ")
        assert result.vowels == "o-u-o-u"
        assert result.reading == "トウキョウ"

    def test_analyze_hiragana_direct(self) -> None:
        result = analyze_hiragana("とうきょう")
        assert result.vowels == "o-u-o-u"

    def test_is_hiragana(self) -> None:
        assert is_hiragana("くさ") is True
        assert is_hiragana("クサ") is False
        assert is_hiragana("草") is False
        assert is_hiragana("kusa") is False
        assert is_hiragana("くさー") is True  # Long vowel mark allowed

    def test_hiragana_to_katakana(self) -> None:
        assert hiragana_to_katakana("くさ") == "クサ"
        assert hiragana_to_katakana("とうきょう") == "トウキョウ"

    def test_extract_phonemes_detailed(self) -> None:
        phonemes = extract_phonemes_detailed("クサ")
        assert len(phonemes) == 2
        assert phonemes[0].consonant == "k"
        assert phonemes[0].vowel == "u"
        assert phonemes[1].consonant == "s"
        assert phonemes[1].vowel == "a"


class TestRhymeIndex:
    def test_add_and_search_by_vowels(self) -> None:
        index = RhymeIndex()

        entries = [
            IndexEntry(word="東京", reading="トウキョウ", vowels="o-u-o-u", consonants="t-k"),
            IndexEntry(word="投稿", reading="トウコウ", vowels="o-u-o-u", consonants="t-k"),
            IndexEntry(word="報告", reading="ホウコク", vowels="o-u-o-u", consonants="h-k-k"),
        ]
        for entry in entries:
            index.add_entry(entry)

        results = index.search_by_vowels("o-u-o-u")
        assert len(results) == 3
        words = [r.word for r in results]
        assert "東京" in words
        assert "投稿" in words
        assert "報告" in words

    def test_search_by_partial_vowels(self) -> None:
        index = RhymeIndex()

        index.add_entry(
            IndexEntry(word="東京", reading="トウキョウ", vowels="o-u-o-u", consonants="t-k")
        )
        index.add_entry(
            IndexEntry(word="高校", reading="コウコウ", vowels="o-u-o-u", consonants="k-k")
        )
        index.add_entry(IndexEntry(word="愛", reading="アイ", vowels="a-i", consonants=""))

        results = index.search_by_vowels("o-u")
        assert len(results) == 2


class TestPatternMatcher:
    @pytest.fixture
    def matcher(self) -> PatternMatcher:
        return PatternMatcher()

    @pytest.fixture
    def index_with_entries(self) -> RhymeIndex:
        index = RhymeIndex()
        test_entries = [
            ("草", "クサ"),
            ("朝", "アサ"),
            ("傘", "カサ"),
            ("蓋", "フタ"),
            ("旗", "ハタ"),
            ("東京", "トウキョウ"),
            ("投稿", "トウコウ"),
        ]
        for word, reading in test_entries:
            phoneme_analysis = analyze(reading)
            entry = IndexEntry(
                word=word,
                reading=reading,
                vowels=phoneme_analysis.vowels,
                consonants=phoneme_analysis.consonants,
                mora_count=phoneme_analysis.mora_count,
                initial_consonant=phoneme_analysis.initial_consonant,
            )
            index.add_entry(entry)
        return index

    def test_parse_suffix_pattern(self, matcher: PatternMatcher) -> None:
        parsed = matcher.parse("*kusa")
        assert parsed.prefix_wildcard is True
        assert parsed.suffix_wildcard is False
        assert len(parsed.phoneme_patterns) == 2

    def test_parse_vowel_only_pattern(self, matcher: PatternMatcher) -> None:
        parsed = matcher.parse("*_u_a")
        assert parsed.prefix_wildcard is True
        assert len(parsed.phoneme_patterns) == 2
        assert parsed.phoneme_patterns[0].consonant is None  # any consonant
        assert parsed.phoneme_patterns[0].vowel == "u"
        assert parsed.phoneme_patterns[1].consonant is None
        assert parsed.phoneme_patterns[1].vowel == "a"

    def test_match_suffix_exact(
        self, matcher: PatternMatcher, index_with_entries: RhymeIndex
    ) -> None:
        parsed = matcher.parse("*kusa")
        entries = index_with_entries.get_all_entries()

        kusa_entry = next(e for e in entries if e.word == "草")
        matches, score = matcher.match(kusa_entry, parsed)
        assert matches is True

        asa_entry = next(e for e in entries if e.word == "朝")
        matches, _ = matcher.match(asa_entry, parsed)
        assert matches is False

    def test_match_vowel_pattern_ua(
        self, matcher: PatternMatcher, index_with_entries: RhymeIndex
    ) -> None:
        # *_u_a matches words with vowel pattern u-a: 草(kusa), 蓋(futa)
        # Does NOT match a-a pattern: 朝(asa), 傘(kasa), 旗(hata)
        parsed = matcher.parse("*_u_a")
        entries = index_with_entries.get_all_entries()

        matching_words = []
        for entry in entries:
            matches, _ = matcher.match(entry, parsed)
            if matches:
                matching_words.append(entry.word)

        assert "草" in matching_words  # k+u, s+a → u-a
        assert "蓋" in matching_words  # f+u, t+a → u-a
        assert "朝" not in matching_words  # a, s+a → a-a (not u-a)
        assert "傘" not in matching_words  # k+a, s+a → a-a
        assert "旗" not in matching_words  # h+a, t+a → a-a

    def test_match_vowel_pattern_aa(
        self, matcher: PatternMatcher, index_with_entries: RhymeIndex
    ) -> None:
        # *_a_a matches words with vowel pattern a-a: 朝(asa), 傘(kasa), 旗(hata)
        parsed = matcher.parse("*_a_a")
        entries = index_with_entries.get_all_entries()

        matching_words = []
        for entry in entries:
            matches, _ = matcher.match(entry, parsed)
            if matches:
                matching_words.append(entry.word)

        assert "朝" in matching_words  # a, s+a → a-a
        assert "傘" in matching_words  # k+a, s+a → a-a
        assert "旗" in matching_words  # h+a, t+a → a-a
        assert "草" not in matching_words  # k+u, s+a → u-a (not a-a)
        assert "蓋" not in matching_words  # f+u, t+a → u-a

    def test_build_pattern_suffix(self) -> None:
        pattern = build_pattern_from_reading("くさ", position="suffix")
        assert pattern == "*kusa"

    def test_build_pattern_prefix(self) -> None:
        pattern = build_pattern_from_reading("くさ", position="prefix")
        assert pattern == "kusa*"

    def test_build_pattern_vowel_only(self) -> None:
        pattern = build_pattern_from_reading(
            "くさ",
            fix_consonants=[False, False],
            fix_vowels=[True, True],
            position="suffix",
        )
        # When consonants are not fixed and vowels are fixed, we get _vowel pattern
        assert "_u_a" in pattern

    def test_parse_youon_pattern(self, matcher: PatternMatcher) -> None:
        """Test parsing of youon (拗音) patterns"""
        # ky, gy, ny, etc. should be parsed as single consonant
        parsed = matcher.parse("kya*")
        assert len(parsed.phoneme_patterns) == 1
        assert parsed.phoneme_patterns[0].consonant == "ky"
        assert parsed.phoneme_patterns[0].vowel == "a"

        parsed = matcher.parse("nyaNn*")
        assert len(parsed.phoneme_patterns) == 2
        assert parsed.phoneme_patterns[0].consonant == "ny"
        assert parsed.phoneme_patterns[0].vowel == "a"
        assert parsed.phoneme_patterns[1].consonant == "N"
        assert parsed.phoneme_patterns[1].vowel == "n"

    def test_parse_hatsuon_pattern(self, matcher: PatternMatcher) -> None:
        """Test parsing of hatsuon (撥音) ん pattern"""
        # ん is represented as Nn (consonant N, vowel n)
        parsed = matcher.parse("kaNn*")
        assert len(parsed.phoneme_patterns) == 2
        assert parsed.phoneme_patterns[0].consonant == "k"
        assert parsed.phoneme_patterns[0].vowel == "a"
        assert parsed.phoneme_patterns[1].consonant == "N"
        assert parsed.phoneme_patterns[1].vowel == "n"

    def test_parse_sokuon_pattern(self, matcher: PatternMatcher) -> None:
        """Test parsing of sokuon (促音) っ pattern"""
        # っ is represented as Q (consonant only, no vowel)
        parsed = matcher.parse("gaQko*")
        assert len(parsed.phoneme_patterns) == 3
        assert parsed.phoneme_patterns[0].consonant == "g"
        assert parsed.phoneme_patterns[0].vowel == "a"
        assert parsed.phoneme_patterns[1].consonant == "Q"
        assert parsed.phoneme_patterns[1].vowel is None
        assert parsed.phoneme_patterns[2].consonant == "k"
        assert parsed.phoneme_patterns[2].vowel == "o"

    def test_parse_multi_char_consonants(self, matcher: PatternMatcher) -> None:
        """Test parsing of multi-character consonants (sh, ch, ts)"""
        parsed = matcher.parse("sha*")
        assert parsed.phoneme_patterns[0].consonant == "sh"

        parsed = matcher.parse("cha*")
        assert parsed.phoneme_patterns[0].consonant == "ch"

        parsed = matcher.parse("tsu*")
        assert parsed.phoneme_patterns[0].consonant == "ts"

    def test_build_pattern_youon(self) -> None:
        """Test building patterns from youon words"""
        pattern = build_pattern_from_reading("にゃんにゃん", position="prefix")
        assert pattern == "nyaNnnyaNn*"

        pattern = build_pattern_from_reading("きょく", position="suffix")
        assert pattern == "*kyoku"

    def test_build_pattern_hatsuon(self) -> None:
        """Test building patterns from hatsuon words"""
        pattern = build_pattern_from_reading("かんたん", position="prefix")
        assert pattern == "kaNntaNn*"

    def test_build_pattern_sokuon(self) -> None:
        """Test building patterns from sokuon words"""
        pattern = build_pattern_from_reading("がっこう", position="prefix")
        assert pattern == "gaQkou*"

    def test_n_as_consonant_not_vowel(self, matcher: PatternMatcher) -> None:
        """Test that 'n' at start of pattern is consonant, not vowel"""
        # 'na' should be consonant n + vowel a, not vowel n + vowel a
        parsed = matcher.parse("na*")
        assert len(parsed.phoneme_patterns) == 1
        assert parsed.phoneme_patterns[0].consonant == "n"
        assert parsed.phoneme_patterns[0].vowel == "a"

        # Pattern for なんなん should have 4 phonemes
        parsed = matcher.parse("naNnnaNn*")
        assert len(parsed.phoneme_patterns) == 4

    def test_underscore_n_pattern(self, matcher: PatternMatcher) -> None:
        """Test that '_n' matches any consonant + n vowel (hatsuon)"""
        # '_n' should match the vowel part of hatsuon (ん)
        # This is useful for patterns like "*_n" to match words ending with ん
        parsed = matcher.parse("_n")
        assert len(parsed.phoneme_patterns) == 1
        assert parsed.phoneme_patterns[0].consonant is None  # any consonant
        assert parsed.phoneme_patterns[0].vowel == "n"  # n vowel (hatsuon)
