import { supabase } from './supabaseClient'

export interface MediaComment {
  CommentID: number
  FileID: number
  AuthorEmail: string
  AuthorName: string
  Content: string
  CreatedAt: string
}

export async function getMediaComments(fileId: number): Promise<MediaComment[]> {
  const { data } = await supabase
    .from('MediaComments')
    .select('*')
    .eq('FileID', fileId)
    .order('CreatedAt', { ascending: true })
  return data ?? []
}

export async function addMediaComment(
  fileId: number,
  authorEmail: string,
  authorName: string,
  content: string
): Promise<MediaComment | null> {
  const { data } = await supabase
    .from('MediaComments')
    .insert({ FileID: fileId, AuthorEmail: authorEmail, AuthorName: authorName, Content: content })
    .select()
    .single()
  return data
}

export async function deleteMediaComment(commentId: number): Promise<void> {
  await supabase.from('MediaComments').delete().eq('CommentID', commentId)
}
