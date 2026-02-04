from enum import Enum

from pydantic import BaseModel, Field


class SortOrder(str, Enum):
    RELEVANCE = "relevance"  # 関連度順（漢字優先）
    READING_ASC = "reading_asc"  # 五十音順（昇順）
    READING_DESC = "reading_desc"  # 五十音順（降順）
    MORA_ASC = "mora_asc"  # モーラ数（短い順）
    MORA_DESC = "mora_desc"  # モーラ数（長い順）


# ========== New Pattern-based API Schemas ==========


class Phoneme(BaseModel):
    """音素（子音+母音のペア）"""

    consonant: str = Field(description="Consonant: k, s, t, n, etc. Empty string for vowels.")
    vowel: str = Field(description="Vowel: a, i, u, e, o, n (for ん)")
    display: str = Field(default="", description="Display character (hiragana)")


class PatternSearchRequest(BaseModel):
    """パターンベースの韻検索リクエスト"""

    reading: str = Field(..., min_length=1, description="Hiragana reading")
    pattern: str = Field(
        ..., min_length=1, description="Search pattern (* = any length, _ = any single phoneme)"
    )
    sort: SortOrder = Field(default=SortOrder.RELEVANCE, description="Sort order")
    limit: int = Field(default=20, ge=1, le=500)
    offset: int = Field(default=0, ge=0)
    mora_min: int | None = Field(default=None, ge=1, description="Minimum mora count filter")
    mora_max: int | None = Field(default=None, ge=1, description="Maximum mora count filter")


class PatternAnalyzeResponse(BaseModel):
    """音素解析レスポンス（新API用）"""

    reading: str = Field(description="Input hiragana reading")
    phonemes: list[Phoneme] = Field(description="List of phonemes")
    vowel_pattern: str = Field(description="Vowel pattern (e.g., u-a)")
    consonant_pattern: str = Field(description="Consonant pattern (e.g., k-s)")


class PatternRhymeResult(BaseModel):
    """パターン検索の結果"""

    word: str = Field(description="Matched word")
    reading: str = Field(description="Reading in hiragana")
    phonemes: list[Phoneme] = Field(description="Phoneme list")
    vowel_pattern: str = Field(description="Vowel pattern")
    consonant_pattern: str = Field(description="Consonant pattern")
    mora_count: int = Field(description="Number of morae")
    score: int = Field(ge=0, le=100, description="Match score")


class PatternSearchResponse(BaseModel):
    """パターン検索レスポンス"""

    input: PatternAnalyzeResponse = Field(description="Input analysis")
    pattern: str = Field(description="Applied search pattern")
    results: list[PatternRhymeResult] = Field(description="Search results")
    total: int = Field(description="Total number of matches")
    page: int = Field(description="Current page number (1-based)")
    per_page: int = Field(description="Results per page")
    total_pages: int = Field(description="Total number of pages")


class IndexUpdateResponse(BaseModel):
    added: int = Field(description="追加された単語数")
    total: int = Field(description="インデックス内の総単語数")
    message: str = Field(description="更新結果のメッセージ")


# ========== English Rhyme Search Schemas ==========


class Language(str, Enum):
    """Search language"""
    JAPANESE = "ja"
    ENGLISH = "en"


class EnglishRhymeResult(BaseModel):
    """英語韻検索の結果"""

    word: str = Field(description="English word")
    pronunciation: str = Field(description="ARPAbet pronunciation")
    katakana: str = Field(description="Approximate katakana reading")
    vowel_pattern: str = Field(description="Vowel pattern (Japanese-style)")
    consonant_pattern: str = Field(description="Consonant pattern")
    syllable_count: int = Field(description="Number of syllables")
    score: int = Field(ge=0, le=100, description="Match score")


class EnglishSearchRequest(BaseModel):
    """英語韻検索リクエスト"""

    reading: str = Field(..., min_length=1, description="Hiragana reading")
    pattern: str = Field(
        ..., min_length=1, description="Search pattern (* = any length, _ = any single phoneme)"
    )
    sort: SortOrder = Field(default=SortOrder.RELEVANCE, description="Sort order")
    limit: int = Field(default=20, ge=1, le=500)
    offset: int = Field(default=0, ge=0)
    mora_min: int | None = Field(default=None, ge=1, description="Minimum syllable count filter")
    mora_max: int | None = Field(default=None, ge=1, description="Maximum syllable count filter")


class EnglishSearchResponse(BaseModel):
    """英語韻検索レスポンス"""

    input: PatternAnalyzeResponse = Field(description="Input analysis (Japanese)")
    pattern: str = Field(description="Applied search pattern")
    results: list[EnglishRhymeResult] = Field(description="English search results")
    total: int = Field(description="Total number of matches")
    page: int = Field(description="Current page number (1-based)")
    per_page: int = Field(description="Results per page")
    total_pages: int = Field(description="Total number of pages")
