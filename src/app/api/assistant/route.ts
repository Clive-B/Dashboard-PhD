import { NextResponse } from "next/server";
import { z } from "zod";
import { aiGatewayToken, generalAiEnabled } from "@/lib/server/aiGateway";
import { databaseConfigured, db, userIdForEmail } from "@/lib/server/db";
import { currentEmail } from "@/lib/server/session";

const schema = z.object({
  prompt: z.string().min(1).max(10_000),
  mode: z.string().max(40).default("general"),
  scope: z.enum(["general", "academic", "planning"]).default("general"),
  includeWorkContext: z.boolean().default(false),
  context: z.object({
    academic: z.array(z.string().max(1_500)).max(24).default([]),
    work: z.array(z.string().max(1_500)).max(16).default([])
  }).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4_000) })).max(10).default([])
});

type Evidence = { sourceId: string; chunkId: string; title: string; page: number | null; section: string | null; timestampSeconds: number | null; excerpt: string };
type OpenAIResponse = { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };

function extractOutputText(payload: OpenAIResponse) {
  return payload.output?.flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text || "").join("\n").trim() || "";
}

async function generateAnswer(input: z.infer<typeof schema>, apiKey: string | null) {
  // Connected generation is deliberately limited to general questions. Academic,
  // planning, Knowledge Vault and work context never enter the provider request.
  if (input.scope !== "general" || !generalAiEnabled()) return null;
  if (!apiKey) return null;

  const response = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-5.4-mini",
      instructions: "You are the optional general-knowledge assistant inside AIC Scholar Command Center. Answer conversationally in British English and adapt detail to the question. Answer only from general knowledge supplied by the model; you have not received the user's Knowledge Vault, research, dashboard, planning or work data. Do not imply access to those sources. If the answer depends on live or rapidly changing information that you cannot verify, say that current verification is needed. Never invent citations or claim to be the official AIC. Do not claim that governance controls, residency checks, audits, signatures or certificates have executed. The user remains the final decision-maker.",
      input: [{ role: "user", content: input.prompt }],
      max_output_tokens: 800,
      store: false
    })
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const payload = await response.json() as OpenAIResponse;
  return extractOutputText(payload) || null;
}

export async function POST(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
  const input = parsed.data;

  let userId: string | null = null;
  let evidence: Evidence[] = [];
  if (databaseConfigured()) {
    userId = await userIdForEmail(email);
    if (input.scope === "academic") {
      const result = await db().query(`SELECT sc.id AS chunk_id,sc.content,s.id AS source_id,s.title,sc.page_number,sc.section_title,sc.transcript_start_seconds FROM source_chunks sc JOIN sources s ON s.id=sc.source_id WHERE s.user_id=$1 AND s.domain='academic' AND sc.search_vector @@ websearch_to_tsquery('english',$2) ORDER BY ts_rank(sc.search_vector,websearch_to_tsquery('english',$2)) DESC LIMIT 5`, [userId, input.prompt]);
      evidence = result.rows.map((row) => ({ sourceId: row.source_id, chunkId: row.chunk_id, title: row.title, page: row.page_number, section: row.section_title, timestampSeconds: row.transcript_start_seconds, excerpt: String(row.content).slice(0, 700) }));
    }
  }

  const providerToken = input.scope === "general" ? await aiGatewayToken() : null;
  let answer: string | null = null;
  try { answer = await generateAnswer(input, providerToken); }
  catch (error) {
    console.error("Assistant provider request failed:", error instanceof Error ? error.message : "Unknown provider error");
    answer = null;
  }

  const providerConfigured = Boolean(providerToken);
  const provenance = evidence.length ? "source-grounded" : "general";
  if (!answer && evidence.length) answer = evidence.map((item) => item.excerpt).join("\n\n");
  if (!answer) return NextResponse.json({
    mode: "local-fallback",
    provenance: "none",
    answer: providerConfigured
      ? "The AI provider is temporarily unavailable. Please try the question again shortly."
      : "The optional general-question AI is not configured. Enable Vercel AI Gateway authentication to use it.",
    evidence: []
  });

  if (userId) {
    const interaction = await db().query<{ id: string }>("INSERT INTO aic_interactions(user_id,mode,user_prompt,response_text,provenance_label,model_provider,result_status) VALUES($1,$2,$3,$4,$5,$6,'success') RETURNING id", [userId, input.mode, input.prompt, answer, provenance === "source-grounded" ? "source_grounded" : "none", providerConfigured ? "vercel-ai-gateway" : "local-retrieval"]);
    for (let index = 0; index < evidence.length; index++) await db().query("INSERT INTO evidence_references(interaction_id,source_id,source_chunk_id,citation_order,quoted_text) VALUES($1,$2,$3,$4,$5)", [interaction.rows[0].id, evidence[index].sourceId, evidence[index].chunkId, index + 1, evidence[index].excerpt]);
  }

  return NextResponse.json({ mode: providerConfigured ? "connected-ai" : "local-retrieval", provenance, answer, evidence });
}
