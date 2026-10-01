import type { Source } from "./types";

export type PodcastStyle = "briefing" | "deep-dive" | "recall";
export type PodcastSpeaker = "host" | "guide";

export interface PodcastSegment {
  id: string;
  speaker: PodcastSpeaker;
  text: string;
  sourceId?: string;
  sourceTitle?: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  style: PodcastStyle;
  createdAt: string;
  sourceIds: string[];
  sourceTitles: string[];
  estimatedMinutes: number;
  segments: PodcastSegment[];
}

export interface PodcastBuildOptions {
  title: string;
  style: PodcastStyle;
  targetMinutes: number;
}

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").replace(/([.!?])(?=[A-Z])/g, "$1 ").trim();
}

function excerpt(value: string, maximumWords: number) {
  const tokens = cleanText(value).split(/\s+/);
  if (tokens.length <= maximumWords) return tokens.join(" ");
  return `${tokens.slice(0, maximumWords).join(" ").replace(/[,;:]$/, "")}.`;
}

function segment(id: string, speaker: PodcastSpeaker, text: string, source?: Source): PodcastSegment {
  return { id, speaker, text, sourceId: source?.id, sourceTitle: source?.title };
}

export function buildPodcastEpisode(sources: Source[], options: PodcastBuildOptions, now = new Date()): PodcastEpisode {
  if (!sources.length) throw new Error("Select at least one knowledge source.");
  const targetWords = Math.max(260, Math.min(5000, options.targetMinutes * 135));
  const wrapperBudget = options.style === "recall" ? 190 : 150;
  const perSource = Math.max(90, Math.floor((targetWords - wrapperBudget) / sources.length));
  const segments: PodcastSegment[] = [
    segment("intro", "host", `Welcome to AIC Scholar Study Podcast. This is ${options.title}. Today we are revising from ${sources.length} named knowledge ${sources.length === 1 ? "source" : "sources"}. The original sources remain authoritative.`)
  ];

  sources.forEach((source, index) => {
    const label = [source.course, source.module, source.lecture].filter(Boolean).join(", ");
    segments.push(segment(`source-intro-${index}`, "host", `Source ${index + 1}: ${source.title}.${label ? ` Context: ${label}.` : ""}`, source));
    if (options.style === "recall") {
      const cues = [source.topic, ...source.tags].filter(Boolean).slice(0, 3).join(", ");
      segments.push(segment(`recall-prompt-${index}`, "guide", `Before listening to the notes, pause and explain what you remember about ${cues || source.title}. What are the main claims, and how would you apply them?`, source));
      segments.push(segment(`source-content-${index}`, "guide", `Now compare your recall with the recorded material. ${excerpt(source.content, perSource)}`, source));
      segments.push(segment(`recall-check-${index}`, "host", "What did you remember accurately? What was missing? Mark that gap for your next active-recall session.", source));
    } else {
      const lead = options.style === "deep-dive" ? "Let us work through the source carefully." : "Here is the focused revision briefing.";
      segments.push(segment(`source-content-${index}`, "guide", `${lead} ${excerpt(source.content, perSource)}`, source));
      if (source.tags.length) segments.push(segment(`source-tags-${index}`, "host", `Key retrieval cues from this source are ${source.tags.slice(0, 5).join(", ")}.`, source));
    }
  });

  segments.push(segment("recap", "guide", `That completes the ${options.style.replace("-", " ")} episode. Revisit the named sources for exact wording, page references, and full context.`));
  segments.push(segment("outro", "host", "This learning material was assembled by AIC Scholar from your Knowledge Vault. Keep interpretation human-led, verify important claims, and continue with one focused revision action."));
  const totalWords = segments.reduce((total, item) => total + words(item.text), 0);
  return {
    id: `podcast-${now.getTime()}`,
    title: options.title.trim() || "Untitled study podcast",
    style: options.style,
    createdAt: now.toISOString(),
    sourceIds: sources.map((source) => source.id),
    sourceTitles: sources.map((source) => source.title),
    estimatedMinutes: Math.max(1, Math.ceil(totalWords / 135)),
    segments
  };
}
