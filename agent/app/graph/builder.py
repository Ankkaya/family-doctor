from langgraph.graph import END, StateGraph

from ..config import Settings, get_settings
from ..llm.provider import LLMProvider
from ..medicine.agent import make_medicine_node
from .state import GraphState


def build_graph(*, llm: LLMProvider, settings: Settings | None = None):
    graph = StateGraph(GraphState)
    graph.add_node("medicine", make_medicine_node(llm, settings or get_settings()))
    graph.set_entry_point("medicine")
    graph.add_edge("medicine", END)
    return graph.compile()
