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
  channelName: string;
  nextVideoTitle: string;
  chapterIdx: number;
}

export type SceneDrawer = (g: SceneCtx) => void;
