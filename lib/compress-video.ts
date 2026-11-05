// Shrink a climbing video in the browser before upload (hardware encoder via WebCodecs).
// Long side → 1280 px (720p), H.264 ~2.5 Mbps, at most 30 fps, AAC audio. Enough for move-by-move
// analysis, and usually 3–6× smaller than a phone's original. Returns null when the browser
// can't do it or it wouldn't help — the caller then uploads the original.
import {
  ALL_FORMATS, BlobSource, BufferTarget, Conversion, ConversionCanceledError, Input, Mp4OutputFormat, Output,
  canEncodeVideo,
} from 'mediabunny'

const LONG_SIDE = 1280
const VIDEO_BITRATE = 2_500_000
const MAX_FPS = 30
/** Files below this are uploaded as they are. */
const MIN_SIZE = 25 * 1024 * 1024

export interface CompressHandle {
  promise: Promise<File | null>
  cancel: () => void
}

export function compressVideo(file: File, onProgress: (pct: number) => void): CompressHandle {
  let conversion: Conversion | null = null
  let canceled = false
  const promise = (async (): Promise<File | null> => {
    if (!file.type.startsWith('video/') || file.size < MIN_SIZE) return null
    if (typeof window === 'undefined' || typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder === 'undefined') return null

    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
    try {
      const track = await input.getPrimaryVideoTrack()
      if (!track) return null
      const w = track.displayWidth, h = track.displayHeight
      const duration = await input.computeDuration()
      const landscape = w >= h
      const longSide = Math.max(w, h)
      // already small and light: nothing to gain
      if (longSide <= LONG_SIDE && duration > 0 && (file.size * 8) / duration < VIDEO_BITRATE * 1.4) return null

      const outW = landscape ? Math.min(LONG_SIDE, w) : undefined
      const outH = landscape ? undefined : Math.min(LONG_SIDE, h)
      if (!(await canEncodeVideo('avc', { width: outW ?? Math.round((w * LONG_SIDE) / h), height: outH ?? Math.round((h * LONG_SIDE) / w), bitrate: VIDEO_BITRATE }))) return null

      const stats = await track.computePacketStats(120).catch(() => null)
      const fps = stats?.averagePacketRate ?? 30

      const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
      conversion = await Conversion.init({
        input,
        output,
        video: {
          ...(outW ? { width: outW } : { height: outH }),
          codec: 'avc',
          bitrate: VIDEO_BITRATE,
          ...(fps > MAX_FPS + 1 ? { frameRate: MAX_FPS } : {}),
        },
        audio: { codec: 'aac', bitrate: 96_000 },
      })
      if (!conversion.isValid || canceled) return null
      conversion.onProgress = p => onProgress(Math.round(p * 100))
      await conversion.execute()

      const buffer = (output.target as BufferTarget).buffer
      if (!buffer) return null
      const name = file.name.replace(/\.[^.]+$/, '') + '.mp4'
      const out = new File([buffer], name, { type: 'video/mp4', lastModified: file.lastModified })
      return out.size < file.size * 0.85 ? out : null
    } catch (e) {
      if (e instanceof ConversionCanceledError || canceled) throw new Error('__cancelled__')
      console.warn('Video compression failed, uploading the original:', e)
      return null
    } finally {
      input.dispose?.()
    }
  })()
  return {
    promise,
    cancel: () => { canceled = true; conversion?.cancel() },
  }
}
