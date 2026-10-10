"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, BookOpen, Bot, Check, Copy, ExternalLink, FileText, Link2, LoaderCircle, Mic, Plus, Printer, SearchCheck, ShieldCheck, Sparkles, StickyNote, Trash2, UserRound, Volume2 } from "lucide-react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { recommendNext } from "@/lib/algorithms";
import { AIC_GOVERNANCE_PRINCIPLES, AIC_OFFICIAL_URL, buildAicHandoffPrompt } from "@/lib/aic-governance";
import { calculateVoiceLevel } from "@/lib/conversation";
import { Badge, SectionHeading } from "@/components/ui";

type Message = { role: "user" | "assistant"; text: string; sources?: string[]; label?: "source-grounded" | "planning" | "general" };
type ConversationPhase = "off" | "listening" | "thinking" | "speaking";
type StickyLane = "today" | "remember" | "ideas";
type DailySticky = { id: string; text: string; lane: StickyLane; source: "assistant" | "manual"; createdAt: string };
const modes = ["General", "Revise", "Test me", "Explain", "Find evidence", "Plan", "Review progress"];
const coachingGoals = ["Refine a research idea", "Identify a research gap", "Check methodology alignment", "Structure a chapter or argument", "Map literature and theory", "Review coherence and academic rigour"];
const stickyLanes: Array<{ id: StickyLane; title: string; hint: string }> = [
  { id: "today", title: "Do today", hint: "Immediate actions" },
  { id: "remember", title: "Remember", hint: "Deadlines and reminders" },
  { id: "ideas", title: "Ideas", hint: "Thoughts to revisit" }
];
const STICKY_STORAGE_KEY = "aic-scholar-daily-stickies-v1";
const CONVERSATION_STORAGE_KEY = "aic-scholar-conversation-v1";
const MAX_SAVED_MESSAGES = 12;
const MAX_SAVED_MESSAGE_LENGTH = 2_000;
const MAX_CONVERSATION_STORAGE_CHARS = 24_000;
const welcomeMessage: Message = { role: "assistant", text: "Good to see you, Clive. I’m your AIC Tutor. I can discuss your courses, research, work and general questions, while keeping your academic interpretation and final writing under your control." };

