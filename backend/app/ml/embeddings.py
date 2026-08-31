"""
NLP embedding layer.

We build each participant's "profile text" from their skills, domains,
role, bio and working style, then vectorize the whole participant pool
with TF-IDF and measure similarity with cosine similarity.

Why TF-IDF instead of Sentence-Transformers here: Sentence-Transformers
needs to download pretrained weights from the internet on first run,
which isn't guaranteed in every deployment environment (offline servers,
locked-down networks, free-tier sandboxes). TF-IDF + cosine similarity is
a well-established, dependency-light NLP technique that needs no
downloads and no GPU, so the project runs anywhere out of the box.

To upgrade to Sentence-Transformers later (recommended once you deploy
somewhere with open internet access), swap `ProfileEmbedder` for a class
that calls `SentenceTransformer('all-MiniLM-L6-v2').encode(texts)` -
every other module (complementarity, optimizer, explainer) only depends
on the resulting similarity matrix, not on how it was produced.
"""
from typing import List

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def build_profile_text(participant) -> str:
    """Turn a participant record into a single text blob for embedding."""
    parts = [
        " ".join(participant.skills) if isinstance(participant.skills, list) else participant.skills,
        " ".join(participant.domains) if isinstance(participant.domains, list) else participant.domains,
        participant.preferred_role or "",
        participant.experience_level or "",
        participant.working_style or "",
        participant.bio or "",
    ]
    return " . ".join(p for p in parts if p)


class ProfileEmbedder:
    """Fits a TF-IDF space over the current participant pool and exposes
    a pairwise similarity matrix. Re-fit per batch (hackathon rosters are
    small, so this is cheap and always reflects the current vocabulary)."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1,
        )
        self.matrix = None
        self.ids: List[int] = []

    def fit(self, participants) -> np.ndarray:
        texts = [build_profile_text(p) for p in participants]
        self.ids = [p.id for p in participants]
        if not texts or all(t.strip() == "" for t in texts):
            # No usable text at all -> everyone equally (dis)similar.
            n = len(participants)
            self.matrix = np.eye(n)
            return self.matrix
        tfidf = self.vectorizer.fit_transform(texts)
        self.matrix = cosine_similarity(tfidf)
        return self.matrix

    def similarity(self, id_a: int, id_b: int) -> float:
        if self.matrix is None:
            return 0.0
        try:
            i, j = self.ids.index(id_a), self.ids.index(id_b)
        except ValueError:
            return 0.0
        return float(self.matrix[i, j])
