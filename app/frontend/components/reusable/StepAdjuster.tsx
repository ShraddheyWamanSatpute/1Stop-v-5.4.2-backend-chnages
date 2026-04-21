"use client"

import type React from "react"
import { useState } from "react"
import { IconButton, Box, Typography } from "@mui/material"
import { AddCircle, RemoveCircle, ArrowUpward, ArrowDownward } from "@mui/icons-material"

interface StepAdjusterProps {
  value: number
  onChange: (newValue: number) => void
}

const StepAdjuster: React.FC<StepAdjusterProps> = ({ value, onChange }) => {
  // The adjustable step value (range: 0.1 to 1, default 0.1)
  const [step, setStep] = useState(0.1)

  const incrementStep = () => setStep((prev) => Math.min(prev + 0.1, 1))
  const decrementStep = () => setStep((prev) => Math.max(prev - 0.1, 0.1))

  const handleAdd = () => {
    onChange(Number.parseFloat((value + step).toFixed(2)))
  }

  const handleSubtract = () => {
    onChange(Number.parseFloat((value - step).toFixed(2)))
  }

  return (
    <Box display="flex" alignItems="center" mt={1}>
      <IconButton onClick={handleSubtract} size="small">
        <RemoveCircle />
      </IconButton>
      <Box display="flex" flexDirection="column" alignItems="center">
        {/* Vertical step selector */}
        <Box display="flex" flexDirection="column" alignItems="center">
          <IconButton onClick={incrementStep} size="small">
            <ArrowUpward fontSize="small" />
          </IconButton>
          <Typography variant="caption">{step.toFixed(1)}</Typography>
          <Typography variant="body2" style={{ margin: "0 8px", minWidth: 40, textAlign: "center" }}>
            {value.toFixed(2)}
          </Typography>
          <IconButton onClick={decrementStep} size="small">
            <ArrowDownward fontSize="small" />
          </IconButton>
        </Box>
        {/* Horizontal adjustment controls */}
      </Box>

      <IconButton onClick={handleAdd} size="small">
        <AddCircle />
      </IconButton>
    </Box>
  )
}

export default StepAdjuster
