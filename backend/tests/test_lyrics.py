from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestLyricsAnalyze:
    def test_analyze_simple_text(self) -> None:
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "東京の空は青い"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_words"] > 0
        assert data["unique_words"] > 0
        assert len(data["words"]) > 0

    def test_analyze_returns_vowel_patterns(self) -> None:
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "東京"},
        )
        data = response.json()
        words = data["words"]
        tokyo = next((w for w in words if w["surface"] == "東京"), None)
        assert tokyo is not None
        assert tokyo["vowel_pattern"] != ""

    def test_empty_text_rejected(self) -> None:
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": ""},
        )
        assert response.status_code == 422

    def test_filters_particles(self) -> None:
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "東京の空"},
        )
        data = response.json()
        surfaces = [w["surface"] for w in data["words"]]
        assert "の" not in surfaces

    def test_filters_single_vowel_words(self) -> None:
        """Words with only 1 vowel have no rhyme value and should be filtered."""
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "待ってましたと言わんばかりの"},
        )
        data = response.json()
        surfaces = [w["surface"] for w in data["words"]]
        # 待っ(まっ) has only 1 vowel 'a' - should be excluded
        assert "待っ" not in surfaces

    def test_filters_grammatical_pos(self) -> None:
        """接尾辞, 連体詞, 接続詞 should be filtered."""
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "この世界はまた素晴らしい"},
        )
        data = response.json()
        surfaces = [w["surface"] for w in data["words"]]
        assert "この" not in surfaces  # 連体詞

    def test_split_mode_b_separates_compounds(self) -> None:
        """SplitMode.B should separate '東京の空' into '東京' and '空'."""
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "東京の空は青い"},
        )
        data = response.json()
        surfaces = [w["surface"] for w in data["words"]]
        assert "東京" in surfaces
        assert "空" in surfaces
        # Should NOT be merged into one token
        assert "東京の空" not in surfaces

    def test_dictionary_form_included(self) -> None:
        """Words should include dictionary/base form."""
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "夢を追いかけて走る"},
        )
        data = response.json()
        oikake = next((w for w in data["words"] if w["surface"] == "追いかけ"), None)
        assert oikake is not None
        assert oikake["dictionary_form"] == "追いかける"

    def test_rhyme_groups_detected(self) -> None:
        """Words with matching vowel suffixes should be grouped."""
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "光と夢 走る星 僕の空"},
        )
        data = response.json()
        assert "rhyme_groups" in data

    def test_rhyme_groups_require_two_words(self) -> None:
        """A rhyme group needs at least 2 words."""
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "光"},
        )
        data = response.json()
        assert data["rhyme_groups"] == []


class TestLyricsPhoneme:
    def test_phoneme_returns_vowel_pattern(self) -> None:
        response = client.post(
            "/api/lyrics/phoneme",
            json={"text": "東京"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reading"] != ""
        assert data["vowel_pattern"] != ""

    def test_phoneme_with_phrase(self) -> None:
        response = client.post(
            "/api/lyrics/phoneme",
            json={"text": "待ってました"},
        )
        data = response.json()
        assert "-" in data["vowel_pattern"]

    def test_phoneme_empty_text(self) -> None:
        response = client.post(
            "/api/lyrics/phoneme",
            json={"text": ""},
        )
        assert response.status_code == 422
