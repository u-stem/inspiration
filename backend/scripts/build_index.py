#!/usr/bin/env python3
"""Build rhyme index from NEologd seed data."""

import csv
import lzma
import socket
import sys
import urllib.request
from pathlib import Path
from urllib.error import URLError

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.phoneme import analyze
from app.services.rhyme import IndexEntry, RhymeIndex

NEOLOGD_SEED_URL = (
    "https://github.com/neologd/mecab-ipadic-neologd/raw/master/seed/"
    "mecab-user-dict-seed.20200910.csv.xz"
)

IPADIC_BASE_URL = "https://raw.githubusercontent.com/taku910/mecab/master/mecab-ipadic/"
IPADIC_FILES = [
    "Noun.csv",
    "Noun.adjv.csv",
    "Noun.adverbal.csv",
    "Noun.nai.csv",
    "Noun.name.csv",
    "Noun.number.csv",
    "Noun.org.csv",
    "Noun.place.csv",
    "Noun.proper.csv",
    "Noun.verbal.csv",
    "Verb.csv",
    "Adj.csv",
    "Adverb.csv",
]

JMDICT_URL = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz"

DOWNLOAD_TIMEOUT = 60  # seconds
MAX_ERRORS = 100


def is_valid_word(surface: str) -> bool:
    """Check if the word is valid for rhyme index."""
    if not surface:
        return False

    if len(surface) > 20:
        return False

    first_char = surface[0]
    noise_start = (
        "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
        "！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～"
        "、。「」『』【】〔〕・…‥〜ー0123456789０１２３４５６７８９"
    )
    if first_char in noise_start:
        return False
    if first_char.isascii() and first_char.isalpha():
        return False

    noise_chars = (
        "()（）「」『』【】・#＃&＆@＠!！?？*＊%％^＾~〜_＿+=<>《》\"'、。○●☆★♪♯♭♀♂①②③④⑤⑥⑦⑧⑨⑩"
    )
    if any(c in noise_chars for c in surface):
        return False

    if all(c.isascii() for c in surface):
        return False

    return not any(c.isdigit() or c in "０１２３４５６７８９" for c in surface)


def download_jmdict(cache_dir: Path) -> Path:
    """Download JMdict dictionary file."""
    import gzip

    cache_dir.mkdir(parents=True, exist_ok=True)
    gz_path = cache_dir / "JMdict_e.gz"
    xml_path = cache_dir / "JMdict_e.xml"

    if xml_path.exists():
        print(f"Using cached: {xml_path}")
        return xml_path

    if not gz_path.exists():
        print(f"Downloading: {JMDICT_URL}")
        original_timeout = socket.getdefaulttimeout()
        try:
            socket.setdefaulttimeout(120)
            urllib.request.urlretrieve(JMDICT_URL, gz_path)
        except (URLError, TimeoutError) as e:
            raise RuntimeError(f"Download failed: {e}") from e
        finally:
            socket.setdefaulttimeout(original_timeout)

    print(f"Extracting: {gz_path}")
    with (
        gzip.open(gz_path, "rt", encoding="utf-8") as f_in,
        open(xml_path, "w", encoding="utf-8") as f_out,
    ):
        f_out.write(f_in.read())

    return xml_path


def get_jmdict_words(cache_dir: Path) -> list[tuple[str, str]]:
    """Get words from JMdict using streaming XML parser."""
    import xml.etree.ElementTree as ET

    xml_path = download_jmdict(cache_dir)
    words: list[tuple[str, str]] = []

    print("Parsing JMdict (streaming)...")

    # Use iterparse for memory efficiency
    context = ET.iterparse(xml_path, events=("end",))
    count = 0

    for _event, elem in context:
        if elem.tag == "entry":
            # Extract kanji (keb) and reading (reb)
            keb_elem = elem.find(".//keb")
            reb_elem = elem.find(".//reb")

            if keb_elem is not None and reb_elem is not None:
                surface = keb_elem.text
                reading = reb_elem.text

                if surface and reading and is_valid_word(surface):
                    # Convert hiragana reading to katakana
                    katakana_reading = "".join(
                        chr(ord(c) + 96) if "ぁ" <= c <= "ん" else c for c in reading
                    )
                    words.append((surface, katakana_reading))

            # Clear element to save memory
            elem.clear()
            count += 1

            if count % 50000 == 0:
                print(f"  Processed {count} entries...")

    print(f"Loaded {len(words)} words from JMdict")
    return words


