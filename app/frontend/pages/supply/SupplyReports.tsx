"use client"

import { alpha } from "@mui/material/styles"
import React, { useMemo, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import type { SelectChangeEvent } from "@mui/material/Select"
import {
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
} from "@mui/icons-material"
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import DataHeader from "../../components/reusable/DataHeader"
import type { SupplyClient, SupplyDelivery, SupplyOrder } from "./types"
import { useSupply } from "../../../backend/context/SupplyContext"

type SupplyReportKey = "clients" | "orders" | "deliveries"

interface SupplyReportProps {
  headerControls?: React.ReactNode
}

const getDateRange = (dateType: "day" | "week" | "month" | "custom", currentDate: Date, customStart: Date, customEnd: Date) => {
  if (dateType === "custom") return { start: customStart, end: customEnd }
  if (dateType === "day") return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
  if (dateType === "week") return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }
  return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) }
}

const inRange = (ts: number | undefined, start: Date, end: Date) => {
  if (!ts) return false
  return ts >= start.getTime() && ts <= end.getTime()
}

const SupplyClientsReport: React.FC<SupplyReportProps & { data: SupplyClient[] }> = ({ headerControls, data }) => {
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())

  const [searchTerm, setSearchTerm] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  const range = useMemo(() => getDateRange(dateType, currentDate, customStartDate, customEndDate), [dateType, currentDate, customStartDate, customEndDate])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return data
      .filter((c) => {
        const ts = (c.updatedAt || c.createdAt) as number | undefined
        // For "custom/day/week/month" we apply the range filter
        if (!inRange(ts, range.start, range.end)) return false
        if (statusFilter.length && !statusFilter.includes(c.status)) return false
        if (!q) return true
        const hay = [c.name, c.email, c.phone, c.city, c.postcode, ...(c.tags || [])].filter(Boolean).join(" ").toLowerCase()
        return hay.includes(q)
      })
  }, [data, range.start, range.end, searchTerm, statusFilter])

  const metrics = useMemo(() => {
    const total = filtered.length
    const active = filtered.filter((c) => c.status === "active").length
    const inactive = filtered.filter((c) => c.status === "inactive").length
    const archived = filtered.filter((c) => c.status === "archived").length
    return { total, active, inactive, archived }
  }, [filtered])

  return (
    <Box>
      <DataHeader
        title=""
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search clients..."
        additionalControls={headerControls}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => {
          setCustomStartDate(start)
          setCustomEndDate(end)
        }}
        filters={[
          {
            label: "Status",
            options: [
              { id: "active", name: "active" },
              { id: "inactive", name: "inactive" },
              { id: "archived", name: "archived" },
            ],
            selectedValues: statusFilter,
            onSelectionChange: setStatusFilter,
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((v) => !v)}
        onExportCSV={() => {
          const headers = ["Name", "Status", "Email", "Phone", "City", "Updated"]
          const rows = filtered.map((c) => [
            c.name,
            c.status,
            c.email || "",
            c.phone || "",
            c.city || "",
            format(new Date(c.updatedAt || c.createdAt), "yyyy-MM-dd HH:mm"),
          ])
          const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `supply_clients_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total", value: metrics.total },
          { label: "Active", value: metrics.active },
          { label: "Inactive", value: metrics.inactive },
          { label: "Archived", value: metrics.archived },
        ].map((m) => (
          <Grid key={m.label} item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {m.label}
                </Typography>
                <Typography variant="h4">{m.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 640 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell>{c.city || "-"}</TableCell>
                  <TableCell>{format(new Date(c.updatedAt || c.createdAt), "dd MMM yyyy")}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No results for this report range/filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

const SupplyOrdersReport: React.FC<SupplyReportProps & { data: SupplyOrder[] }> = ({ headerControls, data }) => {
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())

  const [searchTerm, setSearchTerm] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  const range = useMemo(() => getDateRange(dateType, currentDate, customStartDate, customEndDate), [dateType, currentDate, customStartDate, customEndDate])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return data.filter((o) => {
      const ts = (o.updatedAt || o.createdAt) as number | undefined
      if (!inRange(ts, range.start, range.end)) return false
      if (statusFilter.length && !statusFilter.includes(o.status)) return false
      if (!q) return true
      const hay = [o.orderNumber, o.clientName, o.reference, o.notes].filter(Boolean).join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [data, range.start, range.end, searchTerm, statusFilter])

  const metrics = useMemo(() => {
    const total = filtered.length
    const draft = filtered.filter((o) => o.status === "draft").length
    const delivered = filtered.filter((o) => o.status === "delivered").length
    const cancelled = filtered.filter((o) => o.status === "cancelled").length
    return { total, draft, delivered, cancelled }
  }, [filtered])

  return (
    <Box>
      <DataHeader
        title=""
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search orders..."
        additionalControls={headerControls}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => {
          setCustomStartDate(start)
          setCustomEndDate(end)
        }}
        filters={[
          {
            label: "Status",
            options: (["draft", "confirmed", "processing", "ready", "dispatched", "delivered", "cancelled"] as const).map((s) => ({
              id: s,
              name: s,
            })),
            selectedValues: statusFilter,
            onSelectionChange: setStatusFilter,
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((v) => !v)}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total", value: metrics.total },
          { label: "Draft", value: metrics.draft },
          { label: "Delivered", value: metrics.delivered },
          { label: "Cancelled", value: metrics.cancelled },
        ].map((m) => (
          <Grid key={m.label} item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {m.label}
                </Typography>
                <Typography variant="h4">{m.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 640 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Order date</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{o.orderNumber}</TableCell>
                  <TableCell>{o.clientName}</TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell>{format(new Date(o.orderDate), "dd MMM yyyy")}</TableCell>
                  <TableCell>{typeof o.total === "number" ? `£${o.total.toFixed(2)}` : "-"}</TableCell>
                  <TableCell>{format(new Date(o.updatedAt || o.createdAt), "dd MMM yyyy")}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No results for this report range/filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

const SupplyDeliveriesReport: React.FC<SupplyReportProps & { data: SupplyDelivery[] }> = ({ headerControls, data }) => {
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())

  const [searchTerm, setSearchTerm] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  const range = useMemo(() => getDateRange(dateType, currentDate, customStartDate, customEndDate), [dateType, currentDate, customStartDate, customEndDate])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return data.filter((d) => {
      const ts = (d.updatedAt || d.createdAt) as number | undefined
      if (!inRange(ts, range.start, range.end)) return false
      if (statusFilter.length && !statusFilter.includes(d.status)) return false
      if (!q) return true
      const hay = [d.deliveryNumber, d.clientName, d.orderNumber, d.trackingRef, d.driverName].filter(Boolean).join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [data, range.start, range.end, searchTerm, statusFilter])

  const metrics = useMemo(() => {
    const total = filtered.length
    const delivered = filtered.filter((d) => d.status === "delivered").length
    const inTransit = filtered.filter((d) => d.status === "in_transit").length
    const failed = filtered.filter((d) => d.status === "failed").length
    return { total, delivered, inTransit, failed }
  }, [filtered])

  return (
    <Box>
      <DataHeader
        title=""
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search deliveries..."
        additionalControls={headerControls}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => {
          setCustomStartDate(start)
          setCustomEndDate(end)
        }}
        filters={[
          {
            label: "Status",
            options: (["scheduled", "in_transit", "delivered", "failed", "cancelled"] as const).map((s) => ({ id: s, name: s })),
            selectedValues: statusFilter,
            onSelectionChange: setStatusFilter,
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((v) => !v)}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total", value: metrics.total },
          { label: "In transit", value: metrics.inTransit },
          { label: "Delivered", value: metrics.delivered },
          { label: "Failed", value: metrics.failed },
        ].map((m) => (
          <Grid key={m.label} item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {m.label}
                </Typography>
                <Typography variant="h4">{m.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 640 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Delivery #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Order #</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{d.deliveryNumber}</TableCell>
                  <TableCell>{d.clientName}</TableCell>
                  <TableCell>{d.status}</TableCell>
                  <TableCell>{d.orderNumber || "-"}</TableCell>
                  <TableCell>{d.scheduledDate ? format(new Date(d.scheduledDate), "dd MMM yyyy") : "-"}</TableCell>
                  <TableCell>{format(new Date(d.updatedAt || d.createdAt), "dd MMM yyyy")}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No results for this report range/filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

const SupplyReports: React.FC = () => {
  const { state: supplyState } = useSupply()

  const [selectedReport, setSelectedReport] = useState<SupplyReportKey>("clients")

  const reportOptions: { key: SupplyReportKey; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      { key: "clients", label: "Clients", icon: <PeopleIcon /> },
      { key: "orders", label: "Orders", icon: <ShoppingCartIcon /> },
      { key: "deliveries", label: "Deliveries", icon: <LocalShippingIcon /> },
    ],
    [],
  )

  const headerControls = (
    <FormControl size="small" sx={{ minWidth: 220, ml: 1 }}>
      <InputLabel sx={{ color: "white" }}>Report</InputLabel>
      <Select
        value={selectedReport}
        onChange={(e: SelectChangeEvent) => setSelectedReport(e.target.value as SupplyReportKey)}
        label="Report"
        sx={{
          color: "white",
          "& .MuiSvgIcon-root": { color: "white" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha("#fff", 0.85) },
        }}
        MenuProps={{ PaperProps: { sx: { mt: 1 } } }}
      >
        {reportOptions.map((opt) => (
          <MenuItem key={opt.key} value={opt.key}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {opt.icon}
              {opt.label}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )

  const props: SupplyReportProps = { headerControls }

  const clients = (supplyState.clients || []) as SupplyClient[]
  const orders = (supplyState.orders || []) as SupplyOrder[]
  const deliveries = (supplyState.deliveries || []) as SupplyDelivery[]

  return (
    <Box sx={{ width: "100%" }}>
      {selectedReport === "clients" && <SupplyClientsReport {...props} data={clients} />}
      {selectedReport === "orders" && <SupplyOrdersReport {...props} data={orders} />}
      {selectedReport === "deliveries" && <SupplyDeliveriesReport {...props} data={deliveries} />}
    </Box>
  )
}

export default SupplyReports

