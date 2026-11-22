/** Shared scene drawing context — the contract between director and scenes. */

import { BeatSpec } from './script-data';

export interface SceneCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  /** ms since this beat started */
  beatT: number;
  /** ms since the scene-group started (beats sharing sceneKey) */
  t: number;
  /** scene group duration (ms) */
  d: number;
  /** group progress 0..1 */
  p: number;
  /** beat progress 0..1 */
  beatP: number;
  /** merged scene props (first beat of the group + current beat) */
  s: Record<string, any>;
  beat: BeatSpec;
  speaking: boolean;
  /** word onset times local to the beat (ms) */
  wordTimes: number[];
  wordTexts: string[];
  /** active sentence id + ms into it */
  sentenceId?: string;
  prevSentenceId?: string;
  sentenceT?: number;
  /** D17 cadence machinery — 0-based index of the playing sentence within the
   *  beat, and the beat's total sentence count. Long-hold scenes key their
   *  per-sentence reveals off this. */
  sentenceIdx?: number;
  sentenceCount?: number;
  /** AUDIT R-04 — script-level gesture for the playing sentence
   *  (beat.gestures[sentenceIdx] from script-data), overriding the
   *  sentenceHash pick inside poseAt when it names a pool gesture. */
  gesture?: string;
  channelName: string;
  nextVideoTitle: string;
  chapterIdx: number;
}

export type SceneDrawer = (g: SceneCtx) => void;

/** AUDIT K-02 — the caption pill occupies y 796→968 for two rows
 *  (CAP_FLOOR_Y 968 − pillH ~172). Save-assets the viewer is asked to keep —
 *  the hierarchy tier cards, closing verdict lines — must end above this
 *  line. Scenes keep their lowest content baseline ≤ CAPTION_SAFE_TOP − 22. */
export const CAPTION_SAFE_TOP = 786;