type SpeechResult = { 0: { transcript: string }; isFinal: boolean };
type BrowserSpeechRecognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export function AssistantPage() {
  const { state } = useScholar();
  const [mode, setMode] = useState("General");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [conversationMemoryLoaded, setConversationMemoryLoaded] = useState(false);
  const messagesRef = useRef(messages);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const listenTimerRef = useRef<number | null>(null);
  const voiceMonitorStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceAnimationRef = useRef<number | null>(null);
  const conversationEnabledRef = useRef(false);
  const phaseRef = useRef<ConversationPhase>("off");
  const [conversationMode, setConversationMode] = useState(false);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>("off");
  const [speechError, setSpeechError] = useState("");
  const [voiceInterruptReady, setVoiceInterruptReady] = useState(false);
  const [stickies, setStickies] = useState<DailySticky[]>([]);
  const [stickiesLoaded, setStickiesLoaded] = useState(false);
  const [newSticky, setNewSticky] = useState("");
  const [newStickyLane, setNewStickyLane] = useState<StickyLane>("ideas");
  const [goal, setGoal] = useState(coachingGoals[0]);
  const [course, setCourse] = useState("");
  const [request, setRequest] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const eligibleSources = useMemo(() => state.sources.filter((source) => !course || source.course === course), [course, state.sources]);
  const selectedSources = useMemo(() => state.sources.filter((source) => selectedSourceIds.includes(source.id)), [selectedSourceIds, state.sources]);
  const handoffPrompt = useMemo(() => buildAicHandoffPrompt({ goal, request, course, sources: selectedSources }), [course, goal, request, selectedSources]);
  const dailyTasks = useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return state.tasks.filter((task) => task.status !== "completed").sort((a, b) => {
      const deadlineDifference = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      return deadlineDifference || priorityOrder[a.priority] - priorityOrder[b.priority];
    }).slice(0, 5);
  }, [state.tasks]);
  const todayLabel = useMemo(() => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()), []);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (saved) {
        const compact = JSON.parse(saved) as Array<[0 | 1, string]>;
        const restored = compact
          .filter((item) => Array.isArray(item) && (item[0] === 0 || item[0] === 1) && typeof item[1] === "string")
          .map(([role, text]) => ({ role: role === 0 ? "user" as const : "assistant" as const, text }));
        if (restored.length) setMessages([welcomeMessage, ...restored]);
      }
    } catch {
      window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    } finally {
      setConversationMemoryLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (!conversationMemoryLoaded) return;
    const recent = messages
      .filter((message) => message !== welcomeMessage && message.text !== welcomeMessage.text)
      .slice(-MAX_SAVED_MESSAGES)
      .map((message) => [message.role === "user" ? 0 : 1, message.text.slice(0, MAX_SAVED_MESSAGE_LENGTH)] as [0 | 1, string]);
    while (recent.length && JSON.stringify(recent).length > MAX_CONVERSATION_STORAGE_CHARS) recent.shift();
    if (recent.length) window.localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(recent));
    else window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
  }, [conversationMemoryLoaded, messages]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STICKY_STORAGE_KEY);
      if (saved) setStickies(JSON.parse(saved) as DailySticky[]);
    } catch {
      setSpeechError("Saved sticky notes could not be loaded in this browser.");
    } finally {
      setStickiesLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (!stickiesLoaded) return;
    window.localStorage.setItem(STICKY_STORAGE_KEY, JSON.stringify(stickies));
  }, [stickies, stickiesLoaded]);
  useEffect(() => () => {
    conversationEnabledRef.current = false;
    requestControllerRef.current?.abort();
    recognitionRef.current?.abort();
    if (listenTimerRef.current !== null) window.clearTimeout(listenTimerRef.current);
    if (voiceAnimationRef.current !== null) window.cancelAnimationFrame(voiceAnimationRef.current);
    voiceMonitorStreamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    window.speechSynthesis?.cancel();
  }, []);

  function updateConversationPhase(next: ConversationPhase) {
    phaseRef.current = next;
    setConversationPhase(next);
  }

  function localAnswer(question: string): Message {
    const normalized = question.toLowerCase();
    if (normalized.includes("what should") || normalized.includes("do now") || mode === "Plan") {
      const next = recommendNext(state);
      return next ? { role: "assistant", label: "planning", text: `The strongest next action is “${next.title}” (${next.estimatedMinutes} minutes). I selected it because ${next.reasons.join(", ")}. This is a recommendation—you remain the decision-maker.` } : { role: "assistant", text: "There are no open tasks in the current plan." };
    }
    if (/\b(work|job|office|professional|deliverable|deadline|project)\b/.test(normalized)) {
      const work = state.tasks.filter((task) => task.domain === "work" && task.status !== "completed").slice(0, 4);
      return work.length
        ? { role: "assistant", label: "planning", text: `Your open work priorities are ${work.map((task) => `${task.title} (${task.status}, due ${new Date(task.deadline).toLocaleDateString("en-GB")})`).join("; ")}. Which one would you like to plan?` }
        : { role: "assistant", label: "general", text: "You currently have no open work tasks in the dashboard. You can still ask a general work question once an AI provider is configured." };
    }
    if (/\b(course|school|phd|lecture|study|academic|research|revision)\b/.test(normalized)) {
      const courseNames = state.courses.slice(0, 5).map((item) => item.title);
      const academic = state.tasks.filter((task) => task.domain === "academic" && task.status !== "completed").slice(0, 3);
      return { role: "assistant", label: "general", text: `Your dashboard currently contains ${courseNames.length ? courseNames.join(", ") : "no courses yet"}.${academic.length ? ` Open academic priorities include ${academic.map((task) => task.title).join(", ")}.` : " There are no open academic tasks."}` };
    }
    const terms = normalized.split(/\W+/).filter((word) => word.length > 4);
    const matches = state.sources.filter((source) => terms.some((term) => `${source.title} ${source.content} ${source.tags.join(" ")}`.toLowerCase().includes(term))).slice(0, 3);
    if (matches.length) {
      const excerpts = matches.map((source) => source.content.split(/(?<=[.!?])\s+/).find((sentence) => terms.some((term) => sentence.toLowerCase().includes(term))) || source.content.slice(0, 220));
      return { role: "assistant", label: "source-grounded", text: excerpts.join(" "), sources: matches.map((source) => source.title) };
    }
    return { role: "assistant", text: "I could not find supporting evidence in your Knowledge Vault. Add relevant material, rephrase the question, or configure the optional AI provider for open-ended general questions." };
  }

  async function resolveAnswer(question: string, signal?: AbortSignal): Promise<Message | null> {
    const normalized = question.toLowerCase();
    const planningQuery = mode === "Plan" || mode === "Review progress" || /\b(what should|next|today|deadline|task|plan|priority|progress)\b/.test(normalized);
    const generalQuery = mode === "General";
    const academicQuery = !generalQuery && !planningQuery;
    const includeWorkContext = planningQuery || /\b(work|job|office|professional|deliverable|project)\b/.test(normalized);
    const scope = generalQuery ? "general" : planningQuery ? "planning" : "academic";
    const terms = normalized.split(/\W+/).filter((word) => word.length > 4);
    const relevantSources = state.sources.filter((source) => terms.some((term) => `${source.title} ${source.tags.join(" ")} ${source.course || ""}`.toLowerCase().includes(term))).slice(0, 5);
    const context = {
      academic: academicQuery ? [
        ...state.courses.slice(0, 8).map((item) => `${item.code ? `${item.code}: ` : ""}${item.title}${item.description ? ` — ${item.description}` : ""}`),
        ...state.tasks.filter((task) => task.domain === "academic" && task.status !== "completed").slice(0, 8).map((task) => `Academic task: ${task.title}; status ${task.status}; due ${task.deadline}`),
        ...relevantSources.map((source) => `Source: ${source.title}; ${source.content.slice(0, 500)}`)
      ] : [],
      work: includeWorkContext ? state.tasks.filter((task) => task.domain === "work" && task.status !== "completed").slice(0, 8).map((task) => `Work task: ${task.title}; status ${task.status}; priority ${task.priority}; due ${task.deadline}${task.notes ? `; notes ${task.notes}` : ""}`) : []
    };
    if (process.env.NEXT_PUBLIC_CONNECTED_AI_ENABLED !== "true") return localAnswer(question);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, mode: mode.toLowerCase(), scope, includeWorkContext, context, history: messagesRef.current.slice(-8).map((message) => ({ role: message.role, text: message.text })) }),
        signal
      });
      if (response.ok) {
        const data = await response.json() as { mode?: string; answer?: string; provenance?: string; evidence?: Array<{ title?: string }> };
        if (data.answer && data.mode !== "local-fallback") return {
          role: "assistant",
          label: data.provenance === "source-grounded" ? "source-grounded" : "general",
          text: data.answer,
          sources: data.evidence?.map((item) => item.title || "Knowledge Vault").filter(Boolean)
        };
      }
    } catch {
      if (signal?.aborted) return null;
      // The governed local fallback keeps the dashboard useful offline.
    }
    return localAnswer(question);
  }

  function scheduleListening(delay = 250) {
    if (listenTimerRef.current !== null) window.clearTimeout(listenTimerRef.current);
    listenTimerRef.current = window.setTimeout(() => {
      listenTimerRef.current = null;
      if (!conversationEnabledRef.current) return;
      updateConversationPhase("listening");
      startListening();
    }, delay);
  }

  function releaseRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;
    recognitionRef.current = null;
    recognition.abort();
  }

  function stopVoiceActivityMonitor() {
    if (voiceAnimationRef.current !== null) window.cancelAnimationFrame(voiceAnimationRef.current);
    voiceAnimationRef.current = null;
  }

  function releaseVoiceMonitor() {
    stopVoiceActivityMonitor();
    voiceMonitorStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceMonitorStreamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close();
    audioContextRef.current = null;
    setVoiceInterruptReady(false);
  }

  async function prepareVoiceMonitor() {
    if (analyserRef.current && voiceMonitorStreamRef.current) {
      if (audioContextRef.current?.state === "suspended") await audioContextRef.current.resume();
      setVoiceInterruptReady(true);
      return true;
    }
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (!conversationEnabledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      voiceMonitorStreamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setVoiceInterruptReady(true);
      return true;
    } catch {
      setVoiceInterruptReady(false);
      return false;
    }
  }

  function stopSpokenReplyForInterruption() {
    stopVoiceActivityMonitor();
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    window.speechSynthesis?.cancel();
    updateConversationPhase("listening");
  }

  function startVoiceActivityMonitor() {
    stopVoiceActivityMonitor();
    const analyser = analyserRef.current;
    if (!analyser || !conversationEnabledRef.current) return;
    const samples = new Uint8Array(analyser.fftSize);
    const startedAt = performance.now();
    const monitoringSpokenReply = phaseRef.current === "speaking";
    let baseline = 0.012;
    let consecutiveVoiceFrames = 0;
    const monitor = () => {
      if (!conversationEnabledRef.current || (phaseRef.current !== "speaking" && phaseRef.current !== "thinking")) {
        stopVoiceActivityMonitor();
        return;
      }
      analyser.getByteTimeDomainData(samples);
      const level = calculateVoiceLevel(samples);
      const elapsed = performance.now() - startedAt;
      if (monitoringSpokenReply && elapsed < 450) {
        baseline = baseline * 0.82 + level * 0.18;
        consecutiveVoiceFrames = level > Math.max(0.18, baseline * 4) ? consecutiveVoiceFrames + 1 : 0;
      } else {
        const threshold = Math.max(0.05, baseline * 2.8);
        consecutiveVoiceFrames = level > threshold ? consecutiveVoiceFrames + 1 : Math.max(0, consecutiveVoiceFrames - 2);
      }
      if (consecutiveVoiceFrames >= 5) {
        requestControllerRef.current?.abort();
        requestControllerRef.current = null;
        stopSpokenReplyForInterruption();
        setInput("");
        setSpeechError("");
        scheduleListening(40);
        return;
      }
      voiceAnimationRef.current = window.requestAnimationFrame(monitor);
    };
    voiceAnimationRef.current = window.requestAnimationFrame(monitor);
  }

  function speakReply(text: string) {
    if (!conversationEnabledRef.current || !("speechSynthesis" in window)) {
      if (conversationEnabledRef.current) scheduleListening();
      return;
    }
    updateConversationPhase("speaking");
    releaseRecognition();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.lang = "en-GB";
    utterance.rate = 0.96;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === "en-gb") || voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) || null;
    const resume = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      stopVoiceActivityMonitor();
      if (conversationEnabledRef.current) scheduleListening();
    };
    utterance.onend = resume;
    utterance.onerror = resume;
    window.speechSynthesis.speak(utterance);
    startVoiceActivityMonitor();
  }

  async function askQuestion(question: string, spoken = false) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    setMessages((current) => [...current, { role: "user", text: cleanQuestion }]);
    setInput("");
    if (spoken || conversationEnabledRef.current) updateConversationPhase("thinking");
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    if (conversationEnabledRef.current) startVoiceActivityMonitor();
    const answer = await resolveAnswer(cleanQuestion, controller.signal);
    if (requestControllerRef.current === controller) requestControllerRef.current = null;
    if (!answer) {
      if (conversationEnabledRef.current) scheduleListening(100);
      else updateConversationPhase("off");
      return;
    }
    setMessages((current) => [...current, answer]);
    if (conversationEnabledRef.current) speakReply(answer.text);
    else updateConversationPhase("off");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void askQuestion(input);
  }

  function startListening() {
    if (!conversationEnabledRef.current || recognitionRef.current || phaseRef.current === "thinking" || phaseRef.current === "speaking") return;
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      conversationEnabledRef.current = false;
      setConversationMode(false);
      updateConversationPhase("off");
      setSpeechError("Conversation mode is not supported by this browser. Use Chrome or Edge, or type your message.");
      return;
    }
    const recognition = new Recognition();
    let finalTranscript = "";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    recognition.onstart = () => {
      updateConversationPhase("listening");
      setSpeechError("");
    };
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const words = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalTranscript += `${words} `;
        else interimTranscript += words;
      }
      const heard = [finalTranscript.trim(), interimTranscript.trim()].filter(Boolean).join(" ");
      setInput(heard);
      if (finalTranscript.trim()) {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognitionRef.current = null;
        recognition.stop();
        const question = finalTranscript.trim();
        void askQuestion(question, true);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        conversationEnabledRef.current = false;
        setConversationMode(false);
        updateConversationPhase("off");
        setSpeechError("Microphone access was denied. Allow microphone permission in the browser, then turn Conversation Mode on again.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") setSpeechError(`Microphone error: ${event.error.replaceAll("-", " ")}.`);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (!conversationEnabledRef.current) return;
      if (phaseRef.current === "listening") scheduleListening(250);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); }
    catch {
      recognitionRef.current = null;
      setSpeechError("The microphone paused unexpectedly. Conversation Mode will keep trying to listen.");
      if (conversationEnabledRef.current) scheduleListening(500);
    }
  }

  async function startConversation() {
    conversationEnabledRef.current = true;
    setConversationMode(true);
    setSpeechError("");
    updateConversationPhase("listening");
    await prepareVoiceMonitor();
    if (!conversationEnabledRef.current) return;
    startListening();
  }

  function stopConversation() {
    conversationEnabledRef.current = false;
    setConversationMode(false);
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    releaseRecognition();
    releaseVoiceMonitor();
    if (listenTimerRef.current !== null) window.clearTimeout(listenTimerRef.current);
    listenTimerRef.current = null;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    window.speechSynthesis?.cancel();
    updateConversationPhase("off");
    setInput("");
  }

  function interruptAndListen() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    releaseRecognition();
    stopSpokenReplyForInterruption();
    setInput("");
    setSpeechError("");
    updateConversationPhase("listening");
    scheduleListening(50);
  }

  function handleConversationControl() {
    if (!conversationEnabledRef.current) void startConversation();
    else if (phaseRef.current === "thinking" || phaseRef.current === "speaking") interruptAndListen();
    else stopConversation();
  }

  function toggleSource(id: string) {
    setSelectedSourceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setCopied(false);
  }

  async function copyHandoff() {
    try { await navigator.clipboard.writeText(handoffPrompt); setCopied(true); }
    catch { setCopied(false); }
  }

  function addSticky(event: FormEvent) {
    event.preventDefault();
    const text = newSticky.trim();
    if (!text) return;
    setStickies((current) => [...current, { id: crypto.randomUUID(), text, lane: newStickyLane, source: "manual", createdAt: new Date().toISOString() }]);
    setNewSticky("");
  }

  function generateDailyStickers() {
    const dateId = new Date().toISOString().slice(0, 10);
    const taskNotes: DailySticky[] = dailyTasks.slice(0, 5).map((task, index) => ({
      id: `assistant-${dateId}-${task.id}`,
      text: `${index === 0 ? "Focus: " : ""}${task.title} · ${task.estimatedMinutes} min${task.deadline ? ` · due ${new Date(task.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}`,
      lane: index < 3 ? "today" : "remember",
      source: "assistant",
      createdAt: new Date().toISOString()
    }));
    const reviewNotes: DailySticky[] = state.concepts
      .filter((concept) => new Date(concept.nextReview).getTime() <= Date.now() + 24 * 60 * 60 * 1000)
      .slice(0, 2)
      .map((concept) => ({
        id: `assistant-${dateId}-concept-${concept.id}`,
        text: `Review: ${concept.name} (${concept.course})`,
        lane: "remember" as const,
        source: "assistant" as const,
        createdAt: new Date().toISOString()
      }));
    setStickies((current) => [...current.filter((sticky) => sticky.source === "manual"), ...taskNotes, ...reviewNotes]);
  }

  function updateSticky(id: string, changes: Partial<Pick<DailySticky, "text" | "lane">>) {
    setStickies((current) => current.map((sticky) => sticky.id === id ? { ...sticky, ...changes } : sticky));
  }

  function removeSticky(id: string) {
    setStickies((current) => current.filter((sticky) => sticky.id !== id));
  }

  function clearConversationMemory() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    setMessages([welcomeMessage]);
    setInput("");
    if (conversationEnabledRef.current) {
      releaseRecognition();
      stopSpokenReplyForInterruption();
      scheduleListening(100);
    }
  }

  const phaseLabel = conversationPhase === "listening" ? "Listening—ask your question" : conversationPhase === "thinking" ? "Thinking" : conversationPhase === "speaking" ? "AIC is speaking" : "Conversation is off";
  const conversationControlLabel = !conversationMode
    ? "Turn conversation mode on"
    : conversationPhase === "thinking"
      ? "Interrupt the response and listen"
      : conversationPhase === "speaking"
        ? "Interrupt AIC and listen"
        : "Turn conversation mode off";
  const floatingControlText = !conversationMode ? "Conversation Mode" : conversationPhase === "speaking" ? "Speak now to interrupt" : conversationPhase === "thinking" ? "Interrupt & speak" : "Listening · tap to stop";

  return <div className="stack-xl">
    <div className="assistant-layout">
      <aside className="assistant-context panel"><div className="assistant-mark"><Bot size={22} /></div><span className="eyebrow">AIC Tutor · governed learning</span><h2>Your interactive learning companion.</h2><p>Ask about school, research, work or general topics. Turn Conversation Mode on once; AIC will keep listening between answers, and you can speak over it to interrupt.</p><div className={`aic-capability ${conversationMode ? "active" : ""}`}><span className="status-dot" /><div><strong>{conversationMode ? "Conversation Mode is on" : "Text and conversation available"}</strong><small>British English recognition and voice</small></div></div><div className="governance-list"><div><ShieldCheck size={17} /><span><strong>Human authorship</strong>You write and approve the final academic work.</span></div><div><SearchCheck size={17} /><span><strong>Provenance visible</strong>Vault answers identify their supporting sources.</span></div><div><BookOpen size={17} /><span><strong>Guidance, not ghostwriting</strong>Structure and reasoning take priority over generated prose.</span></div></div></aside>
      <section className="chat-panel panel">
        <div className="chat-toolbar"><div className="mode-tabs">{modes.map((item) => <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item}</button>)}</div><button type="button" className="conversation-memory-clear" onClick={clearConversationMemory} title="Clear saved conversation" aria-label="Clear saved conversation"><Trash2 size={15} /><span>Clear memory</span></button></div>
        <div className="messages" aria-live="polite">{messages.map((message, index) => <div className={`message ${message.role}`} key={index}><span className="avatar">{message.role === "assistant" ? <Bot size={18} /> : <UserRound size={18} />}</span><div>{message.label && <Badge tone={message.label === "source-grounded" ? "green" : message.label === "planning" ? "blue" : "teal"}>{message.label}</Badge>}<p>{message.text}</p>{message.sources?.length ? <div className="message-sources"><strong>Sources</strong>{message.sources.map((source) => <span key={source}>{source}</span>)}</div> : null}</div></div>)}</div>
        <form className="chat-input" onSubmit={submit}><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder={conversationMode ? "Listening for your question…" : `Use ${mode} mode…`} /><button type="button" className={`conversation-mic ${conversationMode ? "active" : ""}`} aria-label={conversationControlLabel} title={conversationControlLabel} onClick={handleConversationControl}>{conversationPhase === "thinking" ? <LoaderCircle size={20} className="spin" /> : conversationPhase === "speaking" ? <Volume2 size={20} /> : <Mic size={20} />}</button><button type="submit" aria-label="Send"><ArrowUp size={19} /></button></form>
        <div className={`conversation-status ${conversationMode ? conversationPhase : "off"}`}><span /><strong>{phaseLabel}</strong>{conversationMode && <small>{conversationPhase === "speaking" ? voiceInterruptReady ? "Speak naturally to stop AIC; recognition begins only after AIC audio stops." : "Automatic interruption is unavailable; use the fixed control." : conversationPhase === "thinking" ? voiceInterruptReady ? "Speak to cancel this response and ask something else." : "Use the fixed control to cancel and speak." : "Hands-free loop active. It will keep listening after every answer; use a conversation control while listening to turn it off."}</small>}</div>
        {speechError && <small className="speech-status error">{speechError}</small>}<small className="chat-disclaimer">AIC can make mistakes. Verify academic claims against named sources. Relevant work context is included only for work and planning questions.</small>
      </section>
    </div>

    <button type="button" className={`conversation-dock ${conversationMode ? conversationPhase : "off"}`} onClick={handleConversationControl} aria-pressed={conversationMode} aria-label={conversationControlLabel} title={conversationControlLabel}><span>{conversationPhase === "thinking" ? <LoaderCircle size={20} className="spin" /> : conversationPhase === "speaking" ? <Volume2 size={20} /> : <Mic size={20} />}</span><strong>{floatingControlText}</strong><small>{!conversationMode ? "OFF · tap to turn on" : conversationPhase === "speaking" && voiceInterruptReady ? "No click needed" : conversationPhase === "speaking" ? "Tap to interrupt" : "Always available"}</small></button>

    <section className="daily-workspace">
      <div className="daily-print-sheet panel">
        <div className="daily-brief-heading"><div><span className="eyebrow">Daily shorthand · {todayLabel}</span><h2>Your one-page day brief</h2></div><button type="button" className="button button-primary no-print" onClick={() => window.print()}><Printer size={16} />Print brief</button></div>
        <div className="daily-focus"><span>FOCUS</span><strong>{dailyTasks[0]?.title || "Choose one meaningful priority"}</strong><small>{dailyTasks[0] ? `${dailyTasks[0].estimatedMinutes} min · ${dailyTasks[0].domain} · ${dailyTasks[0].priority} priority` : "Your open tasks will appear here."}</small></div>
        <ol className="shorthand-list">{dailyTasks.slice(1, 5).map((task, index) => <li key={task.id}><span>{index + 1}</span><div><strong>{task.title}</strong><small>{task.estimatedMinutes}m · due {new Date(task.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {task.status.replaceAll("-", " ")}</small></div></li>)}</ol>
        <div className="print-watch-list"><strong>WATCH</strong>{stickies.filter((sticky) => sticky.lane === "today").slice(0, 5).map((sticky) => <span key={sticky.id}>□ {sticky.text}</span>)}</div>
        <small className="daily-brief-footer">Keep this visible. Re-plan deliberately if priorities change; the brief does not make decisions for you.</small>
      </div>

      <div className="sticky-workspace panel no-print">
        <div className="sticky-heading"><SectionHeading eyebrow="AIC daily board" title="Organised sticky notes" /><button type="button" className="button button-gold" onClick={generateDailyStickers}><Sparkles size={16} />Generate from priorities</button></div>
        <form className="sticky-add" onSubmit={addSticky}><StickyNote size={18} /><input value={newSticky} onChange={(event) => setNewSticky(event.target.value)} placeholder="Add a note or idea…" aria-label="New sticky note" /><select value={newStickyLane} onChange={(event) => setNewStickyLane(event.target.value as StickyLane)} aria-label="Sticky note group">{stickyLanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.title}</option>)}</select><button type="submit" aria-label="Add sticky note"><Plus size={18} /></button></form>
        <div className="sticky-board">{stickyLanes.map((lane) => <section className={`sticky-lane ${lane.id}`} key={lane.id}><div className="sticky-lane-heading"><div><strong>{lane.title}</strong><small>{lane.hint}</small></div><Badge>{stickies.filter((sticky) => sticky.lane === lane.id).length}</Badge></div><div className="sticky-stack">{stickies.filter((sticky) => sticky.lane === lane.id).map((sticky) => <article className="sticky-card" key={sticky.id}><textarea value={sticky.text} onChange={(event) => updateSticky(sticky.id, { text: event.target.value })} aria-label={`${lane.title} sticky note`} /><div><select value={sticky.lane} onChange={(event) => updateSticky(sticky.id, { lane: event.target.value as StickyLane })} aria-label="Move sticky note">{stickyLanes.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}</select><small>{sticky.source === "assistant" ? "AIC organised" : "Your note"}</small><button type="button" onClick={() => removeSticky(sticky.id)} aria-label="Delete sticky note"><Trash2 size={14} /></button></div></article>)}{!stickies.some((sticky) => sticky.lane === lane.id) && <div className="sticky-empty">No notes here yet.</div>}</div></section>)}</div>
        <small className="sticky-privacy">Stored only in this browser. AIC-generated notes use your dashboard priorities; review and move them as your day changes.</small>
      </div>
    </section>

    <section className="panel aic-bridge">
      <div className="aic-bridge-heading"><SectionHeading eyebrow="Official AIC handoff" title="Prepare a governed coaching brief" /><div className="button-row"><Badge tone="gold">Document-linked</Badge><Badge>No API connection</Badge></div></div>
      <div className="aic-bridge-notice"><Link2 size={18} /><div><strong>What this linkage does</strong><span>It prepares only the academic context you choose, copies it for your review, and opens Dr. David King Boison’s official AIC custom GPT. The dashboard does not send data automatically.</span></div></div>
      <div className="aic-bridge-grid">
        <div className="aic-bridge-form">
          <label>Coaching goal<select value={goal} onChange={(event) => { setGoal(event.target.value); setCopied(false); }}>{coachingGoals.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Course context<select value={course} onChange={(event) => { setCourse(event.target.value); setSelectedSourceIds([]); setCopied(false); }}><option value="">All academic courses</option>{state.courses.map((item) => <option key={item.id} value={item.title}>{item.code ? `${item.code} — ` : ""}{item.title}</option>)}</select></label>
          <label className="full">What do you want AIC to help you reason through?<textarea rows={5} value={request} onChange={(event) => { setRequest(event.target.value); setCopied(false); }} placeholder="Describe the problem, context, scope and the point where you are stuck. Ask for structure or a consistency check rather than final authorship." /></label>
          <div className="aic-source-picker full"><strong>Select evidence to disclose</strong><small>Professional tasks are never included. Select only material you are comfortable pasting into ChatGPT.</small>{eligibleSources.length ? eligibleSources.map((source) => <label key={source.id} className={selectedSourceIds.includes(source.id) ? "selected" : ""}><input type="checkbox" checked={selectedSourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} /><FileText size={16} /><span><strong>{source.title}</strong><small>{source.course || "Unassigned course"} · {source.sourceType}</small></span></label>) : <div className="tree-empty">No Knowledge Vault sources match this course.</div>}</div>
        </div>
        <div className="aic-handoff-preview"><div className="aic-preview-top"><div><span className="eyebrow">Review before sharing</span><strong>{selectedSources.length} source{selectedSources.length === 1 ? "" : "s"} selected</strong></div><Badge tone="teal">Human controlled</Badge></div><pre>{handoffPrompt}</pre><div className="button-row"><button className="button button-primary" onClick={copyHandoff}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy AIC brief"}</button><a className="button button-gold" href={AIC_OFFICIAL_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Open official AIC</a></div><small className="aic-handoff-help">Copy first, open AIC, then paste the reviewed brief into the conversation. ChatGPT sign-in and access to the custom GPT are required.</small></div>
      </div>
      <div className="aic-principles">{AIC_GOVERNANCE_PRINCIPLES.map((principle, index) => <div key={principle}><span>{index + 1}</span><p>{principle}</p></div>)}</div>
    </section>
  </div>;
}
