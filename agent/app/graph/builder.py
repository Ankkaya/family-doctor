from __future__ import annotations

from langgraph.graph import END, StateGraph

from ..llm.provider import LLMProvider
from .nodes.emergency import make_emergency_node
from .nodes.match import make_match_node
from .nodes.parse import make_parse_node
from .nodes.preprocess import make_preprocess_node
from .nodes.render import make_render_node
from .nodes.review import make_review_node
from .nodes.safety import make_safety_node
from .nodes.special_population import make_special_population_node
from .nodes.summarize import make_summarize_node
from .state import GraphState


def build_graph(*, llm: LLMProvider, disclaimer: str):
    """构建问药流程图：规则做安全，LLM 做理解和表达。"""
    sg = StateGraph(GraphState)
    sg.add_node("preprocess", make_preprocess_node())
    sg.add_node("parse", make_parse_node(llm))
    sg.add_node("emergency", make_emergency_node())
    sg.add_node("special_population", make_special_population_node())
    sg.add_node("match", make_match_node())
    sg.add_node("review", make_review_node(llm))
    sg.add_node("safety", make_safety_node())
    sg.add_node("render", make_render_node(llm, disclaimer=disclaimer))
    sg.add_node("summarize", make_summarize_node())

    sg.set_entry_point("preprocess")
    sg.add_edge("preprocess", "parse")
    sg.add_edge("parse", "emergency")
    sg.add_edge("emergency", "special_population")
    sg.add_edge("special_population", "match")
    sg.add_edge("match", "review")
    sg.add_edge("review", "safety")
    sg.add_edge("safety", "render")
    sg.add_edge("render", "summarize")
    sg.add_edge("summarize", END)

    return sg.compile()
