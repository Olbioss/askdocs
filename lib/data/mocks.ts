// In-memory mock backend used while the real /api/* routes are stubbed.
// Everything here is deterministic-ish and crafted to make the UI feel alive.

import type {
  AskInput,
  ChatStreamEvent,
  Citation,
  Document,
} from "@/lib/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 24, 0, 0);
  return d.toISOString();
}

export const initialDocuments: Document[] = [
  {
    id: "doc_termsheet",
    filename: "Series-A-Term-Sheet.pdf",
    status: "ready",
    createdAt: daysAgo(2),
    size: 184_320,
    pages: 9,
    chunkCount: 42,
  },
  {
    id: "doc_board",
    filename: "2026-Q1-Board-Memo.pdf",
    status: "ready",
    createdAt: daysAgo(5),
    size: 421_900,
    pages: 14,
    chunkCount: 73,
  },
  {
    id: "doc_handbook",
    filename: "Employee-Handbook.docx",
    status: "ready",
    createdAt: daysAgo(11),
    size: 98_700,
    pages: 28,
    chunkCount: 121,
  },
  {
    id: "doc_research",
    filename: "Research-Notes-RAG.md",
    status: "ready",
    createdAt: daysAgo(1),
    size: 22_140,
    pages: 6,
    chunkCount: 31,
  },
  {
    id: "doc_msa",
    filename: "Vendor-MSA-Acme.pdf",
    status: "processing",
    createdAt: daysAgo(0),
    size: 312_500,
  },
  {
    id: "doc_annual",
    filename: "Annual-Report-2025.pdf",
    status: "failed",
    createdAt: daysAgo(3),
    size: 5_204_880,
  },
];

// ── Citation snippet pool (keyed by id) ───────────────────────────────────
const SNIPPETS: Record<string, Omit<Citation, "similarity">> = {
  ts_val: {
    id: "ch_ts_val",
    documentId: "doc_termsheet",
    documentName: "Series-A-Term-Sheet.pdf",
    content:
      "The Company shall issue shares of Series A Preferred Stock at a price per share reflecting a pre-money valuation of $24,000,000 on a fully-diluted basis.",
    metadata: { page: 2, section: "Price" },
  },
  ts_liq: {
    id: "ch_ts_liq",
    documentId: "doc_termsheet",
    documentName: "Series-A-Term-Sheet.pdf",
    content:
      "In a liquidation event, each holder of Series A Preferred is entitled to a 1x non-participating liquidation preference, payable in preference to the Common Stock.",
    metadata: { page: 3, section: "Liquidation Preference" },
  },
  ts_anti: {
    id: "ch_ts_anti",
    documentId: "doc_termsheet",
    documentName: "Series-A-Term-Sheet.pdf",
    content:
      "Anti-dilution protection shall be on a broad-based weighted-average basis. No full-ratchet provision applies.",
    metadata: { page: 4, section: "Anti-dilution" },
  },
  bd_nrr: {
    id: "ch_bd_nrr",
    documentId: "doc_board",
    documentName: "2026-Q1-Board-Memo.pdf",
    content:
      "Net revenue retention reached 118% in Q1, driven primarily by seat expansion within the mid-market segment and improved gross retention of 94%.",
    metadata: { page: 1, section: "Revenue" },
  },
  bd_burn: {
    id: "ch_bd_burn",
    documentId: "doc_board",
    documentName: "2026-Q1-Board-Memo.pdf",
    content:
      "Monthly net burn declined to $310K, extending runway to roughly 19 months at the current trajectory without additional financing.",
    metadata: { page: 6, section: "Cash & Runway" },
  },
  hb_pto: {
    id: "ch_hb_pto",
    documentId: "doc_handbook",
    documentName: "Employee-Handbook.docx",
    content:
      "Full-time employees accrue 1.5 days of paid time off per month, up to a maximum accrued balance of 30 days. Balances above the cap stop accruing until used.",
    metadata: { section: "4.2 Paid Time Off" },
  },
  hb_remote: {
    id: "ch_hb_remote",
    documentId: "doc_handbook",
    documentName: "Employee-Handbook.docx",
    content:
      "Employees may work remotely up to three days per week, subject to manager approval and core collaboration hours of 10:00–15:00 local time.",
    metadata: { section: "3.1 Flexible Work" },
  },
  rs_hybrid: {
    id: "ch_rs_hybrid",
    documentId: "doc_research",
    documentName: "Research-Notes-RAG.md",
    content:
      "Hybrid retrieval — combining dense vector search with BM25 keyword scoring — cut the measured hallucination rate by 31% versus dense-only retrieval on our eval set.",
  },
  rs_chunk: {
    id: "ch_rs_chunk",
    documentId: "doc_research",
    documentName: "Research-Notes-RAG.md",
    content:
      "Chunk sizes of 500–800 tokens with ~15% overlap gave the best trade-off between recall and answer precision in our experiments.",
  },
};

interface Scenario {
  match: RegExp;
  answer: string; // contains [1], [2]… markers, 1-indexed into `cites`
  cites: (keyof typeof SNIPPETS)[];
}

