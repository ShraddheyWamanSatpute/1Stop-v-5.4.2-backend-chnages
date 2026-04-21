import { useLocation } from "react-router-dom";
import Register from "../../app/frontend/pages/Register";

export default function AdminRegister() {
  const location = useLocation();
  const nextParam = new URLSearchParams(location.search).get("next") || "";
  const safeNextPath = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
  const nextSuffix = safeNextPath ? `?next=${encodeURIComponent(safeNextPath)}` : "";

  return (
    <Register
      title="Create Admin Account"
      subtitle="Create an admin account to access the admin dashboard."
      adminMode={true}
      afterRegisterRedirect={`/AdminLogin${nextSuffix}`}
      loginPath={`/AdminLogin${nextSuffix}`}
    />
  );
}
