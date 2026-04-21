"use client";

import type React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  Typography,
  FormHelperText,
} from "@mui/material";
// import type { NewCorrectionProps } from "../../../backend/context/POSContext"; // Would export NewCorrectionProps from POSContext - would define interface for correction creation props

interface NewCorrectionProps {
  open: boolean;
  onClose: () => void;
  onAddCorrection: (correction: any) => void;
}

const NewCorrection: React.FC<NewCorrectionProps> = ({
  open,
  onClose,
  onAddCorrection,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"void" | "waste" | "edit">("void");
  const [errors, setErrors] = useState({
    name: "",
  });

  const validateForm = (): boolean => {
    const newErrors = {
      name: "",
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = "Correction name is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;

    try {
      await onAddCorrection({ name, type });
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding correction:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setType("void");
    setErrors({
      name: "",
    });
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Correction Type</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create a new correction type for billing adjustments. Correction
            types can be used to void items, record waste, or make edits to
            orders.
          </Typography>

          <TextField
            fullWidth
            label="Correction Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="correction-type-label">Correction Type</InputLabel>
            <Select
              labelId="correction-type-label"
              value={type}
              label="Correction Type"
              onChange={(e) =>
                setType(e.target.value as "void" | "waste" | "edit")
              }
            >
              <MenuItem value="void">Void (Remove from Sale)</MenuItem>
              <MenuItem value="waste">Waste (Stock Loss)</MenuItem>
              <MenuItem value="edit">Edit (Modify Item)</MenuItem>
            </Select>
            <FormHelperText>
              {type === "void" &&
                "Void removes the item from the sale with manager approval"}
              {type === "waste" &&
                "Waste reduces inventory without refunding the customer"}
              {type === "edit" && "Edit allows modification of an order item"}
            </FormHelperText>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="primary">
          Add Correction
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewCorrection;
