'use client'

import { isActiveUser } from '@/lib/active-users'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import MediaComments from '@/components/media/MediaComments'
import { LuChartColumn, LuFileText, LuFolder, LuFolderOpen, LuRefreshCw, LuTrash2, LuTriangleAlert, LuVideo } from 'react-icons/lu'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaFile {
  FileID: number
  Email: string
  GoogleDriveFileId: string
  FileName: string
  MimeType: string
  FileSize: number | null
  UploadedBy: string
  CreatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVideo(mime: string) { return mime.startsWith('video/') }
function isImage(mime: string) { return mime.startsWith('image/') }

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function shortEmail(email: string) {
  return email.split('@')[0]
}

// ─── File card ────────────────────────────────────────────────────────────────

function FileCard({
  file,
  token,
  canDelete,
  onDelete,
  uploaderName,
  currentUser,
  hasAnalysis,
}: {
  file: MediaFile
  token: string
  canDelete: boolean
  onDelete: (id: number) => void
  uploaderName: string
  currentUser: { Email: string; Name: string; Role: string }
  hasAnalysis: boolean
}) {
  const streamUrl = `/api/media/stream/${file.FileID}?token=${encodeURIComponent(token)}`
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`למחוק את הקובץ "${file.FileName}"?`)) return
    setDeleting(true)
    onDelete(file.FileID)
  }

  return (
    <div className="bg-surface rounded-xl border border-line flex flex-col">
      {/* Preview */}
      <div className="bg-surface relative rounded-t-xl overflow-hidden" style={{ minHeight: '160px' }}>
        {isVideo(file.MimeType) ? (
          <video
            src={streamUrl}
            controls
            preload="metadata"
            className="w-full h-full object-contain max-h-64"
          />
        ) : isImage(file.MimeType) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={streamUrl}
            alt={file.FileName}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-40 text-4xl text-faint">
            <LuFileText aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium text-fg truncate" title={file.FileName}>
          {file.FileName}
        </p>
        <p className="text-xs text-faint">
          הועלה על ידי {uploaderName}
        </p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-faint truncate">
              {formatDate(file.CreatedAt)}{file.FileSize ? ` · ${formatBytes(file.FileSize)}` : ''}
            </span>
            {isVideo(file.MimeType) && hasAnalysis && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success">
                נותח ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isVideo(file.MimeType) && (
              <Link
                href={`/analysis/${file.FileID}`}
                className={`text-xs px-2 py-1 rounded-lg transition-colors font-medium ${
 hasAnalysis
 ? 'bg-success/15 text-success hover:bg-success/15 border border-success'
 : 'text-accent hover:text-accent/90'
 }`}
                title={hasAnalysis ? 'צפה בניתוח' : 'נתח סרטון'}
              >
                {hasAnalysis ? 'צפה בניתוח' : <><LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />נתח</>}
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-danger hover:text-danger/90 disabled:opacity-40 transition-colors p-1"
                title="מחק"
              >
                <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
              </button>
            )}
          </div>
        </div>
      </div>
      <MediaComments fileId={file.FileID} currentUser={currentUser} />
    </div>
  )
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
 dragOver ? 'border-accent bg-accent/15' : 'border-line hover:border-accent/90 hover:bg-surface'
 }`}
    >
      <p className="text-3xl mb-2"><LuFolder aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></p>
      <p className="text-sm font-medium text-fg-2">גרור קובץ לכאן או לחץ לבחירה</p>
      <p className="text-xs text-faint mt-1">וידאו, תמונות, מסמכים</p>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={e => e.target.files && onFiles(e.target.files)} />
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function MediaContent() {
  const { currentUser, activeUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const now = new Date()

  const isCoachOrAdmin = currentUser?.Role === 'coach' || currentUser?.Role === 'admin'

  // ── Auth token for API calls ──────────────────────────────────
  const [token, setToken] = useState('')
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? '')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? '')
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Users list ────────────────────────────────────────────────
  const [users, setUsers] = useState<{ Email: string; Name: string }[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  // Map for resolving uploader names
  const [allUsers, setAllUsers] = useState<Record<string, string>>({})

  // ── URL-based filter ──────────────────────────────────────────
  const urlEmail = searchParams.get('email') ?? ''
  const selectedEmail = urlEmail

  function setSelectedEmail(email: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('email', email)
    router.replace(`${pathname}?${params.toString()}`)
  }

  // ── Files state ───────────────────────────────────────────────
  const [files, setFiles] = useState<MediaFile[]>([])
  const [analysedFileIds, setAnalysedFileIds] = useState<Set<number>>(new Set())
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // ── Upload progress ───────────────────────────────────────────
  // progress -1 = idle, 0-100 = uploading
  const [uploadProgress, setUploadProgress] = useState(-1)
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadFileIndex, setUploadFileIndex] = useState(0)
  const [uploadFileTotal, setUploadFileTotal] = useState(0)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load users & set URL default ─────────────────────────────
  useEffect(() => {
    if (!currentUser) return

    async function loadUsers() {
      let list: { Email: string; Name: string }[] = []

      if (currentUser!.Role === 'admin') {
        const { data } = await supabase.from('Users').select('Email, Name, Status, IsActive').order('Name')
        list = (data ?? []).filter(u => u.Email === currentUser!.Email || isActiveUser(u)).map(({ Email, Name }) => ({ Email, Name }))
      } else if (currentUser!.Role === 'coach') {
        const { data } = await supabase
          .from('CoachTraineesActiveView')
          .select('TraineeEmail, TraineeName')
          .eq('CoachEmail', currentUser!.Email)
        const emails = (data ?? []).map(t => t.TraineeEmail)
        const { data: statuses } = emails.length
          ? await supabase.from('Users').select('Email, Status, IsActive').in('Email', emails)
          : { data: [] }
        const active = new Set((statuses ?? []).filter(isActiveUser).map(u => u.Email))
        list = (data ?? []).filter(t => active.has(t.TraineeEmail)).map(t => ({ Email: t.TraineeEmail, Name: t.TraineeName }))
      } else {
        const { data } = await supabase
          .from('Users')
          .select('Email, Name')
          .eq('Email', currentUser!.Email)
          .single()
        if (data) list = [data]
      }

      setUsers(list)

      // Also load all users for uploader name resolution
      const { data: allData } = await supabase.from('Users').select('Email, Name')
      const map: Record<string, string> = {}
      ;(allData ?? []).forEach(u => { map[u.Email] = u.Name })
      setAllUsers(map)

      // Initialise URL param
      const emailInUrl = searchParams.get('email')
      const defaultEmail = activeUser?.Email || currentUser!.Email
      const validEmail =
        list.find(u => u.Email === emailInUrl)?.Email ||
        list.find(u => u.Email === defaultEmail)?.Email ||
        list[0]?.Email ||
        ''

      if (!emailInUrl || emailInUrl !== validEmail) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('email', validEmail)
        router.replace(`${pathname}?${params.toString()}`)
      }

      setUsersLoaded(true)
    }

    loadUsers()
  }, [currentUser?.Email]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load files when selected email or token changes ───────────
  const loadFiles = useCallback(async () => {
    if (!selectedEmail || !token) return
    setFilesLoading(true)
    setSyncError('')
    try {
      // Auto-sync with Drive before listing (best-effort — won't block if Drive is unavailable)
      try {
        const syncRes = await fetch('/api/media/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: selectedEmail }),
        })
        if (!syncRes.ok) {
          const syncJson = await syncRes.json().catch(() => ({}))
          const msg = syncJson.error || `Drive sync failed (${syncRes.status})`
          console.warn('[media] sync error:', msg)
          setSyncError(msg)
        }
      } catch (syncErr: any) {
        console.warn('[media] sync network error:', syncErr.message)
        setSyncError('לא ניתן להתחבר ל-Drive')
      }

      const res = await fetch(`/api/media/list?email=${encodeURIComponent(selectedEmail)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      const loadedFiles: MediaFile[] = res.ok ? json.files : []
      setFiles(loadedFiles)

      // Check which video FileIDs have an existing analysis
      const videoIds = loadedFiles.filter(f => f.MimeType.startsWith('video/')).map(f => f.FileID)
      if (videoIds.length > 0) {
        const { data: analyses } = await supabase
          .from('ClimbingAnalysis')
          .select('FileID')
          .in('FileID', videoIds)
        setAnalysedFileIds(new Set((analyses ?? []).map((a: { FileID: number }) => a.FileID)))
      } else {
        setAnalysedFileIds(new Set())
      }
    } catch {
      setFiles([])
    }
    setFilesLoading(false)
  }, [selectedEmail, token])

  useEffect(() => {
    if (selectedEmail && token) loadFiles()
  }, [loadFiles, selectedEmail, token])

  // ── Direct-to-Drive upload helpers ───────────────────────────
  async function initUpload(params: {
    email: string; fileName: string; mimeType: string; fileSize: number
  }): Promise<string> {
    const res = await fetch('/api/media/init-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to init upload')
    return json.uploadUrl
  }

  // Chunked resumable upload — 5 MB per chunk, resumes from server-acknowledged offset.
  // Each chunk is a separate XHR so mobile connection drops only lose the current chunk.
  async function xhrUploadChunked(
    file: File,
    uploadUrl: string,
    onProgress: (pct: number) => void
  ): Promise<{ driveFileId: string; fileSize: number }> {
    const CHUNK = 10 * 1024 * 1024 // 10 MB — better for slow connections (~1.3 Mbps = ~60s per chunk)
    const total = file.size
    const mime = file.type || 'application/octet-stream'

    // Query session to resume any partially-uploaded bytes
    let offset = await new Promise<number>(resolve => {
      const xhr = new XMLHttpRequest()
      xhr.addEventListener('load', () => {
        if (xhr.status === 308) {
          const range = xhr.getResponseHeader('Range')
          resolve(range ? parseInt(range.split('-')[1]) + 1 : 0)
        } else {
          resolve(0) // session fresh or expired — start from 0
        }
      })
      xhr.addEventListener('error', () => resolve(0))
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Range', `bytes */${total}`)
      xhr.send()
    })

    while (offset < total) {
      const end = Math.min(offset + CHUNK, total)
      const chunk = file.slice(offset, end)

      const result = await new Promise<{ status: number; body: string; serverRange: string | null }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhrRef.current = xhr
          xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) onProgress(Math.round(((offset + e.loaded) / total) * 100))
          })
          xhr.addEventListener('load', () => {
            xhrRef.current = null
            resolve({ status: xhr.status, body: xhr.responseText, serverRange: xhr.getResponseHeader('Range') })
          })
          xhr.addEventListener('error', () => { xhrRef.current = null; reject(new Error('שגיאת רשת')) })
          xhr.addEventListener('abort', () => { xhrRef.current = null; reject(new Error('__cancelled__')) })
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Range', `bytes ${offset}-${end - 1}/${total}`)
          xhr.setRequestHeader('Content-Type', mime)
          xhr.send(chunk)
        }
      )

      if (result.status === 200 || result.status === 201) {
        // Final chunk — Drive returns file metadata
        let data: { id?: string; size?: string | number } = {}
        try { data = JSON.parse(result.body) } catch { /* ignore */ }
        return { driveFileId: data.id ?? '', fileSize: Number(data.size ?? total) }
      }

      if (result.status === 308) {
        // Chunk accepted — advance to server-acknowledged byte position
        offset = result.serverRange ? parseInt(result.serverRange.split('-')[1]) + 1 : end
        onProgress(Math.round((offset / total) * 100))
        continue
      }

      throw new Error(`שגיאת העלאה: ${result.status}`)
    }

    throw new Error('ההעלאה הסתיימה ללא אישור מ-Drive')
  }

  async function registerFile(params: {
    email: string; driveFileId: string; fileName: string; mimeType: string; fileSize: number
  }): Promise<void> {
    const res = await fetch('/api/media/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to register file')
    }
  }

  // ── Upload handler ────────────────────────────────────────────
  const MAX_FILE_SIZE = 300 * 1024 * 1024 // 300 MB hard limit

  const handleFiles = async (fileList: FileList) => {
    if (!token || !selectedEmail) return
    setUploadError('')

    const allFiles = Array.from(fileList)

    // 300 MB hard limit check
    const tooBig = allFiles.find(f => f.size > MAX_FILE_SIZE)
    if (tooBig) {
      setUploadError(
        `שגיאה: הקובץ גדול מדי (מעל 300MB). כדי להעלות בהצלחה: גזרו את הקצוות המיותרים בגלריה, או השתמשו בטיפ הכיווץ דרך הוואטסאפ.`
      )
      return
    }

    setUploadFileTotal(allFiles.length)

    // Keep screen on during upload (Wake Lock API — silently ignored if unsupported)
    let wakeLock: WakeLockSentinel | null = null
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
    } catch { /* not supported or denied */ }

    try {
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i]
        setUploadFileIndex(i + 1)
        setUploadFileName(file.name)
        setUploadProgress(0)

        try {
          const mimeType = file.type || 'application/octet-stream'

          // Step 1: create resumable session URL on our server
          const uploadUrl = await initUpload({
            email: selectedEmail, fileName: file.name, mimeType, fileSize: file.size,
          })

          // Step 2: upload in 5 MB chunks directly to Google Drive (no Vercel in the loop)
          const { driveFileId, fileSize } = await xhrUploadChunked(file, uploadUrl, pct => setUploadProgress(pct))

          // Step 3: save metadata to Supabase via our server
          await registerFile({ email: selectedEmail, driveFileId, fileName: file.name, mimeType, fileSize })
        } catch (err: any) {
          if (err.message !== '__cancelled__') {
            setUploadError(err.message || 'שגיאה בהעלאה')
          }
          break
        }
      }
    } finally {
      wakeLock?.release().catch(() => {})
      setUploadProgress(-1)
      setUploadFileName('')
      loadFiles()
    }
  }

  const handleCancel = () => {
    xhrRef.current?.abort()
  }

  const handleSync = async () => {
    if (!selectedEmail || !token) return
    setSyncing(true)
    try {
      await loadFiles()
    } finally {
      setSyncing(false)
    }
  }

  // ── Block navigation while uploading ─────────────────────────
  const isUploading = uploadProgress >= 0
  useEffect(() => {
    if (!isUploading) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isUploading])

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (fileId: number) => {
    const res = await fetch(`/api/media/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setFiles(prev => prev.filter(f => f.FileID !== fileId))
      showToast('הקובץ נמחק בהצלחה')
    } else {
      const json = await res.json().catch(() => ({}))
      setUploadError(json.error || 'שגיאה במחיקת הקובץ')
    }
  }

  // ── Can delete? ───────────────────────────────────────────────
  function canDeleteFile(file: MediaFile) {
    if (!currentUser) return false
    if (currentUser.Role === 'admin') return true
    if (currentUser.Role === 'coach') return true
    return file.UploadedBy === currentUser.Email
  }

  // ── Render ────────────────────────────────────────────────────
  if (!usersLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-faint">טוען...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24" dir="rtl">
      <h1 className="text-2xl font-bold text-fg mb-6">מדיה</h1>

      {/* ── Filters (only admin/coach see the dropdown) ── */}
      {isCoachOrAdmin ? (
        <div className="bg-surface rounded-xl border border-line p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted">ספורטאי</label>
              <select
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                className="border border-line rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {users.map(u => (
                  <option key={u.Email} value={u.Email}>{u.Name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line px-4 py-3 mb-6">
          <p className="text-sm text-fg-3">
            <span className="font-medium">{users[0]?.Name ?? currentUser?.Name}</span>
            <span className="text-faint mr-1"> — הקבצים שלי</span>
          </p>
        </div>
      )}

      {/* ── Upload tips card ── */}
      <div className="bg-accent/15 border border-accent rounded-xl px-4 py-3 mb-4 text-sm text-accent" dir="rtl">
        <p className="font-semibold mb-1.5"><LuVideo aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />דגשים להעלאת סרטון לניתוח:</p>
        <ul className="space-y-1 text-xs text-accent list-disc list-inside">
          <li><span className="font-medium">חיתוך הסרטון (Trim):</span> מומלץ לחתוך בגלריה את תחילת וסוף הסרטון כך שיכיל רק את הטיפוס עצמו. זה יחסוך זמן העלאה ויאפשר ניתוח מדויק יותר.</li>
          <li><span className="font-medium">מגבלת זמן:</span> המערכת מותאמת לניתוח של עד 6 דקות טיפוס נטו.</li>
          <li><span className="font-medium">הגדרות מומלצות:</span> צלמו ב-1080p (30fps). הימנעו מ-4K כדי למנוע העלאות איטיות מאוד.</li>
          <li><span className="font-medium">טיפ לכיווץ מהיר:</span> אם הסרטון גדול מדי, שלחו אותו לעצמכם בוואטסאפ ושמרו חזרה לגלריה. זה יקטין את הקובץ משמעותית וישמור על איכות מעולה.</li>
        </ul>
      </div>

      {/* ── Upload zone ── */}
      <div className="mb-6">
        {uploadProgress >= 0 ? (
          <div className="border-2 border-accent rounded-xl p-5 bg-accent/15">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-accent truncate ml-3" title={uploadFileName}>
                {uploadFileName}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {uploadFileTotal > 1 && (
                  <span className="text-xs text-accent">{uploadFileIndex} / {uploadFileTotal}</span>
                )}
                <button
                  onClick={handleCancel}
                  className="text-xs text-danger hover:text-danger/90 font-medium px-2 py-0.5 rounded border border-danger hover:border-danger/90 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
            <div className="w-full bg-accent/15 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-accent h-2.5 rounded-full transition-all duration-100"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-accent mt-1.5 text-center">
              {uploadProgress < 100 ? `מעלה לשרת... ${uploadProgress}%` : 'מעבד את הוידאו...'}
            </p>
            <p className="text-xs text-accent mt-1 text-center">השאר את המסך דלוק עד סיום ההעלאה</p>
          </div>
        ) : (
          <DropZone onFiles={handleFiles} />
        )}
        {uploadError && (
          <p className="text-danger text-sm mt-2 text-center">{uploadError}</p>
        )}
      </div>

      {/* ── Drive sync error banner ── */}
      {syncError && (
        <div className="flex items-start justify-between gap-2 bg-danger/15 border border-danger text-danger rounded-xl px-4 py-3 mb-3 text-sm">
          <span><LuTriangleAlert aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שגיאת Drive: {syncError}</span>
          <button onClick={() => setSyncError('')} className="shrink-0 text-danger hover:text-danger/90 font-bold leading-none">✕</button>
        </div>
      )}

      {/* ── Sync row ── */}
      <div className="flex justify-end mb-3">
        <button
          onClick={handleSync}
          disabled={syncing || !selectedEmail}
          className="text-xs text-muted hover:text-accent disabled:opacity-40 flex items-center gap-1.5 transition-colors"
        >
          <span className={syncing ? 'animate-spin' : ''}><LuRefreshCw aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></span>
          {syncing ? 'מסנכרן...' : 'סנכרן עם Drive'}
        </button>
      </div>

      {/* ── File gallery ── */}
      {filesLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-faint">טוען קבצים...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-10 text-center">
          <p className="text-4xl mb-3"><LuFolderOpen aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></p>
          <p className="text-muted">אין קבצים עדיין</p>
          <p className="text-faint text-sm mt-1">גרור קבצים לאזור ההעלאה למעלה</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(file => (
            <FileCard
              key={file.FileID}
              file={file}
              token={token}
              canDelete={canDeleteFile(file)}
              onDelete={handleDelete}
              uploaderName={allUsers[file.UploadedBy] ?? shortEmail(file.UploadedBy)}
              currentUser={currentUser!}
              hasAnalysis={analysedFileIds.has(file.FileID)}
            />
          ))}
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-bg text-fg text-sm px-4 py-2.5 rounded-xl shadow-lg animate-toast whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function MediaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <p className="text-faint">טוען...</p>
      </div>
    }>
      <MediaContent />
    </Suspense>
  )
}
