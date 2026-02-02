from dataclasses import dataclass

# カタカナから母音へのマッピング
VOWEL_MAP: dict[str, str | None] = {
    # 母音
    "ア": "a",
    "イ": "i",
    "ウ": "u",
    "エ": "e",
    "オ": "o",
    # カ行
    "カ": "a",
    "キ": "i",
    "ク": "u",
    "ケ": "e",
    "コ": "o",
    "ガ": "a",
    "ギ": "i",
    "グ": "u",
    "ゲ": "e",
    "ゴ": "o",
    # サ行
    "サ": "a",
    "シ": "i",
    "ス": "u",
    "セ": "e",
    "ソ": "o",
    "ザ": "a",
    "ジ": "i",
    "ズ": "u",
    "ゼ": "e",
    "ゾ": "o",
    # タ行
    "タ": "a",
    "チ": "i",
    "ツ": "u",
    "テ": "e",
    "ト": "o",
    "ダ": "a",
    "ヂ": "i",
    "ヅ": "u",
    "デ": "e",
    "ド": "o",
    # ナ行
    "ナ": "a",
    "ニ": "i",
    "ヌ": "u",
    "ネ": "e",
    "ノ": "o",
    # ハ行
    "ハ": "a",
    "ヒ": "i",
    "フ": "u",
    "ヘ": "e",
    "ホ": "o",
    "バ": "a",
    "ビ": "i",
    "ブ": "u",
    "ベ": "e",
    "ボ": "o",
    "パ": "a",
    "ピ": "i",
    "プ": "u",
    "ペ": "e",
    "ポ": "o",
    # マ行
    "マ": "a",
    "ミ": "i",
    "ム": "u",
    "メ": "e",
    "モ": "o",
    # ヤ行
    "ヤ": "a",
    "ユ": "u",
    "ヨ": "o",
    # ラ行
    "ラ": "a",
    "リ": "i",
    "ル": "u",
    "レ": "e",
    "ロ": "o",
    # ワ行
    "ワ": "a",
    "ヲ": "o",
    # 特殊
    "ン": "n",
    "ッ": None,  # 促音（スキップ）
    "ー": None,  # 長音符（別途処理）
    # 小書き仮名（拗音用）
    "ァ": "a",
    "ィ": "i",
    "ゥ": "u",
    "ェ": "e",
    "ォ": "o",
    "ャ": "a",
    "ュ": "u",
    "ョ": "o",
}

# カタカナから子音へのマッピング
CONSONANT_MAP: dict[str, str] = {
    # 母音（子音なし）
    "ア": "",
    "イ": "",
    "ウ": "",
    "エ": "",
    "オ": "",
    # カ行
    "カ": "k",
    "キ": "k",
    "ク": "k",
    "ケ": "k",
    "コ": "k",
    "ガ": "g",
    "ギ": "g",
    "グ": "g",
    "ゲ": "g",
    "ゴ": "g",
    # サ行
    "サ": "s",
    "シ": "sh",
    "ス": "s",
    "セ": "s",
    "ソ": "s",
    "ザ": "z",
    "ジ": "j",
    "ズ": "z",
    "ゼ": "z",
    "ゾ": "z",
    # タ行
    "タ": "t",
    "チ": "ch",
    "ツ": "ts",
    "テ": "t",
    "ト": "t",
    "ダ": "d",
    "ヂ": "j",
    "ヅ": "z",
    "デ": "d",
    "ド": "d",
    # ナ行
    "ナ": "n",
    "ニ": "n",
    "ヌ": "n",
    "ネ": "n",
    "ノ": "n",
    # ハ行
    "ハ": "h",
    "ヒ": "h",
    "フ": "f",
    "ヘ": "h",
    "ホ": "h",
    "バ": "b",
    "ビ": "b",
    "ブ": "b",
    "ベ": "b",
    "ボ": "b",
    "パ": "p",
    "ピ": "p",
    "プ": "p",
    "ペ": "p",
    "ポ": "p",
    # マ行
    "マ": "m",
    "ミ": "m",
    "ム": "m",
    "メ": "m",
    "モ": "m",
    # ヤ行
    "ヤ": "y",
    "ユ": "y",
    "ヨ": "y",
    # ラ行
    "ラ": "r",
    "リ": "r",
    "ル": "r",
    "レ": "r",
    "ロ": "r",
    # ワ行
    "ワ": "w",
    "ヲ": "w",
    # 特殊
    "ン": "N",  # 撥音（ナ行と区別）
    "ッ": "Q",  # 促音マーカー
    "ー": "",  # 長音（子音なし）
    # 小書き仮名
    "ァ": "",
    "ィ": "",
    "ゥ": "",
    "ェ": "",
    "ォ": "",
    "ャ": "y",
    "ュ": "y",
    "ョ": "y",
}


@dataclass(frozen=True)
class Phoneme:
    vowel: str | None
    consonant: str


@dataclass(frozen=True)
class PhonemeAnalysis:
    reading: str
    vowels: str
    consonants: str
    mora_count: int
    initial_consonant: str  # 先頭の子音（完全韻判定用）


