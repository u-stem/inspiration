from app.services.similarity import calculate_similarity


class TestCalculateSimilarity:
    def test_identical_vowels_high_score(self) -> None:
        score = calculate_similarity(
            input_vowels="o-u-o-u",
            input_consonants="t-k",
            result_vowels="o-u-o-u",
            result_consonants="h-k-k",
            input_mora=4,
            result_mora=4,
        )
        assert score >= 0.8

    def test_no_match_low_score(self) -> None:
        score = calculate_similarity(
            input_vowels="o-u-o-u",
            input_consonants="t-k",
            result_vowels="a-i-e",
            result_consonants="s-r-m",
            input_mora=4,
            result_mora=3,
        )
        assert score < 0.3

    def test_partial_vowel_match(self) -> None:
        score = calculate_similarity(
            input_vowels="a-i-u",
            input_consonants="k-s-t",
            result_vowels="a-i-o",
            result_consonants="k-s-n",
            input_mora=3,
            result_mora=3,
        )
        assert 0.3 < score < 0.8

    def test_score_range(self) -> None:
        score = calculate_similarity(
            input_vowels="a",
            input_consonants="k",
            result_vowels="a",
            result_consonants="k",
            input_mora=1,
            result_mora=1,
        )
        assert 0.0 <= score <= 1.0

    def test_suffix_vowel_weighted_higher(self) -> None:
        score_suffix = calculate_similarity(
            input_vowels="a-i-u",
            input_consonants="k-s-t",
            result_vowels="o-i-u",
            result_consonants="n-s-t",
            input_mora=3,
            result_mora=3,
        )
        score_prefix = calculate_similarity(
            input_vowels="a-i-u",
            input_consonants="k-s-t",
            result_vowels="a-i-o",
            result_consonants="k-s-n",
            input_mora=3,
            result_mora=3,
        )
        assert score_suffix > score_prefix

    def test_empty_patterns(self) -> None:
        score = calculate_similarity(
            input_vowels="",
            input_consonants="",
            result_vowels="",
            result_consonants="",
            input_mora=0,
            result_mora=0,
        )
        assert 0.0 <= score <= 1.0
