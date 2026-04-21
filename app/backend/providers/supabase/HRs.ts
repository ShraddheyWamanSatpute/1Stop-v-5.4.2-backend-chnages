import * as firebaseProvider from "../../rtdatabase/HRs"
import type { Attendance, Employee, Schedule, TimeOffRequest } from "../../interfaces/HRs"
import { authedDataFetch } from "./http"

export * from "../../rtdatabase/HRs"

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const normalizeScheduleDate = (value: unknown): string => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString().split("T")[0]
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
    const match = value.match(/(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
    return value
  }
  return ""
}

const normalizeSchedule = (value: any): Schedule => ({
  ...(value || {}),
  id: String(value?.id || ""),
  employeeId: String(value?.employeeId || value?.employeeID || ""),
  employeeName: String(value?.employeeName || ""),
  date: normalizeScheduleDate(value?.date),
  startTime: String(value?.startTime || ""),
  endTime: String(value?.endTime || ""),
  department: String(value?.department || ""),
  role: value?.role || "",
  notes: value?.notes || "",
  status: value?.status || "scheduled",
  shiftType: value?.shiftType || "regular",
  payType: value?.payType || "hourly",
  payRate: value?.payRate,
  breakDuration: typeof value?.breakDuration === "number" ? value.breakDuration : undefined,
  clockInTime: value?.clockInTime,
  clockOutTime: value?.clockOutTime,
  actualHours: value?.actualHours,
  clockInLocation: value?.clockInLocation,
  clockOutLocation: value?.clockOutLocation,
  approvedBy: value?.approvedBy,
  approvedAt: value?.approvedAt,
  confirmedBy: value?.confirmedBy,
  confirmedAt: value?.confirmedAt,
  departmentID: value?.departmentID || "",
  createdAt:
    typeof value?.createdAt === "string"
      ? value.createdAt
      : new Date(value?.createdAt || Date.now()).toISOString(),
  updatedAt:
    value?.updatedAt !== undefined
      ? typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date(value.updatedAt).toISOString()
      : undefined,
})

export const fetchEmployees: typeof firebaseProvider.fetchEmployees = async (basePath: string) => {
  const result = await authedDataFetch(`/hr/employees${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Employee[]
}

export const createEmployee: typeof firebaseProvider.createEmployee = async (basePath: string, employee) => {
  const result = await authedDataFetch(`/hr/employees`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: employee }),
  })
  return result?.id ? String(result.id) : null
}

export const updateEmployee: typeof firebaseProvider.updateEmployee = async (
  basePath: string,
  employeeId: string,
  updates,
) => {
  const result = await authedDataFetch(`/hr/employees/${encodeURIComponent(employeeId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
  return (result?.row || null) as Employee | null
}

export const deleteEmployee: typeof firebaseProvider.deleteEmployee = async (basePath: string, employeeId: string) => {
  await authedDataFetch(`/hr/employees/${encodeURIComponent(employeeId)}${query({ basePath })}`, {
    method: "DELETE",
  })
  return true
}

export const fetchTimeOffs: typeof firebaseProvider.fetchTimeOffs = async (basePath: string) => {
  const result = await authedDataFetch(`/hr/timeOffs${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as TimeOffRequest[]
}

export const createTimeOff: typeof firebaseProvider.createTimeOff = async (basePath: string, timeOff) => {
  const result = await authedDataFetch(`/hr/timeOffs`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: timeOff }),
  })
  return String(result?.id || "")
}

export const updateTimeOff: typeof firebaseProvider.updateTimeOff = async (
  basePath: string,
  timeOffId: string,
  updates,
) => {
  await authedDataFetch(`/hr/timeOffs/${encodeURIComponent(timeOffId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteTimeOff: typeof firebaseProvider.deleteTimeOff = async (basePath: string, timeOffId: string) => {
  await authedDataFetch(`/hr/timeOffs/${encodeURIComponent(timeOffId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchAttendances: typeof firebaseProvider.fetchAttendances = async (basePath: string) => {
  const result = await authedDataFetch(`/hr/attendances${query({ basePath })}`, { method: "GET" })
  return (result?.rows || []) as Attendance[]
}

export const createAttendance: typeof firebaseProvider.createAttendance = async (basePath: string, attendance) => {
  const result = await authedDataFetch(`/hr/attendances`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: attendance }),
  })
  return String(result?.id || "")
}

export const updateAttendance: typeof firebaseProvider.updateAttendance = async (
  basePath: string,
  attendanceId: string,
  updates,
) => {
  await authedDataFetch(`/hr/attendances/${encodeURIComponent(attendanceId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
}

export const deleteAttendance: typeof firebaseProvider.deleteAttendance = async (
  basePath: string,
  attendanceId: string,
) => {
  await authedDataFetch(`/hr/attendances/${encodeURIComponent(attendanceId)}${query({ basePath })}`, {
    method: "DELETE",
  })
}

export const fetchSchedules: typeof firebaseProvider.fetchSchedules = async (basePath: string) => {
  const result = await authedDataFetch(`/hr/schedules${query({ basePath })}`, { method: "GET" })
  return ((result?.rows || []) as any[]).map(normalizeSchedule)
}

export const createSchedule: typeof firebaseProvider.createSchedule = async (basePath: string, schedule) => {
  const result = await authedDataFetch(`/hr/schedules`, {
    method: "POST",
    body: JSON.stringify({ basePath, data: schedule }),
  })
  return result?.id ? String(result.id) : null
}

export const updateSchedule: typeof firebaseProvider.updateSchedule = async (
  basePath: string,
  scheduleId: string,
  updates,
) => {
  const result = await authedDataFetch(`/hr/schedules/${encodeURIComponent(scheduleId)}`, {
    method: "PATCH",
    body: JSON.stringify({ basePath, updates }),
  })
  return result?.row ? normalizeSchedule(result.row) : null
}

export const deleteSchedule: typeof firebaseProvider.deleteSchedule = async (basePath: string, scheduleId: string) => {
  await authedDataFetch(`/hr/schedules/${encodeURIComponent(scheduleId)}${query({ basePath })}`, {
    method: "DELETE",
  })
  return true
}
