"use client"

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material"
import FormSection from "../../reusable/FormSection"
import type {
  PerformanceReviewTemplate,
  PerformanceReviewTemplateQuestion,
  PerformanceReviewTemplateSection,
  PerformanceTemplateQuestionType,
} from "../../../../backend/interfaces/HRs"

export interface PerformanceTemplateCRUDFormHandle {
  submit: () => void
}

interface PerformanceTemplateCRUDFormProps {
  template?: PerformanceReviewTemplate | null
  mode: "create" | "edit" | "view"
  onSave: (data: Omit<PerformanceReviewTemplate, "id"> | Partial<PerformanceReviewTemplate>) => void
}

const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`

const createDefaultTemplate = (): Omit<PerformanceReviewTemplate, "id"> => {
  const qId = makeId()
  const sId = makeId()
  return {
    name: "Performance Review",
    description: "",
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections: [
      {
        id: sId,
        title: "Overall",
        description: "",
        questions: [
          {
            id: qId,
            label: "Overall performance",
            type: "rating",
            required: true,
            maxRating: 5,
            weight: 1,
            helperText: "",
          },
        ],
      },
    ],
  }
}

const PerformanceTemplateCRUDForm = React.forwardRef<PerformanceTemplateCRUDFormHandle, PerformanceTemplateCRUDFormProps>(
  ({ template, mode, onSave }, ref) => {
    const isReadOnly = mode === "view"

    const [formData, setFormData] = useState<Omit<PerformanceReviewTemplate, "id">>(() => createDefaultTemplate())

    useEffect(() => {
      if (!template) return
      const normalized: Omit<PerformanceReviewTemplate, "id"> = {
        name: template.name || "",
        description: template.description || "",
        isActive: template.isActive ?? true,
        createdAt: template.createdAt || Date.now(),
        updatedAt: template.updatedAt || Date.now(),
        createdBy: template.createdBy,
        sections: Array.isArray(template.sections) ? template.sections : [],
      }
      setFormData(normalized)
    }, [template])

    const sectionCount = formData.sections.length
    const questionCount = useMemo(
      () => formData.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0),
      [formData.sections],
    )

    const updateSection = useCallback((sectionId: string, updates: Partial<PerformanceReviewTemplateSection>) => {
      setFormData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
      }))
    }, [])

    const deleteSection = useCallback((sectionId: string) => {
      setFormData((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }))
    }, [])

    const addSection = useCallback(() => {
      const id = makeId()
      setFormData((prev) => ({
        ...prev,
        sections: [
          ...prev.sections,
          {
            id,
            title: `Section ${prev.sections.length + 1}`,
            description: "",
            questions: [],
          },
        ],
      }))
    }, [])

    const addQuestion = useCallback((sectionId: string) => {
      const q: PerformanceReviewTemplateQuestion = {
        id: makeId(),
        label: "New question",
        type: "text",
        required: false,
        helperText: "",
      }

      setFormData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s
          return { ...s, questions: [...(s.questions || []), q] }
        }),
      }))
    }, [])

    const updateQuestion = useCallback(
      (sectionId: string, questionId: string, updates: Partial<PerformanceReviewTemplateQuestion>) => {
        setFormData((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => {
            if (s.id !== sectionId) return s
            return {
              ...s,
              questions: (s.questions || []).map((q) => (q.id === questionId ? { ...q, ...updates } : q)),
            }
          }),
        }))
      },
      [],
    )

    const deleteQuestion = useCallback((sectionId: string, questionId: string) => {
      setFormData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s
          return { ...s, questions: (s.questions || []).filter((q) => q.id !== questionId) }
        }),
      }))
    }, [])

    const handleSubmit = useCallback(() => {
      const now = Date.now()
      const payload: Omit<PerformanceReviewTemplate, "id"> = {
        ...formData,
        updatedAt: now,
        sections: (formData.sections || []).map((s) => ({
          ...s,
          questions: (s.questions || []).map((q) => {
            const base: PerformanceReviewTemplateQuestion = {
              id: q.id || makeId(),
              label: q.label || "",
              type: q.type || "text",
              required: !!q.required,
              helperText: q.helperText || "",
            }

            if (base.type === "rating") {
              base.maxRating = q.maxRating ?? 5
              base.weight = q.weight ?? 1
            }
            if (base.type === "multiple_choice") {
              base.options = Array.isArray(q.options) ? q.options.filter(Boolean) : []
            }
            return base
          }),
        })),
      }

      onSave(payload)
    }, [formData, onSave])

    useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

    return (
      <Box sx={{ width: "100%" }}>
        <FormSection title="Template Details">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2 }}>
            <TextField
              label="Template name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              required
              disabled={isReadOnly}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Active"
              sx={{ alignSelf: "center" }}
            />
          </Box>
          <TextField
            label="Description"
            value={formData.description || ""}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 2 }}
            disabled={isReadOnly}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Sections: {sectionCount} • Questions: {questionCount}
          </Typography>
        </FormSection>

        <FormSection
          title="Sections & Questions"
          actions={
            !isReadOnly ? (
              <Button size="small" startIcon={<AddIcon />} onClick={addSection}>
                Add section
              </Button>
            ) : undefined
          }
        >
          {formData.sections.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No sections yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {formData.sections.map((section) => (
                <Paper key={section.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                    <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2 }}>
                      <TextField
                        label="Section title"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        fullWidth
                        disabled={isReadOnly}
                      />
                      {!isReadOnly ? (
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                          <Button size="small" startIcon={<AddIcon />} onClick={() => addQuestion(section.id)}>
                            Add question
                          </Button>
                          <IconButton size="small" color="error" onClick={() => deleteSection(section.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ) : null}
                    </Box>
                  </Box>

                  <TextField
                    label="Section description"
                    value={section.description || ""}
                    onChange={(e) => updateSection(section.id, { description: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mt: 1.5 }}
                    disabled={isReadOnly}
                  />

                  <Divider sx={{ my: 2 }} />

                  {(section.questions || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No questions in this section.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {(section.questions || []).map((q) => (
                        <Paper key={q.id} variant="outlined" sx={{ p: 1.5 }}>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr auto" },
                              gap: 1.5,
                              alignItems: "center",
                            }}
                          >
                            <TextField
                              label="Question"
                              value={q.label}
                              onChange={(e) => updateQuestion(section.id, q.id, { label: e.target.value })}
                              fullWidth
                              disabled={isReadOnly}
                            />

                            <FormControl fullWidth size="small" disabled={isReadOnly}>
                              <InputLabel>Type</InputLabel>
                              <Select
                                label="Type"
                                value={q.type}
                                onChange={(e) => {
                                  const newType = e.target.value as PerformanceTemplateQuestionType
                                  updateQuestion(section.id, q.id, {
                                    type: newType,
                                    ...(newType === "multiple_choice" ? { options: q.options || ["Option 1", "Option 2"] } : {}),
                                    ...(newType === "rating" ? { maxRating: q.maxRating ?? 5, weight: q.weight ?? 1 } : {}),
                                  })
                                }}
                              >
                                <MenuItem value="rating">Rating</MenuItem>
                                <MenuItem value="text">Text</MenuItem>
                                <MenuItem value="boolean">Yes/No</MenuItem>
                                <MenuItem value="multiple_choice">Multiple choice</MenuItem>
                              </Select>
                            </FormControl>

                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={!!q.required}
                                  onChange={(e) => updateQuestion(section.id, q.id, { required: e.target.checked })}
                                  disabled={isReadOnly}
                                />
                              }
                              label="Required"
                            />

                            {!isReadOnly ? (
                              <IconButton size="small" color="error" onClick={() => deleteQuestion(section.id, q.id)}>
                                <DeleteIcon />
                              </IconButton>
                            ) : null}
                          </Box>

                          <TextField
                            label="Helper text (optional)"
                            value={q.helperText || ""}
                            onChange={(e) => updateQuestion(section.id, q.id, { helperText: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ mt: 1.5 }}
                            disabled={isReadOnly}
                          />

                          {q.type === "rating" ? (
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
                              <TextField
                                label="Max rating"
                                type="number"
                                value={q.maxRating ?? 5}
                                onChange={(e) => updateQuestion(section.id, q.id, { maxRating: Number(e.target.value) || 5 })}
                                size="small"
                                disabled={isReadOnly}
                                inputProps={{ min: 1, max: 10 }}
                              />
                              <TextField
                                label="Weight"
                                type="number"
                                value={q.weight ?? 1}
                                onChange={(e) => updateQuestion(section.id, q.id, { weight: Number(e.target.value) || 1 })}
                                size="small"
                                disabled={isReadOnly}
                                inputProps={{ min: 0, step: 0.5 }}
                              />
                            </Box>
                          ) : null}

                          {q.type === "multiple_choice" ? (
                            <TextField
                              label="Options (comma separated)"
                              value={(q.options || []).join(", ")}
                              onChange={(e) =>
                                updateQuestion(section.id, q.id, {
                                  options: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                              fullWidth
                              size="small"
                              sx={{ mt: 1.5 }}
                              disabled={isReadOnly}
                            />
                          ) : null}
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </FormSection>
      </Box>
    )
  },
)

export default PerformanceTemplateCRUDForm

