// types/climbing.ts

export interface ClimbingRoute {
  id: string
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
  Description?: string
}

export interface LeadGrade {
  LeadGradeID: number
  FrenchGrade: string
  YosemiteGrade: string
  Description?: string
}

export interface ClimbingLocation {
  LocationID: number
  LocationName: string
  City: string
  Country: string
  LocationType: string
  Description?: string
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

export interface BoardType {
  BoardID: number
  BoardName: string
  Description: string
  Manufacturer: string
  AppSupported: boolean
  AngleRange: string
  LEDSystem: boolean
  CreatedAt?: string
}