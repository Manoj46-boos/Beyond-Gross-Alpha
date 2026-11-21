'use client';

/**
 * AURUM Studio — prepare, preview, render.
 * 1. Prepare project  → narration (cached) + timeline + score mix
 * 2. Preview/scrub    → instant scrub (every frame is a pure function of t)
 * 3. Test render 6s   → confirm the pipeline before the long render
 * 4. Render full MP4  → WebCodecs, streamed straight to disk
 * 5. Thumbnail        → the script's three concepts as PNGs
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareProject, PreparedProject, PipelineProgress, VoiceSettings } from '@/lib/engine/pipeline';
import { drawFrame, RenderOptions } from '@/lib/engine/director';
import { drawThumbnail, ThumbnailVariant } from '@/lib/engine/thumbnail';
import { renderVideo, pickSaveTarget } from '@/lib/engine/encode';
import { youtubeChapters } from '@/lib/engine/timeline';
import { VIDEO_TITLE, CHANNEL_NAME_DEFAULT, NEXT_VIDEO_TITLE, TAGS, DESCRIPTION_BODY } from '@/lib/engine/upload-kit';

const VOICES = [
  { id: 'en-US-AndrewMultilingualNeural', label: 'Andrew — deep, measured (recommended)' },
  { id: 'en-US-ChristopherMultilingualNeural', label: 'Christopher — calm baritone' },
  { id: 'en-US-BrianMultilingualNeural', label: 'Brian — dry, confident' },
  { id: 'en-GB-RyanMultilingualNeural', label: 'Ryan — British, restrained' },
  { id: 'en-GB-SoniaMultilingualNeural', label: 'Sonia — British, crisp' },
  { id: 'en-US-AvaMultilingualNeural', label: 'Ava — warm, precise' },
  { id: 'en-US-EmmaMultilingualNeural', label: 'Emma — bright, quick' },
  { id: 'en-US-GuyMultilingualNeural', label: 'Guy — bold announcer' },
];

type Phase = 'setup' | 'busy' | 'ready' | 'rendering' | 'done';

export default function Studio() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [progress, setProgress] = useState<PipelineProgress>({ phase: 'idle', detail: '', done: 0, total: 1 });
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedProject | null>(null);
  const [settingsHash, setSettingsHash] = useState<string>('');

  const [voice, setVoice] = useState('en-US-AndrewMultilingualNeural');
  const [pace, setPace] = useState(-4);
  const [bgmVolume, setBgmVolume] = useState(0.62);
  const [resolution, setResolution] = useState<'1080' | '720'>('1080');
  const [fps, setFps] = useState(30);
  const [captionsMode, setCaptionsMode] = useState<'karaoke' | 'simple' | 'off'>('karaoke');
  const [watermark, setWatermark] = useState(true);
  const [progressBar, setProgressBar] = useState(true);
  const [channelName, setChannelName] = useState(CHANNEL_NAME_DEFAULT);
  const [nextVideoTitle, setNextVideoTitle] = useState(NEXT_VIDEO_TITLE);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewTRef = useRef(0);
  const playingRef = useRef(false);
  const audioSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef(0);

  const renderOptions: RenderOptions = { captions: captionsMode, channelName, nextVideoTitle, watermark, progressBar };

  // ── fonts ──
  useEffect(() => {
    const faces = [
      '500 16px "Playfair Display"', '600 16px "Playfair Display"', '700 16px "Playfair Display"',
      '800 16px "Playfair Display"', '900 16px "Playfair Display"',
      '400 16px Manrope', '500 16px Manrope', '600 16px Manrope', '700 16px Manrope', '800 16px Manrope',
    ];
    Promise.all(faces.map((f) => document.fonts.load(f))).catch(() => undefined);
  }, []);

  // ── preview loop ──
  const drawAt = useCallback(
    (tMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !prepared) return;
      const h = resolution === '1080' ? 1080 : 720;
      const w = resolution === '1080' ? 1920 : 1280;
      if (canvas.width !== w) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d', { alpha: false })!;
      drawFrame(ctx, prepared.timeline, tMs, renderOptions);
    },
    [prepared, resolution, captionsMode, watermark, progressBar, channelName, nextVideoTitle] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!prepared) return;
    let last = performance.now();
    const loop = (now: number) => {
      if (playingRef.current) {
        const dt = now - last;
        previewTRef.current = Math.min(prepared.timeline.durationMs, previewTRef.current + dt);
        if (previewTRef.current >= prepared.timeline.durationMs) {
          playingRef.current = false;
          stopAudio();
        }
        if (audioSrcRef.current) {
          // audio synced by offset play; visual follows the clock
        }
      }
      last = now;
      drawAt(previewTRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [prepared, drawAt]);

  const stopAudio = () => {
    try { audioSrcRef.current?.stop(); } catch { /* already stopped */ }
    audioSrcRef.current = null;
  };

  const playPause = () => {
    if (!prepared) return;
    if (playingRef.current) {
      playingRef.current = false;
      stopAudio();
      return;
    }
    playingRef.current = true;
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ac.createBufferSource();
      src.buffer = prepared.mixBuffer;
      src.connect(ac.destination);
      src.start(0, previewTRef.current / 1000);
      audioSrcRef.current = src;
      src.onended = () => { audioSrcRef.current = null; };
    } catch { /* preview audio optional */ }
  };

  // ── prepare ──
  const doPrepare = async () => {
    setPhase('busy');
    setError(null);
    try {
      const vs: VoiceSettings = { voice, rate: pace, pitch: 0 };
      const p = await prepareProject(vs, { bgmVolume, voVolume: 0.95, fps }, (pp) => setProgress(pp));
      setPrepared(p);
      setSettingsHash(JSON.stringify({ vs, bgmVolume, fps }));
      previewTRef.current = 0;
      setPhase('ready');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPhase('setup');
    }
  };

  const rePrepare = () => {
    setPhase('setup');
    setPrepared(null);
    stopAudio();
  };

  // ── renders ──
  const canvasSize = () => (resolution === '1080' ? { w: 1920, h: 1080 } : { w: 1280, h: 720 });

  const renderTest = async () => {
    if (!prepared) return;
    const { w, h } = canvasSize();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const tl = { ...prepared.timeline };
    const frames = fps * 6;
    tl.totalFrames = frames;
    tl.durationMs = 6000;
    const blob = await renderVideo({
      timeline: tl,
      mixBuffer: prepared.mixBuffer,
      canvas,
      options: renderOptions,
      audioDurationMs: 6500,
      onLog: (m) => setProgress({ phase: 'mix', detail: m, done: 0, total: 1 }),
    });
    setError(null);
    setProgress({ phase: 'ready', detail: `test render done — ${(blob.bytes / 1e6).toFixed(1)} MB`, done: 1, total: 1 });
  };

  const renderFull = async () => {
    if (!prepared) return;
    setPhase('rendering');
    try {
      const { w, h } = canvasSize();
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const writable = await pickSaveTarget('beyond-gross-alpha-after-tax.mp4');
      const result = await renderVideo({
        timeline: prepared.timeline,
        mixBuffer: prepared.mixBuffer,
        canvas,
        options: renderOptions,
        writable,
        onProgress: (s) =>
          setProgress({
            phase: 'mix',
            detail: `frame ${s.frame}/${s.totalFrames} · ${s.sceneLabel} · ${s.fps.toFixed(1)} fps · ETA ${Math.round(s.etaMs / 60000)}m`,
            done: s.frame,
            total: s.totalFrames,
          }),
        onLog: (m) => console.log(m),
      });
      setProgress({ phase: 'ready', detail: `done — ${(result.bytes / 1e6).toFixed(1)} MB`, done: 1, total: 1 });
      setPhase('done');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPhase('ready');
    }
  };

  const makeThumb = (variant: ThumbnailVariant) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    drawThumbnail(ctx, 1280, 720, variant, channelName);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `thumbnail-t${variant + 1}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    }, 'image/png');
  };

  const chapters = prepared ? youtubeChapters(prepared.timeline) : '';

  return (
    <div className="studio">
      <div className="kicker">Beyond Gross Alpha · Episode 3</div>
      <h1>After-Tax Returns — AURUM Studio</h1>
      <div className="detail">
        Renders the full script as a premium midnight-ledger explainer. Prepare → preview → render.
      </div>

      <div className="grid">
        <div>
          <div className="card">
            <h2>1 · The narration</h2>
            <label>Voice</label>
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            <label>Speaking pace — {pace}% ({pace <= -6 ? 'measured' : pace <= -2 ? 'deliberate' : 'brisk'})</label>
            <input type="range" min={-10} max={6} step={1} value={pace} onChange={(e) => setPace(+e.target.value)} />
            <button onClick={doPrepare} disabled={phase === 'busy'}>
              {prepared ? 'Re-prepare project' : 'Prepare project'}
            </button>
            {phase === 'busy' && (
              <div>
                <div className="progress-line"><div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
                <div className="detail">{progress.detail}</div>
              </div>
            )}
            {error && <div className="error">{error}</div>}
          </div>

          <div className="card">
            <h2>2 · Look &amp; sound</h2>
            <label>Background music — {Math.round(bgmVolume * 100)}%</label>
            <input type="range" min={0} max={1} step={0.05} value={bgmVolume} onChange={(e) => setBgmVolume(+e.target.value)} />
            <label>Captions</label>
            <select value={captionsMode} onChange={(e) => setCaptionsMode(e.target.value as any)}>
              <option value="karaoke">Karaoke — gold word sweep</option>
              <option value="simple">Simple</option>
              <option value="off">Off</option>
            </select>
            <label>Resolution</label>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as any)}>
              <option value="1080">1080p — full quality</option>
              <option value="720">720p — faster</option>
            </select>
            <label>Frame rate</label>
            <select value={String(fps)} onChange={(e) => setFps(+e.target.value)}>
              <option value="30">30 fps</option>
              <option value="24">24 fps — cinematic</option>
            </select>
            <label>Channel name (intro, watermark, end screen)</label>
            <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} />
            <label>Next video title (end screen)</label>
            <input type="text" value={nextVideoTitle} onChange={(e) => setNextVideoTitle(e.target.value)} />
            <div className="checks">
              <label><input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} /> Watermark</label>
              <label><input type="checkbox" checked={progressBar} onChange={(e) => setProgressBar(e.target.checked)} /> Progress bar</label>
            </div>
          </div>

          <div className="card">
            <h2>3 · Build &amp; render</h2>
            <button className="secondary" onClick={renderTest} disabled={phase !== 'ready'}>Test render · 6s</button>
            <button onClick={renderFull} disabled={phase !== 'ready'}>
              {phase === 'rendering' ? 'Rendering… keep this tab visible' : 'Render full MP4'}
            </button>
            {phase === 'rendering' && (
              <div>
                <div className="progress-line"><div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
                <div className="detail">{progress.detail}</div>
              </div>
            )}
            {phase === 'done' && <div className="detail">✓ Rendered. Upload the MP4 to YouTube.</div>}
            {prepared && (
              <div className="detail">
                runtime {(prepared.timeline.durationMs / 60000).toFixed(1)} min · {prepared.timeline.totalFrames} frames ·{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); rePrepare(); }} style={{ color: '#e9c766' }}>change settings</a>
              </div>
            )}
          </div>

          <div className="card">
            <h2>4 · Thumbnails — the script&apos;s three concepts</h2>
            <button className="secondary" onClick={() => makeThumb(0)}>T1 — Split statement · SAME PORTFOLIO</button>
            <button className="secondary" onClick={() => makeThumb(1)}>T2 — Gold line · NOT REPORTED</button>
            <button className="secondary" onClick={() => makeThumb(2)}>T3 — 92% vs 17% · THE GAP</button>
          </div>
        </div>

        <div>
          <div className="card">
            <h2>Preview — every frame scrubs instantly</h2>
            <canvas ref={canvasRef} width={1920} height={1080} />
            <div className="checks">
              <button className="secondary" style={{ width: 140 }} onClick={playPause} disabled={!prepared}>
                {playingRef.current ? 'Pause' : '▶ Play'}
              </button>
              <div style={{ flex: 1 }}>
                <input
                  type="range"
                  min={0}
                  max={prepared?.timeline.durationMs ?? 1000}
                  value={previewTRef.current}
                  style={{ width: '100%' }}
                  onChange={(e) => {
                    previewTRef.current = +e.target.value;
                    stopAudio();
                    playingRef.current = false;
                  }}
                />
                <div className="detail">
                  {(previewTRef.current / 1000).toFixed(1)}s {prepared ? `· ${(prepared.timeline.totalFrames)} frames total` : '· prepare the project first'}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Upload kit</h2>
            <label>Title (A/B test, in order)</label>
            <textarea readOnly value={VIDEO_TITLE} />
            <label>Description + chapters (from the actual render)</label>
            <textarea readOnly value={prepared ? `${DESCRIPTION_BODY}\n\n⏱ Chapters\n${chapters}` : DESCRIPTION_BODY} />
            <label>Tags</label>
            <textarea readOnly value={TAGS.join(', ')} />
          </div>
        </div>
      </div>
    </div>
  );
}
