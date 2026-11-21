/**
 * Timeline builder — script + measured audio → frame-accurate edit list.
 * Beats, part cards, captions, VO intervals, source-chip schedule,
 * music-drop windows (the script's score-out moments), hard-cut times.
 */

import { ChapterSpec, SCRIPT } from './script-data';
import { CaptionLine } from './textfx';
import { gapAfter } from './easing';
import { Mood } from './score';

export interface SentenceSeg {
  lineId: string;
  startMs: number;
  audioDurMs: number;
  words: { t: number; d: number; w: string }[];
  text: string;
}

export interface TimelineBeat {
  chapter: number;
  chapterTitle: string;
  beatIndex: number;
  beat: BeatSpec;
  startMs: number;
  endMs: number;
  sentences: SentenceSeg[];
  speakStartMs: number;
  speakEndMs: number;
}

export interface Timeline {
  durationMs: number;
  fps: number;
  totalFrames: number;
  beats: TimelineBeat[];
  chapterCards: { startMs: number; endMs: number; index: number; title: string; chapter: number }[];
  chapters: { index: number; title: string; startMs: number; endMs: number }[];
  captionLines: CaptionLine[];
  voIntervals: { start: number; end: number }[];
  cutTimes: number[];
  dataDingTimes: number[];
  /** music-drop windows — BGM ducks to near-zero for the whole window */
  silenceWindows: { start: number; end: number }[];
  /** source chip schedule {time, text} */
  sourceChips: { time: number; text: string }[];
}

export interface AudioManifest {
  lines: Record<string, { key: string; durationMs: number; words: { t: number; d: number; w: string }[] }>;
}

import { BeatSpec } from './script-data';

const SENTENCE_GAP = 110;
const BEAT_LEAD_IN = 70;
const CHAPTER_CARD_DUR = 1500; // AURUM part cards breathe longer
const END_SCREEN_HOLD = 7500;

