/**
 * AURUM scenes — openings, statements and the closing movement.
 * coldOpen · gapBars · titleCard · statement · turnCard · quietBeat ·
 * policyRisk · finalLines · circleBack · stampCard
 */

import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, roundRect, goldFillText, FONT_DISPLAY, FONT_UI, goldRule, chip, fitText, kicker, diamond } from './theme';
import { clamp01, easeOutCubic, easeInOutCubic, springTo, hash01, fmtMoney } from './easing';
import { goldDust, impactRing, softBloom, microShake, spinToken, floatY, focusPing, lightBlade, godRays } from './fx';
import { drawStatement, statementAnchor } from './textfx';
import { panelTitle, barRow } from './charts';
import { paintStage } from './stage';

// ── G1 — the split statement (cold open + full-circle close) ────────────────
function splitStatement(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, alpha: number,
  mode: 'full' | 'compact', stage = 2, stageA = 1,
): void {
  const cardW = mode === 'full' ? 660 : 560;
  const cardH = 330;
  const gap = 90;
  const x0 = (W - cardW * 2 - gap) / 2;
  const y0 = mode === 'full' ? 300 : 330;
  const e = easeOutCubic(clamp01(t / 900));
  ctx.save();
  ctx.globalAlpha = alpha;

  // AUDIT K-05 stage 2 — spotlight dim: the room falls back, the two
  // outcomes come forward (drawn before the cards so they paint over it)
  if (stage >= 2) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.42 * stageA;
    ctx.fillStyle = '#05080F';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // stage 2 — the cards breathe toward the viewer as the delta lands
  if (stage >= 2 && stageA > 0) {
    const sc = 1 + 0.045 * stageA;
    ctx.translate(W / 2, y0 + cardH / 2);
    ctx.scale(sc, sc);
    ctx.translate(-W / 2, -(y0 + cardH / 2));
  }

  for (let i = 0; i < 2; i++) {
    const ent = easeOutCubic(clamp01((t - 200 - i * 320) / 800));
    if (ent <= 0) continue;
    const x = x0 + i * (cardW + gap);
    const good = i === 0;
    ctx.save();
    ctx.globalAlpha = alpha * ent;
    ctx.translate(0, (1 - ent) * 34);
    glassCard(ctx, x, y0, cardW, cardH, { r: 20, goldEdge: good, border: good ? rgba(PALETTE.gold, 0.35) : rgba(PALETTE.down, 0.4) });
    // statement header
    setFont(ctx, 28, 700, FONT_UI);
    try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    ctx.fillText('PORTFOLIO STATEMENT', x + cardW / 2, y0 + 52);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('$2,000,000 · 8% gross · 25 years', x + cardW / 2, y0 + 92);
    // the number
    const countP = clamp01((t - 500 - i * 320) / 1100);
    const value = good ? 13700000 : 8600000;
    const shown = fmtMoney(value * countP, 1);
    setFont(ctx, 96, 800, FONT_DISPLAY);
    ctx.textAlign = 'center';
    if (good) {
      goldFillText(ctx, shown, x + cardW / 2, y0 + 205, 96, 800, FONT_DISPLAY, 'center');
    } else {
      const g = ctx.createLinearGradient(0, y0 + 130, 0, y0 + 220);
      g.addColorStop(0, '#F08A8D');
      g.addColorStop(1, PALETTE.down);
      ctx.fillStyle = g;
      ctx.fillText(shown, x + cardW / 2, y0 + 205);
    }
    ctx.textAlign = 'left';
    // gross-return line
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    ctx.fillText(good ? 'after-tax compounding intact' : 'after 2%/yr tax drag', x + cardW / 2, y0 + 250);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  // AUDIT K-05 stage 1 — a gold connector binds the two outcomes into one
  // story (same money, two tax lines) — arrives with the stamp, not before
  if (stage >= 1) {
    const ca = (stage === 1 ? stageA : 1) * clamp01((t - 1400) / 400);
    if (ca > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * ca * 0.9;
      ctx.strokeStyle = rgba(PALETTE.gold, 0.85);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.moveTo(x0 + cardW + 16, y0 + 205);
      ctx.lineTo(x0 + cardW + gap - 16, y0 + 205);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = PALETTE.goldBright;
      for (const cx2 of [x0 + cardW + 16, x0 + cardW + gap - 16]) {
        ctx.beginPath();
        ctx.arc(cx2, y0 + 205, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // center stamp — SAME PORTFOLIO (above the cards, never overlapping them);
  // AUDIT K-05 — lands on stage 1 (the "same portfolio" sentences), not at t+1.5s
  const stampT = t - 1500;
  if (stage >= 1 && stampT > 0) {
    const stampE = clamp01(stampT / 260) * (stage === 1 ? stageA : 1);
    const shake = microShake(t, 1500, 7);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2 + shake.dx, (mode === 'full' ? 214 : 244) + shake.dy);
    ctx.rotate(-0.035);
    ctx.scale(stampE, stampE);
    setFont(ctx, 34, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
    const label = 'SAME PORTFOLIO · SAME MARKET · 25 YEARS';
    const tw = ctx.measureText(label).width + 64;
    ctx.strokeStyle = rgba(PALETTE.gold, 0.9);
    ctx.lineWidth = 2.6;
    roundRect(ctx, -tw / 2, -34, tw, 68, 8);
    ctx.stroke();
    ctx.fillStyle = rgba(PALETTE.gold, 0.14);
    ctx.fill();
    ctx.fillStyle = PALETTE.goldBright;
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 12);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    ctx.restore();
    void e;
  }
  // AUDIT K-05 stage 2 — the delta payoff restages the frame: $5,100,000
  // ($13,700,000 − $8,600,000) lands under the cards with the impact ring —
  // the number the whole episode is titled after, on its own composition
  if (stage >= 2) {
    const da = stageA;
    ctx.save();
    ctx.globalAlpha = alpha * da;
    setFont(ctx, 24, 700, FONT_UI);
    try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    ctx.fillText('THE DIFFERENCE — THE FEE LINE, COMPOUNDING', W / 2, y0 + cardH + 42);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    const dg = ctx.createLinearGradient(0, y0 + cardH + 58, 0, y0 + cardH + 118);
    dg.addColorStop(0, '#F08A8D');
    dg.addColorStop(1, PALETTE.down);
    setFont(ctx, 68, 800, FONT_DISPLAY);
    ctx.fillStyle = dg;
    ctx.fillText('$5,100,000', W / 2, y0 + cardH + 116);
    ctx.textAlign = 'left';
    ctx.restore();
    impactRing(ctx, W / 2, y0 + cardH + 88, t, 3600, 150, 0.8 * da, PALETTE.down);
  }
  // footnote — L-07: exponents are COMPOSED (raised 62%-size runs), not raw
  // U+2075 codepoints: Manrope lacks them, so they used to render through
  // whatever fallback font the OS supplied — glyph mixing across machines.
  const supMap: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  const raw = 'Illustration: $2M × 1.08²⁵ vs $2M × 1.06²⁵ — 2% annual tax drag';
  const runs: { text: string; sup?: boolean }[] = [];
  for (const ch of raw) {
    if (supMap[ch] != null) {
      const last = runs[runs.length - 1];
      if (last?.sup) last.text += supMap[ch];
      else runs.push({ text: supMap[ch], sup: true });
    } else {
      const last = runs[runs.length - 1];
      if (last && !last.sup) last.text += ch;
      else runs.push({ text: ch });
    }
  }
  const baseSize = 28, supSize = Math.round(baseSize * 0.62), supRaise = Math.round(baseSize * 0.38);
  // FIX E1 (frame audit) — the footnote sat 14px under the stage-2 delta
  // kicker with ~190px x-overlap: the film's most important number landed in
  // a pile of overlapping text. Moving the delta block lower would push the
  // $5,100,000 numeral past CAPTION_SAFE_TOP (786), so the premium handoff is
  // a CROSS-FADE: as the delta block arrives (stage 2), the footnote yields
  // the band — the payoff number always owns the composition.
  const fnYield = stage >= 2 ? 1 - stageA : 1;
  ctx.globalAlpha = alpha * 0.8 * fnYield;
  ctx.fillStyle = PALETTE.inkFaint;
  ctx.textAlign = 'left';
  const totalW = runs.reduce((acc, r) => {
    setFont(ctx, r.sup ? supSize : baseSize, r.sup ? 700 : 500, FONT_UI);
    return acc + ctx.measureText(r.text).width;
  }, 0);
  let fx = W / 2 - totalW / 2;
  for (const r of runs) {
    setFont(ctx, r.sup ? supSize : baseSize, r.sup ? 700 : 500, FONT_UI);
    ctx.fillText(r.text, fx, r.sup ? y0 + cardH + 56 - supRaise : y0 + cardH + 56);
    fx += ctx.measureText(r.text).width;
  }
  ctx.restore();
}

export function coldOpenScene(g: SceneCtx): void {
  const { ctx, W, H, t, s, beatT } = g;
  const mode = s.mode ?? 'numbers';
  // U4.5 — reworked for the retention cliff: beat 1 opens on the SPLIT
  // STATEMENT (both cards + the stamp land inside 3 seconds) arriving on a
  // 1.5s light blade; beat 2 cuts to the two big numbers. All entrance clocks
  // are beat-local (beatT) so each state animates fresh on its cut.
  if (mode === 'numbers') {
    // the two numbers, fading in from the dark on their own cut
    const a1 = clamp01((beatT - 200) / 900);
    const a2 = clamp01((beatT - 2100) / 900);
    // AUDIT R-01 — the numbers beat held ONE layout for ~16s. Phase 3.1
    // completes the choreography: at the "It left through the tax line"
    // sentences (index ≥3, beat-clock fallback for QA timing), the room
    // dims, the two numbers compress upward, and a gold tax-line band seals
    // the payoff across the hairline — the beat's second composition.
    const tb2 = g.beat as unknown as { startMs?: number; endMs?: number };
    const bd2 = Math.max(9000, (tb2.endMs ?? 16000) - (tb2.startMs ?? 0));
    const restage = g.sentenceIdx != null && g.sentenceIdx >= 3
      ? clamp01((g.sentenceT ?? 0) / 600)
      : clamp01((beatT - bd2 * 0.62) / 600);
    ctx.save();
    if (restage > 0) {
      ctx.fillStyle = `rgba(5,8,15,${0.42 * restage})`;
      ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2, H * 0.52);
      const sc = 1 - 0.10 * restage;
      ctx.scale(sc, sc);
      ctx.translate(-W / 2, -H * 0.52);
    }
    ctx.textAlign = 'center';
    // $13.7M
    if (a1 > 0) {
      ctx.globalAlpha = a1;
      goldFillText(ctx, '$13,700,000', W / 2, H * 0.40, 110, 800, FONT_DISPLAY, 'center');
      setFont(ctx, 28, 600, FONT_UI);
      ctx.fillStyle = PALETTE.inkFaint;
      ctx.fillText('INVESTOR ONE', W / 2, H * 0.40 - 110);
    }
    if (a2 > 0) {
      ctx.globalAlpha = a2;
      const g2 = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.66);
      g2.addColorStop(0, '#F08A8D');
      g2.addColorStop(1, PALETTE.down);
      setFont(ctx, 110, 800, FONT_DISPLAY);
      ctx.fillStyle = g2;
      ctx.fillText('$8,600,000', W / 2, H * 0.64);
      setFont(ctx, 28, 600, FONT_UI);
      ctx.fillStyle = PALETTE.inkFaint;
      ctx.fillText('INVESTOR TWO', W / 2, H * 0.64 - 112);
      // hairline between
      ctx.strokeStyle = rgba(PALETTE.inkSoft, 0.2);
      ctx.beginPath();
      ctx.moveTo(W * 0.32, H * 0.475);
      ctx.lineTo(W * 0.68, H * 0.475);
      ctx.stroke();
    }
    // FIX F11 — the numbers beat's top/bottom whitespace: the setup facts and
    // the beat's own quiet line frame the two numbers (both verbatim from the
    // VO), so the frame reads composed instead of floating in navy. They ride
    // the restage transform and recede with it.
    const sa = a1 * (1 - restage * 0.35);
    if (sa > 0) {
      ctx.save();
      ctx.globalAlpha = sa;
      chip(ctx, 'SAME $2M · SAME 8% RETURN · SAME 25 YEARS', W / 2, H * 0.155, { size: 26, gold: true, center: true, maxW: 900 });
      ctx.restore();
    }
    const sb = a2 * (1 - restage * 0.45);
    if (sb > 0) {
      ctx.save();
      ctx.globalAlpha = sb;
      setFont(ctx, 30, 600, FONT_DISPLAY);
      ctx.fillStyle = PALETTE.inkSoft;
      ctx.textAlign = 'center';
      ctx.fillText('No crash. No bad pick. No scandal.', W / 2, H * 0.70);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    ctx.restore();
    // AUDIT R-01 — the tax-line seal (full-size, over the dim): the gold
    // band lands where the narration says the money left.
    if (restage > 0) {
      const bandY = H * 0.475;
      const bw = W * 0.42 * easeOutCubic(restage);
      ctx.save();
      ctx.globalAlpha = restage;
      ctx.fillStyle = rgba(PALETTE.gold, 0.14);
      ctx.fillRect(W / 2 - bw / 2, bandY - 34, bw, 68);
      ctx.strokeStyle = rgba(PALETTE.goldBright, 0.75);
      ctx.lineWidth = 1.6;
      ctx.strokeRect(W / 2 - bw / 2, bandY - 34, bw, 68);
      setFont(ctx, 30, 800, FONT_UI);
      try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
      ctx.fillStyle = PALETTE.goldBright;
      ctx.textAlign = 'center';
      ctx.fillText('IT LEFT THROUGH THE TAX LINE', W / 2, bandY + 10);
      try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
      ctx.textAlign = 'left';
      ctx.restore();
      impactRing(ctx, W / 2, bandY, t, 3000, 150, 0.7 * restage, PALETTE.gold);
    }
    void mode; void t;
  } else {
    // the paradox arrives visually in ~3 seconds, on a light-blade arrival
    lightBlade(ctx, W, H, clamp01(beatT / 1500));
    // AUDIT K-05 — the split statement held ONE composition from t≈3s to
    // t≈15s (caption-only change) through the film's highest-retention-
    // leverage window. Phase 3.1 — staged statement events on the BEAT CLOCK
    // (robust to sentence-pacing differences between QA estimates and real
    // TTS): (0-1) the cards land, (2-3) the stamp + connector bind them,
    // (4-5) spotlight dim + the $5.1M delta band re-stage the payoff. Three
    // distinct compositions instead of one, each ≤ ~5s.
    const tb = g.beat as unknown as { startMs?: number; endMs?: number };
    const bd = Math.max(9000, (tb.endMs ?? 14500) - (tb.startMs ?? 0));
    const t1 = Math.min(5000, Math.max(3500, bd * 0.34));
    const t2 = Math.min(10000, Math.max(7000, bd * 0.67));
    const stage = beatT < t1 ? 0 : beatT < t2 ? 1 : 2;
    const stageStart = stage === 0 ? 0 : stage === 1 ? t1 : t2;
    const stageA = clamp01((beatT - stageStart) / 600);
    splitStatement(ctx, W, H, beatT, 1, 'full', stage, stageA);
  }
}

// ── G2 — the gap bars ────────────────────────────────────────────────────────
export function gapBarsScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  panelTitle(ctx, 'The most expensive silence in wealth management', W / 2 - 560, 210, 1120, t / 2400, {
    kickerText: 'BlackRock 2026 · advisor survey',
  });
  // AUDIT K-04 — the tracks used to end at x=1460 (w = W−700), leaving the
  // right third of the frame empty on the most-watched scene in the film.
  // w = 1560 runs the tracks to x≈1800: edge-to-edge composition, no dead third.
  const x = 240, w = 1560, y = 400, rh = 130;
  // D17/U4.1 cadence: sentence 0-1 land the two bars, sentence 2 brings the
  // survey chip, sentence 3 draws the gap annotation, later sentences keep a
  // live gold edge on whichever bar is being talked about.
  const idx = g.sentenceIdx ?? 0;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  const hotRow = idx <= 1 ? 0 : idx <= 3 ? 1 : (idx % 2 === 0 ? 0 : 1);
  // AUDIT K-03 — barRow returns the filled tip (bx+fw). The old ping sat at a
  // fixed track fraction (x + w·0.62), which on the 17% row floats ~290px past
  // the fill in empty track — a gold ring on nothing, read as a render glitch.
  const tipA = barRow(ctx, { x, y, w, h: rh, label: 'Asked for tax guidance', value: 92, maxV: 100, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'gold', valueText: '92%' });
  const tipB = barRow(ctx, { x, y: y + rh + 70, w, h: rh, label: 'After-tax drives decisions', value: 17, maxV: 100, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'down', valueText: '17%' });
  // U4.1 — the survey chip arrives with sentence 2, not with the layout
  if (idx >= 1) {
    const chipA = g.sentenceIdx != null ? clamp01((g.sentenceT ?? 0) / 500) : clamp01((t - 1500) / 500);
    ctx.save();
    ctx.globalAlpha = chipA;
    chip(ctx, 'constantly asked', x + 2, y - 42, { size: 28, gold: true });
    ctx.restore();
    // U3.3 — the eye lands on the FILLED TIP of the bar being narrated
    focusPing(ctx, idx === 1 ? tipB : tipA, (idx === 1 ? y + rh + 70 : y) + rh * 0.5, g.sentenceT, 110);
  }
  // FIX F11 — the right column of the 17% row is empty track at rest: the
  // row's tail carries the narration's own arithmetic ("Only seventeen
  // percent…" ≈ 1 in 6) as a quiet annotated datum, so the wide track reads
  // as composed, not abandoned. Beat-clock entrance (rides with the row),
  // persistent afterwards — including during sentence 0's long opening.
  {
    const ga = clamp01((t - 1900) / 500);
    if (ga > 0) {
      ctx.save();
      ctx.globalAlpha = ga * 0.9;
      // FIX E3 (frame audit) — the diamond sat in the row's vertical CENTER,
      // the same band as the 17% value (tipB+16..tipB+101 after the D4 value
      // rule), and anchored only 90px past the tip: at phone size the value
      // and the annotation read as one jammed line. Anchored at
      // max(tipB+150, x+w*0.34) with the diamond dropped to the row's lower
      // third — the value and the annotation own separate bands.
      const dy2 = y + rh + 70 + rh * 0.78;
      const dx2 = Math.max(tipB + 150, x + w * 0.34);
      diamond(ctx, dx2, dy2, 11, PALETTE.inkMuted);
      setFont(ctx, 26, 600, FONT_UI);
      ctx.fillStyle = PALETTE.inkMuted;
      ctx.fillText('≈ 1 in 6 lets after-tax returns drive decisions', dx2 + 28, dy2 + 9);
      ctx.restore();
    }
  }
  // live gold edge on the bar under discussion
  if (idx >= 2) {
    const hy = hotRow === 0 ? y : y + rh + 70;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.45 * fresh;
    ctx.strokeStyle = PALETTE.goldBright;
    ctx.lineWidth = 2.2;
    roundRect(ctx, x - 14, hy - 12, w + 28, rh + 24, 14);
    ctx.stroke();
    ctx.restore();
  }
  // the gap annotation — U4.1: enters exactly on sentence 3
  const gp = g.sentenceIdx != null ? (g.sentenceIdx >= 2 ? clamp01((g.sentenceT ?? 0) / 600) : 0) : clamp01((t - 2400) / 700);
  if (gp > 0) {
    ctx.save();
    ctx.globalAlpha = gp;
    setFont(ctx, 34, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.textAlign = 'center';
    ctx.fillText('the 75-point gap', x + w * 0.545, y + rh + 55);
    ctx.textAlign = 'left';
    ctx.restore();
    // U3.3 — focus ping on the newest element (the annotation)
    focusPing(ctx, x + w * 0.545, y + rh + 44, g.sentenceT, 100);
  }
  void fmtMoney;
}

// ── minimal title card ───────────────────────────────────────────────────────
export function titleCardScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  const a = clamp01(t / 500) * clamp01((g.d - t) / 400);
  // AUDIT I-03 — the film's own chapter-open carries the signature light:
  // the volumetric pass sits behind the title, on the same schedule as the
  // walk-on cards, instead of reserving godRays for host scenes alone.
  godRays(ctx, W, H, t, { alpha: 0.35, x: W * 0.30 });
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  goldFillText(ctx, s.title ?? 'AFTER-TAX RETURNS', W / 2, H * 0.47, 104, 800, FONT_DISPLAY, 'center');
  goldRule(ctx, W / 2, H * 0.47 + 48, 620, clamp01((t - 300) / 600));
  setFont(ctx, 30, 600, FONT_UI);
  try { (ctx as any).letterSpacing = '5px'; } catch { /* noop */ }
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText((s.sub ?? '').toUpperCase(), W / 2, H * 0.47 + 110);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  ctx.textAlign = 'left';
  ctx.restore();
}

// ── R-06 — the mid-roll re-hook (the Lever-3 boundary promise) ───────────────
// The script promised the five questions once, in the intro; session-time
// optimisation lives and dies on a second engineered event near the middle.
// This card + its VO line land at the Lever-3 boundary, restating the
// promise as a visual event so viewers carry it past the advanced tier.
export function rehookScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  // the same signature light the chapter opens carry — the promise reads as
  // an authored beat, not a thrown-up card
  godRays(ctx, W, H, t, { alpha: 0.32, x: W * 0.28 });
  statementAnchor(ctx, W, H, g.chapterIdx, t, '5');
  const a = clamp01(t / 600);
  kicker(ctx, 'HALFWAY · A PROMISE', W * 0.10, 300, a);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  goldFillText(ctx, 'Stay for the last five minutes.', W / 2, H * 0.46, 84, 800, FONT_DISPLAY, 'center');
  goldRule(ctx, W / 2, H * 0.46 + 46, 740, clamp01((t - 400) / 600));
  setFont(ctx, 32, 600, FONT_UI);
  try { (ctx as any).letterSpacing = '5px'; } catch { /* noop */ }
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText('THE FIVE QUESTIONS AT THE END GRADE YOUR ADVISOR', W / 2, H * 0.46 + 108);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  setFont(ctx, 28, 500, FONT_UI);
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.fillText('— before your money is on the line —', W / 2, H * 0.46 + 156);
  ctx.textAlign = 'left';
  ctx.restore();
  // a quiet question-mark diamond row: five ticks, the promise made visual
  // FIX E2 (frame audit) — the row sat at H*0.70 (756) with numerals at 814:
  // the caption pill's top (~796, CAPTION_SAFE_TOP 786) half-covered the
  // numbers whenever captions ran. Lifted to H*0.66 — numerals now clear the
  // pill by ~15px and the row keeps its breathing room above the caption zone.
  const ta = clamp01((t - 800) / 700);
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha = ta;
    for (let i = 0; i < 5; i++) {
      const dx = W / 2 + (i - 2) * 74;
      const ds = 12 + 2.2 * Math.sin(t / 2200 + i * 1.4);
      ctx.save();
      ctx.translate(dx, H * 0.66);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = rgba(PALETTE.gold, 0.85);
      ctx.fillRect(-ds / 2, -ds / 2, ds, ds);
      ctx.strokeStyle = rgba(PALETTE.goldPale, 0.5);
      ctx.lineWidth = 1;
      ctx.strokeRect(-ds / 2, -ds / 2, ds, ds);
      ctx.restore();
      setFont(ctx, 26, 700, FONT_UI);
      ctx.fillStyle = PALETTE.inkSoft;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), dx, H * 0.66 + 58);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }
}

