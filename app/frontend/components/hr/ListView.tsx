"use client"

import type React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
} from "@mui/material"
import { CalendarMonth as CalendarMonthIcon } from "@mui/icons-material"
import { ListViewProps } from "../../../backend/interfaces/HRs"
import { themeConfig } from "../../../theme/AppTheme"
import EmptyStateCard from "../reusable/EmptyStateCard"


const ListView: React.FC<ListViewProps> = ({ filteredSchedules, handleEditSchedule }) => {

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: themeConfig.colors.primary.main }}>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Employee</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Time</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role Label</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredSchedules.length > 0 ? (
            filteredSchedules.map((schedule) => (
              <TableRow 
                key={schedule.id} 
                onClick={() => handleEditSchedule(schedule)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                    transform: 'scale(1.01)'
                  }
                }}
              >
                <TableCell sx={{ fontWeight: 'medium' }}>{schedule.employeeName}</TableCell>
                <TableCell>{new Date(schedule.date).toLocaleDateString()}</TableCell>
                <TableCell sx={{ fontWeight: 'medium' }}>
                  {schedule.startTime} - {schedule.endTime}
                </TableCell>
                <TableCell>{schedule.role || "—"}</TableCell>
                <TableCell>
                  <Chip 
                    label={schedule.status} 
                    size="small" 
                    sx={{
                      bgcolor: themeConfig.colors.primary.main,
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </TableCell>
                <TableCell>{schedule.notes || "—"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <EmptyStateCard
                  icon={CalendarMonthIcon}
                  title="No schedules found"
                  description="Try adjusting your filters or date range."
                  cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                  contentSx={{ py: 2 }}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default ListView
