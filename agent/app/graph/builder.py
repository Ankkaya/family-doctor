from __future__ import annotations

from langgraph.graph import END, StateGraph

from ..llm.provider import LLMProvider
from .nodes.match import make_match_node
from .nodes.parse import make_parse_node
from .nodes.render import make_render_node
from .nodes.risk import make_risk_node
from .state import GraphState


def build_graph(*, llm: LLMProvider, disclaimer: str):
    """构建 v1 直线图：parse → match → risk → render。"""
    sg = StateGraph(GraphState)
    sg.add_node("parse", make_parse_node(llm))
    sg.add_node("match", make_match_node())
    sg.add_node("risk", make_risk_node(llm))
    sg.add_node("render", make_render_node(llm, disclaimer=disclaimer))

    sg.set_entry_point("parse")
    sg.add_edge("parse", "match")
    sg.add_edge("match", "risk")
    sg.add_edge("risk", "render")
    sg.add_edge("render", END)

    return sg.compile()
