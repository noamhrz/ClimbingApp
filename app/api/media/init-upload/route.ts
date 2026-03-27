// POST /api/media/init-upload
// Creates a Google Drive resumable upload session and returns the upload URL.
// The browser then PUTs the file directly to that URL — no Vercel size limits.

import { NextResponse } from 'next/server'
import { getRequestUser, canAccessUserFiles } from '@/lib/api-auth'
import { getOrCreateUserFolder, createResumableUploadSession } from '@/lib/google-drive'

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, fileName, mimeType, fileSize } = await request.json()

    if (!email || !fileName || !mimeType || fileSize == null) {
      return NextResponse.json({ error: 'Missing required fields: email, fileName, mimeType, fileSize' }, { status: 400 })
    }

    const canAccess = await canAccessUserFiles(user.email, user.role, email)
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const origin = request.headers.get('origin') ?? ''
    const folderId = await getOrCreateUserFolder(email)
    const uploadUrl = await createResumableUploadSession(folderId, fileName, mimeType, fileSize, origin)

    return NextResponse.json({ uploadUrl })
  } catch (err: any) {
    console.error('[init-upload] error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create upload session' }, { status: 500 })
  }
}
