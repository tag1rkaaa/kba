from app.services.search_service import SearchService
from app.schemas.search import SearchHit
from datetime import datetime


def make_hit(id: int, score: float = 1.0) -> SearchHit:
    return SearchHit(
        id=id, title=f"Article {id}", slug=f"article-{id}",
        excerpt="...", score=score, matched_tags=[],
        author_id=1, created_at=datetime.utcnow(),
    )


def test_rrf_merges_lists():
    list_a = [make_hit(1), make_hit(2), make_hit(3)]
    list_b = [make_hit(2), make_hit(1), make_hit(4)]

    result = SearchService._reciprocal_rank_fusion(list_a, list_b, k=60)
    ids = [h.id for h in result]

    # id=1 и id=2 должны быть выше id=3 и id=4 — они встречаются в обоих списках
    assert ids.index(1) < ids.index(3)
    assert ids.index(2) < ids.index(4)


def test_rrf_no_duplicates():
    list_a = [make_hit(1), make_hit(2)]
    list_b = [make_hit(1), make_hit(3)]

    result = SearchService._reciprocal_rank_fusion(list_a, list_b)
    ids = [h.id for h in result]

    assert len(ids) == len(set(ids))  # нет дублей