// ── full-frame statement (serif) ─────────────────────────────────────────────
export function statementScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  // FIX G2 — the statement family anchors at the stronger frame alpha
  drawStatement(ctx, W, H, t, s.lines ?? ['—'], { accentWords: s.accent ?? [], sub: s.sub, ghost: s.ghost, size: s.size, chapterIdx: g.chapterIdx, voidBoost: true });
}

// ── turn card ("Research, not vibes.") ──────────────────────────────────────
export function turnCardScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  // FIX G2 — turn card anchors at the stronger frame alpha
  statementAnchor(ctx, W, H, g.chapterIdx, t, s.ghost, { frameBoost: true });
  const lines = s.lines ?? ['—'];
  ctx.save();
  ctx.textAlign = 'center';
  lines.forEach((ln: string, i: number) => {
    const local = t - 150 - i * 420;
    const a = clamp01(local / 500);
    const sc = springTo(0.94, 1, Math.max(0, local), 150, 16);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * 0.44 + i * 120);
    ctx.scale(sc, sc);
    if (i === lines.length - 1) {
      goldFillText(ctx, ln, 0, 0, 120, 800, FONT_DISPLAY, 'center');
    } else {
      setFont(ctx, 120, 800, FONT_DISPLAY);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText(ln, 0, 0);
    }
    ctx.restore();
  });
  // gold underline draws under the last line
  const up = clamp01((t - 900) / 700);
  goldRule(ctx, W / 2, H * 0.44 + lines.length * 120 - 60, 480, up);
  ctx.restore();
  void easeInOutCubic;
}

