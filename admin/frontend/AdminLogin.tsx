import { useLocation } from "react-router-dom";
import Login from "../../app/frontend/pages/Login";

export default function AdminLogin() {
  const location = useLocation();
  const nextParam = new URLSearchParams(location.search).get("next") || "";
  const safeNextPath = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
  const inviteFlow = safeNextPath.toLowerCase().startsWith("/admininvite/");
  const nextSuffix = safeNextPath ? `?next=${encodeURIComponent(safeNextPath)}` : "";

  return (
    <Login
      title="Admin Login"
      appName="Admin / Login"
      redirectTo="/"
      registerPath={`/AdminRegister${nextSuffix}`}
      resetPath="/ResetPassword"
      requireAdmin={!inviteFlow}
      showRememberMe={true}
      showRegisterLink={true}
      showResetLink={true}
    />
  );
}
