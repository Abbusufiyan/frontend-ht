"""Intent & Task Classification (Box 2 in Architecture).

Classifies user requests entering the Agent Orchestrator to route tasks to
appropriate sub-pipelines (Local RAG Retriever, Tool Permissions, or Direct Inference).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum


class IntentCategory(str, Enum):
    RAG_QUERY = "RAG_QUERY"
    TOOL_EXECUTION = "TOOL_EXECUTION"
    SECURITY_ADMIN = "SECURITY_ADMIN"
    CONVERSATIONAL = "CONVERSATIONAL"


@dataclass
class IntentClassification:
    category: IntentCategory
    confidence: float
    requires_rag: bool
    suggested_tool: str | None = None
    extracted_entities: list[str] = field(default_factory=list)
    action_summary: str = ""


# Cues for intent classification
_RAG_CUES = re.compile(
    r"\b(?:search|find|retrieve|look up|what does (?:the )?(?:document|policy|file|manual|report) say|according to|summarize (?:the )?(?:document|pdf|file)|in (?:section|page|chapter))\b|"
    r"^\s*/rag\b",
    re.I,
)

_TOOL_CUES = [
    ("calculator", re.compile(r"\b(?:calculate|compute|math|sum|product|divide|multiply|\d+\s*[\+\-\*\/]\s*\d+)\b", re.I)),
    ("file_reader", re.compile(r"\b(?:read file|inspect file|open file|view file|cat|contents of)\b", re.I)),
    ("db_query", re.compile(r"\b(?:query (?:the )?db|database select|run sql|sqlite|select \*)\b", re.I)),
    ("system_info", re.compile(r"\b(?:system info|specs|memory usage|cpu stats|host info|platform)\b", re.I)),
    ("shell", re.compile(r"\b(?:run command|exec|shell|uname|df -h|uptime|hostname|whoami)\b", re.I)),
]

_SECURITY_CUES = re.compile(
    r"\b(?:approve|deny|approval|policy|airgap|egress|audit|ledger|tamper|threats?|security|guard|firewall)\b",
    re.I,
)


class IntentClassifier:
    """Classifies user prompts into actionable orchestration tasks."""

    @staticmethod
    def classify(message: str) -> IntentClassification:
        m = (message or "").strip()
        if not m:
            return IntentClassification(IntentCategory.CONVERSATIONAL, 1.0, False, None, [], "Empty input")

        # 1. Check explicit slash commands
        if m.startswith("/rag"):
            return IntentClassification(
                IntentCategory.RAG_QUERY,
                1.0,
                True,
                suggested_tool="rag_search",
                extracted_entities=[],
                action_summary="Explicit RAG command",
            )

        # 2. Check Security / Admin queries
        if _SECURITY_CUES.search(m):
            return IntentClassification(
                IntentCategory.SECURITY_ADMIN,
                0.85,
                False,
                suggested_tool=None,
                extracted_entities=[],
                action_summary="Security harness or policy inquiry",
            )

        # 3. Check Tool invocation requests
        for tool_name, pattern in _TOOL_CUES:
            if pattern.search(m):
                return IntentClassification(
                    IntentCategory.TOOL_EXECUTION,
                    0.85,
                    False,
                    suggested_tool=tool_name,
                    extracted_entities=[],
                    action_summary=f"Requires {tool_name} execution",
                )

        # 4. Check RAG Document queries
        if _RAG_CUES.search(m) or re.search(r"\b\w+\.(pdf|docx|txt|md|csv|pptx)\b", m, re.I):
            matched_files = re.findall(r"\b\w+\.(?:pdf|docx|txt|md|csv|pptx)\b", m, re.I)
            return IntentClassification(
                IntentCategory.RAG_QUERY,
                0.80,
                True,
                suggested_tool="rag_search",
                extracted_entities=matched_files,
                action_summary="Document retrieval / RAG query",
            )

        # 5. Default to conversational reasoning
        return IntentClassification(
            IntentCategory.CONVERSATIONAL,
            0.70,
            False,
            suggested_tool=None,
            extracted_entities=[],
            action_summary="General reasoning / conversation",
        )
