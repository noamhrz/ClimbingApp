// POST /api/media/register
// Saves file metadata to Supabase after the browser has uploaded directly to Drive.

import { NextResponse } from 'next/server'
import { getRequestUser, serviceSupabase } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, driveFileId, fileName, mimeType, fileSize } = await request.json()

    if (!email || !driveFileId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields: email, driveFileId, fileName' }, { status: 400 })
    }

    const supabase = serviceSupabase()
    const { data, error } = await supabase
      .from('MediaFiles')
      .insert({
        Email: email,
        GoogleDriveFileId: driveFileId,
        FileName: fileName,
        MimeType: mimeType || 'application/octet-stream',
        FileSize: fileSize ?? null,
        UploadedBy: user.email,
      })
      .select()
      .single()

    if (error) {
      console.error('[register] DB error:', error)
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, file: data })
  } catch (err: any) {
    console.error('[register] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
