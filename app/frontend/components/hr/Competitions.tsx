"use client"

import React, { useEffect, useState } from "react"
import { Box, Typography, Grid, Card, CardHeader, CardContent, LinearProgress } from "@mui/material"
import { EmojiEvents as EmojiEventsIcon, Store as StoreIcon } from "@mui/icons-material"
// Company state is now handled through HRContext
import { useHR } from "../../../backend/context/HRContext"
import DataHeader from "../reusable/DataHeader"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { THEME_COLORS } from "../../styles/themeColors"
import { exportReportContainerToCsv } from "../../utils/reportExport"
// Functions now accessed through HRContext
// import type { VenueBattle } from "../../../backend/interfaces/HRs" // Unused

const Competitions: React.FC = () => {
  // Company state is now handled through HRContext
  const { state: hrState } = useHR()
  // Use competitions from HR context state instead of local state
  const competitions = hrState.incentives || []
  const venueCompetitions = hrState.venueBattles || []

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const reportRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      // Company state handled internally
      // Competitions are automatically updated in HR context state
      // Venue competitions are already loaded in HRContext
      // Venue competitions are automatically updated in HR context state
    }
    load()
  }, []) // Company state handled internally

  // DataHeader handlers
  const handleSortChange = (value: string, direction: 'asc' | 'desc') => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleRefresh = () => {
    // Reload data
  }

  const handleExportCSV = () => {
    exportReportContainerToCsv(reportRef.current, "competitions.csv")
  }

  // Filter and sort competitions
  const filteredCompetitions = competitions.filter(competition => {
    const matchesSearch = competition.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         competition.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         competition.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter.length === 0 || typeFilter.includes(competition.type)
    return matchesSearch && matchesType
  })

  const sortedCompetitions = [...filteredCompetitions].sort((a, b) => {
    let aValue = ''
    let bValue = ''

    switch (sortBy) {
      case 'title':
        aValue = a.title
        bValue = b.title
        break
      case 'type':
        aValue = a.type
        bValue = b.type
        break
      case 'category':
        aValue = a.category
        bValue = b.category
        break
      default:
        aValue = a.title
        bValue = b.title
    }

    const comparison = aValue.localeCompare(bValue)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // DataHeader configuration
  const filters = [
    {
      label: "Type",
      options: [
        { id: "individual", name: "Individual", color: THEME_COLORS.lightBlue },
        { id: "team", name: "Team", color: THEME_COLORS.success },
        { id: "department", name: "Department", color: THEME_COLORS.warning },
        { id: "company_wide", name: "Company Wide", color: THEME_COLORS.navy },
      ],
      selectedValues: typeFilter,
      onSelectionChange: setTypeFilter,
    },
  ]

  const sortOptions = [
    { value: "title", label: "Title" },
    { value: "type", label: "Type" },
    { value: "category", label: "Category" },
  ]

  return (
    <Box ref={reportRef}>
      <DataHeader
        onExportCSV={handleExportCSV}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search competitions..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onRefresh={handleRefresh}
      />

      <Typography variant="h6" sx={{ mb: 2 }}>Staff Competitions</Typography>
      <Grid container spacing={2}>
        {sortedCompetitions.map(i => (
          <Grid item xs={12} md={6} key={i.id}>
            <Card>
              <CardHeader title={i.title} subheader={`${i.type} • ${i.category}`} />
              <CardContent>
                <Typography variant="body2" sx={{ mb: 1 }}>{i.description}</Typography>
                <LinearProgress variant="determinate" value={(i.progress?.find?.(() => true)?.currentValue || 0) / (i.progress?.find?.(() => true)?.targetValue || 1) * 100} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {sortedCompetitions.length === 0 && (
        <EmptyStateCard
          icon={EmojiEventsIcon}
          title={competitions.length === 0 ? "No staff competitions found" : "No staff competitions match your current filters"}
          description={competitions.length === 0 ? "Create a competition to motivate staff." : "Try adjusting your filters."}
          cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
        />
      )}

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Venue Competitions</Typography>
      <Grid container spacing={2}>
        {venueCompetitions.map(b => (
          <Grid item xs={12} md={6} key={b.id}>
            <Card>
              <CardHeader title={b.title} subheader={`${b.status} • ${new Date(b.startDate).toLocaleDateString()} - ${new Date(b.endDate).toLocaleDateString()}`} />
              <CardContent>
                {(b.leaderboard || []).slice(0, 5).map((entry: any) => (
                  <Box key={entry.siteId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{entry.rank}. {entry.siteName}</Typography>
                    <Typography variant="body2">{entry.score}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {venueCompetitions.length === 0 && (
        <EmptyStateCard
          icon={StoreIcon}
          title="No venue competitions found"
          description="Venue competitions will appear here when created."
          cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
        />
      )}
    </Box>
  )
}

export default Competitions
