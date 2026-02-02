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
        # キャ should be "kya" -> vowel "a", consonant "ky"
        phonemes = extract_phonemes("キャ")
        assert len(phonemes) == 1
        assert phonemes[0].vowel == "a"
        assert phonemes[0].consonant == "ky"

    def test_nasal(self) -> None:
        # ン should have vowel "n"
        phonemes = extract_phonemes("ニホン")
        vowels = [p.vowel for p in phonemes]
        assert vowels == ["i", "o", "n"]

    def test_all_youon_consonants(self) -> None:
        """Test all supported youon (拗音) consonants"""
        test_cases = [
            ("キャ", "ky", "a"),
            ("キュ", "ky", "u"),
            ("キョ", "ky", "o"),
            ("ギャ", "gy", "a"),
            ("ギュ", "gy", "u"),
            ("ギョ", "gy", "o"),
            ("シャ", "sh", "a"),  # sh does not add y
            ("シュ", "sh", "u"),
            ("ショ", "sh", "o"),
            ("ジャ", "j", "a"),  # j does not add y
            ("ジュ", "j", "u"),
            ("ジョ", "j", "o"),
            ("チャ", "ch", "a"),  # ch does not add y
            ("チュ", "ch", "u"),
            ("チョ", "ch", "o"),
            ("ニャ", "ny", "a"),
            ("ニュ", "ny", "u"),
            ("ニョ", "ny", "o"),
            ("ヒャ", "hy", "a"),
            ("ヒュ", "hy", "u"),
            ("ヒョ", "hy", "o"),
            ("ビャ", "by", "a"),
            ("ビュ", "by", "u"),
            ("ビョ", "by", "o"),
            ("ピャ", "py", "a"),
            ("ピュ", "py", "u"),
            ("ピョ", "py", "o"),
            ("ミャ", "my", "a"),
            ("ミュ", "my", "u"),
            ("ミョ", "my", "o"),
            ("リャ", "ry", "a"),
            ("リュ", "ry", "u"),
            ("リョ", "ry", "o"),
        ]
        for kana, expected_cons, expected_vowel in test_cases:
            phonemes = extract_phonemes(kana)
            assert len(phonemes) == 1, f"Expected 1 phoneme for {kana}"
            assert phonemes[0].consonant == expected_cons, f"Consonant mismatch for {kana}"
            assert phonemes[0].vowel == expected_vowel, f"Vowel mismatch for {kana}"

    def test_sokuon(self) -> None:
        """Test sokuon (促音) っ handling"""
        phonemes = extract_phonemes("ガッコウ")
        assert len(phonemes) == 4
        # ガ
        assert phonemes[0].consonant == "g"
        assert phonemes[0].vowel == "a"
        # ッ (sokuon)
        assert phonemes[1].consonant == "Q"
        assert phonemes[1].vowel is None
        # コ
        assert phonemes[2].consonant == "k"
        assert phonemes[2].vowel == "o"
        # ウ
        assert phonemes[3].consonant == ""
        assert phonemes[3].vowel == "u"

    def test_hatsuon(self) -> None:
        """Test hatsuon (撥音) ん handling"""
        phonemes = extract_phonemes("カンタン")
        assert len(phonemes) == 4
        # カ
        assert phonemes[0].consonant == "k"
        assert phonemes[0].vowel == "a"
        # ン
        assert phonemes[1].consonant == "N"
        assert phonemes[1].vowel == "n"
        # タ
        assert phonemes[2].consonant == "t"
        assert phonemes[2].vowel == "a"
        # ン
        assert phonemes[3].consonant == "N"
        assert phonemes[3].vowel == "n"

    def test_chouon(self) -> None:
        """Test chouon (長音) ー handling"""
        phonemes = extract_phonemes("カー")
        assert len(phonemes) == 2
        # カ
        assert phonemes[0].consonant == "k"
        assert phonemes[0].vowel == "a"
        # ー (repeats previous vowel)
        assert phonemes[1].consonant == ""
        assert phonemes[1].vowel == "a"

    def test_display_field(self) -> None:
        """Test that display field contains original characters"""
        phonemes = extract_phonemes("キャ")
        assert phonemes[0].display == "キャ"

        phonemes = extract_phonemes("シュ")
        assert phonemes[0].display == "シュ"

    def test_invalid_youon_combinations(self) -> None:
        """Test that invalid/non-standard youon combinations don't add 'y'"""
        # ツャ - ts should not become tsy (non-standard combination)
        phonemes = extract_phonemes("ツャ")
        assert phonemes[0].consonant == "ts"  # not "tsy"
        assert phonemes[0].vowel == "a"

        # ッャ - Q (sokuon) should not become Qy (invalid combination)
        phonemes = extract_phonemes("ッャ")
        assert phonemes[0].consonant == "Q"  # not "Qy"
        assert phonemes[0].vowel == "a"


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