# Cached Sudachi tokenizer for efficiency
_sudachi_tokenizer = None


def _get_sudachi_tokenizer():
    """Get cached Sudachi tokenizer."""
    global _sudachi_tokenizer
    if _sudachi_tokenizer is None:
        from sudachipy import Dictionary

        dict_obj = Dictionary(dict="full")
        _sudachi_tokenizer = dict_obj.create()
    return _sudachi_tokenizer


def get_reading_from_sudachi(surface: str) -> str | None:
    """Get reading for a word using SudachiPy."""
    try:
        tokenizer = _get_sudachi_tokenizer()
        tokens = tokenizer.tokenize(surface)

        # Concatenate readings of all tokens
        readings = []
        for token in tokens:
            reading = token.reading_form()
            if reading:
                readings.append(reading)

        if readings:
            return "".join(readings)
    except Exception as e:
        print(f"Warning: Failed to get reading for text: {e}")
    return None


def download_ipadic(cache_dir: Path) -> list[Path]:
    """Download IPADIC CSV files if not cached."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    downloaded = []

    for filename in IPADIC_FILES:
        csv_path = cache_dir / f"ipadic_{filename}"
        if csv_path.exists():
            downloaded.append(csv_path)
            continue

        url = IPADIC_BASE_URL + filename
        print(f"Downloading: {url}")
        original_timeout = socket.getdefaulttimeout()
        try:
            socket.setdefaulttimeout(DOWNLOAD_TIMEOUT)
            urllib.request.urlretrieve(url, csv_path)
            downloaded.append(csv_path)
        except (URLError, TimeoutError) as e:
            print(f"Failed to download {filename}: {e}")
        finally:
            socket.setdefaulttimeout(original_timeout)

    return downloaded


def parse_ipadic_csv(csv_path: Path) -> list[tuple[str, str]]:
    """Parse IPADIC CSV and extract (surface, reading) pairs.

    IPADIC CSV format (EUC-JP encoded):
    - Column 0: Surface form (見出し)
    - Column 11: Reading (読み) in katakana
    """
    words: list[tuple[str, str]] = []

    try:
        with open(csv_path, encoding="euc-jp", errors="replace") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) < 12:
                    continue

                surface = row[0]
                reading = row[11] if row[11] != "*" else ""

                if not reading:
                    continue

                if not is_valid_word(surface):
                    continue

                words.append((surface, reading))
    except Exception as e:
        print(f"Error parsing {csv_path}: {e}")

    return words


def get_ipadic_words(cache_dir: Path) -> list[tuple[str, str]]:
    """Get all words from IPADIC."""
    csv_files = download_ipadic(cache_dir)
    all_words: list[tuple[str, str]] = []

    for csv_path in csv_files:
        words = parse_ipadic_csv(csv_path)
        all_words.extend(words)
        print(f"  {csv_path.name}: {len(words)} words")

    seen: set[str] = set()
    unique_words: list[tuple[str, str]] = []
    for surface, reading in all_words:
        if surface not in seen:
            seen.add(surface)
            unique_words.append((surface, reading))

    print(f"Loaded {len(unique_words)} unique words from IPADIC")
    return unique_words


def download_neologd_seed(cache_dir: Path) -> Path:
    """Download NEologd seed data if not cached."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    csv_path = cache_dir / "neologd_seed.csv"
    xz_path = cache_dir / "neologd_seed.csv.xz"

    if csv_path.exists():
        print(f"Using cached: {csv_path}")
        return csv_path

    print(f"Downloading: {NEOLOGD_SEED_URL}")
    original_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(DOWNLOAD_TIMEOUT)
        urllib.request.urlretrieve(NEOLOGD_SEED_URL, xz_path)
    except (URLError, TimeoutError) as e:
        raise RuntimeError(f"Download failed: {e}") from e
    finally:
        socket.setdefaulttimeout(original_timeout)

    print(f"Extracting: {xz_path}")
    with (
        lzma.open(xz_path, "rt", encoding="utf-8") as f_in,
        open(csv_path, "w", encoding="utf-8") as f_out,
    ):
        f_out.write(f_in.read())

    xz_path.unlink()
    return csv_path


