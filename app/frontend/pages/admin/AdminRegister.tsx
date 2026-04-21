import React from "react"
import Register from "../Register"

export default function AdminRegister() {
  return (
    <Register
      title="Create Admin Account"
      subtitle="Create an admin account to access the admin dashboard."
      adminMode={true}
      afterRegisterRedirect="/AdminLogin"
      loginPath="/AdminLogin"
    />
  )
}

