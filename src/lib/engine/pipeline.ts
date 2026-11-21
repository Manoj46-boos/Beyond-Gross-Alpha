/**
 * Render pipeline — client-side orchestrator:
 * 1. synthesize voice lines (server, batched, cached)
 * 2. decode audio + measure exact durations
 * 3. build the frame-accurate timeline
 * 4. mix the score + voiceover (deep duck, music-out windows, SFX grammar)
 */

import { SCRIPT } from './script-data';
import { buildTimeline, AudioManifest } from './timeline';
import { renderMix } from './audio';
import { splitSentences } from './easing';

export interface PipelineProgress {
  phase: 'idle' | 'tts' | 'decode' | 'timeline' | 'mix' | 'ready' | 'error';
  detail: string;
  done: number;
  total: number;
}

export interface VoiceSettings {
  voice: string;
  rate: number;
  pitch: number;
}

export interface PreparedProject {
  manifest: AudioManifest;
  voBuffers: Map<string, AudioBuffer>;
  timeline: ReturnType<typeof buildTimeline>;
  mixBuffer: AudioBuffer;
  settingsHash: string;
}

const TTS_BATCH = 8;

/** per-beat vocal direction → TTS rate/pitch offsets (measured, dry register) */
export const VO_STYLE_DELTAS: Record<string, { rate: number; pitch: number }> = {
  neutral: { rate: 0, pitch: 0 },
  calm: { rate: -4, pitch: 0 },
  urgent: { rate: 5, pitch: 1 },
  reveal: { rate: -9, pitch: -2 },
  quote: { rate: -2, pitch: 2 },
};

function audioCtxShared(): AudioContext {
  const w = globalThis as any;
  if (!w.__sharedAudioCtx) {
    w.__sharedAudioCtx = new (w.AudioContext || w.webkitAudioContext)();
  }
  return w.__sharedAudioCtx;
}

export function allChunks(): { id: string; text: string; voice?: string; rateDelta?: number; pitchDelta?: number }[] {
  const out: { id: string; text: string; voice?: string; rateDelta?: number; pitchDelta?: number }[] = [];
  SCRIPT.forEach((chapter, ci) => {
    chapter.beats.forEach((beat, bi) => {
      if (!beat.vo.trim()) return; // silent beats (quietBeat/endScreen) skip TTS
      const style = VO_STYLE_DELTAS[beat.voStyle ?? 'neutral'] ?? VO_STYLE_DELTAS.neutral;
      splitSentences(beat.vo).forEach((text, si) => {
        out.push({
          id: `${ci}-${bi}-${si}`,
          text,
          voice: beat.scene.voice as string | undefined,
          rateDelta: style.rate,
          pitchDelta: style.pitch,
        });
      });
    });
  });
  return out;
}

export async function generateVoiceover(
  voice: VoiceSettings,
  onProgress: (p: PipelineProgress) => void
): Promise<{ results: Map<string, { key: string; words: { t: number; d: number; w: string }[] }> }> {
  const chunks = allChunks();
  const results = new Map<string, { key: string; words: { t: number; d: number; w: string }[] }>();
  let done = 0;
  for (let i = 0; i < chunks.length; i += TTS_BATCH) {
    const batch = chunks.slice(i, i + TTS_BATCH);
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: batch.map((l) => ({
          id: l.id,
          text: l.text,
          voice: l.voice,
          rateDelta: l.rateDelta ?? 0,
          pitchDelta: l.pitchDelta ?? 0,
        })),
        voice: voice.voice,
        rate: voice.rate,
        pitch: voice.pitch,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'TTS request failed' }));
      throw new Error(err.error || `voice generation failed (batch ${i / TTS_BATCH + 1})`);
    }
    const data = await res.json();
    for (const r of data.results) {
      results.set(r.id, { key: r.key, words: r.words });
    }
    done += batch.length;
    onProgress({
      phase: 'tts',
      detail: `generating the narration · line ${Math.min(done, chunks.length)} of ${chunks.length}`,
      done,
      total: chunks.length,
    });
  }
  return { results };
}

export async function decodeAudio(
  results: Map<string, { key: string; words: { t: number; d: number; w: string }[] }>,
  onProgress: (p: PipelineProgress) => void
): Promise<{ manifest: AudioManifest; voBuffers: Map<string, AudioBuffer> }> {
  const ac = audioCtxShared();
  const manifest: AudioManifest = { lines: {} };
  const voBuffers = new Map<string, AudioBuffer>();
  const ids = [...results.keys()];
  let done = 0;
  for (const id of ids) {
    const r = results.get(id)!;
    const res = await fetch(`/api/tts/file/${r.key}`);
    if (!res.ok) throw new Error(`audio file missing for line ${id}`);
    const buf = await res.arrayBuffer();
    const audio = await ac.decodeAudioData(buf);
    manifest.lines[id] = {
      key: r.key,
      durationMs: audio.duration * 1000,
      words: r.words,
    };
    voBuffers.set(id, audio);
    done++;
    if (done % 10 === 0 || done === ids.length) {
      onProgress({ phase: 'decode', detail: `measuring audio · ${done}/${ids.length}`, done, total: ids.length });
    }
  }
  return { manifest, voBuffers };
}

export interface AudioSettings {
  bgmVolume: number;
  voVolume: number;
  fps: number;
}

export async function prepareProject(
  voice: VoiceSettings,
  audioSettings: AudioSettings,
  onProgress: (p: PipelineProgress) => void
): Promise<PreparedProject> {
  onProgress({ phase: 'tts', detail: 'starting voice generation', done: 0, total: 1 });
  const { results } = await generateVoiceover(voice, onProgress);
  const { manifest, voBuffers } = await decodeAudio(results, onProgress);
  onProgress({ phase: 'timeline', detail: 'building the edit', done: 0, total: 1 });
  const timeline = buildTimeline(manifest, audioSettings.fps);
  onProgress({ phase: 'mix', detail: 'composing the ledger score', done: 0, total: 100 });
  const mixBuffer = await renderMix({
    timeline,
    voBuffers,
    bgmVolume: audioSettings.bgmVolume,
    voVolume: audioSettings.voVolume,
    onProgress: (frac, label) =>
      onProgress({ phase: 'mix', detail: label, done: Math.round(frac * 100), total: 100 }),
  });
  onProgress({
    phase: 'ready',
    detail: `ready · runtime ${(timeline.durationMs / 60000).toFixed(1)} minutes · ${timeline.totalFrames} frames`,
    done: 1,
    total: 1,
  });
  const settingsHash = JSON.stringify({ voice, audioSettings });
  return { manifest, voBuffers, timeline, mixBuffer, settingsHash };
}
