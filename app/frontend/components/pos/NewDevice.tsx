"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
  Grid,
  FormHelperText,
} from "@mui/material";
// import type { NewDeviceProps } from "../../../backend/context/POSContext"; // Would export NewDeviceProps from POSContext - would define interface for device creation props

interface NewDeviceProps {
  open: boolean;
  onClose: () => void;
  onAddDevice: (device: any) => void;
  locations: any[];
}

const NewDevice: React.FC<NewDeviceProps> = ({
  open,
  onClose,
  onAddDevice,
  locations,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<
    "Tablet" | "PC" | "Phone" | "Printer" | "Scanner" | "Other"
  >("Tablet");
  const [connection, setConnection] = useState<"LAN" | "Online">("LAN");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive" | "Maintenance">(
    "Active"
  );
  const [macAddress, setMacAddress] = useState("");
  const [ipAddress, setIpAddress] = useState("");

  const [errors, setErrors] = useState({
    name: "",
    location: "",
  });

  useEffect(() => {
    if (locations.length > 0 && !location) {
      setLocation(locations[0].id);
    }
  }, [locations]);

  const validateForm = (): boolean => {
    const newErrors = {
      name: "",
      location: "",
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = "Device name is required";
      isValid = false;
    }

    if (!location) {
      newErrors.location = "Location is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;

    try {
      const selectedLocation = locations.find((loc) => loc.id === location);
      if (!selectedLocation) return;

      await onAddDevice({
        name,
        type,
        connection,
        location: {
          id: selectedLocation.id,
          name: selectedLocation.name,
          description: selectedLocation.description,
          active: selectedLocation.active
        },
        status,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding device:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setType("Tablet");
    setConnection("LAN");
    setStatus("Active");
    setMacAddress("");
    setIpAddress("");
    if (locations.length > 0) {
      setLocation(locations[0].id);
    } else {
      setLocation("");
    }
    setErrors({
      name: "",
      location: "",
    });
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Device</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Register a new device for your POS system. This can be a terminal,
            printer, scanner or other peripheral device.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Device Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={Boolean(errors.name)}
                helperText={errors.name}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="device-type-label">Device Type</InputLabel>
                <Select
                  labelId="device-type-label"
                  value={type}
                  label="Device Type"
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <MenuItem value="Tablet">Tablet</MenuItem>
                  <MenuItem value="PC">PC / Terminal</MenuItem>
                  <MenuItem value="Phone">Mobile Phone</MenuItem>
                  <MenuItem value="Printer">Receipt Printer</MenuItem>
                  <MenuItem value="Scanner">Scanner</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="connection-type-label">Connection</InputLabel>
                <Select
                  labelId="connection-type-label"
                  value={connection}
                  label="Connection"
                  onChange={(e) =>
                    setConnection(e.target.value as "LAN" | "Online")
                  }
                >
                  <MenuItem value="LAN">Local Network (LAN)</MenuItem>
                  <MenuItem value="Online">Cloud / Internet</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={Boolean(errors.location)}>
                <InputLabel id="location-label">Location</InputLabel>
                <Select
                  labelId="location-label"
                  value={location}
                  label="Location"
                  onChange={(e) => setLocation(e.target.value)}
                >
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.location && (
                  <FormHelperText>{errors.location}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={status}
                  label="Status"
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "Active" | "Inactive" | "Maintenance"
                    )
                  }
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="MAC Address (Optional)"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                placeholder="00:00:00:00:00:00"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="IP Address (Optional)"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.100"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="primary">
          Add Device
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewDevice;
