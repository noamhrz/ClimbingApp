'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import MediaComments from '@/components/media/MediaComments'

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
      {/* Preview */}
      <div className="bg-gray-100 relative rounded-t-xl overflow-hidden" style={{ minHeight: '160px' }}>
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
          <div className="flex items-center justify-center h-40 text-4xl text-gray-400">
            📄
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate" title={file.FileName}>
          {file.FileName}
        </p>
        <p className="text-xs text-gray-400">
          הועלה על ידי {uploaderName}
        </p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-gray-400 truncate">
              {formatDate(file.CreatedAt)}{file.FileSize ? ` · ${formatBytes(file.FileSize)}` : ''}
            </span>
            {isVideo(file.MimeType) && hasAnalysis && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
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
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    : 'text-blue-500 hover:text-blue-700'
                }`}
                title={hasAnalysis ? 'צפה בניתוח' : 'נתח סרטון'}
              >
                {hasAnalysis ? 'צפה בניתוח' : '📊 נתח'}
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors p-1"
                title="מחק"
              >
                🗑️
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
        dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
      }`}
    >
      <p className="text-3xl mb-2">📁</p>
      <p className="text-sm font-medium text-gray-700">גרור קובץ לכאן או לחץ לבחירה</p>
      <p className="text-xs text-gray-400 mt-1">וידאו, תמונות, מסמכים</p>
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

  // ── Load users & set URL default ─────────────────────────────
  useEffect(() => {
    if (!currentUser) return

    async function loadUsers() {
      let list: { Email: string; Name: string }[] = []

      if (currentUser!.Role === 'admin') {
        const { data } = await supabase.from('Users').select('Email, Name').order('Name')
        list = data ?? []
      } else if (currentUser!.Role === 'coach') {
        const { data } = await supabase
          .from('CoachTraineesActiveView')
          .select('TraineeEmail, TraineeName')
          .eq('CoachEmail', currentUser!.Email)
        list = (data ?? []).map(t => ({ Email: t.TraineeEmail, Name: t.TraineeName }))
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
    await fetch(`/api/media/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setFiles(prev => prev.filter(f => f.FileID !== fileId))
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
        <p className="text-gray-400">טוען...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">מדיה</h1>

      {/* ── Filters (only admin/coach see the dropdown) ── */}
      {isCoachOrAdmin ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500">ספורטאי</label>
              <select
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map(u => (
                  <option key={u.Email} value={u.Email}>{u.Name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{users[0]?.Name ?? currentUser?.Name}</span>
            <span className="text-gray-400 mr-1"> — הקבצים שלי</span>
          </p>
        </div>
      )}

      {/* ── Upload tips card (coach/admin only) ── */}
      {isCoachOrAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-900" dir="rtl">
          <p className="font-semibold mb-1.5">🎥 דגשים להעלאת סרטון לניתוח:</p>
          <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
            <li><span className="font-medium">חיתוך הסרטון (Trim):</span> מומלץ לחתוך בגלריה את תחילת וסוף הסרטון כך שיכיל רק את הטיפוס עצמו. זה יחסוך זמן העלאה ויאפשר ניתוח מדויק יותר.</li>
            <li><span className="font-medium">מגבלת זמן:</span> המערכת מותאמת לניתוח של עד 6 דקות טיפוס נטו.</li>
            <li><span className="font-medium">הגדרות מומלצות:</span> צלמו ב-1080p (30fps). הימנעו מ-4K כדי למנוע העלאות איטיות מאוד.</li>
            <li><span className="font-medium">טיפ לכיווץ מהיר:</span> אם הסרטון גדול מדי, שלחו אותו לעצמכם בוואטסאפ ושמרו חזרה לגלריה. זה יקטין את הקובץ משמעותית וישמור על איכות מעולה.</li>
          </ul>
        </div>
      )}

      {/* ── Upload zone (coach/admin only) ── */}
      {isCoachOrAdmin && (
        <div className="mb-6">
          {uploadProgress >= 0 ? (
            <div className="border-2 border-blue-300 rounded-xl p-5 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-800 truncate ml-3" title={uploadFileName}>
                  {uploadFileName}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {uploadFileTotal > 1 && (
                    <span className="text-xs text-blue-500">{uploadFileIndex} / {uploadFileTotal}</span>
                  )}
                  <button
                    onClick={handleCancel}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-0.5 rounded border border-red-300 hover:border-red-500 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-100"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-500 mt-1.5 text-center">
                {uploadProgress < 100 ? `מעלה לשרת... ${uploadProgress}%` : 'מעבד את הוידאו...'}
              </p>
              <p className="text-xs text-blue-400 mt-1 text-center">השאר את המסך דלוק עד סיום ההעלאה</p>
            </div>
          ) : (
            <DropZone onFiles={handleFiles} />
          )}
          {uploadError && (
            <p className="text-red-500 text-sm mt-2 text-center">{uploadError}</p>
          )}
        </div>
      )}

      {/* ── Drive sync error banner ── */}
      {syncError && (
        <div className="flex items-start justify-between gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-3 text-sm">
          <span>⚠️ שגיאת Drive: {syncError}</span>
          <button onClick={() => setSyncError('')} className="shrink-0 text-red-400 hover:text-red-600 font-bold leading-none">✕</button>
        </div>
      )}

      {/* ── Sync row ── */}
      <div className="flex justify-end mb-3">
        <button
          onClick={handleSync}
          disabled={syncing || !selectedEmail}
          className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
        >
          <span className={syncing ? 'animate-spin' : ''}>🔄</span>
          {syncing ? 'מסנכרן...' : 'סנכרן עם Drive'}
        </button>
      </div>

      {/* ── File gallery ── */}
      {filesLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400">טוען קבצים...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-gray-500">אין קבצים עדיין</p>
          {isCoachOrAdmin && (
            <p className="text-gray-400 text-sm mt-1">גרור קבצים לאזור ההעלאה למעלה</p>
          )}
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
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function MediaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <p className="text-gray-400">טוען...</p>
      </div>
    }>
      <MediaContent />
    </Suspense>
  )
}
