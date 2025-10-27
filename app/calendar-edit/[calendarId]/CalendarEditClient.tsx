'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import dayjs from 'dayjs'

export default function CalendarEditClient() {
  const params = useParams()
  const router = useRouter()
  const calendarId = Number(params?.calendarId)

  const [calendarRow, setCalendarRow] = useState<any>(null)
  const [workout, setWorkout] = useState<any>(null)
  const [exerciseForms, setExerciseForms] = useState<any[]>([])
  const [climbRoutes, setClimbRoutes] = useState<any[]>([])
  const [leadGrades, setLeadGrades] = useState<any[]>([])
  const [boulderGrades, setBoulderGrades] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [boards, setBoards] = useState<any[]>([])
  const [climberNotes, setClimberNotes] = useState('')
  const [loading, setLoading] = useState(true)

  // 🟦 טעינת נתונים
  useEffect(() => {
    const load = async () => {
      if (!calendarId) return
      setLoading(true)
      try {
        const { data: cal } = await supabase
          .from('Calendar')
          .select('*')
          .eq('CalendarID', calendarId)
          .maybeSingle()
        if (!cal) throw new Error('Calendar not found')
        setCalendarRow(cal)
        setClimberNotes(cal.ClimberNotes || '')

        const { data: w } = await supabase
          .from('Workouts')
          .select('*')
          .eq('WorkoutID', cal.WorkoutID)
          .maybeSingle()
        setWorkout(w)

        const { data: rels } = await supabase
          .from('WorkoutsExercises')
          .select('ExerciseID')
          .eq('WorkoutID', cal.WorkoutID)
        const ids = rels?.map((r) => r.ExerciseID) || []

        const { data: exs } = await supabase
          .from('Exercises')
          .select('ExerciseID, Name, Description')
          .in('ExerciseID', ids)

        const { data: logs } = await supabase
          .from('ExerciseLogs')
          .select('*')
          .eq('CalendarID', calendarId)

        const mappedExercises =
          exs?.map((ex) => {
            const log = logs?.find((l) => l.ExerciseID === ex.ExerciseID)
            return {
              ExerciseLogID: log?.ExerciseLogID || null,
              ExerciseID: ex.ExerciseID,
              Name: ex.Name,
              Description: ex.Description,
              RepsDone: log?.RepsDone ?? '',
              WeightKG: log?.WeightKG ?? '',
              RPE: log?.RPE ?? '',
              Notes: log?.Notes ?? '',
            }
          }) || []
        setExerciseForms(mappedExercises)

        const { data: climbLogs } = await supabase
          .from('ClimbingLog')
          .select('*')
          .eq('CalendarID', calendarId)
        setClimbRoutes(climbLogs || [])

        const [lg, bg, loc, bd] = await Promise.all([
          supabase.from('LeadGrades').select('*').order('LeadGradeID'),
          supabase.from('BoulderGrades').select('*').order('BoulderGradeID'),
          supabase
            .from('ClimbingLocations')
            .select('*')
            .order('LocationName'),
          supabase.from('BoardTypes').select('*').order('BoardID'),
        ])
        setLeadGrades(lg.data || [])
        setBoulderGrades(bg.data || [])
        setLocations(loc.data || [])
        setBoards(bd.data || [])
      } catch (err) {
        console.error('❌ Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [calendarId])

  const handleExerciseChange = (i: number, field: string, val: any) =>
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i][field] = val
      return next
    })

  const handleClimbChange = (i: number, field: string, val: any) =>
    setClimbRoutes((prev) => {
      const next = [...prev]
      next[i][field] = val
      return next
    })

  // ➕ הוספת טיפוס חדש
  const handleAddClimb = () => {
    setClimbRoutes((prev) => [
      ...prev,
      {
        ClimbType: '',
        LocationID: null,
        BoardTypeID: null,
        RouteName: '',
        GradeID: null,
        Attempts: null,
        Successful: false,
        Notes: '',
      },
    ])
  }

  // 🗑️ מחיקת טיפוס קיים
  const handleDeleteClimb = async (index: number) => {
    const target = climbRoutes[index]
    if (target?.ClimbingLogID) {
      const confirmDel = confirm('למחוק את הרישום הזה לצמיתות?')
      if (!confirmDel) return
      const { error } = await supabase
        .from('ClimbingLog')
        .delete()
        .eq('ClimbingLogID', target.ClimbingLogID)
      if (error) {
        alert('שגיאה במחיקה')
        console.error(error)
        return
      }
    }
    setClimbRoutes((prev) => prev.filter((_, i) => i !== index))
  }

  // 🟨 שמירה בטוחה ללא עומס
  const handleSave = async () => {
    try {
      const now = new Date().toISOString()
      const email = calendarRow?.Email
      if (!email) throw new Error('Missing Email in Calendar record')

      for (const ex of exerciseForms) {
        const hasData =
          (ex.RepsDone && ex.RepsDone !== '') ||
          (ex.WeightKG && ex.WeightKG !== '') ||
          (ex.RPE && ex.RPE !== '') ||
          (ex.Notes && ex.Notes.trim() !== '')
        if (!hasData) continue

        const payload = {
          CalendarID: calendarId,
          WorkoutID: workout?.WorkoutID,
          ExerciseID: ex.ExerciseID,
          Email: email,
          RepsDone: ex.RepsDone || null,
          WeightKG: ex.WeightKG || null,
          RPE: ex.RPE || null,
          Notes: ex.Notes?.trim() || null,
          Completed: true,
          UpdatedAt: now,
        }
        await supabase
          .from('ExerciseLogs')
          .upsert(payload, { onConflict: 'ExerciseLogID' })
        await new Promise((r) => setTimeout(r, 100))
      }

      for (const c of climbRoutes) {
        const hasData =
          (c.RouteName && c.RouteName.trim() !== '') ||
          c.Attempts ||
          c.Successful ||
          (c.Notes && c.Notes.trim() !== '')
        if (!hasData) continue

        const payload: any = {
          CalendarID: calendarId,
          WorkoutID: workout?.WorkoutID,
          Email: email,
          ClimbType: c.ClimbType || null,
          LocationID: c.LocationID || null,
          BoardTypeID: c.BoardTypeID || null,
          RouteName: c.RouteName || null,
          GradeID: c.GradeID || null,
          Attempts: c.Attempts || null,
          Successful: !!c.Successful,
          Notes: c.Notes?.trim() || null,
          UpdatedAt: now,
        }
        if (c.ClimbingLogID) payload.ClimbingLogID = c.ClimbingLogID

        await supabase
          .from('ClimbingLog')
          .upsert(payload, { onConflict: 'ClimbingLogID' })
        await new Promise((r) => setTimeout(r, 100))
      }

      await supabase
        .from('Calendar')
        .update({ ClimberNotes: climberNotes, UpdatedAt: now })
        .eq('CalendarID', calendarId)

      alert('✅ הנתונים נשמרו בהצלחה!')
      router.push('/calendar')
    } catch (err) {
      console.error('❌ Error saving data:', err)
      alert('שגיאה בשמירה — ראה Console')
    }
  }

  if (loading) return <p className="p-6">⌛ טוען נתונים...</p>
  if (!calendarRow) return <p className="p-6">⚠️ לא נמצא אימון לעריכה</p>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">
        עריכת אימון — {workout?.Name || ''}
      </h1>

      <p className="text-gray-600 mb-6">
        תאריך: {dayjs(calendarRow.StartTime).format('DD/MM/YYYY HH:mm')}
      </p>

      {/* 🏋️ תרגילים */}
      {exerciseForms.length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold mb-3">תרגילים</h2>
          {exerciseForms.map((ex, i) => (
            <div key={i} className="border p-3 rounded mb-4 bg-white shadow-sm">
              <div className="font-medium">{ex.Name}</div>
              <div className="text-sm text-gray-500 mb-2">
                {ex.Description}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  className="border p-2 rounded"
                  placeholder="חזרות"
                  value={ex.RepsDone}
                  onChange={(e) =>
                    handleExerciseChange(i, 'RepsDone', e.target.value)
                  }
                />
                <input
                  className="border p-2 rounded"
                  placeholder="משקל (ק״ג)"
                  value={ex.WeightKG}
                  onChange={(e) =>
                    handleExerciseChange(i, 'WeightKG', e.target.value)
                  }
                />
                <input
                  className="border p-2 rounded"
                  placeholder="RPE"
                  value={ex.RPE}
                  onChange={(e) =>
                    handleExerciseChange(i, 'RPE', e.target.value)
                  }
                />
              </div>

              <textarea
                className="border p-2 rounded w-full text-sm mt-3"
                placeholder="הערות"
                value={ex.Notes}
                onChange={(e) =>
                  handleExerciseChange(i, 'Notes', e.target.value)
                }
              />
            </div>
          ))}
        </section>
      )}

      {/* 🧗 טיפוס */}
      <section className="mb-10">
        <h2 className="font-semibold mb-3">רישומי טיפוס</h2>
        {climbRoutes.map((r, i) => (
          <div key={i} className="border p-3 rounded mb-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">מסלול {i + 1}</h3>
              <button
                onClick={() => handleDeleteClimb(i)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                🗑 מחיקה
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <select
                className="border p-2 rounded"
                value={r.ClimbType || ''}
                onChange={(e) =>
                  handleClimbChange(i, 'ClimbType', e.target.value)
                }
              >
                <option value="">סוג טיפוס</option>
                <option value="Lead">Lead</option>
                <option value="Boulder">Boulder</option>
                <option value="Board">Board</option>
              </select>

              <select
                className="border p-2 rounded"
                value={r.LocationID || ''}
                onChange={(e) =>
                  handleClimbChange(i, 'LocationID', Number(e.target.value))
                }
              >
                <option value="">בחר מיקום</option>
                {locations.map((loc) => (
                  <option key={loc.LocationID} value={loc.LocationID}>
                    {loc.LocationName} ({loc.LocationType})
                  </option>
                ))}
              </select>

              {r.ClimbType === 'Board' && (
                <select
                  className="border p-2 rounded"
                  value={r.BoardTypeID || ''}
                  onChange={(e) =>
                    handleClimbChange(
                      i,
                      'BoardTypeID',
                      Number(e.target.value)
                    )
                  }
                >
                  <option value="">סוג בורד</option>
                  {boards.map((b) => (
                    <option key={b.BoardID} value={b.BoardID}>
                      {b.BoardName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <input
                className="border p-2 rounded"
                placeholder="שם מסלול"
                value={r.RouteName || ''}
                onChange={(e) =>
                  handleClimbChange(i, 'RouteName', e.target.value)
                }
              />

              {r.ClimbType === 'Lead' && (
                <select
                  className="border p-2 rounded"
                  value={r.GradeID || ''}
                  onChange={(e) =>
                    handleClimbChange(i, 'GradeID', Number(e.target.value))
                  }
                >
                  <option value="">דירוג Lead</option>
                  {leadGrades.map((g) => (
                    <option key={g.LeadGradeID} value={g.LeadGradeID}>
                      {g.FrenchGrade}
                    </option>
                  ))}
                </select>
              )}

              {(r.ClimbType === 'Boulder' || r.ClimbType === 'Board') && (
                <select
                  className="border p-2 rounded"
                  value={r.GradeID || ''}
                  onChange={(e) =>
                    handleClimbChange(i, 'GradeID', Number(e.target.value))
                  }
                >
                  <option value="">דירוג Boulder / Board</option>
                  {boulderGrades.map((g) => (
                    <option key={g.BoulderGradeID} value={g.BoulderGradeID}>
                      {g.VGrade} ({g.FontGrade})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input
                type="number"
                className="border p-2 rounded"
                placeholder="מספר ניסיונות"
                value={r.Attempts || ''}
                onChange={(e) =>
                  handleClimbChange(i, 'Attempts', Number(e.target.value))
                }
              />
              <label className="flex items-center gap-2 border rounded p-2">
                <input
                  type="checkbox"
                  checked={!!r.Successful}
                  onChange={(e) =>
                    handleClimbChange(i, 'Successful', e.target.checked)
                  }
                />
                הצלחה
              </label>
              <textarea
                className="border rounded p-2 text-sm md:col-span-1"
                placeholder="הערות"
                value={r.Notes || ''}
                onChange={(e) =>
                  handleClimbChange(i, 'Notes', e.target.value)
                }
              />
            </div>
          </div>
        ))}

        <button
          onClick={handleAddClimb}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          ➕ הוסף מסלול טיפוס
        </button>
      </section>

      <section className="mb-10">
        <h2 className="font-semibold mb-2">הערות מטפס</h2>
        <textarea
          className="border rounded w-full p-2"
          rows={3}
          value={climberNotes}
          onChange={(e) => setClimberNotes(e.target.value)}
        />
      </section>

      <div className="flex justify-end gap-3">
        <button
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
          onClick={() => router.push('/calendar')}
        >
          ביטול
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          onClick={handleSave}
        >
          שמירה
        </button>
      </div>
    </div>
  )
}
