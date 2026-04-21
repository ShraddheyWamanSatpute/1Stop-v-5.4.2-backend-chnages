"use client";

import type React from "react";
import { Box, Typography, useTheme } from "@mui/material";

// Simple Line Chart Component
interface LineChartProps {
  data: { name: string; [key: string]: number | string }[];
  lines: { dataKey: string; color: string; strokeWidth?: number }[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export const SimpleLineChart: React.FC<LineChartProps> = ({
  data,
  lines,
  width = 600,
  height = 250,
  showGrid = true,
  showTooltip = true,
}) => {
  const theme = useTheme();
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const allValues = data.flatMap(d => lines.map(l => Number(d[l.dataKey]) || 0));
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues, 0);

  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  // Generate path for line
  const generatePath = (dataKey: string) => {
    return data.map((d, i) => {
      const x = xScale(i) + padding.left;
      const y = yScale(Number(d[dataKey]) || 0) + padding.top;
      return i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }).join('');
  };

  return (
    <Box sx={{ width, height, position: 'relative' }}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {showGrid && (
          <g>
            {/* Horizontal grid lines */}
            {Array.from({ length: 5 }, (_, i) => {
              const y = padding.top + (chartHeight / 4) * i;
              return (
                <line
                  key={`h-grid-${i}`}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={theme.palette.divider}
                  strokeDasharray="2,2"
                />
              );
            })}
            {/* Vertical grid lines */}
            {data.map((_, i) => {
              const x = xScale(i) + padding.left;
              return (
                <line
                  key={`v-grid-${i}`}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke={theme.palette.divider}
                  strokeDasharray="2,2"
                />
              );
            })}
          </g>
        )}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={theme.palette.text.primary}
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={theme.palette.text.primary}
        />

        {/* Lines */}
        {lines.map((line) => (
          <path
            key={line.dataKey}
            d={generatePath(line.dataKey)}
            fill="none"
            stroke={line.color}
            strokeWidth={line.strokeWidth || 2}
          />
        ))}

        {/* Data points */}
        {lines.map((line) =>
          data.map((d, i) => (
            <circle
              key={`${line.dataKey}-point-${i}`}
              cx={xScale(i) + padding.left}
              cy={yScale(Number(d[line.dataKey])) + padding.top}
              r={3}
              fill={line.color}
            />
          ))
        )}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`x-label-${i}`}
            x={xScale(i) + padding.left}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fontSize="12"
            fill={theme.palette.text.secondary}
          >
            {d.name}
          </text>
        ))}

        {/* Y-axis labels */}
        {Array.from({ length: 5 }, (_, i) => {
          const value = minValue + ((maxValue - minValue) / 4) * (4 - i);
          const y = padding.top + (chartHeight / 4) * i;
          return (
            <text
              key={`y-label-${i}`}
              x={padding.left - 10}
              y={y + 5}
              textAnchor="end"
              fontSize="12"
              fill={theme.palette.text.secondary}
            >
              {Math.round(value)}
            </text>
          );
        })}
      </svg>
    </Box>
  );
};

// Simple Bar Chart Component
interface BarChartProps {
  data: { name: string; value: number }[];
  color?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  color = '#1976d2',
  width = 600,
  height = 250,
  showGrid = true,
}) => {
  const theme = useTheme();
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = chartWidth / data.length * 0.6;
  const barSpacing = chartWidth / data.length;

  const yScale = (value: number) => chartHeight - (value / maxValue) * chartHeight;

  return (
    <Box sx={{ width, height, position: 'relative' }}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {showGrid && (
          <g>
            {Array.from({ length: 5 }, (_, i) => {
              const y = padding.top + (chartHeight / 4) * i;
              return (
                <line
                  key={`h-grid-${i}`}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={theme.palette.divider}
                  strokeDasharray="2,2"
                />
              );
            })}
          </g>
        )}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={theme.palette.text.primary}
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={theme.palette.text.primary}
        />

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding.left + barSpacing * i + (barSpacing - barWidth) / 2;
          const barHeight = yScale(d.value);
          const y = height - padding.bottom - barHeight;
          
          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={4}
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`x-label-${i}`}
            x={padding.left + barSpacing * i + barSpacing / 2}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fontSize="12"
            fill={theme.palette.text.secondary}
          >
            {d.name}
          </text>
        ))}

        {/* Y-axis labels */}
        {Array.from({ length: 5 }, (_, i) => {
          const value = (maxValue / 4) * (4 - i);
          const y = padding.top + (chartHeight / 4) * i;
          return (
            <text
              key={`y-label-${i}`}
              x={padding.left - 10}
              y={y + 5}
              textAnchor="end"
              fontSize="12"
              fill={theme.palette.text.secondary}
            >
              {Math.round(value)}
            </text>
          );
        })}
      </svg>
    </Box>
  );
};

// Simple Pie Chart Component
interface PieChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  width?: number;
  height?: number;
}

export const SimplePieChart: React.FC<PieChartProps> = ({
  data,
  colors = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2'],
  width = 300,
  height = 300,
}) => {
  const theme = useTheme();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -Math.PI / 2;

  const createPieSlice = (d: { name: string; value: number }, index: number) => {
    const percentage = d.value / total;
    const angle = percentage * 2 * Math.PI;
    const endAngle = currentAngle + angle;

    const x1 = centerX + radius * Math.cos(currentAngle);
    const y1 = centerY + radius * Math.sin(currentAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    currentAngle = endAngle;

    return (
      <g key={`pie-${index}`}>
        <path
          d={pathData}
          fill={colors[index % colors.length]}
          stroke="white"
          strokeWidth={2}
        />
        {/* Label */}
        {percentage > 0.05 && (
          <text
            x={centerX + (radius / 2) * Math.cos(currentAngle - angle / 2)}
            y={centerY + (radius / 2) * Math.sin(currentAngle - angle / 2)}
            textAnchor="middle"
            fontSize="12"
            fill="white"
            fontWeight="bold"
          >
            {`${Math.round(percentage * 100)}%`}
          </text>
        )}
      </g>
    );
  };

  return (
    <Box sx={{ width, height, position: 'relative' }}>
      <svg width={width} height={height}>
        {data.map((d, i) => createPieSlice(d, i))}
      </svg>
      
      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {data.map((d, i) => (
          <Box key={`legend-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                bgcolor: colors[i % colors.length],
                borderRadius: '50%',
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '11px' }}>
              {d.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
