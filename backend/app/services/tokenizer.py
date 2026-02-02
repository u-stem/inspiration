import atexit
from dataclasses import dataclass
from functools import lru_cache

from sudachipy import Dictionary, SplitMode


@dataclass(frozen=True)
class Token:
    surface: str
    reading: str
    pos: str


class Tokenizer:
    def __init__(self, split_mode: SplitMode = SplitMode.C) -> None:
        """Initialize tokenizer with SudachiPy.

        Args:
            split_mode: Sudachi split mode (A=short, B=middle, C=long units)
        """
        self._dict = Dictionary(dict="full")
        self._tokenizer = self._dict.create()
        self._split_mode = split_mode

    def tokenize(self, text: str) -> list[Token]:
        morphemes = self._tokenizer.tokenize(text, self._split_mode)
        tokens: list[Token] = []

        for morpheme in morphemes:
            surface = morpheme.surface()
            reading = morpheme.reading_form()
            pos = morpheme.part_of_speech()[0]
            tokens.append(Token(surface=surface, reading=reading, pos=pos))

        return tokens

    def get_reading(self, text: str) -> str:
        tokens = self.tokenize(text)
        return "".join(token.reading for token in tokens)

    def close(self) -> None:
        """Close tokenizer resources.

        SudachiPy does not require explicit cleanup, but this method
        is provided for future compatibility.
        """
        pass


@lru_cache(maxsize=1)
def get_tokenizer() -> Tokenizer:
    tokenizer = Tokenizer()
    atexit.register(tokenizer.close)
    return tokenizer