def parse_neologd_csv(csv_path: Path) -> list[tuple[str, str]]:
    """Parse NEologd CSV and extract (surface, reading) pairs.

    NEologd CSV format (0-indexed):
    - Column 0: Surface form (見出し)
    - Column 11: Reading (読み) in katakana
    """
    words: list[tuple[str, str]] = []

    with open(csv_path, encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 12:
                continue

            surface = row[0]
            reading = row[11] if row[11] != "*" else ""

            if not reading or reading == "カオモジ":
                continue

            if not is_valid_word(surface):
                continue

            words.append((surface, reading))

    return words


def get_neologd_words(cache_dir: Path) -> list[tuple[str, str]]:
    """Get all words from NEologd seed data."""
    csv_path = download_neologd_seed(cache_dir)
    words = parse_neologd_csv(csv_path)

    seen: set[str] = set()
    unique_words: list[tuple[str, str]] = []
    for surface, reading in words:
        if surface not in seen:
            seen.add(surface)
            unique_words.append((surface, reading))

    print(f"Loaded {len(unique_words)} unique words from NEologd seed")
    return unique_words


def select_reading(dict_reading: str, surface: str) -> str:
    """Select the best reading using hybrid approach.

    Rules:
    - If dict reading is significantly longer than Sudachi reading,
      use Sudachi (likely a concatenated reading error in dictionary)
    - Otherwise use dict reading (preserves proper nouns like anime titles)
    """
    # Empirically determined: dictionary entries with readings >30% longer
    # than Sudachi readings are typically concatenation errors
    _READING_LENGTH_RATIO_THRESHOLD = 1.3

    sudachi_reading = get_reading_from_sudachi(surface)
    if not sudachi_reading:
        return dict_reading

    if len(dict_reading) > len(sudachi_reading) * _READING_LENGTH_RATIO_THRESHOLD:
        return sudachi_reading

    return dict_reading


def build_sqlite_index(
    output_path: str = "data/rhyme_index.db",
    include_ipadic: bool = True,
    include_jmdict: bool = False,
) -> None:
    """Build SQLite rhyme index from NEologd seed data and optionally IPADIC/JMdict."""
    cache_dir = Path("/tmp/neologd_cache")

    print("Downloading NEologd seed data...")
    words = get_neologd_words(cache_dir)
    print(f"NEologd unique words: {len(words)}")

    existing_surfaces = {w[0] for w in words}

    if include_ipadic:
        print("\nDownloading IPADIC data...")
        ipadic_words = get_ipadic_words(cache_dir)

        # Merge: NEologd takes priority, add IPADIC words not in NEologd
        added_from_ipadic = 0
        for surface, reading in ipadic_words:
            if surface not in existing_surfaces:
                words.append((surface, reading))
                existing_surfaces.add(surface)
                added_from_ipadic += 1
        print(f"Added {added_from_ipadic} words from IPADIC")

    if include_jmdict:
        print("\nDownloading JMdict data...")
        jmdict_words = get_jmdict_words(cache_dir)

        # Merge: add JMdict words not already in dictionary
        added_from_jmdict = 0
        for surface, reading in jmdict_words:
            if surface not in existing_surfaces:
                words.append((surface, reading))
                existing_surfaces.add(surface)
                added_from_jmdict += 1
        print(f"Added {added_from_jmdict} words from JMdict")

    print(f"Total unique words: {len(words)}")

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    if output.exists():
        output.unlink()

    print(f"Building SQLite index: {output_path}")
    index = RhymeIndex(db_path=output_path)
    index.init_db()

    indexed = 0
    used_dict = 0
    used_sudachi = 0
    error_count = 0
    for i, (word, dict_reading) in enumerate(words):
        if i % 50000 == 0:
            print(f"Processing {i}/{len(words)}...")

        # Select reading using hybrid approach
        reading = select_reading(dict_reading, word)
        if reading == dict_reading:
            used_dict += 1
        else:
            used_sudachi += 1

        try:
            phoneme_analysis = analyze(reading)
            if phoneme_analysis.vowels:
                entry = IndexEntry(
                    word=word,
                    reading=reading,
                    vowels=phoneme_analysis.vowels,
                    consonants=phoneme_analysis.consonants,
                    mora_count=phoneme_analysis.mora_count,
                    initial_consonant=phoneme_analysis.initial_consonant,
                )
                index.add_entry_to_db(entry)
                indexed += 1
        except Exception as e:
            error_count += 1
            print(f"Error processing {word}: {e}")
            if error_count > MAX_ERRORS:
                raise RuntimeError(f"Too many errors ({error_count}), aborting") from e
            continue

    index.commit()
    index.close()

    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"Done! Indexed {indexed} words")
    print(f"  Used dict reading: {used_dict}, Used Sudachi: {used_sudachi}")
    print(f"Database size: {size_mb:.2f} MB")


