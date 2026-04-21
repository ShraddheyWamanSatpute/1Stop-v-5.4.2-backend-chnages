"use client"

import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material'
import {
  Upload as UploadIcon,
  FileUpload as FileUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
} from '@mui/icons-material'
import { useFinance } from '../../../../backend/context/FinanceContext'
import type { BankStatement } from '../../../../backend/interfaces/Finance'

interface StatementImportFormProps {
  bankAccountId: string
  onImport: (statements: Omit<BankStatement, "id" | "bank_account_id">[]) => Promise<void>
  onClose: () => void
}

interface ParsedStatement {
  date: string
  description: string
  amount: number
  currency: string
  type: 'debit' | 'credit'
  reference?: string
  balance?: number
  fees?: number
}

const StatementImportForm: React.FC<StatementImportFormProps> = ({
  bankAccountId,
  onImport,
  onClose
}) => {
  const { state: financeState } = useFinance()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [parsedStatements, setParsedStatements] = useState<ParsedStatement[]>([])
  const [importFormat, setImportFormat] = useState<'csv' | 'ofx' | 'auto'>('auto')
  const [errors, setErrors] = useState<string[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)

  const bankAccount = financeState.bankAccounts.find(a => a.id === bankAccountId)

  const parseCSV = (text: string): ParsedStatement[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV file must have at least a header and one data row')

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const statements: ParsedStatement[] = []

    // Common CSV formats
    const dateIndex = headers.findIndex(h => h.includes('date'))
    const descIndex = headers.findIndex(h => h.includes('description') || h.includes('details') || h.includes('memo'))
    const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('value'))
    const debitIndex = headers.findIndex(h => h.includes('debit'))
    const creditIndex = headers.findIndex(h => h.includes('credit'))
    const refIndex = headers.findIndex(h => h.includes('reference') || h.includes('ref') || h.includes('transaction'))

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      
      if (values.length < headers.length) continue

      const date = values[dateIndex] || ''
      const description = values[descIndex] || ''
      let amount = 0
      let type: 'debit' | 'credit' = 'debit'

      if (debitIndex >= 0 && creditIndex >= 0) {
        const debit = parseFloat(values[debitIndex]) || 0
        const credit = parseFloat(values[creditIndex]) || 0
        amount = debit > 0 ? debit : credit
        type = debit > 0 ? 'debit' : 'credit'
      } else if (amountIndex >= 0) {
        amount = Math.abs(parseFloat(values[amountIndex]) || 0)
        type = parseFloat(values[amountIndex]) < 0 ? 'debit' : 'credit'
      }

      if (!date || !description || amount === 0) continue

      statements.push({
        date: new Date(date).toISOString().split('T')[0],
        description,
        amount,
        currency: bankAccount?.currency || 'GBP',
        type,
        reference: refIndex >= 0 ? values[refIndex] : undefined,
      })
    }

    return statements
  }

  const parseOFX = async (text: string): Promise<ParsedStatement[]> => {
    // Basic OFX parsing - in production, use a proper OFX parser library
    const statements: ParsedStatement[] = []
    
    // Extract STMTTRN blocks
    const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
    let match

    while ((match = stmttrnRegex.exec(text)) !== null) {
      const block = match[1]
      
      const dtPosted = block.match(/<DTPOSTED>(\d+)/)?.[1]
      const memo = block.match(/<MEMO>([^<]+)/)?.[1] || ''
      const trnamt = block.match(/<TRNAMT>([-\d.]+)/)?.[1]
      const fitid = block.match(/<FITID>([^<]+)/)?.[1]

      if (dtPosted && trnamt) {
        // OFX date format: YYYYMMDDHHMMSS
        const year = dtPosted.substring(0, 4)
        const month = dtPosted.substring(4, 6)
        const day = dtPosted.substring(6, 8)
        const date = `${year}-${month}-${day}`

        const amount = Math.abs(parseFloat(trnamt))
        const type: 'debit' | 'credit' = parseFloat(trnamt) < 0 ? 'debit' : 'credit'

        statements.push({
          date,
          description: memo || 'OFX Transaction',
          amount,
          currency: bankAccount?.currency || 'GBP',
          type,
          reference: fitid,
        })
      }
    }

    return statements
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setErrors([])
    setParsedStatements([])

    try {
      const text = await file.text()
      let statements: ParsedStatement[] = []

      if (importFormat === 'csv' || (importFormat === 'auto' && file.name.endsWith('.csv'))) {
        statements = parseCSV(text)
      } else if (importFormat === 'ofx' || (importFormat === 'auto' && (file.name.endsWith('.ofx') || file.name.endsWith('.qfx')))) {
        statements = await parseOFX(text)
      } else {
        throw new Error('Unsupported file format. Please use CSV or OFX files.')
      }

      if (statements.length === 0) {
        setErrors(['No valid transactions found in the file.'])
      } else {
        setParsedStatements(statements)
        setPreviewOpen(true)
      }
    } catch (error: any) {
      setErrors([error.message || 'Failed to parse file'])
    } finally {
      setImporting(false)
    }
  }

  const handleImport = async () => {
    if (parsedStatements.length === 0) return

    setImporting(true)
    try {
      const statementsToImport = parsedStatements.map(stmt => ({
        date: stmt.date,
        description: stmt.description,
        amount: stmt.type === 'debit' ? -Math.abs(stmt.amount) : Math.abs(stmt.amount),
        currency: stmt.currency,
        reconciled: false,
        reference: stmt.reference,
        type: stmt.type,
        balance: stmt.balance,
        fees: stmt.fees,
      }))

      await onImport(statementsToImport)
      setPreviewOpen(false)
      onClose()
    } catch (error: any) {
      setErrors([error.message || 'Failed to import statements'])
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Date,Description,Amount,Reference
2024-01-15,Payment from Customer,1000.00,INV-001
2024-01-16,Office Supplies,-50.00,SUP-001
2024-01-17,Bank Fee,-5.00,BANK-FEE-001`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bank_statement_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Import Bank Statements
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Import bank statement transactions from CSV or OFX files. Supported formats:
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>CSV: Date, Description, Amount columns</li>
          <li>OFX/QFX: Standard OFX format from banks</li>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>File Format</InputLabel>
          <Select
            value={importFormat}
            onChange={(e) => setImportFormat(e.target.value as 'csv' | 'ofx' | 'auto')}
            label="File Format"
          >
            <MenuItem value="auto">Auto-detect</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="ofx">OFX/QFX</MenuItem>
          </Select>
        </FormControl>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <Typography key={index} variant="body2">{error}</Typography>
            ))}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ofx,.qfx"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            Select File
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
          >
            Download CSV Template
          </Button>
        </Box>

        {importing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Processing file...</Typography>
          </Box>
        )}

        {parsedStatements.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {parsedStatements.length} transactions found. Click "Preview" to review before importing.
          </Alert>
        )}
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Preview Import ({parsedStatements.length} transactions)</Typography>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedStatements.map((stmt, index) => (
                  <TableRow key={index}>
                    <TableCell>{stmt.date}</TableCell>
                    <TableCell>{stmt.description}</TableCell>
                    <TableCell>
                      <Chip
                        label={stmt.type}
                        size="small"
                        color={stmt.type === 'debit' ? 'error' : 'success'}
                      />
                    </TableCell>
                    <TableCell sx={{ color: stmt.type === 'debit' ? 'error.main' : 'success.main' }}>
                      {stmt.currency} {stmt.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{stmt.reference || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleImport}
            disabled={importing}
          >
            Import {parsedStatements.length} Transactions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StatementImportForm
