"""English phoneme analysis using ARPAbet to Japanese vowel mapping."""

from dataclasses import dataclass

# ARPAbet vowels to Japanese vowel mapping
# Reference: https://en.wikipedia.org/wiki/ARPABET
ARPABET_TO_JAPANESE_VOWEL: dict[str, str] = {
    # Monophthongs
    "AA": "a",  # father, palm
    "AE": "a",  # cat, bat
    "AH": "a",  # but, sun (schwa when unstressed)
    "AO": "o",  # dog, thought
    "EH": "e",  # bed, red
    "ER": "a",  # bird, her (r-colored vowel, closest to 'a')
    "IH": "i",  # bit, ship
    "IY": "i",  # bee, see
    "UH": "u",  # book, put
    "UW": "u",  # food, blue
    # Diphthongs (mapped to two Japanese vowels)
    "AW": "a-u",  # cow, how
    "AY": "a-i",  # my, buy
    "EY": "e-i",  # say, day
    "OW": "o-u",  # go, show
    "OY": "o-i",  # boy, toy
}

# ARPAbet consonants to romanized consonants
# For pattern matching compatibility with Japanese system
ARPABET_TO_CONSONANT: dict[str, str] = {
    "B": "b",
    "CH": "ch",
    "D": "d",
    "DH": "d",  # this (voiced dental fricative, closest to 'd')
    "F": "f",
    "G": "g",
    "HH": "h",
    "JH": "j",
    "K": "k",
    "L": "r",  # Japanese doesn't distinguish L/R
    "M": "m",
    "N": "n",
    "NG": "n",  # sing (velar nasal, map to 'n')
    "P": "p",
    "R": "r",
    "S": "s",
    "SH": "sh",
    "T": "t",
    "TH": "s",  # think (voiceless dental fricative, closest to 's')
    "V": "b",  # Japanese doesn't have 'v', closest is 'b'
    "W": "w",
    "Y": "y",
    "Z": "z",
    "ZH": "j",  # measure (voiced postalveolar fricative)
}


@dataclass(frozen=True)
class EnglishPhoneme:
    """Represents a single phoneme in English."""

    vowel: str | None
    consonant: str
    arpabet: str  # Original ARPAbet symbol


@dataclass(frozen=True)
class EnglishPhonemeAnalysis:
    """Analysis result for an English word."""

    word: str
    pronunciation: str  # Original ARPAbet string
    vowels: str  # Japanese vowel pattern (e.g., "o-u-o-u")
    consonants: str  # Consonant pattern (e.g., "t-k-y")
    syllable_count: int
    phonemes: list[EnglishPhoneme]


def parse_arpabet(pronunciation: str) -> list[EnglishPhoneme]:
    """Parse ARPAbet pronunciation string into phonemes.

    Args:
        pronunciation: Space-separated ARPAbet symbols (e.g., "T OW1 K Y OW0")

    Returns:
        List of EnglishPhoneme objects
    """
    phonemes: list[EnglishPhoneme] = []
    symbols = pronunciation.split()

    for symbol in symbols:
        # Remove stress markers (0, 1, 2)
        base_symbol = symbol.rstrip("012")

        if base_symbol in ARPABET_TO_JAPANESE_VOWEL:
            # This is a vowel
            vowel = ARPABET_TO_JAPANESE_VOWEL[base_symbol]
            phonemes.append(
                EnglishPhoneme(
                    vowel=vowel,
                    consonant="",
                    arpabet=symbol,
                )
            )
        elif base_symbol in ARPABET_TO_CONSONANT:
            # This is a consonant
            consonant = ARPABET_TO_CONSONANT[base_symbol]
            phonemes.append(
                EnglishPhoneme(
                    vowel=None,
                    consonant=consonant,
                    arpabet=symbol,
                )
            )

    return phonemes