def _get_sample_words() -> list[tuple[str, str]]:
    """Return sample words for testing."""
    return [
        ("東京", "トウキョウ"),
        ("投稿", "トウコウ"),
        ("報告", "ホウコク"),
        ("登校", "トウコウ"),
        ("高校", "コウコウ"),
        ("奉公", "ホウコウ"),
        ("ラップ", "ラップ"),
        ("カップ", "カップ"),
        ("トラップ", "トラップ"),
        ("マップ", "マップ"),
        ("ギャップ", "ギャップ"),
        ("愛", "アイ"),
        ("買い", "カイ"),
        ("界", "カイ"),
        ("回", "カイ"),
        ("会", "カイ"),
        ("海", "カイ"),
        ("改", "カイ"),
        ("貝", "カイ"),
        ("甲斐", "カイ"),
        ("日本", "ニホン"),
        ("音楽", "オンガク"),
        ("韻律", "インリツ"),
        ("言葉", "コトバ"),
        ("詩人", "シジン"),
        ("表現", "ヒョウゲン"),
        ("感情", "カンジョウ"),
        ("情熱", "ジョウネツ"),
        ("夢", "ユメ"),
        ("希望", "キボウ"),
        ("未来", "ミライ"),
        ("過去", "カコ"),
        ("現在", "ゲンザイ"),
        ("人生", "ジンセイ"),
        ("世界", "セカイ"),
        ("宇宙", "ウチュウ"),
        ("自然", "シゼン"),
        ("文化", "ブンカ"),
        ("歴史", "レキシ"),
        ("社会", "シャカイ"),
        ("経済", "ケイザイ"),
        ("政治", "セイジ"),
        ("科学", "カガク"),
        ("技術", "ギジュツ"),
        ("芸術", "ゲイジュツ"),
        ("創造", "ソウゾウ"),
        ("想像", "ソウゾウ"),
        ("理想", "リソウ"),
        ("現実", "ゲンジツ"),
        ("肩慣らし", "カタナラシ"),
    ]


def build_sample_index(output_path: str = "data/rhyme_index.db") -> None:
    """Build a small sample index for testing."""
    words = _get_sample_words()

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    if output.exists():
        output.unlink()

    print(f"Building sample SQLite index: {output_path}")
    index = RhymeIndex(db_path=output_path)
    index.init_db()

    for word, reading in words:
        phoneme_analysis = analyze(reading)
        entry = IndexEntry(
            word=word,
            reading=reading,
            vowels=phoneme_analysis.vowels,
            consonants=phoneme_analysis.consonants,
            mora_count=phoneme_analysis.mora_count,
            initial_consonant=phoneme_analysis.initial_consonant,
        )
        index.add_entry_to_db(entry)

    index.commit()
    index.close()
    print(f"Done! Indexed {len(words)} sample words")


