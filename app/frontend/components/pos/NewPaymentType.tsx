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
import { useCompany } from "../../../backend/context/CompanyContext";
// import type { NewPaymentTypeProps } from "../../../backend/context/POSContext"; // Would export NewPaymentTypeProps from POSContext - would define interface for payment type creation props

interface NewPaymentTypeProps {
  open: boolean;
  onClose: () => void;
  onAddPaymentType: (paymentType: any) => void;
}

const NewPaymentType: React.FC<NewPaymentTypeProps> = ({
  open,
  onClose,
  onAddPaymentType,
}) => {
  useCompany();
  const [name, setName] = useState("");
  const [type, setType] = useState<"cash" | "card">("card");
  const [errors, setErrors] = useState({
    name: "",
  });

  const validateForm = (): boolean => {
    const newErrors = {
      name: "",
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = "Payment type name is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;

    try {
      await onAddPaymentType({ name, type });
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding payment type:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setType("card");
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
      <DialogTitle>Add New Payment Type</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Add a new payment method that customers can use to pay for their
            orders. Choose between cash or card-based payment types.
          </Typography>

          <TextField
            fullWidth
            label="Payment Method Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            margin="normal"
            placeholder="e.g., Visa, Mastercard, Cash, etc."
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="payment-type-label">Payment Category</InputLabel>
            <Select
              labelId="payment-type-label"
              value={type}
              label="Payment Category"
              onChange={(e) => setType(e.target.value as "cash" | "card")}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="card">Card / Digital</MenuItem>
            </Select>
            <FormHelperText>
              {type === "cash" &&
                "For physical cash or cash equivalents like vouchers"}
              {type === "card" &&
                "For credit cards, debit cards and digital payments"}
            </FormHelperText>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="primary">
          Add Payment Type
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewPaymentType;
