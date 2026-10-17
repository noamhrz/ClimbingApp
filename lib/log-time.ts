// ClimbingLog.LogDateTime is a naive timestamp in ISRAEL LOCAL time: every reader (dashboard,
// climbing log list, monthly report) takes its date as-is. Calendar.StartTime, in contrast, is
// naive UTC. Copying StartTime into LogDateTime unconverted moved sessions planned between
// 00:00 and 03:00 Israel time (e.g. date-only "midnight" entries) to the previous day.
import moment from 'moment-timezone'
import { parseDbTimestamp } from '@/lib/reports/dates'

const TZ = 'Asia/Jerusalem'
const FMT = 'YYYY-MM-DD HH:mm:ss'

/** LogDateTime for a Calendar.StartTime (naive UTC). */
export const logTimeOf = (startTime: string) => moment(parseDbTimestamp(startTime)).tz(TZ).format(FMT)

/** LogDateTime for a JS Date (an absolute moment). */
export const logTimeOfDate = (d: Date) => moment(d).tz(TZ).format(FMT)

/** LogDateTime for right now. */
export const logTimeNow = () => moment().tz(TZ).format(FMT)
