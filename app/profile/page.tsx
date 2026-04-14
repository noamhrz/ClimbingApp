'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface ProfileData {
  Email: string
  BodyWeightKG: number
  Phone: string | null
  WhatsAppActive: boolean | null
}

export default function UserProfilePage() {
  const { currentUser, activeUser, isImpersonating } = useAuth()
  const router = useRouter()

  // Profile data
  const [bodyWeight, setBodyWeight] = useState<number>(70)
  const [phone, setPhone] = useState<string>('')
  const [whatsappActive, setWhatsappActive] = useState<boolean>(false)
  const [profileExists, setProfileExists] = useState<boolean>(false)

  // UI states
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Password states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  // Coach/admin can edit trainee's profile even while impersonating
  const canEdit = !isImpersonating || currentUser?.Role === 'coach' || currentUser?.Role === 'admin'

  // Load profile data
  useEffect(() => {
    if (activeUser?.Email) {
      loadProfile()
    }
  }, [activeUser])

  const loadProfile = async () => {
    if (!activeUser?.Email) return

    setLoadingProfile(true)
    try {
      const { data, error } = await supabase
        .from('Profiles')
        .select('*')
        .eq('Email', activeUser.Email)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setProfileExists(true)
        setBodyWeight(data.BodyWeightKG)
        setPhone(data.Phone || '')
        setWhatsappActive(data.WhatsAppActive ?? false)
      } else {
        setProfileExists(false)
        setBodyWeight(70)
        setPhone('')
        setWhatsappActive(false)
      }
    } catch (err: any) {
      console.error('Error loading profile:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  // Helper: update Profiles via service-role API route (used when impersonating to bypass RLS)
  const updateProfileViaApi = async (payload: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No auth session')

    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email: activeUser!.Email, ...payload })
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'API error')
    return json
  }

  const handleSaveProfile = async () => {
    if (!activeUser?.Email) return

    // Validation
    if (bodyWeight < 30 || bodyWeight > 200) {
      setMessage({ type: 'error', text: '⚠️ משקל גוף חייב להיות בין 30 ל-200 ק"ג' })
      return
    }

    setLoading(true)
    setMessage(null)

    const cleanPhone = phone.replace(/[^\d+\s-]/g, '').trim() || null

    try {
      if (isImpersonating) {
        // Bypass RLS via admin API route
        await updateProfileViaApi({
          bodyWeight,
          phone: cleanPhone,
          whatsAppActive: whatsappActive
        })
      } else if (profileExists) {
        const { error } = await supabase
          .from('Profiles')
          .update({
            BodyWeightKG: bodyWeight,
            Phone: cleanPhone,
            WhatsAppActive: whatsappActive,
            UpdatedAt: new Date().toISOString()
          })
          .eq('Email', activeUser.Email)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('Profiles')
          .insert({
            Email: activeUser.Email,
            BodyWeightKG: bodyWeight,
            Phone: cleanPhone,
            WhatsAppActive: whatsappActive
          })
        if (error) throw error
        setProfileExists(true)
      }

      setMessage({ type: 'success', text: '✅ הפרופיל נשמר בהצלחה!' })
      setIsEditingProfile(false)

      setTimeout(() => setMessage(null), 3000)

    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ שגיאה: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWhatsApp = async () => {
    if (!activeUser?.Email) return
    const newValue = !whatsappActive
    setSavingWhatsapp(true)
    try {
      if (isImpersonating) {
        // Bypass RLS via admin API route
        await updateProfileViaApi({ whatsAppActive: newValue })
      } else if (profileExists) {
        const { error } = await supabase
          .from('Profiles')
          .update({ WhatsAppActive: newValue })
          .eq('Email', activeUser.Email)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('Profiles')
          .insert({
            Email: activeUser.Email,
            BodyWeightKG: bodyWeight,
            WhatsAppActive: newValue
          })
        if (error) throw error
        setProfileExists(true)
      }
      setWhatsappActive(newValue)
    } catch (err: any) {
      setMessage({ type: 'error', text: `❌ שגיאה: ${err.message}` })
    } finally {
      setSavingWhatsapp(false)
    }
  }

  const handleDirectPasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: '⚠️ אנא מלא את כל השדות' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '⚠️ הסיסמה חייבת להיות לפחות 6 תווים' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '⚠️ הסיסמאות אינן תואמות' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: '✅ הסיסמה עודכנה בהצלחה!'
      })

      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)

      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ שגיאה: ${error.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl text-gray-600">אנא התחבר</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            התחבר
          </button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-blue-600">👤 הפרופיל שלי</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {activeUser?.Name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{activeUser?.Name}</h2>
              <p className="text-gray-500">{activeUser?.Email}</p>
            </div>
          </div>

          {/* Info Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📧</span>
                <div>
                  <p className="text-sm text-gray-500">אימייל</p>
                  <p className="font-medium text-gray-800">{activeUser?.Email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-sm text-gray-500">שם מלא</p>
                  <p className="font-medium text-gray-800">{activeUser?.Name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎭</span>
                <div>
                  <p className="text-sm text-gray-500">תפקיד</p>
                  <p className="font-medium text-gray-800">
                    {activeUser?.Role === 'admin' ? '👑 מנהל' :
                     activeUser?.Role === 'coach' ? '🏋️ מאמן' :
                     '🧗 מטפס'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body Weight & Phone Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              <h3 className="text-xl font-bold text-gray-800">נתוני מתאמן</h3>
            </div>
            {!isEditingProfile && canEdit && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                ✏️ ערוך
              </button>
            )}
          </div>

          {loadingProfile ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">⏳</div>
              <p className="text-gray-600">טוען נתונים...</p>
            </div>
          ) : !isEditingProfile ? (
            <div className="space-y-4">
              {/* Body Weight */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚖️</span>
                  <div>
                    <p className="text-sm text-gray-500">משקל גוף</p>
                    <p className="font-bold text-2xl text-indigo-600">{bodyWeight} ק"ג</p>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="text-sm text-gray-500">טלפון</p>
                    <p className="font-medium text-gray-800">
                      {phone || <span className="text-gray-400">לא הוזן</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Toggle */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <p className="text-sm text-gray-500">תזכורות WhatsApp</p>
                    <p className={`font-medium text-sm ${whatsappActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {whatsappActive ? 'פעיל' : 'כבוי'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleWhatsApp}
                  disabled={savingWhatsapp}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    whatsappActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle WhatsApp reminders"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      whatsappActive ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 למה צריך משקל גוף?</strong><br/>
                  משקל הגוף משמש לחישוב מדויק של סטטיסטיקות תרגילים שכוללים משקל גוף
                  (כמו מתחים, שכיבות סמיכה וכו').
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Body Weight Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⚖️ משקל גוף (ק"ג) *
                </label>
                <input
                  type="number"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(parseFloat(e.target.value))}
                  min="30"
                  max="200"
                  step="0.5"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                  placeholder="70"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">בין 30 ל-200 ק"ג</p>
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📱 טלפון (אופציונלי)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                  placeholder="050-1234567"
                  dir="ltr"
                  disabled={loading}
                />
              </div>

              {/* WhatsApp Toggle in edit mode */}
              <div className="flex items-center justify-between py-3 border rounded-lg px-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <p className="font-medium text-gray-700">תזכורות WhatsApp</p>
                    <p className={`text-sm ${whatsappActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {whatsappActive ? 'פעיל' : 'כבוי'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWhatsappActive(v => !v)}
                  type="button"
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    whatsappActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      whatsappActive ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? '💾 שומר...' : '💾 שמור נתונים'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false)
                    loadProfile()
                    setMessage(null)
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Card - only shown when viewing own profile */}
        {!isImpersonating && <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔐</span>
            <h3 className="text-xl font-bold text-gray-800">שינוי סיסמה</h3>
          </div>

          {!showPasswordForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-800">סיסמה</p>
                  <p className="text-sm text-gray-500">••••••••</p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 שנה סיסמה
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>💡 טיפ:</strong> לחיצה על "שנה סיסמה" תאפשר לך להזין סיסמה חדשה ישירות
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סיסמה חדשה
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  אישור סיסמה
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="הזן שוב את הסיסמה"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              {newPassword && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">חוזק סיסמה:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span>{newPassword.length >= 6 ? '✅' : '⭕'}</span>
                      <span className="text-xs text-gray-600">לפחות 6 תווים</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{newPassword === confirmPassword && confirmPassword ? '✅' : '⭕'}</span>
                      <span className="text-xs text-gray-600">הסיסמאות תואמות</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleDirectPasswordReset}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '⏳ שומר...' : '💾 שמור סיסמה'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                    setMessage(null)
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>}

        {/* Logout Button */}
        <div className="mt-6">
          <button
            onClick={() => {
              supabase.auth.signOut()
              router.push('/')
            }}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            🚪 התנתק
          </button>
        </div>
      </div>
    </div>
  )
}
