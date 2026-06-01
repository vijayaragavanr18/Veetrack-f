import pytest
from services.nlp_pipeline import analyze_sentiment, extract_entities, compute_risk_score

def test_analyze_sentiment():
    """Test that the sentiment model returns correct schema and handles edge cases."""
    # Test positive text
    result_pos = analyze_sentiment("The company announced record breaking profits and incredible growth today.")
    assert "label" in result_pos
    assert "score" in result_pos
    assert result_pos["label"] in ["positive", "neutral", "negative"]

    # Test short text fallback
    result_short = analyze_sentiment("hi")
    assert result_short["label"] == "neutral"
    assert result_short["score"] == 0.5


def test_extract_entities():
    """Test entity extraction returns correct shape."""
    text = "Apple CEO Tim Cook announced new products in California."
    entities = extract_entities(text)
    
    assert isinstance(entities, list)
    # The models might not load during local test if not installed, 
    # but the function shouldn't crash.
    for ent in entities:
        assert "text" in ent
        assert "label" in ent


def test_compute_risk_score():
    """Test deterministic risk scoring based on MD5 hash."""
    text = "Some random article text about a crisis."
    keyword = "Apple"
    
    # Should always return the exact same score for the same inputs
    score1 = compute_risk_score(text, keyword, "negative")
    score2 = compute_risk_score(text, keyword, "negative")
    
    assert score1 == score2
    assert 0 <= score1 <= 100
    
    # Negative sentiment should be higher risk than positive sentiment for the same text
    score_pos = compute_risk_score(text, keyword, "positive")
    assert score1 > score_pos
