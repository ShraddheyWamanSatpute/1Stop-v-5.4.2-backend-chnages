"use client"

import { useState, useEffect } from "react"
import { db, ref, set, push, remove, update, onValue, off, get } from "../services/Firebase"
import { calculateHRAnalytics } from "../functions/HRs"
import { callCallableProxy } from "../services/callableProxy"
import type {
  Employee,
  Department,
  Role,
  TimeOffRequest,
  PerformanceReview,
  Announcement,
  Benefit,
  Warning,
  Schedule,
  JobPosting,
  Candidate,
  Interview,
  HRAnalytics,
  Contract,
  ContractTemplate,
} from "../interfaces/HRs"

// Define missing interfaces that are used in the component
interface TrainingRecord {
  id: string
  employeeId: string
  title: string
  description?: string
  startDate: number
  endDate?: number
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  type: "onboarding" | "compliance" | "skills" | "leadership" | "other"
  provider?: string
  location?: string
  cost?: number
  notes?: string
  createdAt: number
  updatedAt?: number
}

interface Event {
  id: string
  title: string
  description: string
  type: "meeting" | "training" | "social" | "company_wide" | "department" | "celebration"
  startDate: number
  endDate: number
  startTime: string
  endTime: string
  location: string
  isVirtual: boolean
  virtualLink?: string
  organizer: string
  attendees: string[]
  maxAttendees?: number
  isPublic: boolean
  requiresRSVP: boolean
  status: "draft" | "published" | "cancelled" | "completed"
  tags: string[]
  createdAt: number
  updatedAt?: number
}

interface Recruitment {
  id: string
  jobTitle: string
  department: string
  location: string
  employmentType: "full_time" | "part_time" | "contract" | "temporary"
  description: string
  requirements: string[]
  responsibilities: string[]
  salaryRange: {
    min: number
    max: number
    currency: string
  }
  benefits: string[]
  status: "draft" | "active" | "closed" | "on_hold"
  postedDate: number
  closingDate?: number
  hiringManager: string
  createdAt: number
  updatedAt?: number
}

interface Compliance {
  id: string
  title: string
  description: string
  type: "training" | "certification" | "document" | "review" | "other"
  assignedTo: string[]
  dueDate: number
  completedBy?: string[]
  status: "pending" | "in_progress" | "completed" | "overdue"
  priority: "low" | "medium" | "high" | "critical"
  documents: string[]
  notes?: string
  createdBy: string
  createdAt: number
  updatedAt?: number
}

interface DiversityMetric {
  id: string
  title: string
  category: "training" | "cultural" | "recruitment" | "accessibility"
  description: string
  status: "active" | "planning" | "completed"
  startDate: string
  endDate: string
  participants: number
  budget: number
  progress: number
  createdAt: number
  updatedAt?: number
}


interface ClockInOut {
  id: string
  employeeId: string
  date: number
  clockIn: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  totalHours?: number
  status: "present" | "absent" | "late" | "early_departure" | "on_leave"
  notes?: string
  approvedBy?: string
  approvedAt?: number
  createdAt: number
  updatedAt?: number
}

interface PayrollData {
  id: string
  employeeId: string
  employeeName: string
  periodId: string
  periodStartDate: number
  periodEndDate: number
  payPeriodStart: string
  payPeriodEnd: string
  regularHours: number
  overtimeHours: number
  totalHours: number
  hoursWorked: number
  hourlyRate: number
  regularPay: number
  overtimePay: number
  bonuses: number
  grossPay: number
  totalGross: number
  deductions: {
    tax: number
    insurance: number
    retirement: number
    other: number
  }
  totalDeductions: number
  netPay: number
  totalNet: number
  status: "pending" | "approved" | "paid" | "cancelled"
  paymentMethod?: "direct_deposit" | "check" | "cash"
  paymentDate?: string
  notes?: string
  createdAt: number
  updatedAt?: number
}

