"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  Menu,
  MenuItem,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useCompany } from "../../../backend/context/CompanyContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Define types for categories
interface Category {
  name: string;
  value: number;
  percentage: string;
}

interface EnhancedCategoryChartProps {
  dateRange: string;
  height?: number;
  barColor?: string;
  isLoading?: boolean;
  dataSource?: string;
  displayType?: "price" | "quantity";
  backgroundColor?: string;
  textColor?: string;
  data?: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
    }[];
  };
}

const EnhancedCategoryChart: React.FC<EnhancedCategoryChartProps> = ({
  dateRange = "Last 7 Days",
  height = 250,
  isLoading = false,
  dataSource = "stockCount",
  displayType = "price",
  barColor,
  textColor,
}) => {
  const theme = useTheme();
  const { state: companyState } = useCompany();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"bars" | "progress">("progress");

  const chartRef = useRef<any>(null);
  const resolvedBarColor = barColor ?? theme.palette.primary.main;
  const resolvedTextColor = textColor ?? theme.palette.text.primary;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // This would be replaced with actual API calls to your database
        // For now, we'll use mock data
        const mockData = getMockData(dateRange, dataSource);
        setCategories(mockData);
      } catch (error) {
        console.error("Error fetching category data:", error);
        setCategories(getMockData(dateRange, dataSource));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    companyState.companyID,
    companyState.selectedSiteID,
    dateRange,
    dataSource,
    displayType,
  ]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4 }
        : null
    );
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  // Mock data function for development/fallback
  const getMockData = (dateRange: string, dataSource: string): Category[] => {
    let data: Category[] = [];

    // Adjust mock data based on data source
    const multiplier =
      dataSource === "sales"
        ? 0.8
        : dataSource === "purchases"
        ? 1.2
        : dataSource === "profit"
        ? 0.4
        : dataSource === "costOfSales"
        ? 0.6
        : 1;

    switch (dateRange) {
      case "Today":
        data = [
          { name: "Beverages", value: 1250 * multiplier, percentage: "+5%" },
          { name: "Baking", value: 920 * multiplier, percentage: "+12%" },
          { name: "Meat", value: 890 * multiplier, percentage: "+2%" },
          { name: "Produce", value: 450 * multiplier, percentage: "+8%" },
          { name: "Dairy", value: 290 * multiplier, percentage: "+15%" },
        ];
        break;
      case "Yesterday":
        data = [
          { name: "Beverages", value: 1150 * multiplier, percentage: "+3%" },
          { name: "Baking", value: 870 * multiplier, percentage: "+10%" },
          { name: "Meat", value: 850 * multiplier, percentage: "+1%" },
          { name: "Produce", value: 420 * multiplier, percentage: "+6%" },
          { name: "Dairy", value: 270 * multiplier, percentage: "+13%" },
        ];
        break;
      case "Last 7 Days":
        data = [
          { name: "Beverages", value: 4250 * multiplier, percentage: "+15%" },
          { name: "Baking", value: 3120 * multiplier, percentage: "+22%" },
          { name: "Meat", value: 2890 * multiplier, percentage: "+12%" },
          { name: "Produce", value: 1450 * multiplier, percentage: "+18%" },
          { name: "Dairy", value: 890 * multiplier, percentage: "+25%" },
        ];
        break;
      case "Last 30 Days":
        data = [
          { name: "Beverages", value: 14250 * multiplier, percentage: "+25%" },
          { name: "Baking", value: 11120 * multiplier, percentage: "+32%" },
          { name: "Meat", value: 10890 * multiplier, percentage: "+22%" },
          { name: "Produce", value: 5450 * multiplier, percentage: "+28%" },
          { name: "Dairy", value: 3890 * multiplier, percentage: "+35%" },
        ];
        break;
      default:
        data = [
          { name: "Beverages", value: 4250 * multiplier, percentage: "+15%" },
          { name: "Baking", value: 3120 * multiplier, percentage: "+22%" },
          { name: "Meat", value: 2890 * multiplier, percentage: "+12%" },
          { name: "Produce", value: 1450 * multiplier, percentage: "+18%" },
          { name: "Dairy", value: 890 * multiplier, percentage: "+25%" },
        ];
    }

    return data;
  };

  if (loading || isLoading) {
    return (
      <Box
        sx={{
          height: height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const chartData = {
    labels: categories.map((category) => category.name),
    datasets: [
      {
        label: getDataSourceLabel(dataSource),
        data: categories.map((category) => category.value),
        backgroundColor: resolvedBarColor,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: resolvedTextColor,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label +=
                displayType === "price"
                  ? `£${context.parsed.y.toLocaleString('en-GB')}`
                  : context.parsed.y.toLocaleString('en-GB');
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: alpha(resolvedTextColor, 0.12),
        },
        ticks: {
          color: resolvedTextColor,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: alpha(resolvedTextColor, 0.06),
        },
        ticks: {
          color: resolvedTextColor,
          callback: (value: any) =>
            displayType === "price" ? `£${value}` : value,
        },
      },
    },
  };

  const calculatedTotal = categories.reduce(
    (sum, category) => sum + category.value,
    0
  );
  const averagePercentage =
    categories.reduce(
      (sum, category) => sum + Number.parseFloat(category.percentage),
      0
    ) / categories.length;

  return (
    <Box
      sx={{ height: height, position: "relative" }}
      onContextMenu={handleContextMenu}
    >
      {viewMode === "bars" ? (
        <Bar options={options} data={chartData} ref={chartRef} />
      ) : (
        <Box sx={{ mb: 2 }}>
          {categories.map((category, index) => (
            <Box
              key={category.name}
              sx={{
                mb: 3,
                animation: "fadeIn 0.5s ease-out forwards",
                animationDelay: `${index * 100}ms`,
                opacity: 0,
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" sx={{ color: resolvedTextColor }}>
                  {category.name}
                </Typography>
                <Typography variant="body2" color="success.main">
                  {category.percentage}
                </Typography>
              </Box>
              <Box
                sx={{
                  position: "relative",
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <LinearProgress
                  variant="determinate"
                  value={
                    (category.value /
                      Math.max(...categories.map((c) => c.value))) *
                    100
                  }
                  sx={{
                    height: 32,
                    borderRadius: 1,
                    width: "100%",
                    animation: "growWidth 1s ease-out forwards",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 1,
                      transition: "transform 1s ease-out",
                      backgroundColor: resolvedBarColor,
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  color="white"
                  sx={{
                    position: "absolute",
                    left: 16,
                    fontWeight: "medium",
                  }}
                >
                  {displayType === "price" ? "£" : ""}
                  {category.value.toLocaleString('en-GB')}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            setViewMode(viewMode === "bars" ? "progress" : "bars");
            handleClose();
          }}
        >
          Switch to {viewMode === "bars" ? "Progress Bars" : "Bar Chart"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (chartRef.current && viewMode === "bars") {
              // Download as PNG
              const link = document.createElement("a");
              link.download = "category-chart.png";
              link.href = chartRef.current.toBase64Image();
              link.click();
            }
            handleClose();
          }}
          disabled={viewMode !== "bars"}
        >
          Download as PNG
        </MenuItem>
        <MenuItem onClick={handleClose}>View Full Data</MenuItem>
      </Menu>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ color: alpha(resolvedTextColor, 0.6) }}>
            Total {getDataSourceLabel(dataSource)}{" "}
            {dateRange === "Last 7 Days"
              ? "This Week"
              : dateRange === "Last 30 Days" ||
                dateRange === "This Month" ||
                dateRange === "Last Month"
              ? "This Month"
              : "Today"}
          </Typography>
          <Typography variant="h5" fontWeight="bold" sx={{ color: resolvedTextColor }}>
            {displayType === "price" ? "£" : ""}
            {calculatedTotal.toLocaleString('en-GB')}
          </Typography>
        </Box>
        <Typography variant="body2" color="success.main" fontWeight="medium">
          ↑ {averagePercentage.toFixed(1)}% avg increase
        </Typography>
      </Box>
    </Box>
  );
};

// Helper function to get a readable label for data sources
function getDataSourceLabel(source?: string): string {
  switch (source) {
    case "stockCount":
      return "Stock Count";
    case "purchases":
      return "Purchases";
    case "sales":
      return "Sales";
    case "predictedStock":
      return "Predicted Stock";
    case "costOfSales":
      return "Cost of Sales";
    case "profit":
      return "Profit";
    default:
      return "Data";
  }
}

export default EnhancedCategoryChart;
