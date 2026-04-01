import { supabase } from './supabaseClient'

export interface RestPeriod {
  index: number
  afterMoveIndex: number
  startTime: number
  endTime: number
  duration: number
  type: 'tactical' | 'rest' | 'hesitation' | 'footwork'
}

export interface ThirdByMoves {
  move_count: number
  avg_pace: number
  climb_to_rest_ratio: number | null
  duration: number
}

export interface ThirdByTime {
  move_count: number
  avg_pace: number | null
  efficiency_score: number
}

export interface ClimbingAnalysis {
  AnalysisID: number
  FileID: number | null
  Email: string
  CoachEmail: string
  TotalMoves: number | null
  ClimbDuration: number | null
  ActiveTime: number | null
  RestTime: number | null
  AvgPaceOverall: number | null
  AvgPaceLeft: number | null
  AvgPaceRight: number | null
  StallsShort: number | null
  StallsLong: number | null
  ScorePrecision: number | null
  ScoreClipping: number | null
  ScoreTension: number | null
  ScoreFlow: number | null
  ScoreMomentum: number | null
  ScoreHips: number | null
  ScoreSolid: number | null
  ScoreCommitment: number | null
  IsTop: boolean
  CoachComment: string | null
  ClimberComment: string | null
  RawLogJson: { hand: 'L' | 'R'; time: number }[] | null
  ThirdsByMoves: ThirdByMoves[] | null
  ThirdsByTime: ThirdByTime[] | null
  TotalClips: number | null
  AvgClipDuration: number | null
  LongestClip: number | null
  ClippingTime: number | null
  MovementTime: number | null
  StallTime: number | null
  HesitationTime: number | null
  RestPeriodsJson: RestPeriod[] | null
  CreatedAt: string
  UpdatedAt: string
}

export type AnalysisInsert = Omit<ClimbingAnalysis, 'AnalysisID' | 'CreatedAt' | 'UpdatedAt'>

export async function getAnalysis(fileId: number): Promise<ClimbingAnalysis | null> {
  const { data } = await supabase
    .from('ClimbingAnalysis')
    .select('*')
    .eq('FileID', fileId)
    .maybeSingle()
  return data
}

export async function getAnalysesByEmail(email: string): Promise<ClimbingAnalysis[]> {
  const { data } = await supabase
    .from('ClimbingAnalysis')
    .select('*')
    .eq('Email', email)
    .order('CreatedAt', { ascending: false })
  return data ?? []
}

export async function saveAnalysis(data: AnalysisInsert): Promise<ClimbingAnalysis | null> {
  const { data: result } = await supabase
    .from('ClimbingAnalysis')
    .insert(data)
    .select()
    .single()
  return result
}

export async function updateAnalysis(
  id: number,
  data: Partial<AnalysisInsert>
): Promise<ClimbingAnalysis | null> {
  const { data: result } = await supabase
    .from('ClimbingAnalysis')
    .update(data)
    .eq('AnalysisID', id)
    .select()
    .single()
  return result
}

export async function upsertAnalysis(data: Partial<AnalysisInsert> & { FileID: number }): Promise<ClimbingAnalysis | null> {
  console.log('Saving payload:', data)
  const { data: result, error } = await supabase
    .from('ClimbingAnalysis')
    .upsert(data, { onConflict: 'FileID' })
    .select()
    .single()
  if (error) console.error('upsertAnalysis error:', error)
  return result
}

export async function deleteAnalysis(id: number): Promise<void> {
  await supabase.from('ClimbingAnalysis').delete().eq('AnalysisID', id)
}
