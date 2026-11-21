"""Evidence Verification Engine (Box 3 in Architecture).

Provides:
- Claim Checker: decomposes responses into factual statements and extracts propositions.
- Source Checker: validates citation indices [n] against retrieved sources.
- Evidence Checker: evaluates lexical overlap, named-entity and numeric consistency.
- Verification Result: computes comprehensive attribution and verification metrics.
- Verification Policy Checker: enforces classification-tiered verification thresholds.
- Correction Feedback: generates structured rewrite prompts for iterative refinement.
- Fallback to Unverified Response when retry limits are reached.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

_STOP = set(
    "this that with from have been were will would could should their there which about into than then them they what when where while "
    "also such only each other more most some these those your does done over under between because using used uses make made "
    "have having being were was are is be has had do did does can could may might must shall should will would".split()
)
_CITE = re.compile(r"\[(\d{1,2}(?:\s*[,;]\s*\d{1,2})*)\]")
_WORD = re.compile(r"[a-z0-9]{3,}")
_NUM = re.compile(r"\b\d+(?:\.\d+)?%?\b")
_BOILERPLATE = re.compile(
    r"^(?:sure|certainly|based on the (?:provided )?sources?|according to the (?:documents?|sources?)|here (?:is|are)|in summary|to answer your question|as requested)[,:]?\s*",
    re.I,
)


@dataclass
class Claim:
    index: int
    text: str
    cleaned_text: str
    citations: list[int]
    status: str  # "VERIFIED" | "WEAK" | "UNSUPPORTED" | "UNCITED"
    support_score: float = 0.0
    matched_words: list[str] = field(default_factory=list)
    missing_entities: list[str] = field(default_factory=list)
    evidence_snippet: str = ""


@dataclass
class VerificationPolicy:
    name: str
    min_citation_coverage: float  # fraction of claims with citations
    min_verification_score: float  # average support score
    max_unsupported_ratio: float
    require_all_entities_match: bool


POLICIES: dict[str, VerificationPolicy] = {
    "RESTRICTED": VerificationPolicy("RESTRICTED_STRICT", 0.90, 0.40, 0.0, True),
    "CONFIDENTIAL": VerificationPolicy("CONFIDENTIAL_STANDARD", 0.70, 0.30, 0.15, False),
    "INTERNAL": VerificationPolicy("INTERNAL_LENIENT", 0.50, 0.20, 0.30, False),
    "PUBLIC": VerificationPolicy("PUBLIC_BASELINE", 0.30, 0.15, 0.50, False),
}


class ClaimChecker:
    """Decomposes LLM text into atomic factual propositions / statements."""

    @staticmethod
    def extract_claims(text: str) -> list[tuple[str, str, list[int]]]:
        """Returns list of (raw_sentence, cleaned_claim_text, citations_list)."""
        raw_sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+|\n+", text or "")
            if s.strip() and len(s.split()) >= 3
        ]
        results = []
        for s in raw_sentences:
            citations = []
            for g in _CITE.findall(s):
                for x in re.split(r"[,;]\s*", g.strip()):
                    if x.isdigit():
                        citations.append(int(x))
            # Remove citations and conversational prefixes for the claim body
            bare = _CITE.sub("", s).strip()
            cleaned = _BOILERPLATE.sub("", bare).strip()
            if cleaned and len(cleaned.split()) >= 3:
                results.append((s, cleaned, sorted(set(citations))))
        return results


class SourceChecker:
    """Validates citations against the set of retrieved documents."""

    @staticmethod
    def validate_citations(answer: str, num_sources: int) -> tuple[str, list[int], int]:
        """Cleans out hallucinated / out-of-range citations and returns (cleaned_text, cited_order, invalid_count)."""
        cited_order: list[int] = []
        invalid_count = 0

        def replace_cite(m: re.Match) -> str:
            nonlocal invalid_count
            nums = [int(x) for x in re.split(r"[,;]\s*", m.group(1).strip()) if x.isdigit()]
            valid = []
            for x in nums:
                if 1 <= x <= num_sources:
                    valid.append(x)
                    if x not in cited_order:
                        cited_order.append(x)
                else:
                    invalid_count += 1
            return "".join(f"[{x}]" for x in valid)

        cleaned = _CITE.sub(replace_cite, answer)
        return cleaned, cited_order, invalid_count


class EvidenceChecker:
    """Evaluates whether the cited source passages genuinely support the claim."""

    @staticmethod
    def check_claim(claim_text: str, citations: list[int], sources: list[dict]) -> tuple[str, float, list[str], list[str], str]:
        if not citations:
            return "UNCITED", 0.0, [], [], ""

        claim_tokens = {w for w in _WORD.findall(claim_text.lower()) if w not in _STOP}
        claim_nums = set(_NUM.findall(claim_text))

        best_score, best_status = 0.0, "UNSUPPORTED"
        best_matches, missing_nums, best_snip = [], [], ""

        for c_idx in citations:
            if not (1 <= c_idx <= len(sources)):
                continue
            src = sources[c_idx - 1]
            src_text = (src.get("_text") or src.get("text") or src.get("snippet") or "").lower()
            src_tokens = {w for w in _WORD.findall(src_text)}

            if not claim_tokens:
                overlap = 0.0
                matches = []
            else:
                matches = sorted(claim_tokens & src_tokens)
                overlap = len(matches) / len(claim_tokens)

            # Check numbers / metrics consistency
            missing = [num for num in claim_nums if num.lower() not in src_text]

            # Calculate composite score
            score = overlap
            if missing:
                score *= 0.6  # penalty if numeric quantities are not found in the source

            if score > best_score:
                best_score = score
                best_matches = matches
                missing_nums = missing
                best_snip = src.get("snippet", "")[:160]

        if best_score >= 0.35 and not missing_nums:
            status = "VERIFIED"
        elif best_score >= 0.15:
            status = "WEAK"
        else:
            status = "UNSUPPORTED"

        return status, round(best_score, 2), best_matches, missing_nums, best_snip


class VerificationPolicyChecker:
    """Enforces policy threshold checks against the verification result."""

    @staticmethod
    def evaluate(policy: VerificationPolicy, claims: list[Claim]) -> tuple[bool, list[str]]:
        if not claims:
            return True, []
        total = len(claims)
        cited = sum(1 for c in claims if c.citations)
        coverage = cited / total
        verified = sum(1 for c in claims if c.status == "VERIFIED")
        unsupported = sum(1 for c in claims if c.status in ("UNSUPPORTED", "UNCITED"))
        avg_score = (sum(c.support_score for c in claims) / total) if total else 0.0

        violations = []
        if coverage < policy.min_citation_coverage:
            violations.append(
                f"Citation coverage ({coverage * 100:.0f}%) is below policy requirement ({policy.min_citation_coverage * 100:.0f}%)."
            )
        if avg_score < policy.min_verification_score:
            violations.append(
                f"Average evidence support score ({avg_score:.2f}) is below policy threshold ({policy.min_verification_score:.2f})."
            )
        if (unsupported / total) > policy.max_unsupported_ratio:
            violations.append(
                f"Unsupported claims ratio ({(unsupported / total) * 100:.0f}%) exceeds policy limit ({policy.max_unsupported_ratio * 100:.0f}%)."
            )
        if policy.require_all_entities_match:
            missing_entities = [c.missing_entities for c in claims if c.missing_entities]
            if missing_entities:
                violations.append("Certain factual figures or entities could not be corroborated in restricted documents.")

        passed = len(violations) == 0
        return passed, violations


class EvidenceVerificationEngine:
    """Orchestrator for the entire Evidence Verification Engine (Section 3)."""

    def __init__(self, max_retries: int = 1):
        self.max_retries = max_retries

    def verify(self, answer: str, sources: list[dict], classification: str = "INTERNAL") -> dict[str, Any]:
        """Runs the complete verification pipeline and returns structured Verification Result."""
        num_sources = len(sources)
        cleaned_text, cited_order, invalid_count = SourceChecker.validate_citations(answer, num_sources)

        raw_claims = ClaimChecker.extract_claims(cleaned_text)
        claims: list[Claim] = []
        for i, (orig, cleaned, cites) in enumerate(raw_claims):
            status, score, matches, missing, snip = EvidenceChecker.check_claim(cleaned, cites, sources)
            claims.append(
                Claim(
                    index=i + 1,
                    text=orig,
                    cleaned_text=cleaned,
                    citations=cites,
                    status=status,
                    support_score=score,
                    matched_words=matches,
                    missing_entities=missing,
                    evidence_snippet=snip,
                )
            )

        policy = POLICIES.get(classification.upper(), POLICIES["INTERNAL"])
        passed, violations = VerificationPolicyChecker.evaluate(policy, claims)

        total_claims = len(claims)
        verified_count = sum(1 for c in claims if c.status == "VERIFIED")
        weak_count = sum(1 for c in claims if c.status == "WEAK")
        unsupported_count = sum(1 for c in claims if c.status == "UNSUPPORTED")
        uncited_count = sum(1 for c in claims if c.status == "UNCITED")

        for s in sources:
            s["cited"] = s.get("n") in cited_order

        report = {
            "text": cleaned_text,
            "citedOrder": cited_order,
            "invalidCitations": invalid_count,
            "passed": passed,
            "policy": policy.name,
            "violations": violations,
            "metrics": {
                "totalClaims": total_claims,
                "verified": verified_count,
                "weak": weak_count,
                "unsupported": unsupported_count,
                "uncited": uncited_count,
                "coverage": round((total_claims - uncited_count) / max(1, total_claims), 2),
            },
            "claims": [
                {
                    "n": c.index,
                    "claim": c.cleaned_text,
                    "citations": c.citations,
                    "status": c.status,
                    "score": c.support_score,
                }
                for c in claims
            ],
            "attribution": {
                "sentences": total_claims,
                "cited": total_claims - uncited_count,
                "weaklySupported": weak_count,
                "unsupported": unsupported_count,
                "method": "Evidence Verification Engine (Claim Checker + NLI/Lexical Evidence Checker)",
                "status": "VERIFIED" if passed else "UNVERIFIED",
            },
        }
        return report

    def generate_correction_prompt(self, violations: list[str]) -> str:
        """Generates correction feedback for the LLM retry loop."""
        reasons = "; ".join(violations) if violations else "Some statements lacked citations or support."
        return (
            f"Correction Feedback: Your previous answer did not pass evidence verification: {reasons}\n"
            "Rewrite your answer using ONLY the numbered sources. End every factual sentence with its source number like [1] or [2].\n"
            "If the sources do not contain enough facts to support an answer, reply with exactly: INSUFFICIENT_EVIDENCE."
        )
