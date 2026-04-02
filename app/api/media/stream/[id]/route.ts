// GET /api/media/stream/[id]?token=<supabase_jwt>
// Proxies the file from Google Drive with range-request support (for video seeking).
// Token can be passed as ?token= query param so <video src> works without custom headers.

import { NextResponse } from 'next/server'
import { getRequestUser, canAccessUserFiles, serviceSupabase } from '@/lib/api-auth'
import { fetchDriveFile } from '@/lib/google-drive'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = serviceSupabase()

    const { data: fileRecord, error: fetchError } = await supabase
      .from('MediaFiles')
      .select('*')
      .eq('FileID', id)
      .single()

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const canAccess = await canAccessUserFiles(user.email, user.role, fileRecord.Email)
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Forward range header so video seeking works
    const rangeHeader = request.headers.get('range') ?? undefined
    const driveResponse = await fetchDriveFile(fileRecord.GoogleDriveFileId, rangeHeader)

    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', fileRecord.MimeType || 'application/octet-stream')
    responseHeaders.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileRecord.FileName)}"`)
    responseHeaders.set('Cache-Control', 'private, max-age=3600')
    responseHeaders.set('Accept-Ranges', 'bytes')

    // Forward range-response headers from Drive
    const contentRange = driveResponse.headers.get('content-range')
    const contentLength = driveResponse.headers.get('content-length')
    if (contentRange) responseHeaders.set('Content-Range', contentRange)
    if (contentLength) responseHeaders.set('Content-Length', contentLength)

    return new Response(driveResponse.body, {
      status: driveResponse.status, // 200 or 206 (partial content)
      headers: responseHeaders,
    })
  } catch (err: any) {
    console.error('[stream] error:', {
      message: err.message,
      code: err.code,
      status: err.status,
    })
    // Surface Drive 403 as 403 (not 500) so the client can distinguish auth errors
    const status = err.message?.includes('Drive returned 403') ? 403 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}
