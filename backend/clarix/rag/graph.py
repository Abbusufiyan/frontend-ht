"""Optional Knowledge Graph (Box 1 in Architecture).

Extracts and indexes local entities and relations from document chunks to enable
graph-augmented retrieval, entity relationship inspection, and contextual reasoning.
"""
from __future__ import annotations

import re
from typing import Any

from ..db import Database

# Regex-based local entity recognizer for air-gapped environments
_ENTITY_PATTERNS = [
    ("POLICY", r"\b(POL-\d{3}|PO-\d{2,4}|[A-Z]{2,}-\d{2,})\b"),
    ("STANDARD", r"\b(NIST[\s-]\w+|ISO[\s-]\d+|SOC[\s-]2|FIPS[\s-]\d+)\b"),
    ("PROTOCOL", r"\b(HTTPS?|SSH|TLS[\s-]?\d(?:\.\d)?|DNS|UDP|TCP|IPSec|BGP)\b"),
    ("ROLE", r"\b(operator|administrator|superadmin|analyst|auditor|agent)\b"),
    ("TOOL", r"\b(file_reader|db_query|calculator|system_info|shell|rag_search)\b"),
    ("ORG", r"\b([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+){1,2})\b"),
]

_RELATION_CUES = [
    ("ENFORCES", r"(?:enforces|applies|mandates|requires)\s+([A-Za-z0-9_\- ]+)"),
    ("USES", r"(?:uses|utilizes|connects to|invokes)\s+([A-Za-z0-9_\- ]+)"),
    ("BLOCKS", r"(?:blocks|denies|intercepts|prevents)\s+([A-Za-z0-9_\- ]+)"),
    ("CONTAINS", r"(?:contains|includes|stores|indexes)\s+([A-Za-z0-9_\- ]+)"),
]


class KnowledgeGraph:
    def __init__(self, db: Database):
        self.db = db
        self._ensure_tables()

    def _ensure_tables(self) -> None:
        self.db.x("""
        CREATE TABLE IF NOT EXISTS kg_entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_name TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            mentions INTEGER DEFAULT 1,
            UNIQUE(doc_name, name)
        )
        """)
        self.db.x("CREATE INDEX IF NOT EXISTS idx_kg_entities_name ON kg_entities(name)")
        self.db.x("""
        CREATE TABLE IF NOT EXISTS kg_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_entity TEXT NOT NULL,
            target_entity TEXT NOT NULL,
            relation TEXT NOT NULL,
            doc_name TEXT NOT NULL
        )
        """)
        self.db.x("CREATE INDEX IF NOT EXISTS idx_kg_relations_src ON kg_relations(source_entity)")

    def index_document(self, doc_name: str, chunks: list[str]) -> dict[str, int]:
        """Extracts entities and relationships from chunks and indexes them."""
        self.db.x("DELETE FROM kg_entities WHERE doc_name=?", (doc_name,))
        self.db.x("DELETE FROM kg_relations WHERE doc_name=?", (doc_name,))

        found_entities: dict[str, tuple[str, int]] = {}
        found_relations: list[tuple[str, str, str]] = []

        for chunk in chunks:
            chunk_entities: list[str] = []
            for cat, pat in _ENTITY_PATTERNS:
                for match in re.finditer(pat, chunk, re.I):
                    ent_name = match.group(0).strip()
                    if len(ent_name) > 2:
                        chunk_entities.append(ent_name)
                        if ent_name in found_entities:
                            c, m = found_entities[ent_name]
                            found_entities[ent_name] = (c, m + 1)
                        else:
                            found_entities[ent_name] = (cat, 1)

            # Extract relations between co-occurring entities
            for i in range(len(chunk_entities)):
                for j in range(i + 1, min(i + 4, len(chunk_entities))):
                    e1, e2 = chunk_entities[i], chunk_entities[j]
                    if e1.lower() != e2.lower():
                        # Search for cue words between entities
                        rel_type = "RELATED_TO"
                        between = chunk[chunk.find(e1):chunk.find(e2) + len(e2)] if chunk.find(e1) < chunk.find(e2) else ""
                        for rel, pat in _RELATION_CUES:
                            if re.search(pat, between, re.I):
                                rel_type = rel
                                break
                        found_relations.append((e1, e2, rel_type))

        with self.db.tx() as c:
            for name, (cat, mentions) in found_entities.items():
                c.execute(
                    "INSERT INTO kg_entities(doc_name, name, category, mentions) VALUES(?,?,?,?)",
                    (doc_name, name, cat, mentions)
                )
            for src, tgt, rel in set(found_relations[:500]):
                c.execute(
                    "INSERT INTO kg_relations(source_entity, target_entity, relation, doc_name) VALUES(?,?,?,?)",
                    (src, tgt, rel, doc_name)
                )

        return {"entities": len(found_entities), "relations": len(found_relations)}

    def find_related(self, entity_name: str, limit: int = 10) -> list[dict[str, Any]]:
        """Finds entities related to a given concept."""
        q = """
        SELECT target_entity as target, relation, doc_name FROM kg_relations WHERE source_entity LIKE ?
        UNION
        SELECT source_entity as target, relation, doc_name FROM kg_relations WHERE target_entity LIKE ?
        LIMIT ?
        """
        rows = self.db.q(q, (f"%{entity_name}%", f"%{entity_name}%", limit))
        return [dict(r) for r in rows]

    def get_subgraph(self, doc_name: str | None = None, limit: int = 150) -> dict[str, list[dict]]:
        """Returns nodes and links representation for visualization or inspection."""
        if doc_name:
            nodes = self.db.q("SELECT name, category, mentions FROM kg_entities WHERE doc_name=? LIMIT ?", (doc_name, limit))
            edges = self.db.q("SELECT source_entity as source, target_entity as target, relation FROM kg_relations WHERE doc_name=? LIMIT ?", (doc_name, limit))
        else:
            nodes = self.db.q("SELECT name, category, SUM(mentions) as mentions FROM kg_entities GROUP BY name, category LIMIT ?", (limit,))
            edges = self.db.q("SELECT source_entity as source, target_entity as target, relation FROM kg_relations LIMIT ?", (limit,))
        return {
            "nodes": [dict(n) for n in nodes],
            "links": [dict(e) for e in edges],
        }

    def enrich_prompt(self, query: str) -> str:
        """Finds entities in query and generates context enrichment text."""
        words = set(re.findall(r"\b[A-Za-z0-9_\-]{3,}\b", query))
        triplets = []
        for w in words:
            related = self.find_related(w, limit=3)
            for r in related:
                triplets.append(f"({w}) -[{r['relation']}]-> ({r['target']})")
        if not triplets:
            return ""
        return "Knowledge Graph Relationships:\n" + "\n".join(f"• {t}" for t in triplets[:5])