const SCENARIOS: Scenario[] = [
  {
    match: /valuation|liquidation|preference|term sheet|anti-?dilution|series a/i,
    cites: ["ts_val", "ts_liq", "ts_anti"],
    answer:
      "The term sheet prices the round at a pre-money valuation of $24M on a fully-diluted basis, issued as Series A Preferred Stock [1]. Investors take a 1× non-participating liquidation preference, so they recover their investment ahead of common holders but don't also share pro-rata in the remainder [2]. Anti-dilution is the founder-friendly broad-based weighted-average flavor — there is no full-ratchet clause in the sections provided [3].",
  },
  {
    match: /revenue|retention|nrr|burn|runway|quarter|q1|perform|financ|growth/i,
    cites: ["bd_nrr", "bd_burn"],
    answer:
      "Last quarter looked healthy on both growth and efficiency. Net revenue retention came in at 118%, carried mostly by seat expansion in the mid-market, with gross retention at 94% [1]. On the cost side, monthly net burn fell to $310K, which stretches runway to roughly 19 months at the current pace and without raising again [2].",
  },
  {
    match: /pto|vacation|time off|leave|holiday|remote|work from home|wfh|benefit/i,
    cites: ["hb_pto", "hb_remote"],
    answer:
      "Two things from the handbook. PTO accrues at 1.5 days per month and caps at a 30-day balance — once you hit the cap, accrual pauses until you take time off [1]. On location, you can work remotely up to three days a week with manager sign-off, provided you're online for the 10:00–15:00 core hours [2].",
  },
  {
    match: /rag|retrieval|embedding|chunk|hallucinat|vector|bm25|hybrid/i,
    cites: ["rs_hybrid", "rs_chunk"],
    answer:
      "From the research notes: hybrid retrieval — dense vectors plus BM25 keyword scoring — reduced the measured hallucination rate by 31% over dense-only on the eval set [1]. For chunking, 500–800 token chunks with about 15% overlap struck the best balance between recall and answer precision [2].",
  },
];

const DEFAULT_SCENARIO: Scenario = {
  match: /.*/,
  cites: ["bd_nrr", "ts_liq", "rs_hybrid"],
  answer:
    "Here's what the indexed sources say. The most recent board memo reports 118% net revenue retention for the quarter [1]. On the financing side, the term sheet grants investors a 1× non-participating liquidation preference [2]. And from the research notes, hybrid retrieval measurably lowers hallucination rates versus dense-only search [3]. Ask something more specific and I'll pull the exact passages.",
};

function withSimilarity(keys: (keyof typeof SNIPPETS)[]): Citation[] {
  // Descending, plausible similarity scores.
  const scores = [0.92, 0.87, 0.81, 0.76, 0.71];
  return keys.map((k, i) => ({
    ...SNIPPETS[k],
    similarity: scores[i] ?? 0.68,
  }));
}

function pickScenario(input: AskInput): { answer: string; citations: Citation[] } {
  // Scope to a single document if requested.
  if (input.documentId) {
    const inDoc = (
      Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]
    ).filter((k) => SNIPPETS[k].documentId === input.documentId);

    const scenario =
      SCENARIOS.find(
        (s) =>
          s.match.test(input.question) &&
          s.cites.every((c) => SNIPPETS[c].documentId === input.documentId),
      ) ?? null;

    if (scenario) return { answer: scenario.answer, citations: withSimilarity(scenario.cites) };

    if (inDoc.length) {
      const cites = inDoc.slice(0, 3);
      const name = SNIPPETS[cites[0]].documentName;
      const answer =
        `Scoped to ${name}, here are the most relevant passages I found for your question. ` +
        cites.map((_, i) => `See the highlighted excerpt [${i + 1}].`).join(" ");
      return { answer, citations: withSimilarity(cites) };
    }
  }

  const scenario =
    SCENARIOS.find((s) => s.match.test(input.question)) ?? DEFAULT_SCENARIO;
  return { answer: scenario.answer, citations: withSimilarity(scenario.cites) };
}

// ── Public mock API ───────────────────────────────────────────────────────
export async function listDocuments(): Promise<Document[]> {
  await delay(420);
  return initialDocuments.map((d) => ({ ...d }));
}

export async function uploadDocument(file: File): Promise<Document> {
  await delay(700);
  return {
    id: `doc_${Math.random().toString(36).slice(2, 9)}`,
    filename: file.name,
    status: "processing",
    createdAt: new Date().toISOString(),
    size: file.size,
  };
}

export async function deleteDocument(_id: string): Promise<void> {
  await delay(300);
}

export async function* askQuestion(
  input: AskInput,
): AsyncGenerator<ChatStreamEvent> {
  const { answer, citations } = pickScenario(input);
  await delay(380); // "thinking"

  // Stream word-by-word, keeping citation markers attached.
  const tokens = answer.match(/\S+\s*/g) ?? [answer];
  for (const tok of tokens) {
    yield { type: "text", value: tok };
    await delay(18 + Math.random() * 34);
  }

  await delay(160);
  yield { type: "citations", value: citations };
}
