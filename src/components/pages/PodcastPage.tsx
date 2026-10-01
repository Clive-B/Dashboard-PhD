"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, Clock3, Headphones, ListMusic, Pause, Play, Plus, Radio, RotateCcw, ShieldCheck, Square, Trash2, Volume2 } from "lucide-react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, EmptyState, Progress, SectionHeading } from "@/components/ui";
import { buildPodcastEpisode, type PodcastEpisode, type PodcastStyle } from "@/lib/podcast";

const PODCAST_KEY = "aic-scholar-podcast-episodes";

export function PodcastPage() {
  const { state } = useScholar();
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>(state.sources.slice(0, 1).map((source) => source.id));
  const [title, setTitle] = useState("Research Methods Revision Briefing");
  const [style, setStyle] = useState<PodcastStyle>("briefing");
  const [targetMinutes, setTargetMinutes] = useState(8);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [playback, setPlayback] = useState<"idle" | "playing" | "paused">("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hostVoice, setHostVoice] = useState("");
  const [guideVoice, setGuideVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [supported, setSupported] = useState(true);
  const activeEpisodeRef = useRef<PodcastEpisode | null>(null);
  const segmentIndexRef = useRef(0);
  const rateRef = useRef(1);
  const playbackRef = useRef<"idle" | "playing" | "paused">("idle");

  useEffect(() => {
    try { const stored = localStorage.getItem(PODCAST_KEY); if (stored) setEpisodes(JSON.parse(stored) as PodcastEpisode[]); } catch { localStorage.removeItem(PODCAST_KEY); }
    if (!("speechSynthesis" in window)) { setSupported(false); return; }
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      const english = available.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
      const british = english.filter((voice) => /^en-GB$/i.test(voice.lang) || /british|united kingdom|uk english/i.test(voice.name));
      const first = british.find((voice) => /sonia|libby|female/i.test(voice.name)) || british[0] || english[0] || available[0];
      const second = british.find((voice) => voice.voiceURI !== first?.voiceURI && /ryan|george|male/i.test(voice.name))
        || british.find((voice) => voice.voiceURI !== first?.voiceURI) || first;
      setHostVoice((current) => current || first?.voiceURI || "");
      setGuideVoice((current) => current || second?.voiceURI || "");
    };
    loadVoices(); window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => { window.speechSynthesis.cancel(); window.speechSynthesis.removeEventListener("voiceschanged", loadVoices); };
  }, []);

  useEffect(() => { localStorage.setItem(PODCAST_KEY, JSON.stringify(episodes)); }, [episodes]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => {
    setSelectedSources((current) => {
      const valid = current.filter((id) => state.sources.some((source) => source.id === id));
      return valid.length ? valid : state.sources[0] ? [state.sources[0].id] : [];
    });
  }, [state.sources]);

  const activeEpisode = useMemo(() => episodes.find((episode) => episode.id === activeId) || episodes[0] || null, [episodes, activeId]);
  useEffect(() => { activeEpisodeRef.current = activeEpisode; }, [activeEpisode]);

  const speakSegment = useCallback((index: number) => {
    const episode = activeEpisodeRef.current;
    if (playbackRef.current !== "playing") return;
    if (!episode || index >= episode.segments.length) { playbackRef.current = "idle"; setPlayback("idle"); setSegmentIndex(0); segmentIndexRef.current = 0; return; }
    segmentIndexRef.current = index; setSegmentIndex(index);
    const current = episode.segments[index];
    const utterance = new SpeechSynthesisUtterance(current.text);
    const voiceId = current.speaker === "host" ? hostVoice : guideVoice;
    const selectedVoice = voices.find((voice) => voice.voiceURI === voiceId) || null;
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || "en-GB";
    utterance.rate = rateRef.current; utterance.pitch = current.speaker === "host" ? 1 : .96;
    utterance.onend = () => { if (playbackRef.current === "playing") speakSegment(index + 1); };
    utterance.onerror = () => { playbackRef.current = "idle"; setPlayback("idle"); };
    window.speechSynthesis.speak(utterance);
  }, [guideVoice, hostVoice, voices]);

  function generate() {
    const sources = state.sources.filter((source) => selectedSources.includes(source.id));
    if (!sources.length) return;
    const episode = buildPodcastEpisode(sources, { title, style, targetMinutes });
    setEpisodes((current) => [episode, ...current]); setActiveId(episode.id); setSegmentIndex(0); setPlayback("idle");
  }

  function play() {
    if (!supported || !activeEpisode) return;
    if (playback === "paused") { window.speechSynthesis.resume(); playbackRef.current = "playing"; setPlayback("playing"); return; }
    window.speechSynthesis.cancel(); activeEpisodeRef.current = activeEpisode; playbackRef.current = "playing"; setPlayback("playing"); speakSegment(segmentIndexRef.current);
  }
  function pause() { window.speechSynthesis.pause(); playbackRef.current = "paused"; setPlayback("paused"); }
  function stop() { playbackRef.current = "idle"; window.speechSynthesis.cancel(); setPlayback("idle"); setSegmentIndex(0); segmentIndexRef.current = 0; }
  function restart() { playbackRef.current = "idle"; window.speechSynthesis.cancel(); segmentIndexRef.current = 0; setSegmentIndex(0); setTimeout(() => { playbackRef.current = "playing"; setPlayback("playing"); speakSegment(0); }, 0); }
  function removeEpisode(id: string) { if (activeId === id) stop(); setEpisodes((current) => current.filter((episode) => episode.id !== id)); setActiveId(null); }

  const progress = activeEpisode ? (segmentIndex + (playback === "idle" ? 0 : 1)) / activeEpisode.segments.length * 100 : 0;
  return <div className="stack-xl podcast-page">
    <section className="page-intro"><div><span className="eyebrow">Listen and revise</span><h2>Turn your Knowledge Vault into a study podcast.</h2><p>Create source-labelled revision episodes and listen with voices installed on your device. Your academic material stays in the browser.</p></div><Badge tone="teal"><Headphones size={13} /> Local audio</Badge></section>

    <section className="podcast-grid">
      <article className="panel podcast-builder"><SectionHeading eyebrow="Episode studio" title="Build a study episode" />
        <label className="podcast-field">Episode title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="podcast-field"><span>Format</span><div className="podcast-style-grid">{([{id:"briefing",label:"Revision briefing",note:"Focused overview"},{id:"deep-dive",label:"Deep dive",note:"More source detail"},{id:"recall",label:"Active recall",note:"Pause-and-answer prompts"}] as const).map((item) => <button key={item.id} className={style === item.id ? "active" : ""} onClick={() => setStyle(item.id)}><Radio size={17} /><strong>{item.label}</strong><small>{item.note}</small></button>)}</div></div>
        <label className="podcast-field">Target length <strong>{targetMinutes} minutes</strong><input className="podcast-range" type="range" min="3" max="25" value={targetMinutes} onChange={(event) => setTargetMinutes(Number(event.target.value))} /></label>
        <div className="podcast-field"><span>Knowledge sources</span><div className="podcast-sources">{state.sources.map((source) => <label key={source.id} className={selectedSources.includes(source.id) ? "selected" : ""}><input type="checkbox" checked={selectedSources.includes(source.id)} onChange={() => setSelectedSources((current) => current.includes(source.id) ? current.filter((id) => id !== source.id) : [...current, source.id])} /><BookOpenCheck size={18} /><span><strong>{source.title}</strong><small>{source.course || source.sourceType}</small></span></label>)}</div></div>
        <div className="privacy-note"><ShieldCheck size={19} /><span><strong>Private by default</strong>The script and speech are produced locally. No recording or source text is uploaded by this feature.</span></div>
        <button className="button button-primary podcast-generate" disabled={!selectedSources.length || !title.trim()} onClick={generate}><Plus size={17} />Generate episode</button>
      </article>

      <article className="podcast-player">
        <div className="podcast-cover"><div className="podcast-orbit" /><Headphones size={48} /><span>AIC Scholar</span><strong>Study Podcast</strong><small>Knowledge · Revision · Mastery</small></div>
        <div className="player-console panel">{activeEpisode ? <><div className="now-playing"><div><span className="eyebrow">Now selected</span><h3>{activeEpisode.title}</h3><p>{activeEpisode.style.replace("-", " ")} · {activeEpisode.estimatedMinutes} min · {activeEpisode.sourceIds.length} sources</p></div><Badge tone="green">Source-labelled</Badge></div><Progress value={progress} tone="teal" /><div className="segment-status"><span>Segment {Math.min(segmentIndex + 1, activeEpisode.segments.length)} of {activeEpisode.segments.length}</span><span>{activeEpisode.segments[segmentIndex]?.speaker === "host" ? "AIC Host" : "Study Guide"}</span></div><div className="playback-controls"><button onClick={restart} aria-label="Restart"><RotateCcw size={19} /></button>{playback === "playing" ? <button className="primary-control" onClick={pause} aria-label="Pause"><Pause size={23} fill="currentColor" /></button> : <button className="primary-control" onClick={play} aria-label="Play" disabled={!supported}><Play size={23} fill="currentColor" /></button>}<button onClick={stop} aria-label="Stop"><Square size={17} fill="currentColor" /></button></div>{!supported && <p className="podcast-error">Speech playback is not supported by this browser.</p>}<div className="audio-settings"><label><Volume2 size={15} />Host voice<select value={hostVoice} onChange={(event) => setHostVoice(event.target.value)}>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></label><label><Volume2 size={15} />Guide voice<select value={guideVoice} onChange={(event) => setGuideVoice(event.target.value)}>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></label><label><Clock3 size={15} />Speed <strong>{rate.toFixed(2)}×</strong><input type="range" min="0.75" max="1.5" step="0.05" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></label></div></> : <EmptyState title="No episode yet" message="Select source material and generate your first study podcast." />}</div>
      </article>
    </section>

    <section className="panel"><SectionHeading eyebrow="Saved locally" title="Your episodes" />{episodes.length ? <div className="episode-list">{episodes.map((episode) => <button key={episode.id} className={activeEpisode?.id === episode.id ? "active" : ""} onClick={() => { stop(); setActiveId(episode.id); }}><span className="episode-icon"><ListMusic size={20} /></span><span><strong>{episode.title}</strong><small>{new Date(episode.createdAt).toLocaleDateString()} · {episode.estimatedMinutes} min · {episode.sourceTitles.join(", ")}</small></span><Badge tone="blue">{episode.style}</Badge><span className="delete-episode" role="button" aria-label="Delete episode" onClick={(event) => { event.stopPropagation(); removeEpisode(episode.id); }}><Trash2 size={16} /></span></button>)}</div> : <EmptyState title="No saved episodes" message="Generated episodes will be retained in this browser." />}</section>
  </div>;
}
