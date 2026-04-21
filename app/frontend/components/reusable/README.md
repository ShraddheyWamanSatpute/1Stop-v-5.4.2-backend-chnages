# DataHeader Component

A reusable data header component that provides comprehensive functionality for data management interfaces including date navigation, search, filtering, column management, and export capabilities.

## Features

- **Date Navigation**: Previous/next day navigation with calendar popup
- **Date Type Selection**: Day, week, month, or custom date range
- **Search**: Configurable search functionality with custom placeholder
- **Filters**: Collapsible multi-select filters with color indicators
- **Column Management**: Show/hide columns with checkbox menu
- **Export**: PDF and CSV export options
- **Action Buttons**: Refresh, create new, and custom additional buttons
- **Responsive Design**: Works on desktop and mobile devices

## Usage

```tsx
import DataHeader, { FilterOption, ColumnOption } from '../reusable/DataHeader'

// Define your filter options
const filterOptions = [
  {
    label: "Status",
    options: [
      { id: "1", name: "Active", color: "#4caf50" },
      { id: "2", name: "Inactive", color: "#f44336" }
    ],
    selectedValues: statusFilter,
    onSelectionChange: setStatusFilter,
  }
]

// Define your column options
const columnOptions: ColumnOption[] = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
]

// Use the component
<DataHeader
  currentDate={currentDate}
  onDateChange={setCurrentDate}
  dateType="day"
  onDateTypeChange={setDateType}
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Search items..."
  filters={filterOptions}
  filtersExpanded={filtersExpanded}
  onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
  columns={columnOptions}
  columnVisibility={columnVisibility}
  onColumnVisibilityChange={setColumnVisibility}
  onExportCSV={handleExportCSV}
  onExportPDF={handleExportPDF}
  onRefresh={handleRefresh}
  onCreateNew={handleCreateNew}
  createButtonLabel="Create Item"
/>
```

## Props

### Required Props

- `currentDate`: Current selected date
- `onDateChange`: Callback when date changes
- `dateType`: Current date type ("day" | "week" | "month" | "custom")
- `onDateTypeChange`: Callback when date type changes
- `searchTerm`: Current search term
- `onSearchChange`: Callback when search term changes

### Optional Props

- `searchPlaceholder`: Placeholder text for search input
- `filters`: Array of filter configurations
- `filtersExpanded`: Whether filters are expanded
- `onFiltersToggle`: Callback to toggle filters
- `columns`: Array of column configurations
- `columnVisibility`: Object mapping column keys to visibility
- `onColumnVisibilityChange`: Callback when column visibility changes
- `onExportCSV`: Callback for CSV export
- `onExportPDF`: Callback for PDF export
- `onRefresh`: Callback for refresh action
- `onCreateNew`: Callback for create new action
- `createButtonLabel`: Label for create button
- `additionalButtons`: Array of additional button configurations
- `customStartDate`: Start date for custom range
- `customEndDate`: End date for custom range
- `onCustomDateRangeChange`: Callback for custom date range changes
- `backgroundColor`: Background color of the header
- `textColor`: Text color of the header

## Integration Example (Bookings)

The DataHeader has been integrated into the BookingsList component as a complete replacement for the previous header functionality. It provides:

1. **Date Navigation**: Navigate through booking dates with calendar popup
2. **Search**: Search through bookings by name, email, or notes
3. **Filters**: Filter by status, booking type, and tracking status
4. **Column Management**: Show/hide table columns
5. **Export**: Export filtered bookings to CSV or PDF
6. **Actions**: Refresh data and create new bookings

The integration maintains all existing functionality while providing a cleaner, more reusable architecture.

## Customization

The component is highly customizable through props:

- **Styling**: Custom background and text colors
- **Functionality**: Enable/disable specific features by providing/omitting callbacks
- **Content**: Custom button labels and additional action buttons
- **Behavior**: Control filter expansion and date range handling

## Best Practices

1. **Performance**: Use `useMemo` for filter and column options to prevent unnecessary re-renders
2. **State Management**: Keep filter states at the parent component level for proper data flow
3. **Accessibility**: All interactive elements include proper ARIA labels and keyboard navigation
4. **Responsive**: The component automatically adapts to different screen sizes
5. **Consistency**: Use the same color scheme and styling patterns across your application