def add_words_to_index(
    db_path: str,
    words: list[tuple[str, str]],
) -> int:
    """Add words to existing index.

    Args:
        db_path: Path to SQLite database
        words: List of (surface, reading) tuples

    Returns:
        Number of words added
    """
    index = RhymeIndex(db_path=db_path)

    # Get existing words using iterator to avoid loading all into memory
    conn = index._get_conn()
    cursor = conn.execute("SELECT word FROM words")
    existing = {row[0] for row in cursor}

    added = 0
    for word, reading in words:
        if word in existing:
            continue

        try:
            phoneme_analysis = analyze(reading)
            if phoneme_analysis.vowels:
                entry = IndexEntry(
                    word=word,
                    reading=reading,
                    vowels=phoneme_analysis.vowels,
                    consonants=phoneme_analysis.consonants,
                    mora_count=phoneme_analysis.mora_count,
                    initial_consonant=phoneme_analysis.initial_consonant,
                )
                index.add_entry_to_db(entry)
                added += 1
                print(f"  Added: {word} ({reading})")
        except Exception as e:
            print(f"  Error: {word} - {e}")

    index.commit()
    index.close()
    return added


def add_word_interactive(db_path: str) -> None:
    """Interactive mode to add words."""
    from sudachipy import Dictionary

    dict_obj = Dictionary(dict="full")
    tokenizer = dict_obj.create()

    print("Enter words to add (empty line to quit):")
    print("Format: word or word,reading")

    words_to_add = []
    while True:
        line = input("> ").strip()
        if not line:
            break

        if "," in line:
            word, reading = line.split(",", 1)
            word = word.strip()
            reading = reading.strip()
        else:
            word = line
            # Get reading from SudachiPy
            tokens = tokenizer.tokenize(word)
            reading = "".join(t.reading_form() for t in tokens)

        if reading:
            words_to_add.append((word, reading))
            print(f"  Queued: {word} ({reading})")
        else:
            print(f"  Could not get reading for: {word}")

    if words_to_add:
        print(f"\nAdding {len(words_to_add)} words...")
        added = add_words_to_index(db_path, words_to_add)
        print(f"Added {added} new words")
    else:
        print("No words to add")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Build rhyme index from NEologd seed")
    parser.add_argument(
        "-o",
        "--output",
        default="data/rhyme_index.db",
        help="Output path for SQLite database",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Build a small sample index for testing",
    )
    parser.add_argument(
        "--no-ipadic",
        action="store_true",
        help="Skip IPADIC dictionary (use NEologd only)",
    )
    parser.add_argument(
        "--jmdict",
        action="store_true",
        help="Include JMdict (Japanese-English dictionary)",
    )
    parser.add_argument(
        "--add",
        action="store_true",
        help="Interactive mode to add words to existing index",
    )
    parser.add_argument(
        "--add-words",
        nargs="+",
        help="Add specific words (format: word or word,reading)",
    )
    args = parser.parse_args()

    if args.add:
        add_word_interactive(args.output)
    elif args.add_words:
        from sudachipy import Dictionary

        dict_obj = Dictionary(dict="full")
        tokenizer = dict_obj.create()

        words_to_add = []
        for item in args.add_words:
            if "," in item:
                word, reading = item.split(",", 1)
            else:
                word = item
                tokens = tokenizer.tokenize(word)
                reading = "".join(t.reading_form() for t in tokens)
            if reading:
                words_to_add.append((word, reading))

        if words_to_add:
            added = add_words_to_index(args.output, words_to_add)
            print(f"Added {added} new words")
    elif args.sample:
        build_sample_index(args.output)
    else:
        build_sqlite_index(
            args.output,
            include_ipadic=not args.no_ipadic,
            include_jmdict=args.jmdict,
        )
