"""
Centralized Machine Learning Model Registry.

This file loads all the AI/ML models used in the VeeTrack platform.
It provides a single place to see what models are being used and ensures
they are only loaded into memory once.
"""

import logging

logger = logging.getLogger(__name__)

# Model state globals
_sentiment_model = None
_nlp = None
_embed_model = None
_summarizer = None


def init_models():
    """Load all primary ML models into memory. Safe to call multiple times."""
    global _sentiment_model, _nlp, _embed_model, _summarizer
    
    # 1. Sentiment Model (Cardiff RoBERTa)
    if _sentiment_model is None:
        try:
            from transformers import pipeline as hf_pipeline
            _sentiment_model = hf_pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                top_k=1,
            )
            print("[Models] Cardiff RoBERTa loaded [OK]")
        except Exception as e:
            print(f"[Models] RoBERTa failed to load: {e}")
            raise e

    # 2. NER Model (spaCy)
    if _nlp is None:
        import spacy
        # Prefer en_core_web_sm for fast CPU performance, fall back to trf if needed
        for model_name in ("en_core_web_sm", "en_core_web_trf"):
            try:
                _nlp = spacy.load(model_name)
                print(f"[Models] spaCy {model_name} loaded [OK]")
                break
            except Exception as e:
                logger.warning(f"Could not load spaCy model {model_name}: {e}")
        if _nlp is None:
            raise RuntimeError("No spaCy model could be loaded.")

    # 3. Embeddings Model (all-MiniLM-L6-v2)
    if _embed_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
            print("[Models] all-MiniLM-L6-v2 loaded [OK]")
        except Exception as e:
            print(f"[Models] SentenceTransformer failed to load: {e}")
            raise e

    # 4. Summarization (sumy TextRank)
    if _summarizer is None:
        try:
            from sumy.summarizers.text_rank import TextRankSummarizer
            _summarizer = TextRankSummarizer()
            print("[Models] sumy TextRank loaded [OK]")
        except Exception as e:
            print(f"[Models] sumy TextRank failed to load: {e}")
            raise e


def get_sentiment_model():
    return _sentiment_model

def get_ner_model():
    return _nlp

def get_embed_model():
    return _embed_model

def get_summarizer():
    return _summarizer

# Pre-load on import
init_models()