export function buildTimeline(manifest: AudioManifest, fps: number): Timeline {
  const beats: TimelineBeat[] = [];
  const chapterCards: Timeline['chapterCards'] = [];
  const captionLines: CaptionLine[] = [];
  const voIntervals: { start: number; end: number }[] = [];
  const sourceChips: Timeline['sourceChips'] = [];

  let now = 0;
  SCRIPT.forEach((chapter: ChapterSpec, ci: number) => {
    const startOfChapter = now;
    if (ci > 0) {
      chapterCards.push({
        startMs: now,
        endMs: now + CHAPTER_CARD_DUR,
        index: ci,
        title: chapter.title,
        chapter: ci,
      });
      now += CHAPTER_CARD_DUR;
    }
    void startOfChapter;
    chapter.beats.forEach((beat: BeatSpec, bi: number) => {
      const sentences: SentenceSeg[] = [];
      const chunks = beat.vo.split(/\n/).map((sx) => sx.trim()).filter(Boolean);
      const prefix = `${ci}-${bi}-`;
      const sentIdxs: number[] = [];
      let k = 0;
      while (manifest.lines[`${prefix}${k}`]) {
        sentIdxs.push(k);
        k++;
      }
      let local = BEAT_LEAD_IN;
      let lastGap = SENTENCE_GAP;
      for (const si of sentIdxs) {
        const entry = manifest.lines[`${prefix}${si}`];
        sentences.push({
          lineId: `${prefix}${si}`,
          startMs: now + local,
          audioDurMs: entry.durationMs,
          words: entry.words,
          text: '',
        });
        const gap = chunks[si] !== undefined ? gapAfter(chunks[si]) : SENTENCE_GAP;
        lastGap = gap;
        local += entry.durationMs + gap;
      }
      const speakDur = Math.max(0, local - BEAT_LEAD_IN - lastGap);
      const pause = beat.pauseAfter ?? 350;
      const isEndScreen = beat.scene.type === 'endScreen';
      const beatDur = BEAT_LEAD_IN + speakDur + pause + (isEndScreen ? END_SCREEN_HOLD : 0);
      beats.push({
        chapter: ci,
        chapterTitle: chapter.title,
        beatIndex: bi,
        beat,
        startMs: now,
        endMs: now + beatDur,
        sentences,
        speakStartMs: BEAT_LEAD_IN,
        speakEndMs: BEAT_LEAD_IN + speakDur,
      });
      if (sentences.length) {
        voIntervals.push({ start: now + BEAT_LEAD_IN, end: now + BEAT_LEAD_IN + speakDur });
        for (const s of sentences) {
          captionLines.push({
            start: s.startMs,
            end: s.startMs + s.audioDurMs,
            words: s.words.map((w) => ({ t: s.startMs + w.t, d: w.d, w: w.w })),
          });
        }
      }
      if (beat.source) {
        sourceChips.push({ time: now + BEAT_LEAD_IN + 400, text: beat.source });
      }
      now += beatDur;
    });
  });

  const chapters = SCRIPT.map((c, ci) => {
    const first = beats.find((b) => b.chapter === ci)!;
    const lastBeats = beats.filter((b) => b.chapter === ci);
    const last = lastBeats[lastBeats.length - 1];
    return { index: ci, title: c.title, startMs: first.startMs, endMs: last.endMs };
  });

  const durationMs = Math.ceil(now + 400);

  const cutTimes: number[] = [];
  for (let i = 0; i < beats.length; i++) {
    const prevKey = i > 0 ? beats[i - 1].beat.scene.sceneKey : null;
    if (beats[i].beat.scene.sceneKey !== prevKey && beats[i].startMs > 0) {
      cutTimes.push(beats[i].startMs);
    }
  }
  const dataDingTimes: number[] = [];
  for (const b of beats) {
    if (['gapBars', 'growthCurves', 'signatureCurve', 'distribBars', 'eraBars', 'waterfall', 'statCards'].includes(b.beat.scene.type)) {
      dataDingTimes.push(b.startMs + 1400);
    }
  }

  // music-drop windows — full-beat drops (script: score OUT at Betterment + final lines)
  const silenceWindows: { start: number; end: number }[] = [];
  for (const b of beats) {
    if (b.beat.musicOut) {
      silenceWindows.push({ start: b.startMs, end: b.endMs });
    } else if (b.beat.dropOut) {
      const payoffStart = b.startMs + b.speakStartMs;
      const silenceDur = Math.min(1400, Math.max(400, (b.speakEndMs - b.speakStartMs) * 0.35));
      silenceWindows.push({ start: Math.max(0, payoffStart - silenceDur), end: payoffStart });
    }
  }

  return {
    durationMs,
    fps,
    totalFrames: Math.ceil((durationMs / 1000) * fps),
    beats,
    chapterCards,
    chapters,
    captionLines,
    voIntervals,
    cutTimes,
    dataDingTimes,
    silenceWindows,
    sourceChips,
  };
}

export function beatAt(tl: Timeline, tMs: number): TimelineBeat | null {
  const beats = tl.beats;
  let lo = 0, hi = beats.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = beats[mid];
    if (tMs < b.startMs) hi = mid - 1;
    else if (tMs >= b.endMs) lo = mid + 1;
    else return b;
  }
  return beats.length ? beats[Math.min(beats.length - 1, Math.max(0, lo))] : null;
}

export function chapterAt(tl: Timeline, tMs: number): number {
  let c = 0;
  for (const ch of tl.chapters) {
    if (tMs >= ch.startMs) c = ch.index;
  }
  return c;
}

export function youtubeChapters(tl: Timeline): string {
  return tl.chapters
    .map((c) => {
      const s = Math.floor(c.startMs / 1000);
      const m = Math.floor(s / 60);
      const sec = String(s % 60).padStart(2, '0');
      return `${m}:${sec} ${c.title.replace(/[""]/g, '"')}`;
    })
    .join('\n');
}

/** BGM mood per chapter — travels with the film */
export const CHAPTER_MOODS: Mood[] = [
  'dark',      // cold open — the $5.1M paradox
  'sparse',    // frame
  'dark',      // act I — the wrong scoreboard
  'sparse',    // act II — anatomy of the drag
  'sparse',    // act III — asset location
  'dark',      // act IV — TLH (+SEC drop)
  'lift',      // act V — the wrapper
  'dark',      // act VI — advanced tier
  'resolve',   // act VII — synthesis
];
