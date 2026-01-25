from enum import Enum
from typing import Any, Iterator, Callable
from dataclasses import dataclass
from inspect import signature


@dataclass(frozen=True, eq=True)
class Edge:
    future: tuple[bool, ...]
    target_state: int


@dataclass(frozen=True, eq=True)
class Node:
    state: int
    edges: tuple[Edge, ...]


class GameEnd(Enum):
    WIN = 1
    LOSE = 2


def generate_future(n_params: int) -> Iterator[tuple[bool, ...]]:
    if n_params == 1:
        yield (False,)
        yield (True,)
    else:
        for future in generate_future(n_params - 1):
            yield (False,) + future
            yield (True,) + future


@dataclass(frozen=True, eq=True)
class GameGraph:
    nodes: list[Node]
    states: list[Any]
    playing_function: Callable[..., Any | GameEnd]
    root: Any

    def _serialize_int(self) -> list[int]:
        output: list[int] = []
        n_edges: int = -1
        for node in self.nodes:
            if n_edges < 1:
                n_edges = len(node.edges)
            else:
                assert n_edges == len(node.edges)

        for node in self.nodes:
            for edge in node.edges:
                assert 2 ** len(edge.future) == n_edges
                k: int = len(edge.future)
        output = []
        output.append(k)
        output.append(len(self.nodes))
        for node in self.nodes:
            for edge in node.edges:
                output.append(edge.target_state)
        return output

    @classmethod
    def compute_graph(
        cls,
        playing_function: Callable[..., Any | GameEnd],
        root: Any,
    ) -> "GameGraph":
        n_params: int = len(signature(playing_function).parameters) - 1
        states: dict[Any, int] = {GameEnd.WIN: 0, GameEnd.LOSE: 1}
        nodes: list[Node] = [Node(state=0, edges=()), Node(state=1, edges=())]

        def _dfs(score: Any) -> None:
            states[score] = len(states)
            score_idx = len(states) - 1
            nodes.append(Node(state=score_idx, edges=()))
            edges: list[Edge] = []
            for probe in generate_future(n_params):
                n_score = playing_function(score, *probe)
                if n_score not in states and not isinstance(n_score, GameEnd):
                    _dfs(n_score)
                edges.append(Edge(future=probe, target_state=states[n_score]))
            nodes[score_idx] = Node(state=score_idx, edges=tuple(edges))

        _dfs(root)

        states_list = list(states.keys())
        for k in range(len(states_list)):
            states[states_list[k]] = k

        return GameGraph(
            nodes=nodes,
            states=states_list,
            playing_function=playing_function,
            root=root,
        )


def run_code(code: str) -> list[int] | str:
    import sys
    import io
    import traceback

    old_stdout = sys.stdout
    buffer = io.StringIO()
    sys.stdout = buffer

    loc: dict[str, Any] = {}
    try:
        exec(code, globals(), loc)

        play_fn = loc["play_fn"]
        root = loc["s0"]
        graph = GameGraph.compute_graph(play_fn, root)
        return graph._serialize_int()
    except Exception:
        traceback.print_exc(file=buffer)

    sys.stdout = old_stdout
    return buffer.getvalue()