def extract_phonemes(katakana: str) -> list[Phoneme]:
    """カタカナ文字列から音素を抽出する"""
    phonemes: list[Phoneme] = []
    prev_vowel: str | None = None

    for char in katakana:
        if char == "ー" and prev_vowel:
            # 長音: 直前の母音を繰り返す
            phonemes.append(Phoneme(vowel=prev_vowel, consonant=""))
            continue

        vowel = VOWEL_MAP.get(char)
        consonant = CONSONANT_MAP.get(char, "")

        # 小書き仮名の処理（キャ、シュなどの拗音）
        if char in ("ャ", "ュ", "ョ", "ァ", "ィ", "ゥ", "ェ", "ォ") and phonemes:
            # 直前の音素の母音を置き換える
            prev = phonemes[-1]
            phonemes[-1] = Phoneme(vowel=vowel, consonant=prev.consonant)
            prev_vowel = vowel
            continue

        if vowel is not None or consonant:
            phonemes.append(Phoneme(vowel=vowel, consonant=consonant))
            prev_vowel = vowel

    return phonemes


def count_morae(katakana: str) -> int:
    """カタカナ文字列のモーラ数をカウントする

    日本語のモーラ計算ルール:
    - 通常の仮名 = 各1モーラ
    - 小書き仮名（ャュョァィゥェォ）= 0モーラ（直前と合わせて1モーラ）
    - ン（撥音）= 1モーラ
    - ッ（促音）= 1モーラ
    - ー（長音）= 1モーラ
    """
    mora = 0
    small_kana = set("ャュョァィゥェォ")

    for char in katakana:
        if char in small_kana:
            continue
        if char in VOWEL_MAP or char in CONSONANT_MAP:
            mora += 1

    return mora


def get_initial_consonant(katakana: str) -> str:
    """カタカナ文字列の先頭子音を取得する

    完全韻の判定では先頭子音が異なる必要がある。
    母音で始まる場合は空文字を返す。
    """
    if not katakana:
        return ""

    first_char = katakana[0]
    return CONSONANT_MAP.get(first_char, "")


def analyze(katakana: str) -> PhonemeAnalysis:
    """カタカナ文字列を解析し、母音・子音パターンを返す"""
    phonemes = extract_phonemes(katakana)

    vowels = "-".join(p.vowel for p in phonemes if p.vowel)
    consonants = "-".join(p.consonant for p in phonemes if p.consonant)
    mora_count = count_morae(katakana)
    initial_consonant = get_initial_consonant(katakana)

    return PhonemeAnalysis(
        reading=katakana,
        vowels=vowels,
        consonants=consonants,
        mora_count=mora_count,
        initial_consonant=initial_consonant,
    )


def katakana_to_hiragana(text: str) -> str:
    """カタカナをひらがなに変換する"""
    result = []
    for char in text:
        code = ord(char)
        if 0x30A1 <= code <= 0x30F6:
            result.append(chr(code - 0x60))
        else:
            result.append(char)
    return "".join(result)


def hiragana_to_katakana(text: str) -> str:
    """ひらがなをカタカナに変換する"""
    result = []
    for char in text:
        code = ord(char)
        if 0x3041 <= code <= 0x3096:
            result.append(chr(code + 0x60))
        else:
            result.append(char)
    return "".join(result)


def is_hiragana(text: str) -> bool:
    """文字列がひらがなのみで構成されているか判定"""
    for char in text:
        code = ord(char)
        # ひらがな範囲（0x3041-0x3096）と長音符（ー）を許可
        if not (0x3041 <= code <= 0x3096 or char == "ー"):
            return False
    return len(text) > 0


def analyze_hiragana(reading: str) -> PhonemeAnalysis:
    """ひらがなを直接音素解析する（MeCab不要）

    Args:
        reading: ひらがな文字列

    Returns:
        PhonemeAnalysis: 音素解析結果
    """
    katakana = hiragana_to_katakana(reading)
    return analyze(katakana)


def extract_phonemes_detailed(katakana: str) -> list[Phoneme]:
    """カタカナ文字列から詳細な音素リストを抽出する

    子音と母音のペアを明示的に返す。
    """
    phonemes: list[Phoneme] = []
    prev_vowel: str | None = None

    for char in katakana:
        if char == "ー" and prev_vowel:
            phonemes.append(Phoneme(vowel=prev_vowel, consonant=""))
            continue

        vowel = VOWEL_MAP.get(char)
        consonant = CONSONANT_MAP.get(char, "")

        # 小書き仮名の処理
        if char in ("ャ", "ュ", "ョ", "ァ", "ィ", "ゥ", "ェ", "ォ") and phonemes:
            prev = phonemes[-1]
            phonemes[-1] = Phoneme(vowel=vowel, consonant=prev.consonant)
            prev_vowel = vowel
            continue

        if vowel is not None or consonant:
            phonemes.append(Phoneme(vowel=vowel, consonant=consonant))
            prev_vowel = vowel

    return phonemes
