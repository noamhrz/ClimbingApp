// DELETE /api/media/[id]

import { NextResponse } from 'next/server'
import { getRequestUser, canAccessUserFiles, serviceSupabase } from '@/lib/api-auth'
import { deleteFileFromDrive } from '@/lib/google-drive'

export async function DELETE(
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

    // Coach must have access to the athlete
    if (user.role === 'coach') {
      const canAccess = await canAccessUserFiles(user.email, user.role, fileRecord.Email)
      if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Regular users can only delete their own uploads
    if (user.role === 'user' && fileRecord.UploadedBy !== user.email) {
      return NextResponse.json({ error: 'Forbidden — can only delete your own uploads' }, { status: 403 })
    }

    // Delete from Drive (best-effort — don't fail the whole request if Drive errors)
    try {
      await deleteFileFromDrive(fileRecord.GoogleDriveFileId)
    } catch (driveErr) {
      console.error('Drive delete failed (continuing):', driveErr)
    }

    await supabase.from('MediaFiles').delete().eq('FileID', id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
