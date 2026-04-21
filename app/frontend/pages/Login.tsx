"use client";

import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
} from "@mui/material";
import { useSettings } from "../../backend/context/SettingsContext";
import { auth, db, get, ref } from "../../backend/services/Firebase";
import { APP_KEYS, getFunctionsFetchBaseUrl } from "../../backend/config/keys"

type LoginProps = {
  title?: string
  appName?: string
  redirectTo?: string
  registerPath?: string
  resetPath?: string
  requireAdmin?: boolean
  showRememberMe?: boolean
  showRegisterLink?: boolean
  showResetLink?: boolean
}

const Login: React.FC<LoginProps> = ({
  title = "Log In",
  appName = "1 Stop",
  redirectTo,
  registerPath = "/Register",
  resetPath = "/ResetPassword",
  requireAdmin = false,
  showRememberMe = true,
  showRegisterLink = true,
  showResetLink = true,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, logout } = useSettings();
  const navigate = useNavigate();

  const resendVerification = async () => {
    if (!email) {
      setMessage("Please enter your email first.")
      return
    }
    setIsLoading(true)
    setMessage("")
    try {
      const fnBase = getFunctionsFetchBaseUrl({
        projectId: APP_KEYS.firebase.projectId,
        region: APP_KEYS.firebase.functionsRegion,
      })
      const continueUrl = `${window.location.origin}/Login`
      const res = await fetch(`${fnBase}/sendAuthEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "verifyEmail", email, continueUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to resend verification email.")
      setMessage("Verification email sent. Please check your inbox/spam and try logging in again.")
    } catch (err: any) {
      setMessage(err?.message || "Failed to resend verification email.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      if (!email || !password) {
        throw new Error("Email and Password are required.");
      }

      // Step 1: Verify credentials only - this is fast
      const { uid } = await login(email, password);

      // Step 2: If admin required, check access
      if (requireAdmin) {
        if (!uid) {
          try {
            await logout();
          } catch {
            // ignore
          }
          throw new Error("Admin login failed: missing user session.");
        }

        // Read user data to check admin access
        const userSnap = await get(ref(db, `users/${uid}`));
        if (!userSnap.exists()) {
          try {
            await logout();
          } catch {
            // ignore
          }
          throw new Error("User data not found. Please contact support.");
        }
        
        const userData: any = userSnap.val();
        const hasAdminAccess = Boolean(userData?.isAdmin) || Boolean(userData?.adminStaff?.active);
        
        if (!hasAdminAccess) {
          try {
            await logout();
          } catch {
            // ignore
          }
          throw new Error("This account does not have admin access.");
        }
        
        // Mark as admin user in localStorage for faster subsequent checks
        localStorage.setItem("isAdminUser", "true");
      }
      
      // Step 3: Credentials verified - redirect immediately
      // Data loading happens in background via onAuthStateChanged
      // The target page will show loading state while data initializes
      setMessage("Redirecting...");
      setIsLoading(false);
      
      if (keepSignedIn) {
        localStorage.setItem("keepSignedIn", "true");
      }

      if (redirectTo) {
        navigate(redirectTo);
        return;
      }
      
      // Check if we're on mobile route and redirect accordingly
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/Mobile")) {
        navigate("/Mobile/Dashboard");
      } else if (currentPath.startsWith("/ESS")) {
        navigate("/ESS/Dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      setIsLoading(false);
      setMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    }
  };

  const showResendVerification = message.includes("EMAIL_NOT_VERIFIED") || message.toLowerCase().includes("isn’t verified") || message.toLowerCase().includes("isn't verified")

  return (
    <Container maxWidth="sm">
      <Card sx={{ marginTop: 8, padding: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
              {appName}
            </Typography>
          </Box>
          <Typography variant="h5" gutterBottom>
            {title}
          </Typography>
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {showRememberMe ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                  />
                }
                label="Remember Me"
              />
            ) : null}
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={isLoading}
              sx={{ marginTop: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : "Log In"}
            </Button>
            {showResendVerification ? (
              <Button
                fullWidth
                variant="outlined"
                onClick={resendVerification}
                disabled={isLoading}
                sx={{ marginTop: 1 }}
              >
                Resend verification email
              </Button>
            ) : null}
            {showRegisterLink ? (
              <Button
                fullWidth
                variant="text"
                onClick={() => navigate(registerPath)}
                sx={{ marginTop: 1 }}
              >
                Create Account
              </Button>
            ) : null}
            {showResetLink ? (
              <Button
                fullWidth
                variant="text"
                onClick={() => navigate(resetPath)}
              >
                Forgot Password
              </Button>
            ) : null}
            {message && (
              <Typography
                sx={{
                  marginTop: 2,
                  color: message.toLowerCase().includes("successful") ? "success.main" : "error.main",
                }}
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

export default Login;
