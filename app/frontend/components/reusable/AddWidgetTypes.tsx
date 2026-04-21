"use client";

import type React from "react";
import { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from "@mui/material";
import { Add, BarChart, TableChart, Dashboard } from "@mui/icons-material";
import { DataType } from "../../types/WidgetTypes"


interface AddWidgetButtonProps {
  onAddWidget: (type: "chart" | "stat" | "table", dataType: DataType) => void;
}

const AddWidgetButton: React.FC<AddWidgetButtonProps> = ({ onAddWidget }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [widgetType, setWidgetType] = useState<"chart" | "stat" | "table">(
    "chart"
  );
  const [dataType, setDataType] = useState<DataType>(DataType.STOCK_COUNT);


  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleWidgetTypeSelect = (type: "chart" | "stat" | "table") => {
    setWidgetType(type);
    setDialogOpen(true);
    handleClose();
  };

  const handleAddWidget = () => {
    onAddWidget(widgetType, dataType);
    setDialogOpen(false);
  };

  const dataTypeOptions: { value: DataType; label: string }[] = [
  { value: DataType.STOCK_COUNT, label: "Stock Count" },
  { value: DataType.PURCHASES, label: "Purchases" },
  { value: DataType.SALES, label: "Sales" },
  { value: DataType.PREDICTED_STOCK, label: "Predicted Stock" },
  { value: DataType.COST_OF_SALES, label: "Cost of Sales" },
  { value: DataType.PROFIT, label: "Profit" },
  { value: DataType.PAR_LEVELS, label: "Par Levels" },
  { value: DataType.STOCK_VALUE, label: "Stock Value" },
  { value: DataType.STOCK_TURNOVER, label: "Stock Turnover" },
  { value: DataType.TOP_ITEMS, label: "Top Items" },
]
;

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={handleClick}
      >
        Add Widget
      </Button>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => handleWidgetTypeSelect("chart")}>
          <ListItemIcon>
            <BarChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>Chart</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleWidgetTypeSelect("stat")}>
          <ListItemIcon>
            <Dashboard fontSize="small" />
          </ListItemIcon>
          <ListItemText>Stat Card</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleWidgetTypeSelect("table")}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>Table</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add {widgetType}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={dataType}
                  label="Data Type"
                  onChange={(e) => setDataType(e.target.value as DataType)}
                >
                  {dataTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddWidget} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddWidgetButton;
