"use client";
import { Card, CardContent } from "@mui/material";
import type React from "react";

// Mark unused props with underscore prefix to indicate they're intentionally unused
interface ResizableCardProps {
  children: React.ReactNode;
  _id?: string; // Renamed from id
  _title?: string; // Made optional and renamed from title
  _position?: { x: number; y: number }; // Renamed from position
  _size?: { width: number; height: number }; // Renamed from size
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  _onDelete?: () => void; // Renamed from onDelete
  _onSettings?: () => void; // Renamed from onSettings
  className?: string;
  gridSize?: number; // Add this prop
  sx?: any;
  elevation?: number;
}

// Also rename the destructured variables in the component function
const ResizableCard: React.FC<ResizableCardProps> = ({
  children,
  className,
  sx,
  elevation = 1,
}) => {
  // Rename unused variables in the component

  // Snap to grid helper

  // Rename unused functions

  // Rename unused functions

  return (
    <Card
      elevation={elevation}
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
        ...sx,
      }}
      className={className}
    >
      <CardContent sx={{ height: "100%", p: 2 }}>{children}</CardContent>
    </Card>
  );
};

export default ResizableCard;

// ResizableCard.tsx

export const DATA_SOURCES = [
  { label: "Stock Count", value: "stockCount" },
  { label: "Purchases", value: "purchases" },
  { label: "Sales", value: "sales" },
  { label: "Predicted Stock", value: "predictedStock" },
  { label: "Cost of Sales", value: "costOfSales" },
  { label: "Profit", value: "profit" },
];

export const DISPLAY_TYPES = [
  { label: "Price", value: "price" },
  { label: "Quantity", value: "quantity" },
];
