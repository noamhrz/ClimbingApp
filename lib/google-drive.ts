// lib/google-drive.ts
// Server-only — imported exclusively by API routes

import { google } from 'googleapis'

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!

function getDriveAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getDriveAuth() })
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function getOrCreateUserFolder(email: string): Promise<string> {
  const drive = getDriveClient()
  const folderName = email.toLowerCase()

  const { data } = await drive.files.list({
    q: `name='${folderName}' and '${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  if (data.files && data.files.length > 0) {
    return data.files[0].id!
  }

  const { data: folder } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [ROOT_FOLDER_ID],
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  return folder.id!
}

// ── Resumable upload session (browser uploads directly to Drive) ──────────────

/**
 * Creates a resumable upload session on Google Drive using the service account.
 * Returns the upload URL — the browser PUT this URL directly with the file,
 * bypassing Vercel entirely. On 200/201 the response body contains the file
 * metadata (id, name, size) as requested via `fields`.
 */
export async function createResumableUploadSession(
  folderId: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  origin = ''
): Promise<string> {
  const auth = getDriveAuth()
  const { token } = await auth.getAccessToken()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Upload-Content-Type': mimeType,
    'X-Upload-Content-Length': String(fileSize),
  }
  if (origin) headers['Origin'] = origin

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: fileName, parents: [folderId] }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Drive resumable session failed: ${response.status} ${text}`)
  }

  const uploadUrl = response.headers.get('Location')
  if (!uploadUrl) throw new Error('Drive did not return a Location header')

  return uploadUrl
}

// ── List files in a folder ────────────────────────────────────────────────────

export async function listFilesInFolder(folderId: string): Promise<{
  id: string
  name: string
  mimeType: string
  size: number | null
}[]> {
  const drive = getDriveClient()
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
    fields: 'files(id,name,mimeType,size)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 1000,
  })
  return (data.files ?? []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    size: f.size ? Number(f.size) : null,
  }))
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId, supportsAllDrives: true })
}

// ── Stream (with range request support for video seeking) ─────────────────────

export async function fetchDriveFile(
  fileId: string,
  rangeHeader?: string
): Promise<Response> {
  const auth = getDriveAuth()
  const { token } = await auth.getAccessToken()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (rangeHeader) headers['Range'] = rangeHeader

  return fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers }
  )
}
