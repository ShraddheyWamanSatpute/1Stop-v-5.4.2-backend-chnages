"use client"

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import FormSection from "../../reusable/FormSection"
import { useHR } from "../../../../backend/context/HRContext"
import type {
  PerformanceReviewAnswer,
  PerformanceReviewEntry,
  PerformanceReviewTemplate,
  PerformanceReviewTemplateQuestion,
} from "../../../../backend/interfaces/HRs"

export interface PerformanceReviewCRUDFormHandle {
  submit: () => void
}

interface PerformanceReviewCRUDFormProps {
  review?: PerformanceReviewEntry | null
  templates: PerformanceReviewTemplate[]
  mode: "create" | "edit" | "view"
  onSave: (data: Omit<PerformanceReviewEntry, "id"> | Partial<PerformanceReviewEntry>) => void
}

const normalizeAnswersToMap = (answers: PerformanceReviewAnswer[] | undefined) => {
  const m = new Map<string, PerformanceReviewAnswer["value"]>()
  ;(answers || []).forEach((a) => m.set(a.questionId, a.value))
  return m
}

const answersMapToArray = (map: Map<string, PerformanceReviewAnswer["value"]>): PerformanceReviewAnswer[] =>
  Array.from(map.entries()).map(([questionId, value]) => ({ questionId, value: value ?? null }))

const computeOverallScore = (template: PerformanceReviewTemplate | undefined, answers: Map<string, any>) => {
  if (!template) return undefined
  const ratingQs: PerformanceReviewTemplateQuestion[] = []
  template.sections.forEach((s) => s.questions.forEach((q) => q.type === "rating" && ratingQs.push(q)))
  if (ratingQs.length === 0) return undefined

  let weightSum = 0
  let weighted = 0
  for (const q of ratingQs) {
    const raw = answers.get(q.id)
    const value = typeof raw === "number" ? raw : Number(raw)
    if (!Number.isFinite(value)) continue
    const w = q.weight ?? 1
    weightSum += w
    weighted += value * w
  }
  if (weightSum <= 0) return undefined
  return Math.round((weighted / weightSum) * 10) / 10
}