// ── quiet beat (held silence with a whisper line) ────────────────────────────
export function quietBeatScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  // FIX F4 (frame audit) — the quiet beat read as a playback error: a
  // near-black room with one dim 44px line, the ruled frame and horizon glow
  // invisible. The label rises to 52px ink and the anchor's horizon glow runs
  // at FULL strength on quiet beats (the room stays alive through the silence).
  statementAnchor(ctx, W, H, g.chapterIdx, t, s.ghost, { glowBoost: true });
  const a = clamp01(t / 700) * clamp01((g.d - t) / 500);
  ctx.save();
  ctx.globalAlpha = a * 0.92;
  setFont(ctx, 52, 500, FONT_DISPLAY);
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.fillText(s.label ?? '', W / 2, H * 0.52);
  ctx.textAlign = 'left';
  ctx.restore();
}

// ── policy risk statement (Build on it. Don't worship it.) ───────────────────
export function policyRiskScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  drawStatement(ctx, W, H, t, s.lines ?? ['—'], { accentWords: s.accent ?? [], size: 104, sub: '$48B is a policy choice, not a law of physics.', chapterIdx: g.chapterIdx, voidBoost: true });
}

// ── the final lines (earned vs kept) ─────────────────────────────────────────
export function finalLinesScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  statementAnchor(ctx, W, H, g.chapterIdx, t);
  // near-silent room: dimmer stage, dust only
  ctx.save();
  ctx.fillStyle = rgba('#05080F', 0.25);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const rows: { text: string; accent?: boolean }[] = [
    { text: 'Gross returns are what you brag about.' },
    { text: 'After-tax returns are what you spend.' },
    { text: 'The market doesn’t keep score of what you earned.' },
    { text: 'Only what you kept.', accent: true },
  ];
  ctx.save();
  ctx.textAlign = 'center';
  rows.forEach((r, i) => {
    const local = t - 100 - i * 950;
    const a = clamp01(local / 600);
    if (a <= 0) return;
    const rise = springTo(22, 0, Math.max(0, local), 130, 15);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, rise);
    setFont(ctx, i >= 2 ? 78 : 84, 700, FONT_DISPLAY);
    if (r.accent) {
      goldFillText(ctx, r.text, W / 2, H * 0.30 + i * 118, 84, 800, FONT_DISPLAY, 'center');
    } else {
      ctx.fillStyle = i >= 2 ? PALETTE.ink : PALETTE.inkSoft;
      ctx.fillText(r.text, W / 2, H * 0.30 + i * 118);
    }
    ctx.restore();
  });
  ctx.restore();
}

