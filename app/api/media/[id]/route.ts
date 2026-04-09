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

    // Delete from Drive first. Only proceed to DB delete if Drive confirms success.
    // A Drive failure here means the file would survive in Drive and get re-synced
    // back into Supabase on the next loadFiles call.
    try {
      await deleteFileFromDrive(fileRecord.GoogleDriveFileId)
    } catch (driveErr: any) {
      // Normalise the HTTP status from googleapis GaxiosError
      const httpStatus: number = driveErr?.status ?? driveErr?.response?.status ?? driveErr?.code ?? 0
      // 404 means Drive already doesn't have it — safe to remove the DB record
      if (httpStatus === 404) {
        console.warn('[delete] Drive file not found (already deleted), removing DB record only')
      } else {
        console.error('[delete] Drive delete failed:', {
          httpStatus,
          message: driveErr?.message,
          errors: driveErr?.errors ?? driveErr?.response?.data,
          driveFileId: fileRecord.GoogleDriveFileId,
        })
        return NextResponse.json(
          { error: `Drive error ${httpStatus}: ${driveErr?.message ?? 'unknown'}` },
          { status: 500 }
        )
      }
    }

    const { error: dbErr } = await supabase.from('MediaFiles').delete().eq('FileID', id)
    if (dbErr) {
      console.error('Supabase delete failed:', dbErr)
      return NextResponse.json({ error: 'שגיאה במחיקה מהמסד — נסה שוב' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
