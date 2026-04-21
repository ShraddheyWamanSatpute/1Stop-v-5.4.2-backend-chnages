/**
 * ESS Performance Page
 * 
 * View performance reviews and goals:
 * - Recent reviews
 * - Performance scores
 * - Goals and objectives
 */

"use client"

import React from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  useTheme,
} from "@mui/material"
import {
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Flag as GoalIcon,
  CheckCircle as CompletedIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { EmptyState } from "../components"
import type { ESSPerformanceReview } from "../../backend/interfaces"

const ESSPerformance: React.FC = () => {
  const theme = useTheme()
  const { state } = useESS()

  // Format date
  const formatDate = (date: string | number): string => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 4) return theme.palette.success.main
    if (score >= 3) return theme.palette.warning.main
    return theme.palette.error.main
  }

  // Render star rating
  const renderStars = (score: number) => {
    return (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            sx={{
              fontSize: 20,
              color: star <= score ? theme.palette.warning.main : theme.palette.grey[300],
            }}
          />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Overall Score Card */}
      {state.performanceReviews.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Latest Review Score
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 700,
                  color: getScoreColor(state.performanceReviews[0]?.overallScore || 0),
                }}
              >
                {state.performanceReviews[0]?.overallScore?.toFixed(1) || "N/A"}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                / 5
              </Typography>
            </Box>
            {renderStars(Math.round(state.performanceReviews[0]?.overallScore || 0))}
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {state.performanceReviews.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {state.performanceReviews.map((review: ESSPerformanceReview) => (
            <Card key={review.id} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {review.reviewPeriod}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {review.updatedAt ? `Updated: ${formatDate(review.updatedAt)}` : review.createdAt ? `Created: ${formatDate(review.createdAt)}` : `Period: ${formatDate(review.reviewDate)}`}
                    </Typography>
                  </Box>
                  {review.overallScore !== undefined && (
                  <Chip
                    icon={<StarIcon />}
                    label={review.overallScore.toFixed(1)}
                    color={review.overallScore >= 4 ? "success" : review.overallScore >= 3 ? "warning" : "error"}
                    size="small"
                  />
                  )}
                </Box>

                {/* Qualification Assessment */}
                {review.qualificationAssessment && review.qualificationAssessment.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {review.qualificationAssessment.map((qual: any, index: number) => (
                      <Box key={index} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2">{qual.qualification}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {qual.currentLevel}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            qual.currentLevel === "expert" ? 100 :
                            qual.currentLevel === "advanced" ? 80 :
                            qual.currentLevel === "intermediate" ? 60 :
                            qual.currentLevel === "beginner" ? 40 : 0
                          }
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: theme.palette.grey[200],
                            "& .MuiLinearProgress-bar": {
                              bgcolor: getScoreColor(
                                qual.currentLevel === "expert" ? 5 :
                                qual.currentLevel === "advanced" ? 4 :
                                qual.currentLevel === "intermediate" ? 3 : 2
                              ),
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Comments */}
                {review.comments && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      "{review.comments}"
                    </Typography>
                  </>
                )}

                {/* Strengths */}
                {review.strengths && review.strengths.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Strengths</Typography>
                    {review.strengths.map((strength: string, idx: number) => (
                      <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        • {strength}
                      </Typography>
                    ))}
                  </>
                )}

                {/* Areas for Improvement */}
                {review.areasForImprovement && review.areasForImprovement.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Areas for Improvement</Typography>
                    {review.areasForImprovement.map((area: string, idx: number) => (
                      <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        • {area}
                      </Typography>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <EmptyState
          icon={<TrendingUpIcon sx={{ fontSize: 48 }} />}
          title="No Performance Reviews"
          description="Your performance reviews will appear here once completed by your manager."
        />
      )}

      {/* Goals Section (if available) */}
      {state.performanceReviews.some((r: ESSPerformanceReview) => r.goals && r.goals.length > 0) && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
            Goals & Objectives
          </Typography>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              {state.performanceReviews[0]?.goals?.map((goal: any, index: number) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    py: 1.5,
                    borderBottom: index < (state.performanceReviews[0]?.goals?.length || 0) - 1 ? `1px solid ${theme.palette.divider}` : "none",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: goal.status === "completed" ? theme.palette.success.light : theme.palette.grey[100],
                    }}
                  >
                    {goal.status === "completed" ? (
                      <CompletedIcon sx={{ fontSize: 18, color: "success.main" }} />
                    ) : (
                      <GoalIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        textDecoration: goal.status === "completed" ? "line-through" : "none",
                        color: goal.status === "completed" ? "text.secondary" : "text.primary",
                      }}
                    >
                      {goal.description}
                    </Typography>
                    {goal.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {formatDate(goal.dueDate)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}

export default ESSPerformance