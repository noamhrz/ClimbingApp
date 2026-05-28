export interface RoadmapCategory {
  CategoryID: number
  Name: string
  Icon?: string
  Color?: string
  Order?: number
  Group?: string
}

export interface RoadmapLevel {
  LevelID: number
  CategoryID: number
  LevelNumber: number
  Name: string
}

export interface DynamicExerciseItem {
  DynamicExerciseItemID: number
  DynamicExerciseID: number
  LevelID: number
  ExerciseID: number
  Sets: number
  Reps: number
  Duration: number | null
  Rest: number
  Order: number
}
