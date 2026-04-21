"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useStock } from "../../../backend/context/StockContext";
import { useCompany } from "../../../backend/context/CompanyContext";
import { themeConfig } from "../../../theme/AppTheme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// ✅ NEW TYPE FOR CHART DATA
interface PerformanceChartData {
  labels: string[];
  primaryData: number[];
  secondaryData: number[];
}

interface PerformanceChartProps {
  dateRange: string;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  isLoading?: boolean;
  dataSource?: string;
  compareDataSource?: string;
  displayType?: "price" | "quantity";
  showComparison?: boolean;
  backgroundColor?: string;
  textColor?: string;
  data?: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string;
    }[];
  };
}

const EnhancedPerformanceChart: React.FC<PerformanceChartProps> = ({
  dateRange = "Last 7 Days",
  height = 250,
  primaryColor = themeConfig.brandColors.navy,
  secondaryColor = themeConfig.brandColors.offWhite,
  isLoading = false,
  dataSource = "stockCount",
  compareDataSource = "purchases",
  displayType = "price",
  showComparison = true,
  backgroundColor = themeConfig.brandColors.offWhite,
  textColor = themeConfig.brandColors.navy,
}) => {
  const { state: companyState } = useCompany();
  const { fetchStockHistory } = useStock();
  const [stockData, setStockData] = useState<PerformanceChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const chartRef = useRef<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let primaryResult: any[] = [];
        let secondaryResult: any[] = [];

        if (companyState.companyID && companyState.selectedSiteID) {
          primaryResult = await fetchStockHistory();

          if (showComparison) {
            secondaryResult = await fetchStockHistory();
          }
        }

        const processedData: PerformanceChartData = {
          labels: getLabels(),
          primaryData: primaryResult.map((item) =>
            displayType === "price" ? item.value : item.quantity
          ),
          secondaryData: secondaryResult.map((item) =>
            displayType === "price" ? item.value : item.quantity
          ),
        };

        setStockData(processedData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setStockData(getMockData());
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
    compareDataSource,
    displayType,
    showComparison,
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

  const getMockData = (): PerformanceChartData => {
    let primaryData: number[] = [];
    let secondaryData: number[] = [];

    switch (dateRange) {
      case "Today":
        primaryData = [4200, 4300, 4250, 4400, 4500, 4600, 4700];
        secondaryData = [4000, 4100, 4050, 4200, 4300, 4400, 4500];
        break;
      case "Yesterday":
        primaryData = [4000, 4100, 4150, 4200, 4300, 4400, 4500];
        secondaryData = [3800, 3900, 3950, 4000, 4100, 4200, 4300];
        break;
      case "Last 7 Days":
        primaryData = [42000, 43500, 42500, 44000, 45000, 46000, 47000];
        secondaryData = [40000, 41000, 40500, 42000, 43000, 44000, 45000];
        break;
      case "Last 30 Days":
      case "This Month":
      case "Last Month":
        primaryData = [140000, 145000, 150000, 148000];
        secondaryData = [130000, 135000, 140000, 138000];
        break;
      default:
        primaryData = [42000, 43500, 42500, 44000, 45000, 46000, 47000];
        secondaryData = [40000, 41000, 40500, 42000, 43000, 44000, 45000];
    }

    return {
      labels: getLabels(),
      primaryData,
      secondaryData,
    };
  };

  const getLabels = () => {
    switch (dateRange) {
      case "Today":
      case "Yesterday":
        return ["9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM"];
      case "Last 7 Days":
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      case "Last 30 Days":
      case "This Month":
      case "Last Month":
        return ["Week 1", "Week 2", "Week 3", "Week 4"];
      default:
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }
  };

  if (loading || isLoading || !stockData) {
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
    labels: stockData.labels,
    datasets: [
      {
        label: getDataSourceLabel(dataSource),
        data: stockData.primaryData,
        borderColor: primaryColor,
        backgroundColor: `${primaryColor}20`,
        tension: 0.4,
        borderWidth: 3,
        fill: true,
      },
      ...(showComparison
        ? [
            {
              label: getDataSourceLabel(compareDataSource),
              data: stockData.secondaryData,
              borderColor: secondaryColor,
              backgroundColor: `${secondaryColor}20`,
              tension: 0.4,
              borderWidth: 2,
              borderDash: [5, 5],
              fill: true,
            },
          ]
        : []),
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: textColor,
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || "";
            if (label) label += ": ";
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
    interaction: {
      mode: "nearest",
      intersect: false,
    },
    scales: {
      x: {
        grid: { display: false, color: `${textColor}20` },
        ticks: { color: textColor },
      },
      y: {
        beginAtZero: false,
        grid: { color: `${textColor}10` },
        ticks: {
          color: textColor,
          callback: (value) => (displayType === "price" ? `£${value}` : value),
        },
      },
    },
  };

  const calculateTotalChange = () => {
    const primaryTotal = stockData.primaryData.reduce(
      (sum, val) => sum + val,
      0
    );
    const secondaryTotal = stockData.secondaryData.reduce(
      (sum, val) => sum + val,
      0
    );
    const percentChange =
      ((primaryTotal - secondaryTotal) / secondaryTotal) * 100;
    return {
      total: primaryTotal,
      change: percentChange.toFixed(1),
    };
  };

  const totals = calculateTotalChange();

  return (
    <Box
      sx={{ height, position: "relative", backgroundColor }}
      onContextMenu={handleContextMenu}
    >
      <Line options={options} data={chartData} ref={chartRef} />

      <Box sx={{ display: "flex", justifyContent: "center", gap: 4, mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: primaryColor,
            }}
          />
          <Typography variant="body2" sx={{ color: textColor }}>
            {getDataSourceLabel(dataSource)}
          </Typography>
        </Box>
        {showComparison && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: secondaryColor,
              }}
            />
            <Typography variant="body2" sx={{ color: textColor }}>
              {getDataSourceLabel(compareDataSource)}
            </Typography>
          </Box>
        )}
      </Box>

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
            if (chartRef.current) {
              const link = document.createElement("a");
              link.download = "performance-chart.png";
              link.href = chartRef.current.toBase64Image();
              link.click();
            }
            handleClose();
          }}
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
          mt: 2,
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ color: `${textColor}99` }}>
            Total {getDataSourceLabel(dataSource)}{" "}
            {dateRange.includes("7 Days")
              ? "This Week"
              : dateRange.includes("Month")
              ? "This Month"
              : "Today"}
          </Typography>
          <Typography variant="h5" fontWeight="bold" sx={{ color: textColor }}>
            {displayType === "price" ? "£" : ""}
            {totals.total.toLocaleString('en-GB')}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color={parseFloat(totals.change) > 0 ? "success.main" : "error.main"}
          fontWeight="medium"
        >
          {parseFloat(totals.change) > 0 ? "↑" : "↓"}{" "}
          {Math.abs(parseFloat(totals.change))}% vs{" "}
          {getDataSourceLabel(compareDataSource)}
        </Typography>
      </Box>
    </Box>
  );
};

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

export default EnhancedPerformanceChart;

