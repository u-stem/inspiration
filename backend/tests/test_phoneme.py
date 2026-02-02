from app.services.phoneme import (
    analyze,
    extract_phonemes,
    katakana_to_hiragana,
)


class TestExtractPhonemes:
    def test_simple_vowels(self) -> None:
        phonemes = extract_phonemes("アイウエオ")
        vowels = [p.vowel for p in phonemes]
        assert vowels == ["a", "i", "u", "e", "o"]

    def test_ka_row(self) -> None:
        phonemes = extract_phonemes("カキクケコ")
        vowels = [p.vowel for p in phonemes]
        consonants = [p.consonant for p in phonemes]
        assert vowels == ["a", "i", "u", "e", "o"]
        assert consonants == ["k", "k", "k", "k", "k"]

    def test_long_vowel(self) -> None:
        # トウキョウ (Tokyo)
        phonemes = extract_phonemes("トウキョウ")
        vowels = [p.vowel for p in phonemes]
        assert vowels == ["o", "u", "o", "u"]

    def test_combination_sound(self) -> None:
        # キャ should be "kya" -> vowel "a", consonant "k"
        phonemes = extract_phonemes("キャ")
        assert len(phonemes) == 1
        assert phonemes[0].vowel == "a"
        assert phonemes[0].consonant == "k"

    def test_nasal(self) -> None:
        # ン should have vowel "n"
        phonemes = extract_phonemes("ニホン")
        vowels = [p.vowel for p in phonemes]
        assert vowels == ["i", "o", "n"]


class TestAnalyze:
    def test_tokyo(self) -> None:
        result = analyze("トウキョウ")
        assert result.vowels == "o-u-o-u"
        assert "t" in result.consonants
        assert "k" in result.consonants

    def test_toukou(self) -> None:
        result = analyze("トウコウ")
        assert result.vowels == "o-u-o-u"

    def test_rap(self) -> None:
        result = analyze("ラップ")
        # ラ(ra) + ッ(skip) + プ(pu)
        vowels = result.vowels.split("-")
        assert "a" in vowels
        assert "u" in vowels


class TestKatakanaToHiragana:
    def test_basic_conversion(self) -> None:
        assert katakana_to_hiragana("トウキョウ") == "とうきょう"
        assert katakana_to_hiragana("ラップ") == "らっぷ"
        assert katakana_to_hiragana("アイウエオ") == "あいうえお"

    def test_mixed_text(self) -> None:
        # Non-katakana characters should remain unchanged
        assert katakana_to_hiragana("ABC") == "ABC"
        assert katakana_to_hiragana("123") == "123"
