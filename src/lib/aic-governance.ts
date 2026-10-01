import type { Source } from "./types";

export const AIC_OFFICIAL_URL = "https://chatgpt.com/g/g-69790c94d7e48191a07a659f635328ba-academic-intelligence-center-aic";

export const AIC_GOVERNANCE_PRINCIPLES = [
  "Guide reasoning and structure; do not replace the learner's thinking or authorship.",
  "Check philosophical, methodological and argumentative coherence.",
  "Use sources with citation discipline and never fabricate references.",
  "Keep final writing, verification and intellectual responsibility with the learner."
] as const;

export type AicHandoffInput = {
  goal: string;
  request: string;
  course?: string;
  sources: Source[];
};

export function buildAicHandoffPrompt({ goal, request, course, sources }: AicHandoffInput) {
  const evidence = sources.length
    ? sources.map((source, index) => [
        `[Source ${index + 1}] ${source.title}`,
        `Type: ${source.sourceType}${source.author ? ` | Author: ${source.author}` : ""}${source.sourceDate ? ` | Date: ${source.sourceDate.slice(0, 10)}` : ""}`,
        `Content: ${source.content}`
      ].join("\n")).join("\n\n")
    : "No source material was selected. Identify what evidence I should add before making source-dependent claims.";

  return [
    "AIC GOVERNED COACHING REQUEST",
    "",
    "Learner level: PhD in Information Technology",
    `Course/context: ${course || "Not specified"}`,
    `Coaching goal: ${goal}`,
    "",
    "My request:",
    request || "Help me identify the first questions I should answer to make progress.",
    "",
    "Evidence I deliberately selected from my Academic Intelligence Center dashboard:",
    evidence,
    "",
    "Apply the documented AIC method:",
    "- Act as a guided academic intelligence partner, not as my ghostwriter.",
    "- Help me reason, structure and test the logic; do not produce submission-ready work for me.",
    "- Check alignment among the research problem, questions, ontology, epistemology, methodology and methods where relevant.",
    "- Distinguish evidence-supported points from suggestions and uncertainties.",
    "- Do not invent citations, references, lecturer content or facts.",
    "- Ask focused questions when information is missing.",
    "- Finish with concrete next steps for work I must complete myself.",
    "",
    "Human authority: I remain the author and will independently verify all claims and citations."
  ].join("\n");
}
