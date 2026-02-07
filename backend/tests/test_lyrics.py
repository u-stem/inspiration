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