export const useHRData = (basePath: string) => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([])
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [recruitments, setRecruitments] = useState<Recruitment[]>([])
  const [compliance, setCompliance] = useState<Compliance[]>([])
  const [diversityMetrics, setDiversityMetrics] = useState<DiversityMetric[]>([])
  const [analytics, setAnalytics] = useState<HRAnalytics | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [clockInOuts, setClockInOuts] = useState<ClockInOut[]>([])
  const [payrollData, setPayrollData] = useState<PayrollData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    if (!basePath) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Build all RTDB refs synchronously so cleanup can run synchronously.
    const employeesRef = ref(db, `${basePath}/employees`)
    const departmentsRef = ref(db, `${basePath}/departments`)
    const rolesRef = ref(db, `${basePath}/roles`)
    const timeOffRef = ref(db, `${basePath}/timeOffs`)
    const performanceRef = ref(db, `${basePath}/performanceReviews`)
    const trainingRef = ref(db, `${basePath}/trainings`)
    const announcementsRef = ref(db, `${basePath}/announcements`)
    const eventsRef = ref(db, `${basePath}/events`)
    const benefitsRef = ref(db, `${basePath}/benefits`)
    const warningsRef = ref(db, `${basePath}/warnings`)
    const recruitmentsRef = ref(db, `${basePath}/recruitments`)
    const complianceRef = ref(db, `${basePath}/compliance`)
    const diversityRef = ref(db, `${basePath}/diversityMetrics`)
    const analyticsRef = ref(db, `${basePath}/analytics`)
    const schedulesRef = ref(db, `${basePath}/schedules`)
    const attendancesRef = ref(db, `${basePath}/attendances`)
    const payrollRef = ref(db, `${basePath}/payrolls`)

    // Helper: convert RTDB snapshot to typed array keyed by node key.
    const toList = <T>(snapshot: any, cast: (id: string, val: any) => T): T[] => {
      if (!snapshot.exists()) return []
      return Object.entries(snapshot.val() as Record<string, any>).map(([id, v]) =>
        cast(id, v)
      )
    }

    // Attach all listeners synchronously and collect unsubscribe handles.
    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      onValue(employeesRef, (snapshot) => {
        if (snapshot.exists()) {
          callCallableProxy<{ employees: Employee[] }>("hrListEmployees", { hrPath: basePath })
            .then((res: any) => setEmployees((res?.data?.employees || []) as Employee[]))
            .catch((err: any) => {
              if (Number(err?.status) === 404) {
                setEmployees(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Employee, "id">) })))
                return
              }
              setEmployees([])
            })
        } else {
          setEmployees([])
        }
      })
    )

    unsubscribers.push(
      onValue(departmentsRef, (snapshot) => {
        setDepartments(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Department, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(rolesRef, (snapshot) => {
        setRoles(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Role, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(timeOffRef, (snapshot) => {
        setTimeOffRequests(toList(snapshot, (id, v) => ({ id, ...(v as Omit<TimeOffRequest, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(performanceRef, (snapshot) => {
        setPerformanceReviews(toList(snapshot, (id, v) => ({ id, ...(v as Omit<PerformanceReview, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(trainingRef, (snapshot) => {
        setTrainingRecords(toList(snapshot, (id, v) => ({ id, ...(v as Omit<TrainingRecord, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(announcementsRef, (snapshot) => {
        setAnnouncements(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Announcement, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(eventsRef, (snapshot) => {
        setEvents(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Event, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(benefitsRef, (snapshot) => {
        setBenefits(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Benefit, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(warningsRef, (snapshot) => {
        setWarnings(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Warning, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(recruitmentsRef, (snapshot) => {
        setRecruitments(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Recruitment, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(complianceRef, (snapshot) => {
        setCompliance(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Compliance, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(diversityRef, (snapshot) => {
        setDiversityMetrics(toList(snapshot, (id, v) => ({ id, ...(v as Omit<DiversityMetric, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(analyticsRef, (snapshot) => {
        setAnalytics(snapshot.exists() ? (snapshot.val() as HRAnalytics) : null)
      })
    )

    unsubscribers.push(
      onValue(schedulesRef, (snapshot) => {
        setSchedules(toList(snapshot, (id, v) => ({ id, ...(v as Omit<Schedule, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(attendancesRef, (snapshot) => {
        setClockInOuts(toList(snapshot, (id, v) => ({ id, ...(v as Omit<ClockInOut, "id">) })))
      })
    )

    unsubscribers.push(
      onValue(payrollRef, (snapshot) => {
        if (snapshot.exists()) {
          callCallableProxy<{ payrolls: PayrollData[] }>("hrListPayrolls", { hrPath: basePath })
            .then((res: any) => setPayrollData((res?.data?.payrolls || []) as PayrollData[]))
            .catch((err: any) => {
              if (Number(err?.status) === 404) {
                setPayrollData(
                  toList(snapshot, (id, v) => ({ id, ...(v as Omit<PayrollData, "id">) }))
                )
                return
              }
              setPayrollData([])
            })
        } else {
          setPayrollData([])
        }
      })
    )

    setLoading(false)

    // Synchronous cleanup: all listeners are detached immediately on unmount.
    return () => {
      unsubscribers.forEach((fn) => fn())
    }
  }, [basePath])

  return {
    employees,
    departments,
    roles,
    timeOffRequests,
    performanceReviews,
    trainingRecords,
    announcements,
    events,
    benefits,
    warnings,
    recruitments,
    compliance,
    diversityMetrics,
    analytics,
    schedules,
    clockInOuts,
    payrollData,
    loading,
    error,
    calculateHRAnalytics,
  }
}

// CRUD operations for Employees - moved to end of file

// Helper function to remove undefined values from objects for Firebase
const sanitizeForFirebase = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirebase).filter(item => item !== undefined)
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirebase(value)
      }
    }
    return sanitized
  }
  
  return obj
}

// Duplicate CRUD operations removed - using functions at end of file

// Analytics functions
export const updateHRAnalytics = async (basePath: string, analytics: HRAnalytics): Promise<void> => {
  const analyticsRef = ref(db, `${basePath}/analytics`)
  try {
    await set(analyticsRef, analytics)
  } catch (error) {
    console.error("Error updating HR analytics:", error)
    throw error
  }
}

// CRUD operations for Trainings
export const fetchTrainings = async (basePath: string): Promise<TrainingRecord[]> => {
  try {
    const trainingsRef = ref(db, `${basePath}/trainings`)
    const snapshot = await get(trainingsRef)
    if (snapshot.exists()) {
      const trainingsData = snapshot.val()
      return Object.keys(trainingsData).map(key => ({
        id: key,
        ...trainingsData[key]
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching trainings:", error)
    return []
  }
}

export const createTraining = async (basePath: string, training: Omit<TrainingRecord, "id">): Promise<string> => {
  try {
    const trainingsRef = ref(db, `${basePath}/trainings`)
    const newTrainingRef = push(trainingsRef, sanitizeForFirebase({
      ...training,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
    return newTrainingRef.key || ""
  } catch (error) {
    console.error("Error creating training:", error)
    throw error
  }
}

export const updateTraining = async (basePath: string, trainingId: string, training: Partial<TrainingRecord>): Promise<void> => {
  try {
    const trainingRef = ref(db, `${basePath}/trainings/${trainingId}`)
    await update(trainingRef, {
      ...training,
      updatedAt: Date.now(),
    })
  } catch (error) {
    console.error("Error updating training:", error)
    throw error
  }
}

export const deleteTraining = async (basePath: string, trainingId: string): Promise<void> => {
  try {
    const trainingRef = ref(db, `${basePath}/trainings/${trainingId}`)
    await remove(trainingRef)
  } catch (error) {
    console.error("Error deleting training:", error)
    throw error
  }
}

// CRUD operations for Time Off Requests
export const fetchTimeOffs = async (basePath: string): Promise<TimeOffRequest[]> => {
  try {
    const timeOffsRef = ref(db, `${basePath}/timeOffs`)
    const snapshot = await get(timeOffsRef)
    if (snapshot.exists()) {
      const timeOffsData = snapshot.val()
      return Object.keys(timeOffsData).map(key => ({
        id: key,
        ...timeOffsData[key]
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching time offs:", error)
    return []
  }
}

export const createTimeOff = async (basePath: string, timeOff: Omit<TimeOffRequest, "id">): Promise<string> => {
  try {
    const timeOffsRef = ref(db, `${basePath}/timeOffs`)

    const timeOffData: any = {
      employeeId: timeOff.employeeId,
      employeeName: timeOff.employeeName,
      startDate: timeOff.startDate,
      endDate: timeOff.endDate,
      type: timeOff.type,
      reason: timeOff.reason || "",
      status: timeOff.status,
      createdAt: typeof timeOff.createdAt === "number" ? timeOff.createdAt : Date.now(),
      updatedAt: Date.now(),
    }

    if (timeOff.notes != null) timeOffData.notes = timeOff.notes
    if (timeOff.approvedBy != null) timeOffData.approvedBy = timeOff.approvedBy
    if (timeOff.approvedDate != null) timeOffData.approvedDate = timeOff.approvedDate
    if (timeOff.totalDays != null) timeOffData.totalDays = timeOff.totalDays

    const newTimeOffRef = push(timeOffsRef, timeOffData)
    const timeOffId = newTimeOffRef.key

    if (!timeOffId) {
      throw new Error("Failed to create time off: No key returned from database")
    }

    return timeOffId
  } catch (error) {
    console.error("Error creating time off:", error)
    throw error
  }
}

export const updateTimeOff = async (basePath: string, timeOffId: string, timeOff: Partial<TimeOffRequest>): Promise<void> => {
  try {
    const timeOffRef = ref(db, `${basePath}/timeOffs/${timeOffId}`)
    
    await update(timeOffRef, sanitizeForFirebase({ ...timeOff, updatedAt: Date.now() }))
  } catch (error) {
    console.error("Error updating time off:", error)
    throw error
  }
}

export const deleteTimeOff = async (basePath: string, timeOffId: string): Promise<void> => {
  try {
    const timeOffRef = ref(db, `${basePath}/timeOffs/${timeOffId}`)
    await remove(timeOffRef)
  } catch (error) {
    console.error("Error deleting time off:", error)
    throw error
  }
}

// CRUD operations for Warnings
export const fetchWarnings = async (basePath: string): Promise<Warning[]> => {
  try {
    const warningsRef = ref(db, `${basePath}/warnings`)
    const snapshot = await get(warningsRef)
    if (!snapshot.exists()) return []
    
    const warnings: Warning[] = []
    snapshot.forEach((childSnapshot: any) => {
      warnings.push({ id: childSnapshot.key, ...childSnapshot.val() } as Warning)
    })
    return warnings
  } catch (error) {
    console.error("Error fetching warnings:", error)
    return []
  }
}

export const createWarning = async (basePath: string, warning: Omit<Warning, "id">): Promise<string> => {
  try {
    const warningsRef = ref(db, `${basePath}/warnings`)
    const newWarningRef = push(warningsRef, sanitizeForFirebase({
      ...warning,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
    return newWarningRef.key || ""
  } catch (error) {
    console.error("Error creating warning:", error)
    throw error
  }
}

export const updateWarning = async (basePath: string, warningId: string, warning: Partial<Warning>): Promise<void> => {
  try {
    const warningRef = ref(db, `${basePath}/warnings/${warningId}`)
    await update(warningRef, sanitizeForFirebase({
      ...warning,
      updatedAt: Date.now(),
    }))
  } catch (error) {
    console.error("Error updating warning:", error)
    throw error
  }
}

export const deleteWarning = async (basePath: string, warningId: string): Promise<void> => {
  try {
    const warningRef = ref(db, `${basePath}/warnings/${warningId}`)
    await remove(warningRef)
  } catch (error) {
    console.error("Error deleting warning:", error)
    throw error
  }
}

// CRUD operations for Attendances
export const fetchAttendances = async (basePath: string): Promise<ClockInOut[]> => {
  try {
    const attendancesRef = ref(db, `${basePath}/attendances`)
    const snapshot = await get(attendancesRef)
    if (snapshot.exists()) {
      const attendancesData = snapshot.val()
      return Object.keys(attendancesData).map(key => ({
        id: key,
        ...attendancesData[key]
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching attendances:", error)
    return []
  }
}

export const createAttendance = async (basePath: string, attendance: Omit<ClockInOut, "id">): Promise<string> => {
  try {
    const attendancesRef = ref(db, `${basePath}/attendances`)
    const newAttendanceRef = push(attendancesRef)
    const attendanceId = newAttendanceRef.key
    if (!attendanceId) throw new Error("createAttendance: failed to generate ID")

    const attendanceData = sanitizeForFirebase({
      ...attendance as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    await set(newAttendanceRef, attendanceData)
    return attendanceId
  } catch (error) {
    console.error("Error creating attendance:", error)
    throw error
  }
}

export const updateAttendance = async (basePath: string, attendanceId: string, attendance: Partial<ClockInOut>): Promise<void> => {
  try {
    const attendanceRef = ref(db, `${basePath}/attendances/${attendanceId}`)
    const updateData = sanitizeForFirebase({
      ...attendance as any,
      updatedAt: Date.now(),
    })
    await update(attendanceRef, updateData)
  } catch (error) {
    console.error("Error updating attendance:", error)
    throw error
  }
}

export const deleteAttendance = async (basePath: string, attendanceId: string): Promise<void> => {
  try {
    const attendanceRef = ref(db, `${basePath}/attendances/${attendanceId}`)
    await remove(attendanceRef)
  } catch (error) {
    console.error("Error deleting attendance:", error)
    throw error
  }
}

// CRUD operations for Job Postings
export const fetchJobs = async (basePath: string): Promise<JobPosting[]> => {
  try {
    const jobsRef = ref(db, `${basePath}/jobPostings`)
    const snapshot = await get(jobsRef)
    if (!snapshot.exists()) return []
    
    const jobs: JobPosting[] = []
    snapshot.forEach((childSnapshot: any) => {
      jobs.push({ id: childSnapshot.key, ...childSnapshot.val() } as JobPosting)
    })
    return jobs
  } catch (error) {
    console.error("Error fetching jobs:", error)
    return []
  }
}

export const createJob = async (basePath: string, job: Omit<JobPosting, "id">): Promise<string> => {
  try {
    const jobsRef = ref(db, `${basePath}/jobPostings`)
    const newJobRef = push(jobsRef)
    const jobId = newJobRef.key!
    const jobData = sanitizeForFirebase({
      ...job as any,
      id: jobId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    await set(newJobRef, jobData)
    return jobId
  } catch (error) {
    console.error("Error creating job:", error)
    throw error
  }
}

export const updateJob = async (basePath: string, jobId: string, updates: Partial<JobPosting>): Promise<void> => {
  try {
    const jobRef = ref(db, `${basePath}/jobPostings/${jobId}`)
    const updateData = sanitizeForFirebase({
      ...updates as any,
      updatedAt: Date.now()
    })
    await update(jobRef, updateData)
  } catch (error) {
    console.error("Error updating job:", error)
    throw error
  }
}

export const deleteJob = async (basePath: string, jobId: string): Promise<void> => {
  try {
    const jobRef = ref(db, `${basePath}/jobPostings/${jobId}`)
    await remove(jobRef)
  } catch (error) {
    console.error("Error deleting job:", error)
    throw error
  }
}

// CRUD operations for Candidates
export const fetchCandidates = async (basePath: string): Promise<Candidate[]> => {
  try {
    const candidatesRef = ref(db, `${basePath}/candidates`)
    const snapshot = await get(candidatesRef)
    if (!snapshot.exists()) return []
    
    const candidates: Candidate[] = []
    snapshot.forEach((childSnapshot: any) => {
      candidates.push({ id: childSnapshot.key, ...childSnapshot.val() } as Candidate)
    })
    return candidates
  } catch (error) {
    console.error("Error fetching candidates:", error)
    return []
  }
}

export const createCandidate = async (basePath: string, candidate: Omit<Candidate, "id">): Promise<string> => {
  try {
    const candidatesRef = ref(db, `${basePath}/candidates`)
    const newCandidateRef = push(candidatesRef)
    const candidateId = newCandidateRef.key!
    const candidateData = sanitizeForFirebase({
      ...candidate as any,
      id: candidateId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    await set(newCandidateRef, candidateData)
    return candidateId
  } catch (error) {
    console.error("Error creating candidate:", error)
    throw error
  }
}

export const updateCandidate = async (basePath: string, candidateId: string, updates: Partial<Candidate>): Promise<void> => {
  try {
    const candidateRef = ref(db, `${basePath}/candidates/${candidateId}`)
    const updateData = sanitizeForFirebase({
      ...updates as any,
      updatedAt: Date.now()
    })
    await update(candidateRef, updateData)
  } catch (error) {
    console.error("Error updating candidate:", error)
    throw error
  }
}

export const deleteCandidate = async (basePath: string, candidateId: string): Promise<void> => {
  try {
    const candidateRef = ref(db, `${basePath}/candidates/${candidateId}`)
    await remove(candidateRef)
  } catch (error) {
    console.error("Error deleting candidate:", error)
    throw error
  }
}

// Interview CRUD functions
export const createInterview = async (basePath: string, interview: Omit<Interview, "id">): Promise<string> => {
  try {
    const interviewsRef = ref(db, `${basePath}/interviews`)
    const newInterviewRef = push(interviewsRef)
    const interviewId = newInterviewRef.key!
    const interviewData = sanitizeForFirebase({
      ...interview as any,
      id: interviewId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    await set(newInterviewRef, interviewData)
    return interviewId
  } catch (error) {
    console.error("Error creating interview:", error)
    throw error
  }
}

export const updateInterview = async (basePath: string, interviewId: string, updates: Partial<Interview>): Promise<void> => {
  try {
    const interviewRef = ref(db, `${basePath}/interviews/${interviewId}`)
    const updateData = sanitizeForFirebase({
      ...updates as any,
      updatedAt: Date.now()
    })
    await update(interviewRef, updateData)
  } catch (error) {
    console.error("Error updating interview:", error)
    throw error
  }
}

export const deleteInterview = async (basePath: string, interviewId: string): Promise<void> => {
  try {
    const interviewRef = ref(db, `${basePath}/interviews/${interviewId}`)
    await remove(interviewRef)
  } catch (error) {
    console.error("Error deleting interview:", error)
    throw error
  }
}

export const fetchInterviews = async (basePath: string): Promise<Interview[]> => {
  try {
    const interviewsRef = ref(db, `${basePath}/interviews`)
    const snapshot = await get(interviewsRef)
    
    if (snapshot.exists()) {
      const interviewsData = snapshot.val()
      return Object.entries(interviewsData).map(([id, v]) => ({
        id,
        ...(v as Omit<Interview, "id">),
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching interviews:", error)
    throw error
  }
}

// Aliases for backwards compatibility - removed to avoid circular references

// Contract CRUD operations
export const fetchContracts = async (basePath: string): Promise<Contract[]> => {
  try {
    // Support both paths: basePath/contracts and basePath/data/hr/contracts
    // Try data/hr path first (standard HR data location), then fallback to direct path
    let contractsRef = ref(db, `${basePath}/data/hr/contracts`)
    let snapshot = await get(contractsRef)
    
    if (!snapshot.exists()) {
      // Fallback to direct path for backward compatibility
      contractsRef = ref(db, `${basePath}/contracts`)
      snapshot = await get(contractsRef)
    }
    
    if (!snapshot.exists()) {
      return []
    }
    
    const contracts: Contract[] = []
    snapshot.forEach((childSnapshot: any) => {
      contracts.push({ id: childSnapshot.key, ...childSnapshot.val() } as Contract)
    })
    return contracts
  } catch (error) {
    console.error("Error fetching contracts:", error)
    return []
  }
}

export const updateContract = async (basePath: string, contractId: string, contractUpdates: Partial<Contract>): Promise<Contract | null> => {
  try {
    // Try data/hr path first, then fallback for legacy records
    let contractRef = ref(db, `${basePath}/data/hr/contracts/${contractId}`)
    let snapshot = await get(contractRef)

    if (!snapshot.exists()) {
      contractRef = ref(db, `${basePath}/contracts/${contractId}`)
      snapshot = await get(contractRef)
    }

    if (!snapshot.exists()) {
      console.error("Contract not found:", contractId)
      return null
    }

    // Atomic partial update — only write the changed fields plus updatedAt.
    // Never read-modify-write the full document; concurrent writes would overwrite each other.
    const patch = sanitizeForFirebase({
      ...contractUpdates,
      updatedAt: Date.now(),
    })
    // Guard: never blank out employeeId with an explicit empty string.
    if (patch.employeeId === "") delete patch.employeeId

    await update(contractRef, patch)

    // Return merged view built locally — no extra round-trip needed.
    return { id: contractId, ...snapshot.val(), ...patch } as Contract
  } catch (error) {
    console.error("Error updating contract:", error)
    throw error
  }
}

export const fetchContractTemplates = async (basePath: string): Promise<ContractTemplate[]> => {
  try {
    const hasDataHr = basePath.includes("/data/hr")
    const candidatePaths = hasDataHr
      ? [`${basePath}/contractTemplates`]
      : [`${basePath}/data/hr/contractTemplates`]

    const byKey = new Map<string, ContractTemplate>()

    for (const p of candidatePaths) {
      const templatesRef = ref(db, p)
      const snapshot = await get(templatesRef)
      if (!snapshot.exists()) continue

      snapshot.forEach((childSnapshot) => {
        const template = childSnapshot.val()
        if (!template) return
        const id = childSnapshot.key || (template as any)?.id || ""
        const name = (template as any)?.name || ""
        const key = id ? `id:${id}` : name ? `name:${name}` : ""
        if (!key) return

        // Prefer the first found (data/hr path is searched first when applicable)
        if (!byKey.has(key)) {
          byKey.set(key, { ...(template as any), id: id || (template as any)?.id || "" } as ContractTemplate)
        }
      })
    }

    return Array.from(byKey.values())
  } catch (error) {
    console.error("Error fetching contract templates:", error)
    throw error
  }
}

export const createContract = async (basePath: string, contract: Partial<Contract> & { employeeId: string; type: string; startDate: number; status: string; createdAt: number }): Promise<Contract | null> => {
  try {
    // Use standard HR data path: basePath/data/hr/contracts
    const contractsRef = ref(db, `${basePath}/data/hr/contracts`)
    const newContractRef = push(contractsRef)
    const contractId = newContractRef.key
    
    if (!contractId) {
      console.error("Failed to generate contract ID")
      return null
    }
    
    const newContract = {
      ...contract,
      id: contractId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      salary: contract.salary || 0,
      benefits: contract.benefits || [],
      terms: contract.terms || [],
      workingHours: contract.workingHours || "",
      holidayEntitlement: contract.holidayEntitlement || ""
    } as Contract
    
    await set(newContractRef, newContract)
    return newContract
  } catch (error) {
    console.error("Error creating contract:", error)
    throw error
  }
}

export const createContractTemplate = async (basePath: string, template: Omit<ContractTemplate, "id">): Promise<ContractTemplate | null> => {
  try {
    const templatesPath = basePath.includes("/data/hr") ? `${basePath}/contractTemplates` : `${basePath}/data/hr/contractTemplates`
    const templatesRef = ref(db, templatesPath)
    const newTemplateRef = push(templatesRef)
    const templateId = newTemplateRef.key
    
    if (!templateId) {
      console.error("Failed to generate template ID")
      return null
    }
    
    const newTemplate: ContractTemplate = {
      ...template,
      id: templateId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    await set(newTemplateRef, newTemplate)
    return newTemplate
  } catch (error) {
    console.error("Error creating contract template:", error)
    throw error
  }
}

export const updateContractTemplate = async (
  basePath: string,
  templateId: string,
  templateUpdates: Partial<ContractTemplate>,
): Promise<ContractTemplate | null> => {
  try {
    const templatePath = basePath.includes("/data/hr")
      ? `${basePath}/contractTemplates/${templateId}`
      : `${basePath}/data/hr/contractTemplates/${templateId}`

    const templateRef = ref(db, templatePath)
    const snapshot = await get(templateRef)

    if (!snapshot.exists()) {
      return null
    }

    const current = snapshot.val() || {}
    const updated: ContractTemplate = {
      ...current,
      ...templateUpdates,
      id: templateId,
      updatedAt: Date.now(),
    } as ContractTemplate

    await update(templateRef, updated as any)
    return updated
  } catch (error) {
    console.error("Error updating contract template:", error)
    throw error
  }
}

export const deleteContract = async (basePath: string, contractId: string): Promise<void> => {
  try {
    // Try data/hr path first, then fallback to direct path
    let contractRef = ref(db, `${basePath}/data/hr/contracts/${contractId}`)
    let snapshot = await get(contractRef)
    
    if (!snapshot.exists()) {
      // Fallback to direct path for backward compatibility
      contractRef = ref(db, `${basePath}/contracts/${contractId}`)
      snapshot = await get(contractRef)
    }
    
    if (!snapshot.exists()) {
      console.error("Contract not found for deletion:", contractId)
      throw new Error("Contract not found")
    }
    
    await remove(contractRef)
  } catch (error) {
    console.error("Error deleting contract:", error)
    throw error
  }
}

export const deleteContractTemplate = async (basePath: string, templateId: string): Promise<void> => {
  try {
    const templatePath = basePath.includes("/data/hr")
      ? `${basePath}/contractTemplates/${templateId}`
      : `${basePath}/data/hr/contractTemplates/${templateId}`
    const templateRef = ref(db, templatePath)
    await remove(templateRef)
  } catch (error) {
    console.error("Error deleting contract template:", error)
    throw error
  }
}

// Announcements CRUD operations
export const fetchAnnouncements = async (basePath: string): Promise<Announcement[]> => {
  try {
    const announcementsRef = ref(db, `${basePath}/announcements`)
    const snapshot = await get(announcementsRef)
    if (!snapshot.exists()) return []
    
    const announcements: Announcement[] = []
    snapshot.forEach((childSnapshot: any) => {
      announcements.push({ id: childSnapshot.key, ...childSnapshot.val() } as Announcement)
    })
    return announcements
  } catch (error) {
    console.error("Error fetching announcements:", error)
    throw error
  }
}

export const createAnnouncement = async (basePath: string, announcement: Omit<Announcement, 'id'>): Promise<Announcement> => {
  try {
    const announcementsRef = ref(db, `${basePath}/announcements`)
    const newAnnouncementRef = push(announcementsRef)
    const announcementId = newAnnouncementRef.key!
    
    const announcementData: any = {
      ...announcement,
      id: announcementId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    // Firebase rejects undefined values; omit optional fields when not set.
    Object.keys(announcementData).forEach((k) => announcementData[k] === undefined && delete announcementData[k])
    
    await set(newAnnouncementRef, announcementData)
    return announcementData
  } catch (error) {
    console.error("Error creating announcement:", error)
    throw error
  }
}

export const updateAnnouncement = async (basePath: string, announcementId: string, updates: Partial<Announcement>): Promise<void> => {
  try {
    const announcementRef = ref(db, `${basePath}/announcements/${announcementId}`)
    await update(announcementRef, sanitizeForFirebase({ ...updates, updatedAt: Date.now() }))
  } catch (error) {
    console.error("Error updating announcement:", error)
    throw error
  }
}

export const deleteAnnouncement = async (basePath: string, announcementId: string): Promise<void> => {
  try {
    const announcementRef = ref(db, `${basePath}/announcements/${announcementId}`)
    await remove(announcementRef)
  } catch (error) {
    console.error("Error deleting announcement:", error)
    throw error
  }
}

// Benefits operations - extracted from contracts
export const fetchBenefits = async (basePath: string): Promise<Benefit[]> => {
  try {
    // Fetch contracts to extract benefits from them
    const contracts = await fetchContracts(basePath)
    
    // Extract unique benefits from all contracts
    const benefitsSet = new Set<string>()
    
    contracts.forEach(contract => {
      if (contract.benefits && Array.isArray(contract.benefits)) {
        contract.benefits.forEach(benefit => {
          if (typeof benefit === 'string') {
            benefitsSet.add(benefit)
          }
        })
      }
    })
    
    // Convert to Benefit objects
    const benefits: Benefit[] = Array.from(benefitsSet).map((benefit, index) => ({
      id: `benefit_${index + 1}`,
      name: benefit,
      description: `${benefit} benefit package`,
      type: 'other' as const,
      provider: 'Company Provided',
      cost: {
        employer: 0,
        employee: 0,
        frequency: 'monthly' as const
      },
      eligibility: {
        employmentTypes: ['full_time' as const],
        waitingPeriod: 0,
        waitingPeriodUnit: 'days' as const,
        minimumHours: 0
      },
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))
    
    return benefits
  } catch (error) {
    console.error("Error fetching benefits:", error)
    throw error
  }
}

// Employee CRUD Operations
export const fetchEmployees = async (basePath: string): Promise<Employee[]> => {
  try {
    const res: any = await callCallableProxy("hrListEmployees", { hrPath: basePath })
    return (res?.data?.employees || []) as Employee[]
  } catch (error) {
    // Non-fatal: return empty list on missing/forbidden paths to allow multi-path fallback
    return []
  }
}

export const createEmployee = async (basePath: string, employee: Omit<Employee, "id">): Promise<string | null> => {
  try {
    const res: any = await callCallableProxy("hrUpsertEmployee", { hrPath: basePath, employee })
    return (res?.data?.employeeId as string) || null
  } catch (error) {
    console.error("Error creating employee:", error)
    throw error
  }
}

export const updateEmployee = async (basePath: string, employeeId: string, updates: Partial<Employee>): Promise<Employee | null> => {
  try {
    await callCallableProxy("hrUpsertEmployee", { hrPath: basePath, employeeId, employee: updates })

    // Fetch decrypted employee to return
    const res: any = await callCallableProxy("hrGetEmployee", { hrPath: basePath, employeeId })
    return (res?.data?.employee as Employee) || null
  } catch (error) {
    console.error("Error updating employee:", error)
    throw error
  }
}

export const deleteEmployee = async (basePath: string, employeeId: string): Promise<boolean> => {
  try {
    await callCallableProxy("hrDeleteEmployee", { hrPath: basePath, employeeId })
    return true
  } catch (error) {
    console.error("Error deleting employee:", error)
    throw error
  }
}

// Role CRUD Operations
export const fetchRoles = async (basePath: string): Promise<Role[]> => {
  try {
    const rolesRef = ref(db, `${basePath}/roles`)
    const snapshot = await get(rolesRef)
    if (!snapshot.exists()) return []
    
    const roles: Role[] = []
    snapshot.forEach((childSnapshot: any) => {
      roles.push({ id: childSnapshot.key, ...childSnapshot.val() } as Role)
    })
    return roles
  } catch (error) {
    console.error("Error fetching roles:", error)
    return []
  }
}

// Department CRUD Operations
export const fetchDepartments = async (basePath: string): Promise<Department[]> => {
  try {
    const departmentsRef = ref(db, `${basePath}/departments`)
    const snapshot = await get(departmentsRef)
    if (!snapshot.exists()) return []
    
    const departments: Department[] = []
    snapshot.forEach((childSnapshot: any) => {
      departments.push({ id: childSnapshot.key, ...childSnapshot.val() } as Department)
    })
    return departments
  } catch (error) {
    console.error("Error fetching departments:", error)
    return []
  }
}

// Schedule CRUD Operations
export const fetchSchedules = async (basePath: string): Promise<Schedule[]> => {
  try {
    const schedulesRef = ref(db, `${basePath}/schedules`)
    const snapshot = await get(schedulesRef)
    if (!snapshot.exists()) return []
    
    const schedules: Schedule[] = []
    snapshot.forEach((childSnapshot: any) => {
      const scheduleData = childSnapshot.val()
      
      // Normalize date to YYYY-MM-DD format
      let normalizedDate = ""
      if (scheduleData.date) {
        if (typeof scheduleData.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(scheduleData.date)) {
          normalizedDate = scheduleData.date
        } else if (typeof scheduleData.date === 'number') {
          normalizedDate = new Date(scheduleData.date).toISOString().split("T")[0]
        } else if (typeof scheduleData.date === 'string') {
          const parsed = new Date(scheduleData.date)
          if (!isNaN(parsed.getTime())) {
            normalizedDate = parsed.toISOString().split("T")[0]
          } else {
            // Try to extract YYYY-MM-DD from string
            const match = scheduleData.date.match(/(\d{4}-\d{2}-\d{2})/)
            normalizedDate = match ? match[1] : scheduleData.date
          }
        }
      }
      
      // Map Firebase field names to our interface (match actual database structure)
      const mappedSchedule: Schedule = {
        id: childSnapshot.key,
        employeeId: scheduleData.employeeID || scheduleData.employeeId,
        employeeName: scheduleData.employeeName || "",
        date: normalizedDate,
        startTime: scheduleData.startTime || "",
        endTime: scheduleData.endTime || "",
        department: scheduleData.department || "",
        role: scheduleData.role || "", // Optional field
        notes: scheduleData.notes || "", // Optional field
        status: scheduleData.status || "scheduled",
        shiftType: scheduleData.shiftType || "regular", // Default value
        payType: scheduleData.payType || "hourly", // Default value
        payRate: scheduleData.payRate, // Optional field
        breakDuration: typeof scheduleData.breakDuration === "number" ? scheduleData.breakDuration : undefined,
        // Clock/confirmation fields (optional)
        clockInTime: scheduleData.clockInTime,
        clockOutTime: scheduleData.clockOutTime,
        actualHours: scheduleData.actualHours,
        clockInLocation: scheduleData.clockInLocation,
        clockOutLocation: scheduleData.clockOutLocation,
        // Approval workflow (optional)
        approvedBy: scheduleData.approvedBy,
        approvedAt: scheduleData.approvedAt,
        confirmedBy: scheduleData.confirmedBy,
        confirmedAt: scheduleData.confirmedAt,
        departmentID: scheduleData.departmentID || "", // Add departmentID mapping
        createdAt: scheduleData.createdAt ? new Date(scheduleData.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: scheduleData.updatedAt ? new Date(scheduleData.updatedAt).toISOString() : undefined
      }
      
      schedules.push(mappedSchedule)
    })
    return schedules
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return []
  }
}

export const createSchedule = async (basePath: string, schedule: Omit<Schedule, "id">): Promise<string | null> => {
  try {
    const schedulesRef = ref(db, `${basePath}/schedules`)
    const newScheduleRef = push(schedulesRef)
    const scheduleId = newScheduleRef.key
    
    if (!scheduleId) {
      console.error("Failed to generate schedule ID")
      return null
    }
    
    // IMPORTANT: RTDB rejects undefined anywhere in the payload, so sanitize before set().
    const databaseSchedule = sanitizeForFirebase({
      scheduleID: scheduleId,
      employeeId: schedule.employeeId,
      employeeName: schedule.employeeName,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      department: schedule.department,
      role: schedule.role ?? "",
      notes: schedule.notes ?? "",
      status: schedule.status,
      shiftType: schedule.shiftType ?? "regular",
      payType: schedule.payType ?? "hourly",
      payRate: schedule.payRate ?? 0,
      breakDuration: (schedule as any).breakDuration,
      // Clock/confirmation fields
      clockInTime: schedule.clockInTime,
      clockOutTime: schedule.clockOutTime,
      actualHours: schedule.actualHours,
      clockInLocation: schedule.clockInLocation,
      clockOutLocation: schedule.clockOutLocation,
      // Approval workflow
      approvedBy: schedule.approvedBy,
      approvedAt: schedule.approvedAt,
      confirmedBy: schedule.confirmedBy,
      confirmedAt: schedule.confirmedAt,
      departmentID: schedule.departmentID || "", // Add departmentID if available
      createdAt: Date.now(), // Use timestamp for database
      createdBy: "system" // Add createdBy field
    })
    
    await set(newScheduleRef, databaseSchedule)
    return scheduleId
  } catch (error) {
    console.error("Error creating schedule:", error)
    throw error
  }
}

export const updateSchedule = async (basePath: string, scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | null> => {
  try {
    const scheduleRef = ref(db, `${basePath}/schedules/${scheduleId}`)
    
    const updatedData = sanitizeForFirebase({
      ...updates as any,
      updatedAt: new Date().toISOString()
    })
    
    await update(scheduleRef, updatedData)
    
    // Return the updated schedule
    const snapshot = await get(scheduleRef)
    if (snapshot.exists()) {
      const scheduleData = snapshot.val()

      // Normalize date to YYYY-MM-DD format
      let normalizedDate = ""
      if (scheduleData?.date) {
        if (typeof scheduleData.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(scheduleData.date)) {
          normalizedDate = scheduleData.date
        } else if (typeof scheduleData.date === 'number') {
          normalizedDate = new Date(scheduleData.date).toISOString().split("T")[0]
        } else if (typeof scheduleData.date === 'string') {
          const parsed = new Date(scheduleData.date)
          if (!isNaN(parsed.getTime())) {
            normalizedDate = parsed.toISOString().split("T")[0]
          } else {
            const match = scheduleData.date.match(/(\d{4}-\d{2}-\d{2})/)
            normalizedDate = match ? match[1] : scheduleData.date
          }
        }
      }

      const mappedSchedule: Schedule = {
        id: scheduleId,
        employeeId: scheduleData.employeeID || scheduleData.employeeId,
        employeeName: scheduleData.employeeName || "",
        date: normalizedDate || scheduleData.date || "",
        startTime: scheduleData.startTime || "",
        endTime: scheduleData.endTime || "",
        department: scheduleData.department || "",
        role: scheduleData.role || "",
        notes: scheduleData.notes || "",
        status: scheduleData.status || "scheduled",
        shiftType: scheduleData.shiftType || "regular",
        payType: scheduleData.payType || "hourly",
        payRate: scheduleData.payRate,
        breakDuration: typeof scheduleData.breakDuration === "number" ? scheduleData.breakDuration : undefined,
        clockInTime: scheduleData.clockInTime,
        clockOutTime: scheduleData.clockOutTime,
        actualHours: scheduleData.actualHours,
        clockInLocation: scheduleData.clockInLocation,
        clockOutLocation: scheduleData.clockOutLocation,
        approvedBy: scheduleData.approvedBy,
        approvedAt: scheduleData.approvedAt,
        confirmedBy: scheduleData.confirmedBy,
        confirmedAt: scheduleData.confirmedAt,
        departmentID: scheduleData.departmentID || "",
        createdAt: scheduleData.createdAt ? new Date(scheduleData.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: scheduleData.updatedAt ? new Date(scheduleData.updatedAt).toISOString() : undefined
      }

      return mappedSchedule
    }
    return null
  } catch (error) {
    console.error("Error updating schedule:", error)
    throw error
  }
}

export const deleteSchedule = async (basePath: string, scheduleId: string): Promise<boolean> => {
  try {
    const scheduleRef = ref(db, `${basePath}/schedules/${scheduleId}`)
    await remove(scheduleRef)
    return true
  } catch (error) {
    console.error("Error deleting schedule:", error)
    throw error
  }
}

// Generic HR Action Database Operations
export const handleHRActionDB = async <T = any>(
  basePath: string,
  action: "fetch" | "create" | "edit" | "delete",
  id?: string,
  data?: Partial<T>
): Promise<T | T[] | boolean> => {
  try {
    const stripUndefinedDeep = (value: any): any => {
      if (Array.isArray(value)) return value.map(stripUndefinedDeep)
      if (value && typeof value === "object") {
        const out: any = {}
        Object.keys(value).forEach((k) => {
          const v = (value as any)[k]
          if (v === undefined) return
          out[k] = stripUndefinedDeep(v)
        })
        return out
      }
      return value
    }

    switch (action) {
      case "fetch": {
        // Fetch all items of the entity type
        const snapshot = await get(ref(db, basePath))
        if (!snapshot.exists()) return [] as T[]
        
        const items: T[] = []
        snapshot.forEach((childSnapshot: any) => {
          items.push({ id: childSnapshot.key, ...childSnapshot.val() } as T)
        })
        return items
      }
      
      case "create": {
        // Create a new item
        if (!data) throw new Error("Data is required for create action")
        const newRef = push(ref(db, basePath))
        const newId = newRef.key
        if (!newId) throw new Error("Failed to generate ID")
        
        const cleaned = stripUndefinedDeep(data)
        await set(newRef, cleaned)
        return { id: newId, ...(cleaned as any) } as T
      }
      
      case "edit": {
        // Update an existing item
        if (!id) throw new Error("ID is required for edit action")
        if (!data) throw new Error("Data is required for edit action")
        
        const cleaned = stripUndefinedDeep(data)
        await update(ref(db, `${basePath}/${id}`), cleaned)
        return { id, ...(cleaned as any) } as T
      }
      
      case "delete": {
        // Delete an item
        if (!id) throw new Error("ID is required for delete action")
        
        await remove(ref(db, `${basePath}/${id}`))
        return true
      }
      
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
  } catch (error) {
    console.error(`Error in handleHRActionDB (${action}):`, error)
    throw error
  }
}

// Role CRUD operations
export const createRole = async (basePath: string, role: Omit<Role, "id">): Promise<Role> => {
  try {
    const roleRef = ref(db, `${basePath}/roles`)
    const newRoleRef = push(roleRef)
    const roleId = newRoleRef.key!
    
    const roleData: Role = {
      ...role,
      id: roleId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    await set(newRoleRef, roleData)
    return roleData
  } catch (error) {
    console.error("Error creating role:", error)
    throw error
  }
}

export const updateRole = async (basePath: string, roleId: string, updates: Partial<Role>): Promise<void> => {
  try {
    const roleRef = ref(db, `${basePath}/roles/${roleId}`)
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: Date.now()
    }
    await update(roleRef, updatesWithTimestamp)
  } catch (error) {
    console.error("Error updating role:", error)
    throw error
  }
}

export const deleteRole = async (basePath: string, roleId: string): Promise<void> => {
  try {
    const roleRef = ref(db, `${basePath}/roles/${roleId}`)
    await remove(roleRef)
  } catch (error) {
    console.error("Error deleting role:", error)
    throw error
  }
}

// Department CRUD operations
export const createDepartment = async (basePath: string, department: Omit<Department, "id">): Promise<Department> => {
  try {
    const departmentRef = ref(db, `${basePath}/departments`)
    const newDepartmentRef = push(departmentRef)
    const departmentId = newDepartmentRef.key!
    
    const departmentData: Department = {
      ...department,
      id: departmentId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    await set(newDepartmentRef, departmentData)
    return departmentData
  } catch (error) {
    console.error("Error creating department:", error)
    throw error
  }
}

export const updateDepartment = async (basePath: string, departmentId: string, updates: Partial<Department>): Promise<void> => {
  try {
    const departmentRef = ref(db, `${basePath}/departments/${departmentId}`)
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: Date.now()
    }
    await update(departmentRef, updatesWithTimestamp)
  } catch (error) {
    console.error("Error updating department:", error)
    throw error
  }
}

export const deleteDepartment = async (basePath: string, departmentId: string): Promise<void> => {
  try {
    const departmentRef = ref(db, `${basePath}/departments/${departmentId}`)
    await remove(departmentRef)
  } catch (error) {
    console.error("Error deleting department:", error)
    throw error
  }
}

// Payroll CRUD operations
export const fetchPayroll = async (basePath: string): Promise<PayrollData[]> => {
  try {
    const res: any = await callCallableProxy("hrListPayrolls", { hrPath: basePath })
    return (res?.data?.payrolls || []) as PayrollData[]
  } catch (error) {
    const err = error as any
    const status = err?.status
    const msg = String(err?.message || "")
    if (Number(status) === 404) {
      try {
        const snap = await get(ref(db, `${basePath}/payrolls`))
        if (snap.exists()) {
          const data = snap.val() || {}
          return Object.entries(data).map(([id, payroll]) => ({
            id,
            ...(payroll as Omit<PayrollData, "id">),
          })) as PayrollData[]
        }
      } catch {
        // ignore
      }
      return []
    }
    const isAuthError =
      status === 401 ||
      status === 403 ||
      err?.isAuthError === true ||
      msg.includes("(401)") ||
      msg.toLowerCase().includes("not signed in") ||
      msg.toLowerCase().includes("unauthorized")

    // Payroll is permission-gated; avoid noisy logs when user isn't authorized.
    if (!isAuthError) {
      console.error("Error fetching payroll:", error)
    }
    return []
  }
}

// ===== SERVICE CHARGE =====

export async function fetchServiceChargeRules(basePath: string): Promise<any> {
  try {
    const snap = await get(ref(db, `${basePath}/serviceChargeRules`))
    return snap.exists() ? snap.val() : null
  } catch (error) {
    console.error("Error fetching service charge rules:", error)
    return null
  }
}

export async function saveServiceChargeRules(basePath: string, rules: Record<string, any>): Promise<void> {
  try {
    await set(ref(db, `${basePath}/serviceChargeRules`), sanitizeForFirebase(rules))
  } catch (error) {
    console.error("Error saving service charge rules:", error)
    throw error
  }
}

export async function fetchPosBills(
  basePath: string,
  fromTimestamp?: number,
  toTimestamp?: number,
): Promise<any> {
  try {
    const billsRef = ref(db, `${basePath}/pos/bills`)
    let snap
    if (fromTimestamp !== undefined && toTimestamp !== undefined) {
      const { query: rtdbQuery, orderByChild, startAt, endAt } = await import("firebase/database")
      const q = rtdbQuery(billsRef, orderByChild("createdAt"), startAt(fromTimestamp), endAt(toTimestamp))
      snap = await get(q)
    } else {
      snap = await get(billsRef)
    }
    return snap.exists() ? snap.val() : null
  } catch (error) {
    console.error("Error fetching POS bills:", error)
    return null
  }
}

export async function saveServiceChargeAllocation(basePath: string, allocationId: string, allocation: any): Promise<void> {
  if (!allocationId) throw new Error("saveServiceChargeAllocation: allocationId is required")
  try {
    await set(ref(db, `${basePath}/serviceChargeAllocations/${allocationId}`), sanitizeForFirebase(allocation))
  } catch (error) {
    console.error("Error saving service charge allocation:", error)
    throw error
  }
}

export async function saveServiceChargeEmployeeAllocation(basePath: string, allocId: string, data: any): Promise<void> {
  if (!allocId) throw new Error("saveServiceChargeEmployeeAllocation: allocId is required")
  try {
    await set(ref(db, `${basePath}/serviceChargeEmployeeAllocations/${allocId}`), sanitizeForFirebase(data))
  } catch (error) {
    console.error("Error saving service charge employee allocation:", error)
    throw error
  }
}

// ===== HR EMAIL CONFIG =====

export async function fetchHrEmailConfig(configPath: string): Promise<any | null> {
  try {
    const snap = await get(ref(db, configPath))
    if (!snap.exists()) return null
    const value = snap.val()
    if (!value || typeof value !== "object") return value
    const { appPassword, ...safeValue } = value
    return safeValue
  } catch (error) {
    console.error("Error fetching HR email config:", error)
    return null
  }
}

export async function saveHrEmailConfig(configPath: string, config: any): Promise<void> {
  try {
    const { appPassword, ...safeConfig } = config || {}
    await set(ref(db, configPath), {
      ...safeConfig,
      ...(appPassword ? { secretStorage: "server_required" } : {}),
    })
  } catch (error) {
    console.error("Error saving HR email config:", error)
    throw error
  }
}

// Performance Reviews CRUD operations
export const fetchPerformanceReviews = async (basePath: string): Promise<PerformanceReview[]> => {
  try {
    const performanceRef = ref(db, `${basePath}/performanceReviews`)
    const snapshot = await get(performanceRef)
    if (!snapshot.exists()) return []
    
    const reviews: PerformanceReview[] = []
    snapshot.forEach((childSnapshot: any) => {
      reviews.push({ id: childSnapshot.key, ...childSnapshot.val() } as PerformanceReview)
    })
    return reviews
  } catch (error) {
    console.error("Error fetching performance reviews:", error)
    return []
  }
}

// ===== GENERIC COLLECTION & SETTINGS =====

export async function fetchHRCollection(basePath: string, collection: string): Promise<any[]> {
  try {
    const snap = await get(ref(db, `${basePath}/${collection}`))
    if (!snap.exists()) return []

    const val = snap.val()
    if (Array.isArray(val)) return val
    if (val && typeof val === "object") {
      return Object.entries(val).map(([id, v]) => ({ id, ...(v as any) }))
    }
    return []
  } catch (error) {
    console.error(`Error fetching HR collection ${collection}:`, error)
    return []
  }
}

export async function fetchHRSettingsSection(basePath: string, section: string): Promise<any | null> {
  try {
    const snap = await get(ref(db, `${basePath}/${section}`))
    return snap.exists() ? (snap.val() || {}) : null
  } catch (err: any) {
    console.error("Error fetching HR settings section:", err)
    return null
  }
}

export async function saveHRSettingsSection(basePath: string, section: string, data: any): Promise<void> {
  try {
    const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== undefined))
    await update(ref(db, `${basePath}/${section}`), { ...clean, updatedAt: Date.now() })
  } catch (err: any) {
    console.error("Error saving HR settings section:", err)
    throw err
  }
}

export async function fetchHRIntegrations(path: string): Promise<any> {
  try {
    const snap = await get(ref(db, path))
    return snap.exists() ? (snap.val() || {}) : {}
  } catch (err: any) {
    console.error("Error fetching HR integrations:", err)
    return {}
  }
}

export async function saveHRIntegration(path: string, integration: any): Promise<void> {
  try {
    if (!path || !integration?.id) return
    const clean = Object.fromEntries(Object.entries(integration).filter(([, v]) => v !== undefined))
    await set(ref(db, `${path}/${integration.id}`), clean)
  } catch (err: any) {
    console.error("Error saving HR integration:", err)
    throw err
  }
}

export async function fetchHREmployeeDefaults(basePath: string): Promise<any | null> {
  try {
    const snap = await get(ref(db, `${basePath}/employeeDefaults`))
    return snap.exists() ? (snap.val() || {}) : null
  } catch (err: any) {
    console.error("Error fetching HR employee defaults:", err)
    return null
  }
}

export async function saveHREmployeeDefaults(basePath: string, data: any): Promise<void> {
  try {
    const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== undefined))
    await set(ref(db, `${basePath}/employeeDefaults`), { ...clean, updatedAt: Date.now() })
  } catch (err: any) {
    console.error("Error saving HR employee defaults:", err)
    throw err
  }
}

export async function fetchHRPayrollSettings(basePath: string): Promise<any | null> {
  try {
    const snap = await get(ref(db, `${basePath}/payrollSettings`))
    return snap.exists() ? (snap.val() || {}) : null
  } catch (err: any) {
    console.error("Error fetching HR payroll settings:", err)
    return null
  }
}

export async function saveHRPayrollSettings(basePath: string, data: any): Promise<void> {
  try {
    const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== undefined))
    await set(ref(db, `${basePath}/payrollSettings`), { ...clean, updatedAt: Date.now() })
  } catch (err: any) {
    console.error("Error saving HR payroll settings:", err)
    throw err
  }
}

export async function findHRSchedulePath(paths: string[], scheduleId: string): Promise<string | null> {
  const results = await Promise.all(
    paths.map(async (p) => {
      try {
        const snap = await get(ref(db, `${p}/schedules/${scheduleId}`))
        return snap.exists() ? p : null
      } catch {
        return null
      }
    })
  )
  return results.find((r) => r !== null) ?? null
}

export async function findHRReadPath(paths: string[], entity: string, id: string): Promise<string | null> {
  const results = await Promise.all(
    paths.map(async (p) => {
      try {
        const snap = await get(ref(db, `${p}/${entity}/${id}`))
        return snap.exists() ? p : null
      } catch {
        return null
      }
    })
  )
  return results.find((r) => r !== null) ?? null
}