// ── circle back to G1 + comment prompt ───────────────────────────────────────
export function circleBackScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  if ((s.mode ?? 'comments') === 'comments') {
    panelTitle(ctx, 'Ask question one. Report back.', W / 2 - 520, 220, 1040, t / 2400, { kickerText: 'Your turn' });
    // floating comment bubbles
    const bubbles = [
      { text: 'My advisor sent the after-tax report in an hour.', x: W * 0.30, tone: 'gold' },
      { text: '“What distributions cost me?” — he had to check.', x: W * 0.62, tone: 'platinum' },
      { text: 'Question 5: $412K embedded gains. Plan made.', x: W * 0.44, tone: 'up' },
    ];
    bubbles.forEach((b, i) => {
      const ent = clamp01((t - 300 - i * 420) / 600);
      if (ent <= 0) return;
      ctx.save();
      ctx.globalAlpha = ent;
      ctx.translate(0, (1 - easeOutCubic(ent)) * 30 + floatY(t, i, 6, 4200));
      const bw = 560, bh = 120;
      glassCard(ctx, b.x - bw / 2, 380 + i * 150, bw, bh, { r: 60, goldEdge: b.tone === 'gold' });
      setFont(ctx, 28, 600, FONT_UI);
      ctx.fillStyle = PALETTE.inkSoft;
      wrapText(ctx, b.text, bw - 80, 26, 600, FONT_UI).forEach((ln, li) => {
        ctx.fillText(ln, b.x - bw / 2 + 44, 380 + i * 150 + 52 + li * 34);
      });
      ctx.restore();
    });
  } else {
    splitStatement(ctx, W, H, t, 1, 'compact');
  }
}

