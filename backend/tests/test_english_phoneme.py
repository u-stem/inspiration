"""Tests for English phoneme analysis."""

from app.services.english_phoneme import (
    analyze_english,
    arpabet_to_katakana,
    parse_arpabet,
)


class TestParseArpabet:
    def test_simple_word_tokyo(self) -> None:
        """Test parsing 'tokyo' pronunciation."""
        phonemes = parse_arpabet("T OW1 K Y OW0")
        assert len(phonemes) == 5
        # T - consonant
        assert phonemes[0].consonant == "t"
        assert phonemes[0].vowel is None
        # OW1 - diphthong vowel
        assert phonemes[1].vowel == "o-u"
        assert phonemes[1].consonant == ""
        # K - consonant
        assert phonemes[2].consonant == "k"
        # Y - consonant
        assert phonemes[3].consonant == "y"
        # OW0 - diphthong vowel
        assert phonemes[4].vowel == "o-u"

    def test_simple_vowels(self) -> None:
        """Test basic vowel mapping."""
        # "a" -> AH0
        phonemes = parse_arpabet("AH0")
        assert phonemes[0].vowel == "a"

        # "bee" -> B IY1
        phonemes = parse_arpabet("B IY1")
        assert phonemes[0].consonant == "b"
        assert phonemes[1].vowel == "i"

    def test_diphthongs(self) -> None:
        """Test diphthong vowels."""
        # "my" -> M AY1
        phonemes = parse_arpabet("M AY1")
        assert phonemes[1].vowel == "a-i"

        # "go" -> G OW1
        phonemes = parse_arpabet("G OW1")
        assert phonemes[1].vowel == "o-u"

        # "boy" -> B OY1
        phonemes = parse_arpabet("B OY1")
        assert phonemes[1].vowel == "o-i"


class TestAnalyzeEnglish:
    def test_tokyo(self) -> None:
        """Test 'tokyo' analysis."""
        result = analyze_english("tokyo", "T OW1 K Y OW0")
        assert result.word == "tokyo"
        assert result.vowels == "o-u-o-u"
        assert "t" in result.consonants
        assert "k" in result.consonants
        assert result.syllable_count == 2

    def test_rainbow(self) -> None:
        """Test 'rainbow' analysis."""
        result = analyze_english("rainbow", "R EY1 N B OW2")
        assert result.vowels == "e-i-o-u"
        assert result.syllable_count == 2

    def test_simple_word(self) -> None:
        """Test simple word 'cat'."""
        result = analyze_english("cat", "K AE1 T")
        assert result.vowels == "a"
        assert result.syllable_count == 1

    def test_money(self) -> None:
        """Test 'money' - common in Japanese rap."""
        result = analyze_english("money", "M AH1 N IY0")
        assert result.vowels == "a-i"
        assert result.syllable_count == 2

    def test_birthday(self) -> None:
        """Test 'birthday' - used in Japanese rap examples."""
        result = analyze_english("birthday", "B ER1 TH D EY2")
        assert result.vowels == "a-e-i"
        assert result.syllable_count == 2


class TestArpabetToKatakana:
    def test_tokyo(self) -> None:
        """Test katakana conversion for 'tokyo'."""
        katakana = arpabet_to_katakana("T OW1 K Y OW0")
        assert "トウ" in katakana or "ト" in katakana

    def test_simple_words(self) -> None:
        """Test katakana for simple words."""
        # "cat" -> K AE1 T
        katakana = arpabet_to_katakana("K AE1 T")
        assert "カ" in katakana

        # "dog" -> D AO1 G
        katakana = arpabet_to_katakana("D AO1 G")
        assert "ド" in katakana or "ド" in katakana

    def test_rainbow(self) -> None:
        """Test katakana for 'rainbow'."""
        katakana = arpabet_to_katakana("R EY1 N B OW2")
        assert "レイ" in katakana or "レ" in katakana
