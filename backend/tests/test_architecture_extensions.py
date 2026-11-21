"""Tests for new architectural modules:
- Evidence Verification Engine (verifier.py)
- Knowledge Graph (graph.py)
- Encrypted Local Storage (crypto_storage.py)
- Intent & Task Classification (intent.py)
- Ingestion Loaders for CSV and PPTX (loaders.py)
"""
import io
import unittest
from pathlib import Path

from clarix.db import Database
from clarix.intent import IntentCategory, IntentClassifier
from clarix.rag import loaders
from clarix.rag.graph import KnowledgeGraph
from clarix.rag.verifier import (
    ClaimChecker,
    EvidenceChecker,
    EvidenceVerificationEngine,
    SourceChecker,
    VerificationPolicyChecker,
    POLICIES,
)
from clarix.security.crypto_storage import CryptoStorage


class TestVerificationEngine(unittest.TestCase):
    def setUp(self):
        self.sources = [
            {"n": 1, "doc": "security_policy.pdf", "locator": "p. 1", "snippet": "POL-001 requires all external network egress to be blocked at the socket layer.", "_text": "POL-001 requires all external network egress to be blocked at the socket layer. Loopback connections are allowed."},
            {"n": 2, "doc": "audit_spec.docx", "locator": "section 2/4", "snippet": "The audit ledger uses SHA-256 canonical hashing across every record.", "_text": "The audit ledger uses SHA-256 canonical hashing across every record. Append-only triggers prevent silent tampering."},
        ]
        self.engine = EvidenceVerificationEngine()

    def test_claim_checker_extraction(self):
        text = "Based on the provided sources, the system blocks all network egress [1]. Furthermore, the audit ledger uses SHA-256 hashing [2]."
        claims = ClaimChecker.extract_claims(text)
        self.assertEqual(len(claims), 2)
        self.assertEqual(claims[0][2], [1])
        self.assertEqual(claims[1][2], [2])

    def test_source_checker_filtering(self):
        text = "Supported fact [1]. Hallucinated source [99]. Another fact [2]."
        cleaned, cited, invalid = SourceChecker.validate_citations(text, num_sources=2)
        self.assertIn("[1]", cleaned)
        self.assertIn("[2]", cleaned)
        self.assertNotIn("[99]", cleaned)
        self.assertEqual(cited, [1, 2])
        self.assertEqual(invalid, 1)

    def test_evidence_checker_support_scoring(self):
        status, score, matches, missing, _ = EvidenceChecker.check_claim(
            "network egress is blocked at socket layer", [1], self.sources
        )
        self.assertEqual(status, "VERIFIED")
        self.assertGreaterEqual(score, 0.35)

    def test_full_engine_verification_pass(self):
        text = "POL-001 requires all external network egress to be blocked [1]. The audit ledger uses SHA-256 canonical hashing [2]."
        report = self.engine.verify(text, self.sources, classification="INTERNAL")
        self.assertTrue(report["passed"])
        self.assertEqual(report["metrics"]["totalClaims"], 2)
        self.assertEqual(report["attribution"]["status"], "VERIFIED")

    def test_full_engine_verification_fail_and_correction_feedback(self):
        text = "The system uses quantum key distribution across cloud satellites."
        report = self.engine.verify(text, self.sources, classification="RESTRICTED")
        self.assertFalse(report["passed"])
        self.assertEqual(report["metrics"]["uncited"], 1)
        feedback = self.engine.generate_correction_prompt(report["violations"])
        self.assertIn("Correction Feedback", feedback)
        self.assertIn("INSUFFICIENT_EVIDENCE", feedback)


class TestKnowledgeGraph(unittest.TestCase):
    def setUp(self):
        self.db = Database(":memory:")
        self.kg = KnowledgeGraph(self.db)

    def test_index_and_subgraph(self):
        chunks = [
            "POL-001 enforces airgap isolation. The operator uses file_reader inside the sandbox.",
            "NIST guidelines recommend immutable audit ledgers. POL-001 blocks network sockets.",
        ]
        res = self.kg.index_document("doc1.pdf", chunks)
        self.assertGreater(res["entities"], 0)
        subgraph = self.kg.get_subgraph("doc1.pdf")
        self.assertTrue(len(subgraph["nodes"]) > 0)

    def test_enrich_prompt(self):
        chunks = ["POL-001 enforces airgap isolation."]
        self.kg.index_document("doc1.pdf", chunks)
        enrichment = self.kg.enrich_prompt("Tell me about POL-001 requirements.")
        self.assertIn("Knowledge Graph", enrichment)


class TestCryptoStorage(unittest.TestCase):
    def test_encryption_and_decryption(self):
        crypto = CryptoStorage(Path("./test_data_vault"), custom_key="test-master-key-12345")
        self.assertTrue(crypto.is_available)
        raw = b"Secret confidential document payload"
        enc = crypto.encrypt(raw)
        self.assertNotEqual(raw, enc)
        self.assertTrue(enc.startswith(b"CLX_ENC_V1::"))
        dec = crypto.decrypt(enc)
        self.assertEqual(raw, dec)


class TestIntentClassifier(unittest.TestCase):
    def test_classification_categories(self):
        res1 = IntentClassifier.classify("/rag ask What is the policy?")
        self.assertEqual(res1.category, IntentCategory.RAG_QUERY)
        self.assertTrue(res1.requires_rag)

        res2 = IntentClassifier.classify("Calculate 45 * 1024 / 2")
        self.assertEqual(res2.category, IntentCategory.TOOL_EXECUTION)
        self.assertEqual(res2.suggested_tool, "calculator")

        res3 = IntentClassifier.classify("What is the current airgap egress status?")
        self.assertEqual(res3.category, IntentCategory.SECURITY_ADMIN)

        res4 = IntentClassifier.classify("Hello there, how are you?")
        self.assertEqual(res4.category, IntentCategory.CONVERSATIONAL)


class TestLoaders(unittest.TestCase):
    def test_csv_extraction(self):
        csv_bytes = b"id,name,role\n1,Alice,Admin\n2,Bob,Operator\n"
        pages = loaders.extract_pages("test.csv", csv_bytes)
        self.assertEqual(len(pages), 1)
        self.assertIn("Alice", pages[0][1])
        self.assertIn("role: Admin", pages[0][1])


if __name__ == "__main__":
    unittest.main()
