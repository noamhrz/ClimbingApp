// types/climbing.ts

export interface ClimbingRoute {
  id: string  // temp ID for UI
  climbType: 'Boulder' | 'Board' | 'Lead'
  gradeID: number | null
  gradeDisplay: string
  routeName: string
  attempts: number
  successful: boolean
  notes: string
}

export interface BoulderGrade {
  BoulderGradeID: number
  VGrade: string
  FontGrade: string
}

export interface LeadGrade {
  LeadGradeID: number
  AussieGrade: number
  FrenchGrade: string
  YosemiteGrade: string
  DifficultyLevel: string
}

export interface ClimbingLocation {
  LocationID: number
  LocationName: string
  LocationType: string
  City: string
  Country: string
  BoardTypeID?: number
  Notes?: string
  CreatedAt?: string
}

export interface ClimbingLogEntry {
  ClimbingLogID?: number
  Email: string
  WorkoutID?: number | null
  LocationID?: number | null
  ClimbType: 'Boulder' | 'Board' | 'Lead'
  BoardTypeID?: number | null
  GradeID?: number | null
  RouteName?: string | null
  Attempts: number
  Successful: boolean
  DurationSeconds?: number | null
  Notes?: string | null
  LogDateTime?: string
  CreatedAt?: string
  UpdatedAt?: string
  CalendarID?: number | null
}
