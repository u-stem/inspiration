#!/usr/bin/env python3
"""Build English rhyme index from CMU Pronouncing Dictionary."""

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.english_phoneme import analyze_english, arpabet_to_katakana

CMU_DICT_PATH = Path(__file__).parent.parent / "data" / "cmudict.txt"
DEFAULT_OUTPUT = "data/english_rhyme_index.db"


def parse_cmu_dict(dict_path: Path) -> list[tuple[str, str]]:
    """Parse CMU Pronouncing Dictionary.

    Args:
        dict_path: Path to cmudict.txt

    Returns:
        List of (word, pronunciation) tuples
    """
    entries: list[tuple[str, str]] = []

    with open(dict_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith(";;;"):
                continue

            # Format: word  pronunciation
            # Some words have variants like "word(2)"
            parts = line.split(maxsplit=1)
            if len(parts) != 2:
                continue

            word, pronunciation = parts

            # Skip variant pronunciations for now (e.g., "read(2)")
            if "(" in word:
                continue

            # Skip words with apostrophes at the start (contractions)
            if word.startswith("'"):
                continue

            # Normalize word to lowercase
            word = word.lower()

            entries.append((word, pronunciation))

    return entries


def is_valid_english_word(word: str) -> bool:
    """Check if word is valid for rhyme index."""
    # Skip single characters
    if len(word) < 2:
        return False

    # Skip words with numbers
    if any(c.isdigit() for c in word):
        return False

    # Skip words with special characters (except hyphen and apostrophe)
    allowed_chars = set("abcdefghijklmnopqrstuvwxyz'-")
    return all(c in allowed_chars for c in word)


def build_english_index(
    output_path: str = DEFAULT_OUTPUT,
    dict_path: Path = CMU_DICT_PATH,
) -> None:
    """Build SQLite English rhyme index from CMU dictionary.

    Args:
        output_path: Path for output SQLite database
        dict_path: Path to CMU dictionary file
    """
    if not dict_path.exists():
        raise FileNotFoundError(
            f"CMU dictionary not found: {dict_path}\n"
            "Please download it first:\n"
            "curl -o backend/data/cmudict.txt "
            "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict"
        )

    print(f"Parsing CMU dictionary: {dict_path}")
    entries = parse_cmu_dict(dict_path)
    print(f"Found {len(entries)} entries")

    # Filter valid words
    valid_entries = [(w, p) for w, p in entries if is_valid_english_word(w)]
    print(f"Valid entries: {len(valid_entries)}")

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    if output.exists():
        output.unlink()

    print(f"Building SQLite index: {output_path}")

    conn = sqlite3.connect(output_path)
    cursor = conn.cursor()

    # Create table
    cursor.execute("""
        CREATE TABLE english_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            pronunciation TEXT NOT NULL,
            katakana TEXT NOT NULL,
            vowels TEXT NOT NULL,
            consonants TEXT NOT NULL,
            syllable_count INTEGER NOT NULL
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX idx_english_vowels ON english_words(vowels)")
    cursor.execute("CREATE INDEX idx_english_syllables ON english_words(syllable_count)")
    cursor.execute("CREATE INDEX idx_english_word ON english_words(word)")

    indexed = 0
    errors = 0

    for i, (word, pronunciation) in enumerate(valid_entries):
        if i % 10000 == 0:
            print(f"Processing {i}/{len(valid_entries)}...")

        try:
            analysis = analyze_english(word, pronunciation)

            # Skip words with no vowels
            if not analysis.vowels:
                continue

            katakana = arpabet_to_katakana(pronunciation)

            cursor.execute(
                """
                INSERT INTO english_words
                (word, pronunciation, katakana, vowels, consonants, syllable_count)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    word,
                    pronunciation,
                    katakana,
                    analysis.vowels,
                    analysis.consonants,
                    analysis.syllable_count,
                ),
            )
            indexed += 1

        except Exception as e:
            errors += 1
            if errors < 10:
                print(f"Error processing {word}: {e}")

    conn.commit()
    conn.close()

    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"Done! Indexed {indexed} words")
    print(f"Errors: {errors}")
    print(f"Database size: {size_mb:.2f} MB")


def build_sample_index(output_path: str = DEFAULT_OUTPUT) -> None:
    """Build a small sample index for testing."""
    sample_entries = [
        ("tokyo", "T OW1 K Y OW0"),
        ("rainbow", "R EY1 N B OW2"),
        ("money", "M AH1 N IY0"),
        ("birthday", "B ER1 TH D EY2"),
        ("sunshine", "S AH1 N SH AY2 N"),
        ("hello", "HH AH0 L OW1"),
        ("world", "W ER1 L D"),
        ("music", "M Y UW1 Z IH0 K"),
        ("rhythm", "R IH1 DH AH0 M"),
        ("poetry", "P OW1 AH0 T R IY0"),
        ("flower", "F L AW1 ER0"),
        ("power", "P AW1 ER0"),
        ("tower", "T AW1 ER0"),
        ("shower", "SH AW1 ER0"),
        ("love", "L AH1 V"),
        ("above", "AH0 B AH1 V"),
        ("dream", "D R IY1 M"),
        ("team", "T IY1 M"),
        ("stream", "S T R IY1 M"),
        ("cream", "K R IY1 M"),
        ("night", "N AY1 T"),
        ("light", "L AY1 T"),
        ("fight", "F AY1 T"),
        ("right", "R AY1 T"),
        ("bright", "B R AY1 T"),
        ("slow", "S L OW1"),
        ("flow", "F L OW1"),
        ("grow", "G R OW1"),
        ("show", "SH OW1"),
        ("know", "N OW1"),
    ]

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    if output.exists():
        output.unlink()

    print(f"Building sample SQLite index: {output_path}")

    conn = sqlite3.connect(output_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE english_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            pronunciation TEXT NOT NULL,
            katakana TEXT NOT NULL,
            vowels TEXT NOT NULL,
            consonants TEXT NOT NULL,
            syllable_count INTEGER NOT NULL
        )
    """)

    cursor.execute("CREATE INDEX idx_english_vowels ON english_words(vowels)")
    cursor.execute("CREATE INDEX idx_english_syllables ON english_words(syllable_count)")
    cursor.execute("CREATE INDEX idx_english_word ON english_words(word)")

    for word, pronunciation in sample_entries:
        analysis = analyze_english(word, pronunciation)
        katakana = arpabet_to_katakana(pronunciation)

        cursor.execute(
            """
            INSERT INTO english_words
            (word, pronunciation, katakana, vowels, consonants, syllable_count)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                word,
                pronunciation,
                katakana,
                analysis.vowels,
                analysis.consonants,
                analysis.syllable_count,
            ),
        )

    conn.commit()
    conn.close()

    print(f"Done! Indexed {len(sample_entries)} sample words")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Build English rhyme index from CMU dictionary"
    )
    parser.add_argument(
        "-o",
        "--output",
        default=DEFAULT_OUTPUT,
        help="Output path for SQLite database",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Build a small sample index for testing",
    )
    parser.add_argument(
        "--dict",
        type=Path,
        default=CMU_DICT_PATH,
        help="Path to CMU dictionary file",
    )
    args = parser.parse_args()

    if args.sample:
        build_sample_index(args.output)
    else:
        build_english_index(args.output, args.dict)
