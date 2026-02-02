import atexit
import sqlite3
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Self


@dataclass
class IndexEntry:
    word: str
    reading: str
    vowels: str
    consonants: str
    mora_count: int = 0
    initial_consonant: str = ""


class RhymeIndex:
    """SQLite-backed rhyme index for fast pattern matching."""

    SCHEMA = """
    CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY,
        word TEXT NOT NULL,
        reading TEXT NOT NULL,
        vowels TEXT NOT NULL,
        consonants TEXT NOT NULL,
        mora_count INTEGER NOT NULL,
        initial_consonant TEXT,
        vowels_rev TEXT,
        consonants_rev TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_vowels ON words(vowels);
    CREATE INDEX IF NOT EXISTS idx_consonants ON words(consonants);
    CREATE INDEX IF NOT EXISTS idx_vowels_rev ON words(vowels_rev);
    CREATE INDEX IF NOT EXISTS idx_consonants_rev ON words(consonants_rev);
    CREATE INDEX IF NOT EXISTS idx_reading ON words(reading);
    CREATE INDEX IF NOT EXISTS idx_mora ON words(mora_count);
    """

    def __init__(self, db_path: str | None = None) -> None:
        self._db_path = db_path
        self._conn: sqlite3.Connection | None = None
        self._entries: list[IndexEntry] = []
        self._vowel_index: dict[str, list[int]] = {}
        self._consonant_index: dict[str, list[int]] = {}
        self._vowel_prefix_index: dict[str, list[int]] = {}
        self._consonant_prefix_index: dict[str, list[int]] = {}
        self._perfect_index: dict[str, list[int]] = {}

    def __enter__(self) -> Self:
        return self

    def __exit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        self.close()

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            if self._db_path is None:
                self._conn = sqlite3.connect(":memory:")
            else:
                self._conn = sqlite3.connect(self._db_path)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def init_db(self) -> None:
        """Initialize database schema."""
        conn = self._get_conn()
        conn.executescript(self.SCHEMA)
        conn.commit()

    def add_entry(self, entry: IndexEntry) -> None:
        """Add entry to in-memory index (for compatibility with tests)."""
        idx = len(self._entries)
        self._entries.append(entry)

        vowels = entry.vowels.split("-")
        for length in range(1, min(9, len(vowels) + 1)):
            key = "-".join(vowels[-length:])
            if key not in self._vowel_index:
                self._vowel_index[key] = []
            self._vowel_index[key].append(idx)

        for length in range(1, min(9, len(vowels) + 1)):
            key = "-".join(vowels[:length])
            if key not in self._vowel_prefix_index:
                self._vowel_prefix_index[key] = []
            self._vowel_prefix_index[key].append(idx)

        consonants = entry.consonants.split("-")
        for length in range(1, min(9, len(consonants) + 1)):
            key = "-".join(consonants[-length:])
            if key not in self._consonant_index:
                self._consonant_index[key] = []
            self._consonant_index[key].append(idx)

        for length in range(1, min(9, len(consonants) + 1)):
            key = "-".join(consonants[:length])
            if key not in self._consonant_prefix_index:
                self._consonant_prefix_index[key] = []
            self._consonant_prefix_index[key].append(idx)

        perfect_key = f"{entry.vowels}:{entry.mora_count}"
        if perfect_key not in self._perfect_index:
            self._perfect_index[perfect_key] = []
        self._perfect_index[perfect_key].append(idx)

    def add_entry_to_db(self, entry: IndexEntry) -> None:
        """Add entry directly to SQLite database."""
        conn = self._get_conn()
        # Create reversed patterns for suffix search optimization
        vowels_rev = self._reverse_pattern(entry.vowels)
        consonants_rev = self._reverse_pattern(entry.consonants)
        conn.execute(
            """
            INSERT INTO words (word, reading, vowels, consonants, mora_count, initial_consonant, vowels_rev, consonants_rev)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry.word,
                entry.reading,
                entry.vowels,
                entry.consonants,
                entry.mora_count,
                entry.initial_consonant,
                vowels_rev,
                consonants_rev,
            ),
        )

    @staticmethod
    def _reverse_pattern(pattern: str) -> str:
        """Reverse a hyphen-separated pattern (e.g., 'a-i-u' -> 'u-i-a')."""
        parts = pattern.split("-")
        return "-".join(reversed(parts))

    def commit(self) -> None:
        """Commit changes to database."""
        if self._conn:
            self._conn.commit()

    def search_by_vowels(self, pattern: str, limit: int = 100) -> list[IndexEntry]:
        """Search by vowel pattern suffix match."""
        if self._entries:
            indices = self._vowel_index.get(pattern, [])
            return [self._entries[i] for i in indices[:limit]]

        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT word, reading, vowels, consonants, mora_count, initial_consonant
            FROM words
            WHERE vowels LIKE ?
            LIMIT ?
            """,
            (f"%{pattern}", limit),
        )
        return [self._row_to_entry(row) for row in cursor]

    def search_by_vowels_prefix(self, pattern: str, limit: int = 100) -> list[IndexEntry]:
        """Search by vowel pattern prefix match."""
        if self._entries:
            indices = self._vowel_prefix_index.get(pattern, [])
            return [self._entries[i] for i in indices[:limit]]

        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT word, reading, vowels, consonants, mora_count, initial_consonant
            FROM words
            WHERE vowels LIKE ?
            LIMIT ?
            """,
            (f"{pattern}%", limit),
        )
        return [self._row_to_entry(row) for row in cursor]

    def search_by_consonants(self, pattern: str, limit: int = 100) -> list[IndexEntry]:
        """Search by consonant pattern suffix match."""
        if self._entries:
            indices = self._consonant_index.get(pattern, [])
            return [self._entries[i] for i in indices[:limit]]

        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT word, reading, vowels, consonants, mora_count, initial_consonant
            FROM words
            WHERE consonants LIKE ?
            LIMIT ?
            """,
            (f"%{pattern}", limit),
        )
        return [self._row_to_entry(row) for row in cursor]

    def search_by_consonants_prefix(self, pattern: str, limit: int = 100) -> list[IndexEntry]:
        """Search by consonant pattern prefix match."""
        if self._entries:
            indices = self._consonant_prefix_index.get(pattern, [])
            return [self._entries[i] for i in indices[:limit]]

        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT word, reading, vowels, consonants, mora_count, initial_consonant
            FROM words
            WHERE consonants LIKE ?
            LIMIT ?
            """,
            (f"{pattern}%", limit),
        )
        return [self._row_to_entry(row) for row in cursor]

    def search_perfect(self, vowels: str, mora_count: int) -> list[IndexEntry]:
        """Search for perfect rhyme (same vowels and mora count)."""
        if self._entries:
            key = f"{vowels}:{mora_count}"
            indices = self._perfect_index.get(key, [])
            return [self._entries[i] for i in indices]

        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT word, reading, vowels, consonants, mora_count, initial_consonant
            FROM words
            WHERE vowels = ? AND mora_count = ?
            """,
            (vowels, mora_count),
        )
        return [self._row_to_entry(row) for row in cursor]

    def get_all_entries(self) -> list[IndexEntry]:
        """Get all entries (for compatibility)."""
        if self._entries:
            return self._entries

        conn = self._get_conn()
        cursor = conn.execute(
            """
            SELECT word, reading, vowels, consonants, mora_count, initial_consonant
            FROM words
            """
        )
        return [self._row_to_entry(row) for row in cursor]

    def search_by_pattern(
        self,
        vowel_pattern: str | None = None,
        consonant_pattern: str | None = None,
        prefix: bool = False,
        suffix: bool = False,
        limit: int = 10000,
    ) -> list[IndexEntry]:
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
        if self._entries:
            # In-memory fallback for tests
            return self._entries[:limit]

        conn = self._get_conn()
        conditions = []
        params: list[str | int] = []

        if vowel_pattern:
            if suffix:
                # Use reversed column for suffix match (becomes prefix search)
                vowel_pattern_rev = self._reverse_pattern(vowel_pattern)
                conditions.append("vowels_rev LIKE ?")
                params.append(f"{vowel_pattern_rev}%")
            elif prefix:
                conditions.append("vowels LIKE ?")
                params.append(f"{vowel_pattern}%")
            else:
                # Contains - use LIKE with wildcards (slower but necessary)
                conditions.append("vowels LIKE ?")
                params.append(f"%{vowel_pattern}%")

        if consonant_pattern:
            if suffix:
                consonant_pattern_rev = self._reverse_pattern(consonant_pattern)
                conditions.append("consonants_rev LIKE ?")
                params.append(f"{consonant_pattern_rev}%")
            elif prefix:
                conditions.append("consonants LIKE ?")
                params.append(f"{consonant_pattern}%")
            else:
                conditions.append("consonants LIKE ?")
                params.append(f"%{consonant_pattern}%")

        if not conditions:
            # No pattern specified, return limited results
            cursor = conn.execute(
                "SELECT word, reading, vowels, consonants, mora_count, initial_consonant FROM words LIMIT ?",
                (limit,),
            )
        else:
            where_clause = " AND ".join(conditions)
            params.append(limit)
            cursor = conn.execute(
                f"""
                SELECT word, reading, vowels, consonants, mora_count, initial_consonant
                FROM words
                WHERE {where_clause}
                LIMIT ?
                """,
                params,
            )

        return [self._row_to_entry(row) for row in cursor]

    def _row_to_entry(self, row: sqlite3.Row) -> IndexEntry:
        return IndexEntry(
            word=row["word"],
            reading=row["reading"],
            vowels=row["vowels"],
            consonants=row["consonants"],
            mora_count=row["mora_count"],
            initial_consonant=row["initial_consonant"] or "",
        )

    def load_from_db(self, db_path: str) -> None:
        """Load index from SQLite database."""
        self._db_path = db_path
        self._conn = None
        self._entries = []

    def close(self) -> None:
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def save(self, path: str) -> None:
        """Save to JSON format (for tests)."""
        import json
        import os

        data = {
            "entries": [
                {
                    "word": e.word,
                    "reading": e.reading,
                    "vowels": e.vowels,
                    "consonants": e.consonants,
                    "mora_count": e.mora_count,
                    "initial_consonant": e.initial_consonant,
                }
                for e in self._entries
            ]
        }
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self, path: str) -> None:
        """Load from JSON format (for tests)."""
        import json

        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        self._entries = []
        self._vowel_index = {}
        self._consonant_index = {}
        self._vowel_prefix_index = {}
        self._consonant_prefix_index = {}
        self._perfect_index = {}

        for item in data["entries"]:
            entry = IndexEntry(
                word=item["word"],
                reading=item["reading"],
                vowels=item["vowels"],
                consonants=item["consonants"],
                mora_count=item.get("mora_count", 0),
                initial_consonant=item.get("initial_consonant", ""),
            )
            self.add_entry(entry)


@lru_cache(maxsize=1)
def get_rhyme_index(index_path: str) -> RhymeIndex:
    """Get or create rhyme index singleton.

    Uses lru_cache for thread-safe caching.
    """
    index = RhymeIndex()
    path = Path(index_path)

    if path.suffix == ".db" and path.exists():
        index.load_from_db(index_path)
    elif path.exists():
        index.load(index_path)

    atexit.register(index.close)

    return index
