"use client"

import React, { useState } from "react"
import { Box, Tabs, Tab } from "@mui/material"
import {
  Description as RunsheetIcon,
  ShoppingCart as PreorderIcon,
  CreditCard as PlaceCardIcon,
  Restaurant as ItemSummaryIcon,
  Assessment as NumbersIcon,
  Assignment as StaffIcon,
} from "@mui/icons-material"
import { PrintSettingsProvider } from "./ToolsPrintSettings"
import RunsheetsTool from "./RunsheetsTool"
import PreordersTool from "./PreordersTool"
import PlaceCardsTool from "./PlaceCardsTool"
import ItemSummaryTool from "./ItemSummaryTool"
import NumbersTableTool from "./NumbersTableTool"
import StaffAssignmentTool from "./StaffAssignmentTool"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tools-tabpanel-${index}`}
      aria-labelledby={`tools-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  )
}

const Tools: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <PrintSettingsProvider>
      <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="tools tabs"
            sx={{
              minHeight: "40px",
              "& .MuiTab-root": {
                minHeight: "40px",
                py: 0.5,
                fontSize: "0.875rem",
              },
            }}
          >
            <Tab icon={<RunsheetIcon />} label="Runsheets" iconPosition="start" />
            <Tab icon={<PreorderIcon />} label="Preorders" iconPosition="start" />
            <Tab icon={<PlaceCardIcon />} label="Place Cards" iconPosition="start" />
            <Tab icon={<ItemSummaryIcon />} label="Item Summary" iconPosition="start" />
            <Tab icon={<NumbersIcon />} label="Numbers Table" iconPosition="start" />
            <Tab icon={<StaffIcon />} label="Staff Assignment" iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          <TabPanel value={activeTab} index={0}>
            <RunsheetsTool />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <PreordersTool />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <PlaceCardsTool />
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <ItemSummaryTool />
          </TabPanel>
          <TabPanel value={activeTab} index={4}>
            <NumbersTableTool />
          </TabPanel>
          <TabPanel value={activeTab} index={5}>
            <StaffAssignmentTool />
          </TabPanel>
        </Box>
      </Box>
    </PrintSettingsProvider>
  )
}

export default Tools

