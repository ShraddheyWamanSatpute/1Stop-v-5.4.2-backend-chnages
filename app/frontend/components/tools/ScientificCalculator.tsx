"use client"

import type React from "react"
import { Box } from "@mui/material"
import ReusableModal from "../reusable/ReusableModal"
import SimpleCalculatorWidget from "./SimpleCalculatorWidget"

interface ScientificCalculatorProps {
  open: boolean
  onClose: () => void
}

const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({ open, onClose }) => {
  return (
    <ReusableModal
      open={open}
      onClose={onClose}
      title="Calculator"
      initialSize={{ width: 320, height: 480 }}
      minSize={{ width: 280, height: 420 }}
      maxSize={{ width: 450, height: 650 }}
      centerOnOpen={true}
      resizable={true}
      draggable={true}
      showMinimizeButton={true}
    >
      <Box sx={{ 
        height: '100%', 
        width: '100%', 
        p: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        <SimpleCalculatorWidget onClose={onClose} />
      </Box>
    </ReusableModal>
  )
}

export default ScientificCalculator
