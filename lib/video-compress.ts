// lib/video-compress.ts
// Browser-only — imported lazily from upload handlers only.
// Uses single-threaded @ffmpeg/core — no SharedArrayBuffer or COOP/COEP needed.
//
// Loads @ffmpeg packages from jsDelivr CDN at runtime.
// Uses new Function('u','return import(u)') to bypass Next.js webpack static analysis,
// which fails on the dynamic internal imports inside @ffmpeg/ffmpeg.

/* eslint-disable @typescript-eslint/no-explicit-any */

const CDN_FFMPEG_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm'
const CDN_FFMPEG      = `${CDN_FFMPEG_BASE}/index.js`
const CDN_UTIL        = 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js'
const CDN_CORE        = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'

// Escape-hatch: import a URL at runtime without webpack resolving it at build time
const runtimeImport = (url: string): Promise<any> =>
  new Function('u', 'return import(u)')(url)

let ffmpegInstance: any = null
let toBlobURL: ((url: string, mimeType: string) => Promise<string>) | null = null
let loadPromise: Promise<void> | null = null

async function getFFmpeg(): Promise<any> {
  if (!ffmpegInstance) {
    const [ffmpegMod, utilMod] = await Promise.all([
      runtimeImport(CDN_FFMPEG),
      runtimeImport(CDN_UTIL),
    ])
    ffmpegInstance = new ffmpegMod.FFmpeg()
    toBlobURL = utilMod.toBlobURL
  }

  if (!loadPromise) {
    loadPromise = ffmpegInstance.load({
      coreURL:   await toBlobURL!(`${CDN_CORE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL:   await toBlobURL!(`${CDN_CORE}/ffmpeg-core.wasm`, 'application/wasm'),
      // @ffmpeg/ffmpeg uses 'classWorkerURL' (not 'workerURL') — must be a blob URL
      classWorkerURL: await toBlobURL!(`${CDN_FFMPEG_BASE}/worker.js`, 'text/javascript'),
    }).catch((err: any) => {
      // Reset so the next attempt can retry
      loadPromise = null
      ffmpegInstance = null
      toBlobURL = null
      throw new Error(`טעינת FFmpeg נכשלה: ${err?.message ?? String(err)}`)
    })
  }

  await loadPromise
  return ffmpegInstance
}

/**
 * Compresses a video to 720p H.264 @ CRF 28 (~1500-2000 kbps) in the browser.
 * Returns a new .mp4 File. onProgress receives 0-100.
 */
export async function compressVideo(
  file: File,
  onProgress: (pct: number) => void
): Promise<File> {
  const ext = (file.name.split('.').pop() ?? 'mp4').toLowerCase()
  const inputName = `input.${ext}`
  const outputName = 'output.mp4'

  onProgress(1) // WASM loading
  const ffmpeg = await getFFmpeg()
  onProgress(3) // WASM ready, reading file

  const progressHandler = ({ progress }: { progress: number }) => {
    // FFmpeg progress 0-1 mapped to 5-99 (reserve 0-4 for init stages)
    const pct = Math.min(Math.round(progress * 94) + 5, 99)
    onProgress(pct)
  }
  ffmpeg.on('progress', progressHandler)

  try {
    const buf = await file.arrayBuffer()
    onProgress(4) // file read into memory, writing to WASM FS
    await ffmpeg.writeFile(inputName, new Uint8Array(buf))

    await ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=-2:720',         // 720p, preserve aspect ratio
      '-c:v', 'libx264',
      '-crf', '28',                   // quality: good balance for climbing analysis
      '-preset', 'fast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',      // moov atom at front for instant web playback
      outputName,
    ])

    const raw = await ffmpeg.readFile(outputName)
    const bytes = raw instanceof Uint8Array ? raw : new TextEncoder().encode(raw as string)

    onProgress(100)
    return new File(
      [bytes],
      file.name.replace(/\.[^.]+$/, '.mp4'),
      { type: 'video/mp4' }
    )
  } finally {
    ffmpeg.off('progress', progressHandler)
    ffmpeg.deleteFile(inputName).catch(() => {})
    ffmpeg.deleteFile(outputName).catch(() => {})
  }
}
