// Alternative exercises come in pairs: A.AltExerciseID = B and B.AltExerciseID = A.
// Called after an exercise is saved with a (possibly changed) alternative.
import { supabase } from '@/lib/supabaseClient'

export async function linkAltPair(id: number, newAlt: number | null | undefined, oldAlt: number | null | undefined) {
  newAlt = newAlt || null
  oldAlt = oldAlt || null
  // the former partner no longer points back here
  if (oldAlt && oldAlt !== newAlt) {
    await supabase.from('Exercises').update({ AltExerciseID: null }).eq('ExerciseID', oldAlt).eq('AltExerciseID', id)
  }
  if (newAlt) {
    // the new partner leaves its previous pair, if it had one
    const { data } = await supabase.from('Exercises').select('AltExerciseID').eq('ExerciseID', newAlt).maybeSingle()
    const prev = data?.AltExerciseID as number | null | undefined
    if (prev && prev !== id) {
      await supabase.from('Exercises').update({ AltExerciseID: null }).eq('ExerciseID', prev).eq('AltExerciseID', newAlt)
    }
    await supabase.from('Exercises').update({ AltExerciseID: id }).eq('ExerciseID', newAlt)
  }
}
