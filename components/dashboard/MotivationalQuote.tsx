// components/dashboard/MotivationalQuote.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Quote {
  QuoteID: number
  Author: string
  Quote_EN: string
  Quote_HE: string
  Category: string
}

export default function MotivationalQuote() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRandomQuote()
  }, [])

  const loadRandomQuote = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('QuotesFromClimbers')
        .select('*')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length)
        setQuote(data[randomIndex])
      }
    } catch (error) {
      console.error('Error loading quote:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !quote) {
    return (
      <div className="text-fg rounded-xl p-8 text-center bg-surface border border-line">
        <div className="text-5xl mb-4">💪</div>
        <div className="text-xl">טוען ציטוט...</div>
      </div>
    )
  }

  return (
    <div className="text-fg rounded-xl p-8 text-center bg-surface border border-line">
      {/* אייקון */}
      <div className="text-5xl mb-4">💪</div>
      
      {/* הציטוט בעברית */}
      <blockquote className="text-2xl font-bold mb-2">
        "{quote.Quote_HE}"
      </blockquote>
      
      {/* המחבר */}
      <p className="text-fg-2 text-lg mb-1">
        - {quote.Author}
      </p>
      
      {/* הציטוט באנגלית (קטן יותר) */}
      <p className="text-fg-2 text-sm italic mb-4">
        "{quote.Quote_EN}"
      </p>
      
      {/* קטגוריה */}
      {quote.Category && (
        <span className="inline-block bg-accent/30 px-3 py-1 rounded-full text-xs mb-4">
          {quote.Category}
        </span>
      )}
      
      {/* כפתור לציטוט חדש */}
      <button 
        onClick={loadRandomQuote}
        className="mt-4 px-6 py-2 bg-raised border border-line-strong hover:bg-line-strong rounded-lg 
                   text-white font-medium transition-all hover:scale-105"
      >
        🔄 ציטוט אחר
      </button>
    </div>
  )
}