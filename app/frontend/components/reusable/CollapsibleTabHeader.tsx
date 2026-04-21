import { themeConfig } from "../../../theme/AppTheme";
import React from "react"
import { Box, Paper, Tabs, Tab, IconButton } from "@mui/material"
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from "@mui/icons-material"

interface TabItem {
  label: string
  icon?: React.ReactElement
  slug?: string
  [key: string]: any
}

const tabBarSx = {
  px: 2,
  flex: 1,
  minHeight: 44,
  "& .MuiTab-root": {
    color: themeConfig.brandColors.offWhite,
    opacity: 0.7,
    minHeight: 44,
    "&.Mui-selected": {
      color: themeConfig.brandColors.offWhite,
      opacity: 1,
    },
  },
  "& .MuiTabs-indicator": {
    backgroundColor: themeConfig.brandColors.offWhite,
  },
} as const

interface CollapsibleTabHeaderProps {
  tabs: TabItem[]
  activeTab: number
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void
  onTabIntent?: (newValue: number) => void
  isExpanded: boolean
  onToggleExpanded: () => void
  dashboardContent?: React.ReactNode
  /**
   * `default` — optional dashboard above tabs; collapse chevron sits at the end of the tab row (Stock/POS).
   * `dataHeaderGap` — tab bar first, then a centered collapse strip (App HR order). Put summary/metrics in the page body below this header.
   */
  layout?: "default" | "dataHeaderGap"
}

const CollapsibleTabHeader: React.FC<CollapsibleTabHeaderProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onTabIntent,
  isExpanded,
  onToggleExpanded,
  dashboardContent,
  layout = "default",
}) => {
  if (layout === "dataHeaderGap") {
    return (
      <>
        {isExpanded ? (
          <Paper
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
              m: 0,
              p: 0,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={onTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={tabBarSx}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.slug ?? index}
                  icon={tab.icon}
                  label={tab.label}
                  onMouseEnter={() => onTabIntent?.(index)}
                  onFocus={() => onTabIntent?.(index)}
                  onTouchStart={() => onTabIntent?.(index)}
                />
              ))}
            </Tabs>
          </Paper>
        ) : null}

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            py: 1,
            minHeight: 40,
            lineHeight: 0,
          }}
        >
          <IconButton
            onClick={onToggleExpanded}
            size="small"
            aria-label={isExpanded ? "Collapse tab navigation" : "Expand tab navigation"}
            sx={{
              color: "text.primary",
              m: 0,
              p: 0.5,
              "&:hover": {
                bgcolor: "transparent",
                opacity: 0.7,
              },
            }}
          >
            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
      </>
    )
  }

  return (
    <>
      {isExpanded && dashboardContent && (
        <Box sx={{ width: "100%", mb: 0 }}>
          {dashboardContent}
        </Box>
      )}

      {isExpanded ? (
        <Paper
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: themeConfig.brandColors.navy,
            color: themeConfig.brandColors.offWhite,
            m: 0,
            p: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={onTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={tabBarSx}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.slug ?? index}
                icon={tab.icon}
                label={tab.label}
                onMouseEnter={() => onTabIntent?.(index)}
                onFocus={() => onTabIntent?.(index)}
                onTouchStart={() => onTabIntent?.(index)}
              />
            ))}
          </Tabs>
          <IconButton
            onClick={onToggleExpanded}
            size="small"
            sx={{
              color: themeConfig.brandColors.offWhite,
              mr: 1,
              p: 0.5,
              "&:hover": {
                bgcolor: "transparent",
                opacity: 0.7,
              },
            }}
          >
            <ExpandLessIcon fontSize="small" />
          </IconButton>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "background.paper",
            m: 0,
            p: 0,
            lineHeight: 0,
          }}
        >
          <IconButton
            onClick={onToggleExpanded}
            size="small"
            sx={{
              color: "text.primary",
              m: 0,
              p: 0.5,
              "&:hover": {
                bgcolor: "transparent",
                opacity: 0.7,
              },
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </>
  )
}

export default CollapsibleTabHeader

