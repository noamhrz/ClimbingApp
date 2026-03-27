// POST /api/media/sync
// Reconciles Drive files with Supabase MediaFiles for a given email:
//   - Files in Drive but not in Supabase → inserted
//   - Files in Supabase but no longer in Drive → deleted

import { NextResponse } from 'next/server'
import { getRequestUser, canAccessUserFiles, serviceSupabase } from '@/lib/api-auth'
import { getOrCreateUserFolder, listFilesInFolder } from '@/lib/google-drive'

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

    const canAccess = await canAccessUserFiles(user.email, user.role, email)
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = serviceSupabase()

    // 1. Get Drive files
    const folderId = await getOrCreateUserFolder(email)
    const driveFiles = await listFilesInFolder(folderId)
    const driveIds = new Set(driveFiles.map(f => f.id))

    // 2. Get Supabase records
    const { data: dbFiles } = await supabase
      .from('MediaFiles')
      .select('FileID, GoogleDriveFileId')
      .eq('Email', email)
    const dbFiles_ = dbFiles ?? []
    const dbIds = new Set(dbFiles_.map(f => f.GoogleDriveFileId))

    // 3. Insert files that are in Drive but not in Supabase
    const toInsert = driveFiles.filter(f => !dbIds.has(f.id))
    let inserted = 0
    if (toInsert.length > 0) {
      const { error } = await supabase.from('MediaFiles').insert(
        toInsert.map(f => ({
          Email: email,
          GoogleDriveFileId: f.id,
          FileName: f.name,
          MimeType: f.mimeType,
          FileSize: f.size,
          UploadedBy: user.email,
        }))
      )
      if (!error) inserted = toInsert.length
    }

    // 4. Delete records whose Drive file no longer exists
    const toDelete = dbFiles_.filter(f => !driveIds.has(f.GoogleDriveFileId))
    let deleted = 0
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('MediaFiles')
        .delete()
        .in('FileID', toDelete.map(f => f.FileID))
      if (!error) deleted = toDelete.length
    }

    return NextResponse.json({ inserted, deleted })
  } catch (err: any) {
    console.error('[sync] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
