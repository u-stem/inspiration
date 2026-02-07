"""English rhyme index service using SQLite."""

import atexit
import sqlite3
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Self


@dataclass
class EnglishIndexEntry:
    """Entry in the English rhyme index."""

    word: str
    pronunciation: str
    katakana: str
    vowels: str
    consonants: str
    syllable_count: int


class EnglishRhymeIndex:
    """SQLite-backed English rhyme index for fast pattern matching."""

    def __init__(self, db_path: str | None = None) -> None:
        self._db_path = db_path
        self._conn: sqlite3.Connection | None = None

    def __enter__(self) -> Self:
        return self

    def __exit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        self.close()

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            if self._db_path is None:
                raise ValueError("Database path not set")
            self._conn = sqlite3.connect(self._db_path)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def search_by_pattern(
        self,
        vowel_pattern: str | None = None,
        consonant_pattern: str | None = None,
        prefix: bool = False,
        suffix: bool = False,
        limit: int = 10000,
    ) -> list[EnglishIndexEntry]:
        """Search entries using SQL-level pattern matching.

        Args:
            vowel_pattern: Vowel pattern to match (hyphen-separated, e.g., 'a-i-u')
            consonant_pattern: Consonant pattern to match
            prefix: If True, match pattern at start
            suffix: If True, match pattern at end
            limit: Maximum number of results

        Returns:
            List of matching entries
        """
        conn = self._get_conn()
        conditions = []
        params: list[str | int] = []

        if vowel_pattern:
            if suffix:
                # Suffix match - pattern at end
                conditions.append("vowels LIKE ?")
                params.append(f"%{vowel_pattern}")
            elif prefix:
                # Prefix match - pattern at start
                conditions.append("vowels LIKE ?")
                params.append(f"{vowel_pattern}%")
            else:
                # Contains
                conditions.append("vowels LIKE ?")
                params.append(f"%{vowel_pattern}%")

        if consonant_pattern:
            if suffix:
                conditions.append("consonants LIKE ?")
                params.append(f"%{consonant_pattern}")
            elif prefix:
                conditions.append("consonants LIKE ?")
                params.append(f"{consonant_pattern}%")
            else:
                conditions.append("consonants LIKE ?")
                params.append(f"%{consonant_pattern}%")

        if not conditions:
            cursor = conn.execute(
                """
                SELECT word, pronunciation, katakana, vowels, consonants, syllable_count
                FROM english_words LIMIT ?
                """,
                (limit,),
            )
        else:
            where_clause = " AND ".join(conditions)
            params.append(limit)
            cursor = conn.execute(
                f"""
                SELECT word, pronunciation, katakana, vowels, consonants, syllable_count
                FROM english_words
                WHERE {where_clause}
                LIMIT ?
                """,
                params,
            )

        return [self._row_to_entry(row) for row in cursor]

    def search_by_vowels(self, pattern: str, limit: int = 100) -> list[EnglishIndexEntry]:
        """Search by vowel pattern suffix match."""
        return self.search_by_pattern(vowel_pattern=pattern, suffix=True, limit=limit)

    def search_by_vowels_prefix(self, pattern: str, limit: int = 100) -> list[EnglishIndexEntry]:
        """Search by vowel pattern prefix match."""
        return self.search_by_pattern(vowel_pattern=pattern, prefix=True, limit=limit)

    def search_exact_vowels(self, pattern: str, limit: int = 100) -> list[EnglishIndexEntry]:
        """Search by exact vowel pattern match."""
        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT word, pronunciation, katakana, vowels, consonants, syllable_count
            FROM english_words
            WHERE vowels = ?
            LIMIT ?
            """,
            (pattern, limit),
        )
        return [self._row_to_entry(row) for row in cursor]

    def get_total_count(self) -> int:
        """Get total number of entries in the index."""
        conn = self._get_conn()
        cursor = conn.execute("SELECT COUNT(*) FROM english_words")
        return cursor.fetchone()[0]

    def _row_to_entry(self, row: sqlite3.Row) -> EnglishIndexEntry:
        return EnglishIndexEntry(
            word=row["word"],
            pronunciation=row["pronunciation"],
            katakana=row["katakana"],
            vowels=row["vowels"],
            consonants=row["consonants"],
            syllable_count=row["syllable_count"],
        )

    def load_from_db(self, db_path: str) -> None:
        """Load index from SQLite database."""
        self._db_path = db_path
        self._conn = None

    def close(self) -> None:
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None


@lru_cache(maxsize=1)
def get_english_rhyme_index(index_path: str) -> EnglishRhymeIndex:
    """Get or create English rhyme index singleton.

    Uses lru_cache for thread-safe caching.
    """
    index = EnglishRhymeIndex()
    path = Path(index_path)

    if path.suffix == ".db" and path.exists():
        index.load_from_db(index_path)
    else:
        raise FileNotFoundError(f"English rhyme index not found: {index_path}")

    atexit.register(index.close)

    return index
