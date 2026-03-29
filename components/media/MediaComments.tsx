'use client'

import { useState, useEffect, useRef } from 'react'
import { getMediaComments, addMediaComment, deleteMediaComment, MediaComment } from '@/lib/media-comments-api'

interface Props {
  fileId: number
  currentUser: { Email: string; Name: string; Role: string }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function getCommentStyle(comment: MediaComment, currentUser: Props['currentUser']) {
  const isOwn = comment.AuthorEmail === currentUser.Email
  const myRoleIsCoach = currentUser.Role === 'coach' || currentUser.Role === 'admin'

  if (isOwn) {
    return myRoleIsCoach
      ? { align: 'items-end', bubble: 'bg-blue-100 border border-blue-200', name: 'text-blue-600' }
      : { align: 'items-end', bubble: 'bg-green-100 border border-green-200', name: 'text-green-700' }
  }
  // Assume other side has the opposite role
  return myRoleIsCoach
    ? { align: 'items-start', bubble: 'bg-gray-50 border border-gray-200', name: 'text-gray-500' }
    : { align: 'items-start', bubble: 'bg-purple-50 border border-purple-200', name: 'text-purple-600' }
}

export default function MediaComments({ fileId, currentUser }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<MediaComment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newText, setNewText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded || loaded) return
    setLoading(true)
    getMediaComments(fileId).then(data => {
      setComments(data)
      setLoaded(true)
      setLoading(false)
    })
  }, [expanded, loaded, fileId])

  useEffect(() => {
    if (expanded && loaded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments, expanded, loaded])

  async function handleSend() {
    const text = newText.trim()
    if (!text || sending) return
    setSending(true)
    const comment = await addMediaComment(fileId, currentUser.Email, currentUser.Name, text)
    if (comment) {
      setComments(prev => [...prev, comment])
      setNewText('')
    }
    setSending(false)
  }

  async function handleDelete(commentId: number) {
    await deleteMediaComment(commentId)
    setComments(prev => prev.filter(c => c.CommentID !== commentId))
  }

  const count = loaded ? comments.length : null

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-right px-3 py-2 text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1.5"
      >
        <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
        <span>תגובות{count !== null && count > 0 ? ` (${count})` : ''}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-4">טוען...</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto mb-2 pr-1">
              {comments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">אין תגובות עדיין</p>
              )}
              {comments.map(c => {
                const style = getCommentStyle(c, currentUser)
                const isOwn = c.AuthorEmail === currentUser.Email
                return (
                  <div key={c.CommentID} className={`flex flex-col ${style.align}`}>
                    <div className={`rounded-xl px-3 py-2 max-w-[85%] relative group ${style.bubble}`}>
                      <p className={`text-[11px] font-semibold mb-0.5 ${style.name}`}>{c.AuthorName}</p>
                      <p className="text-sm leading-snug text-gray-800">{c.Content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTime(c.CreatedAt)}</p>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(c.CommentID)}
                          className="absolute -top-1.5 -left-1.5 hidden group-hover:flex w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 items-center justify-center text-[10px] border border-red-200"
                          title="מחק"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="הוסף תגובה..."
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!newText.trim() || sending}
              className="text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              שלח
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