// ── stamp card (verdict slam) ────────────────────────────────────────────────
export function stampCardScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  const label = s.label ?? 'NOT REPORTED';
  const sub = s.sub ?? '';
  const stampT = t - 350;
  if (stampT < 0) return;
  const e = easeOutCubic(clamp01(stampT / 240));
  const shake = microShake(t, 350, 9);
  ctx.save();
  ctx.translate(W / 2 + shake.dx, H * 0.42 + shake.dy);
  ctx.rotate(-0.03);
  ctx.scale(2.6 * e + 0.4, 2.6 * e + 0.4);
  setFont(ctx, 56, 800, FONT_UI);
  try { (ctx as any).letterSpacing = '8px'; } catch { /* noop */ }
  const tw = ctx.measureText(label).width + 90;
  ctx.strokeStyle = rgba(PALETTE.down, 0.92);
  ctx.lineWidth = 5;
  roundRect(ctx, -tw / 2, -62, tw, 124, 14);
  ctx.stroke();
  ctx.fillStyle = rgba(PALETTE.down, 0.12);
  ctx.fill();
  ctx.fillStyle = '#F08A8D';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 20);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  ctx.restore();
  if (sub) {
    ctx.save();
    ctx.globalAlpha = clamp01((t - 900) / 400);
    setFont(ctx, 30, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.textAlign = 'center';
    ctx.fillText(sub, W / 2, H * 0.42 + 130);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  softBloom(ctx, W, H, t - 350, 320, 0.10);
  impactRing(ctx, W / 2, H * 0.42, t, 350, 240, 1.4, PALETTE.down);
}

// shared painter for scenes that want the stage under their content
export function defaultStage(g: SceneCtx, opts: any = {}): void {
  paintStage(g.ctx, g.W, g.H, g.t, opts);
}
