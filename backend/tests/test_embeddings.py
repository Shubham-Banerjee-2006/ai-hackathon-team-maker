"""Unit tests for the TF-IDF profile embedder."""
from types import SimpleNamespace

from app.ml.embeddings import ProfileEmbedder, build_profile_text


def person(id, skills=None, domains=None, role="", experience="Intermediate", style="", bio=""):
    return SimpleNamespace(
        id=id,
        skills=skills or [],
        domains=domains or [],
        preferred_role=role,
        experience_level=experience,
        working_style=style,
        bio=bio,
    )


def test_build_profile_text_combines_fields():
    p = person(1, skills=["Python"], domains=["Healthcare"], role="ML", bio="Loves data.")
    text = build_profile_text(p)
    assert "Python" in text
    assert "Healthcare" in text
    assert "Loves data." in text


def test_build_profile_text_skips_empty_fields():
    p = person(1)
    text = build_profile_text(p)
    assert text == "Intermediate"  # only experience_level is non-empty by default


def test_similar_profiles_score_higher_than_dissimilar():
    a = person(1, skills=["Python", "Machine Learning"], bio="I love NLP and data pipelines.")
    b = person(2, skills=["Python", "Machine Learning"], bio="I love NLP and data pipelines too.")
    c = person(3, skills=["Figma", "Product Management"], bio="I love roadmaps and user interviews.")

    embedder = ProfileEmbedder()
    embedder.fit([a, b, c])

    sim_ab = embedder.similarity(1, 2)
    sim_ac = embedder.similarity(1, 3)
    assert sim_ab > sim_ac


def test_similarity_is_symmetric():
    a = person(1, skills=["Python"], bio="backend person")
    b = person(2, skills=["React"], bio="frontend person")
    embedder = ProfileEmbedder()
    embedder.fit([a, b])
    assert embedder.similarity(1, 2) == embedder.similarity(2, 1)


def test_similarity_with_unknown_id_returns_zero():
    a = person(1, skills=["Python"])
    embedder = ProfileEmbedder()
    embedder.fit([a])
    assert embedder.similarity(1, 999) == 0.0


def test_empty_participant_list_does_not_crash():
    embedder = ProfileEmbedder()
    matrix = embedder.fit([])
    assert matrix.shape == (0, 0)


def test_all_blank_profiles_fall_back_to_identity_matrix():
    a = SimpleNamespace(id=1, skills=[], domains=[], preferred_role="", experience_level="", working_style="", bio="")
    b = SimpleNamespace(id=2, skills=[], domains=[], preferred_role="", experience_level="", working_style="", bio="")
    embedder = ProfileEmbedder()
    matrix = embedder.fit([a, b])
    assert matrix.shape == (2, 2)
    assert matrix[0][1] == 0.0