def analyze_english(word: str, pronunciation: str) -> EnglishPhonemeAnalysis:
    """Analyze an English word with its ARPAbet pronunciation.

    Args:
        word: The English word
        pronunciation: ARPAbet pronunciation string

    Returns:
        EnglishPhonemeAnalysis with vowel/consonant patterns
    """
    phonemes = parse_arpabet(pronunciation)

    # Extract vowels (some may be diphthongs like "a-i")
    vowel_list: list[str] = []
    for p in phonemes:
        if p.vowel:
            # Diphthongs are already in "a-i" format
            vowel_list.append(p.vowel)

    # Join vowels with dash, but diphthongs already have internal dashes
    # So we need to flatten: ["a", "a-i", "o"] -> "a-a-i-o"
    vowels = "-".join(vowel_list)

    # Extract consonants
    consonant_list = [p.consonant for p in phonemes if p.consonant]
    consonants = "-".join(consonant_list)

    # Count syllables (number of vowel sounds)
    syllable_count = len(vowel_list)

    return EnglishPhonemeAnalysis(
        word=word,
        pronunciation=pronunciation,
        vowels=vowels,
        consonants=consonants,
        syllable_count=syllable_count,
        phonemes=phonemes,
    )


def arpabet_to_katakana(pronunciation: str) -> str:
    """Convert ARPAbet pronunciation to approximate Katakana.

    This is a rough approximation for display purposes.

    Args:
        pronunciation: ARPAbet pronunciation string

    Returns:
        Approximate Katakana representation
    """
    # Mapping from phoneme sequences to katakana
    # This is simplified and won't be perfect for all words
    ARPABET_TO_KANA: dict[str, str] = {
        # Vowels
        "AA": "ア",
        "AE": "ア",
        "AH": "ア",
        "AO": "オ",
        "EH": "エ",
        "ER": "アー",
        "IH": "イ",
        "IY": "イー",
        "UH": "ウ",
        "UW": "ウー",
        # Diphthongs
        "AW": "アウ",
        "AY": "アイ",
        "EY": "エイ",
        "OW": "オウ",
        "OY": "オイ",
        # Consonants (with default vowel 'u' for standalone)
        "B": "ブ",
        "CH": "チ",
        "D": "ド",
        "DH": "ズ",
        "F": "フ",
        "G": "グ",
        "HH": "ハ",
        "JH": "ジ",
        "K": "ク",
        "L": "ル",
        "M": "ム",
        "N": "ン",
        "NG": "ン",
        "P": "プ",
        "R": "ル",
        "S": "ス",
        "SH": "シ",
        "T": "ト",
        "TH": "ス",
        "V": "ヴ",
        "W": "ウ",
        "Y": "イ",
        "Z": "ズ",
        "ZH": "ジ",
    }

    # Consonant + Vowel combinations
    CV_COMBINATIONS: dict[tuple[str, str], str] = {
        # K combinations
        ("K", "AA"): "カ",
        ("K", "AE"): "カ",
        ("K", "AH"): "カ",
        ("K", "AO"): "コ",
        ("K", "EH"): "ケ",
        ("K", "IH"): "キ",
        ("K", "IY"): "キー",
        ("K", "UH"): "ク",
        ("K", "UW"): "クー",
        ("K", "AW"): "カウ",
        ("K", "AY"): "カイ",
        ("K", "EY"): "ケイ",
        ("K", "OW"): "コウ",
        ("K", "OY"): "コイ",
        # T combinations
        ("T", "AA"): "タ",
        ("T", "AE"): "タ",
        ("T", "AH"): "タ",
        ("T", "AO"): "ト",
        ("T", "EH"): "テ",
        ("T", "IH"): "ティ",
        ("T", "IY"): "ティー",
        ("T", "UH"): "トゥ",
        ("T", "UW"): "トゥー",
        ("T", "AW"): "タウ",
        ("T", "AY"): "タイ",
        ("T", "EY"): "テイ",
        ("T", "OW"): "トウ",
        ("T", "OY"): "トイ",
        # S combinations
        ("S", "AA"): "サ",
        ("S", "AE"): "サ",
        ("S", "AH"): "サ",
        ("S", "AO"): "ソ",
        ("S", "EH"): "セ",
        ("S", "IH"): "シ",
        ("S", "IY"): "シー",
        ("S", "UH"): "ス",
        ("S", "UW"): "スー",
        ("S", "AW"): "サウ",
        ("S", "AY"): "サイ",
        ("S", "EY"): "セイ",
        ("S", "OW"): "ソウ",
        ("S", "OY"): "ソイ",
        # N combinations
        ("N", "AA"): "ナ",
        ("N", "AE"): "ナ",
        ("N", "AH"): "ナ",
        ("N", "AO"): "ノ",
        ("N", "EH"): "ネ",
        ("N", "IH"): "ニ",
        ("N", "IY"): "ニー",
        ("N", "UH"): "ヌ",
        ("N", "UW"): "ヌー",
        ("N", "AW"): "ナウ",
        ("N", "AY"): "ナイ",
        ("N", "EY"): "ネイ",
        ("N", "OW"): "ノウ",
        ("N", "OY"): "ノイ",
        # R combinations
        ("R", "AA"): "ラ",
        ("R", "AE"): "ラ",
        ("R", "AH"): "ラ",
        ("R", "AO"): "ロ",
        ("R", "EH"): "レ",
        ("R", "IH"): "リ",
        ("R", "IY"): "リー",
        ("R", "UH"): "ル",
        ("R", "UW"): "ルー",
        ("R", "AW"): "ラウ",
        ("R", "AY"): "ライ",
        ("R", "EY"): "レイ",
        ("R", "OW"): "ロウ",
        ("R", "OY"): "ロイ",
        # M combinations
        ("M", "AA"): "マ",
        ("M", "AE"): "マ",
        ("M", "AH"): "マ",
        ("M", "AO"): "モ",
        ("M", "EH"): "メ",
        ("M", "IH"): "ミ",
        ("M", "IY"): "ミー",
        ("M", "UH"): "ム",
        ("M", "UW"): "ムー",
        ("M", "AW"): "マウ",
        ("M", "AY"): "マイ",
        ("M", "EY"): "メイ",
        ("M", "OW"): "モウ",
        ("M", "OY"): "モイ",
        # B combinations
        ("B", "AA"): "バ",
        ("B", "AE"): "バ",
        ("B", "AH"): "バ",
        ("B", "AO"): "ボ",
        ("B", "EH"): "ベ",
        ("B", "IH"): "ビ",
        ("B", "IY"): "ビー",
        ("B", "UH"): "ブ",
        ("B", "UW"): "ブー",
        ("B", "AW"): "バウ",
        ("B", "AY"): "バイ",
        ("B", "EY"): "ベイ",
        ("B", "OW"): "ボウ",
        ("B", "OY"): "ボイ",
        # P combinations
        ("P", "AA"): "パ",
        ("P", "AE"): "パ",
        ("P", "AH"): "パ",
        ("P", "AO"): "ポ",
        ("P", "EH"): "ペ",
        ("P", "IH"): "ピ",
        ("P", "IY"): "ピー",
        ("P", "UH"): "プ",
        ("P", "UW"): "プー",
        ("P", "AW"): "パウ",
        ("P", "AY"): "パイ",
        ("P", "EY"): "ペイ",
        ("P", "OW"): "ポウ",
        ("P", "OY"): "ポイ",
        # D combinations
        ("D", "AA"): "ダ",
        ("D", "AE"): "ダ",
        ("D", "AH"): "ダ",
        ("D", "AO"): "ド",
        ("D", "EH"): "デ",
        ("D", "IH"): "ディ",
        ("D", "IY"): "ディー",
        ("D", "UH"): "ドゥ",
        ("D", "UW"): "ドゥー",
        ("D", "AW"): "ダウ",
        ("D", "AY"): "ダイ",
        ("D", "EY"): "デイ",
        ("D", "OW"): "ドウ",
        ("D", "OY"): "ドイ",
        # G combinations
        ("G", "AA"): "ガ",
        ("G", "AE"): "ガ",
        ("G", "AH"): "ガ",
        ("G", "AO"): "ゴ",
        ("G", "EH"): "ゲ",
        ("G", "IH"): "ギ",
        ("G", "IY"): "ギー",
        ("G", "UH"): "グ",
        ("G", "UW"): "グー",
        ("G", "AW"): "ガウ",
        ("G", "AY"): "ガイ",
        ("G", "EY"): "ゲイ",
        ("G", "OW"): "ゴウ",
        ("G", "OY"): "ゴイ",
        # H combinations
        ("HH", "AA"): "ハ",
        ("HH", "AE"): "ハ",
        ("HH", "AH"): "ハ",
        ("HH", "AO"): "ホ",
        ("HH", "EH"): "ヘ",
        ("HH", "IH"): "ヒ",
        ("HH", "IY"): "ヒー",
        ("HH", "UH"): "フ",
        ("HH", "UW"): "フー",
        ("HH", "AW"): "ハウ",
        ("HH", "AY"): "ハイ",
        ("HH", "EY"): "ヘイ",
        ("HH", "OW"): "ホウ",
        ("HH", "OY"): "ホイ",
        # F combinations
        ("F", "AA"): "ファ",
        ("F", "AE"): "ファ",
        ("F", "AH"): "ファ",
        ("F", "AO"): "フォ",
        ("F", "EH"): "フェ",
        ("F", "IH"): "フィ",
        ("F", "IY"): "フィー",
        ("F", "UH"): "フ",
        ("F", "UW"): "フー",
        ("F", "AW"): "ファウ",
        ("F", "AY"): "ファイ",
        ("F", "EY"): "フェイ",
        ("F", "OW"): "フォウ",
        ("F", "OY"): "フォイ",
        # W combinations
        ("W", "AA"): "ワ",
        ("W", "AE"): "ワ",
        ("W", "AH"): "ワ",
        ("W", "AO"): "ウォ",
        ("W", "EH"): "ウェ",
        ("W", "IH"): "ウィ",
        ("W", "IY"): "ウィー",
        ("W", "UH"): "ウ",
        ("W", "UW"): "ウー",
        ("W", "AW"): "ワウ",
        ("W", "AY"): "ワイ",
        ("W", "EY"): "ウェイ",
        ("W", "OW"): "ウォウ",
        ("W", "OY"): "ウォイ",
        # Y combinations
        ("Y", "AA"): "ヤ",
        ("Y", "AE"): "ヤ",
        ("Y", "AH"): "ヤ",
        ("Y", "AO"): "ヨ",
        ("Y", "EH"): "イェ",
        ("Y", "IH"): "イ",
        ("Y", "IY"): "イー",
        ("Y", "UH"): "ユ",
        ("Y", "UW"): "ユー",
        ("Y", "AW"): "ヤウ",
        ("Y", "AY"): "ヤイ",
        ("Y", "EY"): "イェイ",
        ("Y", "OW"): "ヨウ",
        ("Y", "OY"): "ヨイ",
        # L combinations
        ("L", "AA"): "ラ",
        ("L", "AE"): "ラ",
        ("L", "AH"): "ラ",
        ("L", "AO"): "ロ",
        ("L", "EH"): "レ",
        ("L", "IH"): "リ",
        ("L", "IY"): "リー",
        ("L", "UH"): "ル",
        ("L", "UW"): "ルー",
        ("L", "AW"): "ラウ",
        ("L", "AY"): "ライ",
        ("L", "EY"): "レイ",
        ("L", "OW"): "ロウ",
        ("L", "OY"): "ロイ",
        # SH combinations
        ("SH", "AA"): "シャ",
        ("SH", "AE"): "シャ",
        ("SH", "AH"): "シャ",
        ("SH", "AO"): "ショ",
        ("SH", "EH"): "シェ",
        ("SH", "IH"): "シ",
        ("SH", "IY"): "シー",
        ("SH", "UH"): "シュ",
        ("SH", "UW"): "シュー",
        ("SH", "AW"): "シャウ",
        ("SH", "AY"): "シャイ",
        ("SH", "EY"): "シェイ",
        ("SH", "OW"): "ショウ",
        ("SH", "OY"): "ショイ",
        # CH combinations
        ("CH", "AA"): "チャ",
        ("CH", "AE"): "チャ",
        ("CH", "AH"): "チャ",
        ("CH", "AO"): "チョ",
        ("CH", "EH"): "チェ",
        ("CH", "IH"): "チ",
        ("CH", "IY"): "チー",
        ("CH", "UH"): "チュ",
        ("CH", "UW"): "チュー",
        ("CH", "AW"): "チャウ",
        ("CH", "AY"): "チャイ",
        ("CH", "EY"): "チェイ",
        ("CH", "OW"): "チョウ",
        ("CH", "OY"): "チョイ",
        # JH combinations
        ("JH", "AA"): "ジャ",
        ("JH", "AE"): "ジャ",
        ("JH", "AH"): "ジャ",
        ("JH", "AO"): "ジョ",
        ("JH", "EH"): "ジェ",
        ("JH", "IH"): "ジ",
        ("JH", "IY"): "ジー",
        ("JH", "UH"): "ジュ",
        ("JH", "UW"): "ジュー",
        ("JH", "AW"): "ジャウ",
        ("JH", "AY"): "ジャイ",
        ("JH", "EY"): "ジェイ",
        ("JH", "OW"): "ジョウ",
        ("JH", "OY"): "ジョイ",
        # V combinations
        ("V", "AA"): "ヴァ",
        ("V", "AE"): "ヴァ",
        ("V", "AH"): "ヴァ",
        ("V", "AO"): "ヴォ",
        ("V", "EH"): "ヴェ",
        ("V", "IH"): "ヴィ",
        ("V", "IY"): "ヴィー",
        ("V", "UH"): "ヴ",
        ("V", "UW"): "ヴー",
        ("V", "AW"): "ヴァウ",
        ("V", "AY"): "ヴァイ",
        ("V", "EY"): "ヴェイ",
        ("V", "OW"): "ヴォウ",
        ("V", "OY"): "ヴォイ",
        # Z combinations
        ("Z", "AA"): "ザ",
        ("Z", "AE"): "ザ",
        ("Z", "AH"): "ザ",
        ("Z", "AO"): "ゾ",
        ("Z", "EH"): "ゼ",
        ("Z", "IH"): "ジ",
        ("Z", "IY"): "ジー",
        ("Z", "UH"): "ズ",
        ("Z", "UW"): "ズー",
        ("Z", "AW"): "ザウ",
        ("Z", "AY"): "ザイ",
        ("Z", "EY"): "ゼイ",
        ("Z", "OW"): "ゾウ",
        ("Z", "OY"): "ゾイ",
        # TH combinations (voiceless, map to S-like)
        ("TH", "AA"): "サ",
        ("TH", "AE"): "サ",
        ("TH", "AH"): "サ",
        ("TH", "AO"): "ソ",
        ("TH", "EH"): "セ",
        ("TH", "IH"): "シ",
        ("TH", "IY"): "シー",
        ("TH", "UH"): "ス",
        ("TH", "UW"): "スー",
        # DH combinations (voiced, map to Z-like)
        ("DH", "AA"): "ザ",
        ("DH", "AE"): "ザ",
        ("DH", "AH"): "ザ",
        ("DH", "AO"): "ゾ",
        ("DH", "EH"): "ゼ",
        ("DH", "IH"): "ジ",
        ("DH", "IY"): "ジー",
        ("DH", "UH"): "ズ",
        ("DH", "UW"): "ズー",
    }

    symbols = pronunciation.split()
    result: list[str] = []
    i = 0

    while i < len(symbols):
        symbol = symbols[i]
        base_symbol = symbol.rstrip("012")

        # Check if this is a consonant followed by a vowel
        if i + 1 < len(symbols):
            next_symbol = symbols[i + 1]
            next_base = next_symbol.rstrip("012")

            if base_symbol in ARPABET_TO_CONSONANT and next_base in ARPABET_TO_JAPANESE_VOWEL:
                # Try CV combination
                cv_key = (base_symbol, next_base)
                if cv_key in CV_COMBINATIONS:
                    result.append(CV_COMBINATIONS[cv_key])
                    i += 2
                    continue

        # Single symbol
        if base_symbol in ARPABET_TO_KANA:
            result.append(ARPABET_TO_KANA[base_symbol])

        i += 1

    return "".join(result)