const PerformanceReviewCRUDForm = React.forwardRef<PerformanceReviewCRUDFormHandle, PerformanceReviewCRUDFormProps>(
  ({ review, templates, mode, onSave }, ref) => {
    const { state: hrState } = useHR()
    const isReadOnly = mode === "view"

    const [templateId, setTemplateId] = useState<string>("")
    const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId])

    const [employeeId, setEmployeeId] = useState<string>("")
    const [reviewerId, setReviewerId] = useState<string>("")
    const [reviewDate, setReviewDate] = useState<Date | null>(new Date())
    const [dueDate, setDueDate] = useState<Date | null>(null)
    const [status, setStatus] = useState<PerformanceReviewEntry["status"]>("draft")
    const [comments, setComments] = useState<string>("")
    const [answers, setAnswers] = useState<Map<string, any>>(new Map())

    useEffect(() => {
      if (!review) return
      setTemplateId(review.templateId || "")
      setEmployeeId(review.employeeId || "")
      setReviewerId(review.reviewerId || "")
      setReviewDate(review.reviewDate ? new Date(review.reviewDate) : new Date())
      setDueDate(review.dueDate ? new Date(review.dueDate) : null)
      setStatus(review.status || "draft")
      setComments(review.comments || "")
      setAnswers(normalizeAnswersToMap(review.answers))
    }, [review])

    // Initialize answers when template changes (create mode only)
    useEffect(() => {
      if (mode !== "create") return
      if (!selectedTemplate) return
      setAnswers((prev) => {
        const next = new Map(prev)
        selectedTemplate.sections.forEach((s) => {
          s.questions.forEach((q) => {
            if (!next.has(q.id)) next.set(q.id, null)
          })
        })
        return next
      })
    }, [mode, selectedTemplate])

    const employeeName = useMemo(() => {
      const e = hrState.employees?.find((x) => x.id === employeeId)
      return e ? `${e.firstName} ${e.lastName}` : ""
    }, [employeeId, hrState.employees])

    const reviewerName = useMemo(() => {
      const e = hrState.employees?.find((x) => x.id === reviewerId)
      return e ? `${e.firstName} ${e.lastName}` : ""
    }, [reviewerId, hrState.employees])

    const overallScore = useMemo(() => computeOverallScore(selectedTemplate, answers), [answers, selectedTemplate])

    const setAnswer = useCallback((questionId: string, value: any) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(questionId, value)
        return next
      })
    }, [])

    const handleSubmit = useCallback(() => {
      const now = Date.now()
      const payload: Omit<PerformanceReviewEntry, "id"> = {
        templateId: templateId || undefined,
        templateName: selectedTemplate?.name || review?.templateName,
        employeeId,
        reviewerId,
        reviewDate: (reviewDate || new Date()).getTime(),
        dueDate: dueDate ? dueDate.getTime() : undefined,
        status,
        answers: answersMapToArray(answers),
        overallScore,
        comments: comments || "",
        createdAt: review?.createdAt || now,
        updatedAt: now,
      }
      onSave(payload)
    }, [
      answers,
      comments,
      dueDate,
      employeeId,
      overallScore,
      onSave,
      reviewerId,
      review?.createdAt,
      review?.templateName,
      reviewDate,
      selectedTemplate?.name,
      status,
      templateId,
    ])

    useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ width: "100%" }}>
          <FormSection title="Review Setup">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" }, gap: 2 }}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Template</InputLabel>
                <Select
                  label="Template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select a template</em>
                  </MenuItem>
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Employee</InputLabel>
                <Select label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <MenuItem value="">
                    <em>Select an employee</em>
                  </MenuItem>
                  {hrState.employees?.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Reviewer</InputLabel>
                <Select label="Reviewer" value={reviewerId} onChange={(e) => setReviewerId(e.target.value)}>
                  <MenuItem value="">
                    <em>Select a reviewer</em>
                  </MenuItem>
                  {hrState.employees?.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr 1fr" }, gap: 2, mt: 2 }}>
              <DatePicker
                label="Review date"
                value={reviewDate}
                onChange={(d) => setReviewDate(d)}
                disabled={isReadOnly}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Due date"
                value={dueDate}
                onChange={(d) => setDueDate(d)}
                disabled={isReadOnly}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="in_progress">In progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <Paper variant="outlined" sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Overall score
                </Typography>
                <Chip label={overallScore !== undefined ? overallScore : "—"} size="small" color={overallScore ? "info" : "default"} />
              </Paper>
            </Box>

            {(employeeName || reviewerName) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {employeeName ? `Employee: ${employeeName}` : ""} {employeeName && reviewerName ? "•" : ""}{" "}
                {reviewerName ? `Reviewer: ${reviewerName}` : ""}
              </Typography>
            )}
          </FormSection>

          <FormSection title="Questions">
            {!selectedTemplate ? (
              <Typography variant="body2" color="text.secondary">
                Select a template to begin.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {selectedTemplate.sections.map((section) => (
                  <Paper key={section.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {section.title}
                    </Typography>
                    {section.description ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {section.description}
                      </Typography>
                    ) : null}

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 2 }}>
                      {section.questions.map((q) => {
                        const value = answers.get(q.id)
                        return (
                          <Paper key={q.id} variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {q.label}{" "}
                              {q.required ? (
                                <Typography component="span" color="error" sx={{ fontWeight: 700 }}>
                                  *
                                </Typography>
                              ) : null}
                            </Typography>
                            {q.helperText ? (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {q.helperText}
                              </Typography>
                            ) : null}

                            {q.type === "rating" ? (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                                <Rating
                                  value={typeof value === "number" ? value : Number(value) || 0}
                                  onChange={(_e, newValue) => setAnswer(q.id, newValue ?? 0)}
                                  disabled={isReadOnly}
                                  max={q.maxRating ?? 5}
                                />
                                <Typography variant="body2" color="text.secondary">
                                  {typeof value === "number" ? value : Number(value) || 0}/{q.maxRating ?? 5}
                                </Typography>
                              </Box>
                            ) : null}

                            {q.type === "text" ? (
                              <TextField
                                value={typeof value === "string" ? value : value ?? ""}
                                onChange={(e) => setAnswer(q.id, e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                                sx={{ mt: 1 }}
                                disabled={isReadOnly}
                              />
                            ) : null}

                            {q.type === "boolean" ? (
                              <FormControl fullWidth sx={{ mt: 1 }} disabled={isReadOnly}>
                                <InputLabel>Answer</InputLabel>
                                <Select
                                  label="Answer"
                                  value={value === true ? "yes" : value === false ? "no" : ""}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setAnswer(q.id, v === "yes" ? true : v === "no" ? false : null)
                                  }}
                                >
                                  <MenuItem value="">
                                    <em>Choose</em>
                                  </MenuItem>
                                  <MenuItem value="yes">Yes</MenuItem>
                                  <MenuItem value="no">No</MenuItem>
                                </Select>
                              </FormControl>
                            ) : null}

                            {q.type === "multiple_choice" ? (
                              <FormControl fullWidth sx={{ mt: 1 }} disabled={isReadOnly}>
                                <InputLabel>Answer</InputLabel>
                                <Select
                                  label="Answer"
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(q.id, e.target.value)}
                                >
                                  <MenuItem value="">
                                    <em>Choose</em>
                                  </MenuItem>
                                  {(q.options || []).map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                      {opt}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : null}
                          </Paper>
                        )
                      })}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </FormSection>

          <FormSection title="Comments">
            <TextField
              label="Comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              fullWidth
              multiline
              rows={4}
              disabled={isReadOnly}
            />
          </FormSection>
        </Box>
      </LocalizationProvider>
    )
  },
)

export default PerformanceReviewCRUDForm

