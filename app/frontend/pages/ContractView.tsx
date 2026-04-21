"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Typography, Alert } from "@mui/material"
import { useHR } from "../../backend/context/HRContext"
import type { Contract, Employee } from "../../backend/interfaces/HRs"

const ContractView: React.FC = () => {
  const navigate = useNavigate()
  const { companyId, siteId, contractId } = useParams()
  const { state: hrState, updateContract } = useHR()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    if (!companyId || !siteId || !contractId) { 
      setError("Invalid contract link"); 
      setLoading(false); 
      return 
    }
    
    // Find contract from HR context state
    const found = (hrState.contracts || []).find(c => String(c.id) === String(contractId)) || null
    setContract(found)
    
    if (found) {
      const emp = (hrState.employees || []).find((e: any) => String(e.id) === String(found.employeeId)) || null
      setEmployee(emp as any)
    }
    
    setLoading(false)
  }, [companyId, siteId, contractId, hrState.contracts, hrState.employees])

  const canSign = useMemo(() => contract && (contract.status === "sent" || contract.status === "draft"), [contract])

  const handleSign = async () => {
    if (!contractId || !contract) return
    try {
      await updateContract(contractId, { status: "signed", signedDate: Date.now() })
      setContract({ ...contract, status: "signed", signedDate: Date.now() })
    } catch (e) {
      setError("Failed to sign contract")
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!contract) {
    return <Alert severity="error" sx={{ m: 3 }}>{error || 'Contract not found'}</Alert>
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader title={contract.contractTitle || contract.roleName || 'Employment Contract'} subheader={employee ? `${employee.firstName} ${employee.lastName}` : ''} />
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">Status: {contract.status}</Typography>
            {contract.signedDate && (
              <Typography variant="body2" color="text.secondary">Signed: {new Date(contract.signedDate).toLocaleString()}</Typography>
            )}
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <div dangerouslySetInnerHTML={{ __html: contract.bodyHtml || '' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            {canSign && <Button variant="contained" onClick={handleSign}>Sign Contract</Button>}
            <Button variant="outlined" onClick={() => window.print()}>Print / Save as PDF</Button>
            <Button onClick={() => navigate('/')}>Back</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ContractView


