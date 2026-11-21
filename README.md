# AURUM Studio — Beyond Gross Alpha · Episode 3

Renders the complete **"After-Tax Returns: The Metric Most Advisors Ignore"** script
(`After-Tax_Returns_MASTER_SCRIPT.md`) as a premium, cinematic explainer video —
frame by frame — and saves a YouTube-ready MP4.

**This is a deliberately new visual identity, not a re-skin.** The previous film
("K-Shaped Economy") used a light ivory/teal, hand-inked look with a felt-piano
score. Episode 3 is built in the **Midnight Ledger** system:

| Layer | K-Shaped Economy | After-Tax Returns (AURUM) |
|---|---|---|
| Room | warm ivory gradient, flat light | deep navy (never pure black), breathing indigo/gold glows, blueprint lattice, perspective floor, gold horizon |
| Figure | flat-ink stickman, gold vest + scarf, line boil | "The Principal" — gradient-shaded suited figure, polished joints, rim light, silver hair, gold-rimmed glasses, floor reflection |
| Type | Fraunces + Inter | Playfair Display (luxury serif) + Manrope |
| Charts | teal/coral flat fills | glow lines, gradient columns with gold caps, glass panels, gold-shaded gap fills |
| Motion | K-wipe, whip cuts, punch-ins | light-blade transitions, fade-through-navy, depth-layered parallax camera, DOF reactions |
| Music | 92 BPM C-major felt-piano arpeggio | 72 BPM D-minor: string pad + glass piano + sub bass + the ledger bell motif (D–F–A–G), deep −22 LUFS-style ducking, full score-drop at the SEC story and the final lines |
| SFX | whooshes + dings | paper tick on every source chip, sheen risers, sub booms, glass pings, seal slams |
| Captions | white pill, teal sweep | dark glass pill, gold word sweep, gold voice tab |
| Retention device | — | **source chips** (S1–S21 from the script) on every statistic, bottom-left, 3 s |

Everything the script demands is implemented: the $5.1M cold-open paradox, G1–G9
graphics, the signature gold gap curve, the location map, the TLH mechanic,
the FAJ waterfall, era bars, the SEC press-release drop, the wrapper plumbing,
the exchange-fund padlock, the hierarchy and five-questions save assets,
and the "earned vs kept" close.

---

## Quickstart (your laptop)

You need **Node.js LTS** and **Chrome or Edge** (WebCodecs). Nothing else.

```bash
npm install
npm run dev        # → http://localhost:3001
```

Then, in the studio:

| Step | Click | What happens |
|---|---|---|
| 1 | **Prepare project** | Generates ~180 narration clips (Edge neural voices, cached in `.render-assets/tts/`), measures them, builds the frame-accurate timeline, composes the score and mixes the audio |
| 2 | **▶ Play / scrub** | Instant preview — every frame is a pure function of time |
| 3 | **Test render · 6s** | Sanity check before the long render |
| 4 | **Render full MP4** | Renders frame by frame (1080p/30 ≈ 45–90 min) and streams the MP4 straight to disk |

Extras: three thumbnail generators (the script's T1/T2/T3 concepts), an upload
kit with auto-computed chapter timestamps, karaoke/simple/off captions,
24 or 30 fps, 1080p/720p, channel name + next-video title.

> Voice generation needs network access; once cached, the render is fully offline.

## Offline QA harness (no browser needed)

```bash
npm run qa            # renders QA frames (synthetic timings, no TTS)
node tools/render-frames.mjs --rebuild --times 6000,20000,40000 --out evidence
node tools/render-frames.mjs --rebuild --segments "0-10s" --step 0.5
npm run preview       # assembles evidence frames into preview.mp4
npx tsc --noEmit      # typecheck
```

The harness compiles the engine to `.qa-build/` with tsc, shims
`document`/`OffscreenCanvas`, registers the bundled fonts and draws real frames
with node-canvas — the exact same `drawFrame` the browser renders.

## Engine map

```
src/lib/engine/
  theme.ts        AURUM palette, glass panels, gold type, layout law
  stage.ts        the room: navy gradient, glows, lattice, floor, sheen
  stickman.ts     The Principal: gradient limbs, IK, gestures, talk visemes, walk
  fx.ts           gold dust, bokeh, god rays, DOF, grain, vignette, light blade
  charts.ts       line/bar/waterfall/donut/dot-grid/stat-card in AURUM style
  textfx.ts       captions, part cards, source chips, watermark, progress bar
  score.ts        72 BPM D-minor score-as-data (pad/piano/sub/bell/swell/tick)
  audio.ts        mix: deep duck, music-out windows, SFX grammar, −14 LUFS
  timeline.ts     beats → frame-accurate edit list + chip schedule
  script-data.ts  the full episode script (verbatim VO, sources, scene props)
  scenes-*.ts     45 scene drawers across the seven acts
  director.ts     drawFrame: camera → stage → scene → furniture → finish
  encode.ts       WebCodecs AV1/H264 chain → mp4-muxer → disk
```

## Notes

- Design grid is 1920×1080; encode targets 12 Mbps at 1080p (YouTube-safe).
- Deterministic rendering: every animated value is a pure function of `(t, seed)`
  — scrubbing and re-renders are pixel-identical.
- Education, not tax advice — the video says so itself; keep it that way.
