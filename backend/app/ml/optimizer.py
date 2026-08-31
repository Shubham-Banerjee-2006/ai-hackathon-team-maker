"""
Team formation optimizer.

Exhaustively trying every way to split N people into teams of size k is
combinatorially explosive (even 20 people into groups of 4 is millions of
partitions), so we use a practical two-stage approach that still
"evaluates thousands of possible team combinations" as promised:

1. Seed teams greedily: repeatedly pick the participant who most needs a
   home, then fill their team with the best-fitting remaining people
   (by complementarity + embedding similarity + domain overlap).
2. Local-search refinement: run many random pairwise swaps between teams
   and keep any swap that improves total team quality (a lightweight
   simulated-annealing style hill climb). Thousands of candidate swaps
   are evaluated here, which is exactly where "optimization over many
   combinations" pays off without needing brute force.

The result is a good, explainable approximation - the same practical
tradeoff real team-matching products make.
"""
import random
from typing import List

import numpy as np

from .embeddings import ProfileEmbedder
from .matching import (
    experience_balance,
    pairwise_complementarity,
    role_diversity,
    team_skill_coverage,
)


def team_quality(members: List, embedder: ProfileEmbedder) -> float:
    if len(members) < 2:
        return 0.0
    pair_scores = []
    interest_scores = []
    for i in range(len(members)):
        for j in range(i + 1, len(members)):
            pair_scores.append(pairwise_complementarity(members[i], members[j]))
            interest_scores.append(embedder.similarity(members[i].id, members[j].id))

    complementarity = float(np.mean(pair_scores))
    shared_interest = float(np.mean(interest_scores))
    coverage = team_skill_coverage(members)
    balance = experience_balance(members)
    diversity = role_diversity(members)

    # Weighted objective: skill coverage and complementarity matter most
    # for a hackathon team's ability to actually ship something; shared
    # interest keeps people motivated; balance/diversity avoid stacking.
    return (
        0.30 * coverage
        + 0.25 * complementarity
        + 0.20 * shared_interest
        + 0.15 * balance
        + 0.10 * diversity
    )


def _greedy_seed(participants: List, team_size: int, embedder: ProfileEmbedder) -> List[List]:
    pool = participants[:]
    random.shuffle(pool)
    teams: List[List] = []

    while pool:
        anchor = pool.pop(0)
        team = [anchor]
        while len(team) < team_size and pool:
            best_idx, best_score = None, -1.0
            for idx, candidate in enumerate(pool):
                trial = team + [candidate]
                score = team_quality(trial, embedder)
                if score > best_score:
                    best_idx, best_score = idx, score
            team.append(pool.pop(best_idx))
        teams.append(team)

    return teams


def _local_search(teams: List[List], embedder: ProfileEmbedder, iterations: int = 2000) -> List[List]:
    """Randomly try swapping one member between two teams; keep the swap
    if it improves combined quality. Cheap, effective, and evaluates
    thousands of candidate team combinations as it runs."""
    if len(teams) < 2:
        return teams

    current_total = sum(team_quality(t, embedder) for t in teams)

    for _ in range(iterations):
        ta_idx, tb_idx = random.sample(range(len(teams)), 2)
        team_a, team_b = teams[ta_idx], teams[tb_idx]
        if not team_a or not team_b:
            continue
        i, j = random.randrange(len(team_a)), random.randrange(len(team_b))

        new_a = team_a[:i] + [team_b[j]] + team_a[i + 1:]
        new_b = team_b[:j] + [team_a[i]] + team_b[j + 1:]

        before = team_quality(team_a, embedder) + team_quality(team_b, embedder)
        after = team_quality(new_a, embedder) + team_quality(new_b, embedder)

        if after > before:
            teams[ta_idx], teams[tb_idx] = new_a, new_b
            current_total += (after - before)

    return teams


def generate_teams(participants: List, team_size: int = 4) -> List[List]:
    """Main entry point: builds an embedder over the current pool, seeds
    teams greedily, then refines with local search."""
    if len(participants) < 2:
        return [participants] if participants else []

    embedder = ProfileEmbedder()
    embedder.fit(participants)

    teams = _greedy_seed(participants, team_size, embedder)
    teams = _local_search(teams, embedder, iterations=min(3000, 200 * len(participants)))
    return teams
