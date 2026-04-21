"use client";

import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
} from "@mui/material";
import { useSettings } from "../../backend/context/SettingsContext";

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { passwordReset } = useSettings();

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      if (!email) {
        throw new Error("Email is required to reset the password.");
      }
      await passwordReset(email);
      setIsSuccess(true);
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (error) {
      setIsSuccess(false);
      setMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Card sx={{ marginTop: 8, padding: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
              1 Stop
            </Typography>
          </Box>
          <Typography variant="h5" gutterBottom>
            Reset Password
          </Typography>
          <form onSubmit={handlePasswordReset}>
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{ marginTop: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : "Submit"}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate("/Login")}
              sx={{ marginTop: 1 }}
            >
              Back to Login
            </Button>
            {message && (
              <Typography
                color={isSuccess ? "success.main" : "error"}
                sx={{ marginTop: 2, textAlign: "center" }}
              >
                {message}
              </Typography>
            )}
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ResetPassword;
