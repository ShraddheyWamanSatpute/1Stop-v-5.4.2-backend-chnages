import Login from "../Login"

export default function AdminLogin() {
  return (
    <Login
      title="Admin Login"
      appName="Admin • Login"
      redirectTo="/Admin"
      registerPath="/AdminRegister"
      resetPath="/ResetPassword"
      requireAdmin
      showRememberMe={true}
      showRegisterLink={true}
      showResetLink={true}
    />
  )
}

