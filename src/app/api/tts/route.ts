/** TTS batch route — Edge neural voices, cached on disk. */
import { NextRequest, NextResponse } from 'next/server';
import { synthesizeLines } from '@/lib/server/tts-service';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface LineInput {
  id: string;
  text: string;
  voice?: string;
  rateDelta?: number;
  pitchDelta?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lines: LineInput[] = Array.isArray(body?.lines) ? body.lines : [];
    if (!lines.length || lines.length > 40) {
      return NextResponse.json({ error: 'lines must be 1..40' }, { status: 400 });
    }
    const voice = typeof body?.voice === 'string' && body.voice ? body.voice : 'en-US-AndrewMultilingualNeural';
    const rate = typeof body?.rate === 'number' ? Math.max(-30, Math.min(30, body.rate)) : -4;
    const pitch = typeof body?.pitch === 'number' ? Math.max(-20, Math.min(20, body.pitch)) : 0;
    const results = await synthesizeLines(lines, voice, rate, pitch, 3);
    return NextResponse.json({ ok: true, voice, rate, pitch, results });
  } catch (e: any) {
    console.error('tts route error', e);
    return NextResponse.json({ error: e?.message ?? 'voice generation failed' }, { status: 500 });
  }
}
