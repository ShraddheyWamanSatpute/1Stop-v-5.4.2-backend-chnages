"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { Box, Button, Grid } from "@mui/material"

interface FunctionalNumberPadProps {
  onNumberClick: (number: string) => void
  disabled?: boolean
}

const FunctionalNumberPad: React.FC<FunctionalNumberPadProps> = ({ onNumberClick, disabled = false }) => {
  const numberButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "00"],
  ]

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 1,
        bgcolor: "background.paper",
      }}
    >
      {/* Number Grid */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
        {numberButtons.map((row, rowIndex) => (
          <Grid container spacing={0.5} key={rowIndex} sx={{ flexGrow: 1 }}>
            {row.map((button, colIndex) => (
              <Grid item xs={4} key={colIndex} sx={{ display: "flex" }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={disabled}
                  onClick={() => onNumberClick(button)}
                  sx={{
                    flexGrow: 1,
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    minHeight: 50,
                    bgcolor: themeConfig.brandColors.navy,
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                  }}
                >
                  {button}
                </Button>
              </Grid>
            ))}
          </Grid>
        ))}
      </Box>
    </Box>
  )
}

export default FunctionalNumberPad
