import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { auth } from "../../backend/services/Firebase";
import { APP_KEYS, getFunctionsBaseUrl } from "../../config/keys";

const AcceptAdminInvite: React.FC = () => {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (!inviteId) return;
      if (!auth.currentUser) return;
      setStatus("processing");
      try {
        const token = await auth.currentUser.getIdToken();
        const fnBase = getFunctionsBaseUrl({
          projectId: APP_KEYS.firebase.projectId,
          region: APP_KEYS.firebase.functionsRegion,
        });
        const resp = await fetch(`${fnBase}/claimAdminInvite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ inviteId }),
        });
        const data = await resp.json();
        if (!data?.success) {
          throw new Error(data?.error || "Failed to claim invite");
        }
        setStatus("success");
        setMessage("Invite accepted. Redirecting to admin…");
        setTimeout(() => navigate("/Admin"), 1200);
      } catch (e: any) {
        setStatus("error");
        setMessage(e.message || "Failed to accept invite");
      }
    };
    run();
  }, [inviteId, navigate]);

  const isLoggedIn = Boolean(auth.currentUser);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Card sx={{ maxWidth: 560, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Admin staff invite
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Invite: {inviteId}
          </Typography>

          {!isLoggedIn && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please login or create an account, then return to this invite link to activate your admin access.
              </Alert>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={() => navigate("/AdminLogin")}>
                  Login
                </Button>
                <Button variant="contained" onClick={() => navigate("/AdminRegister")}>
                  Create account
                </Button>
              </Box>
            </>
          )}

          {isLoggedIn && status === "idle" && (
            <Button variant="contained" onClick={() => window.location.reload()}>
              Continue
            </Button>
          )}

          {status === "processing" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>Accepting invite…</Typography>
            </Box>
          )}

          {status === "success" && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}

          {status === "error" && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AcceptAdminInvite;

