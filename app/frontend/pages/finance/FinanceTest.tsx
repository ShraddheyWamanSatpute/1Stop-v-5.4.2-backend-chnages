import React from "react"
import { Box, Typography, Button, Card, CardContent } from "@mui/material"
import { useFinance } from "../../../backend/context/FinanceContext"

const FinanceTest: React.FC = () => {
  const { 
    state, 
    refreshAll, 
    formatCurrency,
    getOutstandingInvoices,
    getOverdueBills 
  } = useFinance()

  const handleRefresh = () => {
    refreshAll()
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Finance Context Test
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={handleRefresh} 
        sx={{ mb: 3 }}
        disabled={state.loading}
      >
        {state.loading ? "Loading..." : "Refresh Data"}
      </Button>

      {state.error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error: {state.error}
        </Typography>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Context State</Typography>
          <Typography>Base Path: {state.basePath || "Not set"}</Typography>
          <Typography>Loading: {state.loading ? "Yes" : "No"}</Typography>
          <Typography>Accounts: {state.accounts.length}</Typography>
          <Typography>Invoices: {state.invoices.length}</Typography>
          <Typography>Bills: {state.bills.length}</Typography>
          <Typography>Expenses: {state.expenses.length}</Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Function Tests</Typography>
          <Typography>Outstanding Invoices: {getOutstandingInvoices().length}</Typography>
          <Typography>Overdue Bills: {getOverdueBills().length}</Typography>
          <Typography>Format Currency Test: {formatCurrency(1234.56)}</Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default FinanceTest
