/**
 * ESS Documents Page
 * 
 * Employee documents:
 * - Contracts
 * - Policies
 * - Training materials
 * - Personal documents
 */

"use client"

import React, { useMemo, useState } from "react"
import {
  Box,
  Card,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  Avatar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Paper,
  Typography,
  Divider,
} from "@mui/material"
import {
  Description as DocumentIcon,
  Folder as FolderIcon,
  PictureAsPdf as PdfIcon,
  Article as ArticleIcon,
  Visibility as ViewIcon,
  Description as ContractIcon,
  Edit as EditIcon,
  School as TrainingIcon,
  Verified as CertificationIcon,
  GetApp as DownloadIcon,
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { useHR } from "../../../app/backend/context/HRContext"
import { uploadFile } from "../../backend/services/Firebase"
import { EmptyState } from "../components"
import type { Document } from "../../../app/backend/interfaces/HRs"

const ESSDocuments: React.FC = () => {
  const theme = useTheme()
  const { state: essState, authState, refreshData } = useESS()
  const hrContext = useHR() as any
  const { state: hrState } = hrContext
  const [tabValue, setTabValue] = useState(0)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [signature, setSignature] = useState("")
  const [viewContractDialogOpen, setViewContractDialogOpen] = useState(false)
  const [contractToView, setContractToView] = useState<any>(null)

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadSelectedFile, setUploadSelectedFile] = useState<File | null>(null)
  const [uploadDisplayName, setUploadDisplayName] = useState("")

  // Get documents from employee and contracts from HR context
  const allDocuments = useMemo(() => {
    const docs: Array<Document & { category: string; needsSignature?: boolean }> = []
    
    // Get contracts from HR context (filtered by employee)
    if (hrState.contracts && essState.employeeId) {
      const employeeContracts = hrState.contracts
        .filter((contract: any) => contract.employeeId === essState.employeeId)
        .map((contract: any) => ({
          id: contract.id || contract.contractId,
          name: contract.contractTitle || contract.name || contract.title || "Contract",
          type: contract.type || "pdf",
          url: contract.url || contract.fileUrl || "",
          uploadedAt: contract.uploadedAt || contract.createdAt || Date.now(),
          expiryDate: contract.expiryDate,
          category: "contract",
          needsSignature: !contract.signedDate,
          signature: contract.signature,
          signedAt: contract.signedDate || contract.signedAt,
          contractData: contract, // Store full contract data for PDF generation
        }))
      docs.push(...employeeContracts)
    }
    
    // Get training documents from employee object (filter by category)
    if (essState.currentEmployee?.documents) {
      const employeeDocs = (essState.currentEmployee.documents as Document[]).map((doc) => {
        // Preserve explicit category when present (matches main app Self Service uploads)
        const explicitCategory = (doc as any).category as string | undefined
        if (explicitCategory) {
          return {
            ...doc,
            category: explicitCategory,
          }
        }

        // Determine category based on document name or type (fallback)
        let category = "training"
        const docName = (doc.name || "").toLowerCase()
        if (docName.includes("passport") || docName.includes("signed contract") || docName.includes("contract (signed)")) {
          category = "file"
        } else if (docName.includes("certif") || docName.includes("license") || docName.includes("qualification")) {
          category = "certification"
        } else if (docName.includes("training") || docName.includes("course")) {
          category = "training"
        }
        
        return {
          ...doc,
          category,
        }
      })
      docs.push(...employeeDocs)
    }
    
    return docs
  }, [essState.currentEmployee?.documents, hrState.contracts, essState.employeeId])

  const categories = [
    { label: "Contracts", value: "contract" },
    { label: "Training", value: "training" },
    { label: "Certification", value: "certification" },
    { label: "Files", value: "file" },
  ]

  const isFilesTab = categories[tabValue]?.value === "file"

  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => doc.category === categories[tabValue].value)
  }, [allDocuments, tabValue, categories])

  const getDocumentIcon = (type: string, category: string) => {
    if (category === "contract") {
      return <ContractIcon sx={{ color: theme.palette.primary.main }} />
    }
    if (category === "training") {
      return <TrainingIcon sx={{ color: theme.palette.info.main }} />
    }
    if (category === "certification") {
      return <CertificationIcon sx={{ color: theme.palette.success.main }} />
    }
    switch (type?.toLowerCase()) {
      case "pdf":
        return <PdfIcon sx={{ color: theme.palette.error.main }} />
      case "doc":
      case "docx":
        return <ArticleIcon sx={{ color: theme.palette.primary.main }} />
      default:
        return <DocumentIcon color="action" />
    }
  }

  const handleSignContract = (contract: any) => {
    setSelectedContract(contract)
    setSignatureDialogOpen(true)
    setSignature("")
  }

  const handleOpenUploadDialog = () => {
    setUploadSelectedFile(null)
    setUploadDisplayName("")
    setUploadDialogOpen(true)
  }

  const handleCloseUploadDialog = () => {
    if (uploading) return
    setUploadDialogOpen(false)
  }

  const handleUploadEmployeeFile = async () => {
    const employeeId = essState.employeeId || (essState.currentEmployee as any)?.id
    const companyId = authState.currentCompanyId

    if (!employeeId) {
      alert("Employee record not found yet. Please try again in a moment.")
      return
    }
    if (!companyId) {
      alert("Company not selected. Please try again.")
      return
    }
    if (!uploadSelectedFile) {
      alert("Please choose a PDF file.")
      return
    }
    const isPdf =
      uploadSelectedFile.type === "application/pdf" ||
      uploadSelectedFile.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      alert("Only PDF files are supported.")
      return
    }

    try {
      setUploading(true)

      const folder = `companies/${companyId}/hr/employees/${employeeId}/documents`
      const url = await uploadFile(uploadSelectedFile, folder)

      const now = Date.now()
      const safeName = String(uploadDisplayName || "").trim()
      const docName = safeName.length > 0 ? safeName : uploadSelectedFile.name

      const newDoc: any = {
        id: `file_${now}_${Math.random().toString(36).slice(2, 10)}`,
        name: docName,
        type: "pdf",
        url,
        uploadedAt: now,
        category: "file",
      }

      const currentDocs = ((essState.currentEmployee as any)?.documents || []) as any[]
      const updatedDocs = [...currentDocs, newDoc]

      if (typeof hrContext?.updateEmployee !== "function") {
        throw new Error("Employee update is not available")
      }

      await hrContext.updateEmployee(employeeId, { documents: updatedDocs } as any)
      await Promise.resolve(refreshData?.())
      setUploadDialogOpen(false)
    } catch (err) {
      console.error("Failed to upload file:", err)
      alert(err instanceof Error ? err.message : "Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveSignature = async () => {
    if (!signature.trim() || !selectedContract) return

    try {
      if (typeof hrContext?.updateContract !== "function") {
        throw new Error("Contract signing is not available")
      }

      await hrContext.updateContract(selectedContract.id, {
        signedDate: Date.now(),
        status: "signed",
        signature: signature.trim(),
      })

      await Promise.resolve(refreshData?.())
      setSignatureDialogOpen(false)
      setSelectedContract(null)
      setSignature("")
    } catch (error) {
      console.error("Failed to save contract signature:", error)
      alert(error instanceof Error ? error.message : "Failed to sign contract. Please try again.")
    }
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const handleViewDocument = (doc: Document & { category: string; needsSignature?: boolean; contractData?: any }) => {
    if (doc.category === "contract" && doc.contractData) {
      // For contracts, always open view dialog (whether signed or not)
      setContractToView(doc.contractData)
      setViewContractDialogOpen(true)
    } else if (doc.url) {
      window.open(doc.url, "_blank")
    } else {
      console.warn("Document has no URL or contract data:", doc)
    }
  }

  const handleViewContract = (contract: any) => {
    setContractToView(contract)
    setViewContractDialogOpen(true)
  }

  const handleCloseViewContract = () => {
    setViewContractDialogOpen(false)
    setContractToView(null)
  }

  const handleDownloadContractPDF = (contract: any) => {
    try {
      // Dynamic import for jsPDF
      import('jspdf').then((jsPDF) => {
        const doc = new jsPDF.default()
        const contractTitle = contract.contractTitle || contract.name || contract.title || 'Employment Contract'
        
        // Add title
        doc.setFontSize(16)
        doc.text(contractTitle, 14, 20)
        
        // Add contract details
        doc.setFontSize(10)
        let y = 30
        doc.text(`Type: ${contract.type || 'N/A'}`, 14, y)
        y += 7
        doc.text(`Status: ${contract.status || 'N/A'}`, 14, y)
        y += 7
        doc.text(`Start Date: ${contract.startDate ? formatDate(contract.startDate) : 'N/A'}`, 14, y)
        y += 7
        if (contract.endDate) {
          doc.text(`End Date: ${formatDate(contract.endDate)}`, 14, y)
          y += 7
        }
        y += 5
        
        // Add contract body HTML content (strip HTML tags and convert to text)
        if (contract.bodyHtml) {
          // Create a temporary div to extract text from HTML
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = contract.bodyHtml
          const textContent = tempDiv.textContent || tempDiv.innerText || ''
          
          // Split text into lines that fit the page width
          const pageWidth = doc.internal.pageSize.width - 28 // margins
          const lines = doc.splitTextToSize(textContent, pageWidth)
          
          // Add lines to PDF
          lines.forEach((line: string) => {
            if (y > doc.internal.pageSize.height - 20) {
              doc.addPage()
              y = 20
            }
            doc.text(line, 14, y)
            y += 7
          })
        }
        
        // Save PDF
        const fileName = `contract_${contract.id}_${formatDate(Date.now())}.pdf`
        doc.save(fileName)
      }).catch((error) => {
        console.error('Error loading jsPDF:', error)
        alert('Failed to generate PDF. Please try again.')
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Category Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          bgcolor: "primary.main",
          borderRadius: 2,
          px: 1,
          "& .MuiTab-root": {
            color: "primary.contrastText",
            opacity: 0.75,
            "&.Mui-selected": {
              color: "primary.contrastText",
              opacity: 1,
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "primary.contrastText",
          },
        }}
      >
        {categories.map((cat) => (
          <Tab key={cat.value} label={cat.label} />
        ))}
      </Tabs>

      {/* Files tab action */}
      {isFilesTab && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={handleOpenUploadDialog}
            disabled={!essState.employeeId || uploading}
            sx={{ borderRadius: 2 }}
          >
            Upload File
          </Button>
        </Box>
      )}

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <List disablePadding>
            {filteredDocuments.map((doc, index) => (
              <React.Fragment key={doc.id}>
                <ListItem disablePadding>
                  <ListItemButton 
                    sx={{ py: 2 }}
                    onClick={() => handleViewDocument(doc)}
                    disabled={!doc.url && doc.category !== "contract"}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: theme.palette.grey[100] }}>
                        {getDocumentIcon(doc.type, doc.category)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.name}
                      secondary={
                        <>
                          Uploaded {formatDate(doc.uploadedAt)}
                          {doc.expiryDate && (
                            <> • Expires {formatDate(doc.expiryDate)}</>
                          )}
                        </>
                      }
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      {doc.category === "contract" && (
                        <>
                          <Chip
                            icon={<ViewIcon />}
                            label="View"
                            size="small"
                            variant="outlined"
                            color="primary"
                            clickable
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDocument(doc)
                            }}
                          />
                          {doc.needsSignature && (
                            <Chip
                              icon={<EditIcon />}
                              label="Sign"
                              size="small"
                              color="primary"
                              variant="contained"
                              clickable
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSignContract(doc)
                              }}
                            />
                          )}
                        </>
                      )}
                      {doc.category !== "contract" && doc.url && (
                        <Chip
                          icon={<ViewIcon />}
                          label="View"
                          size="small"
                          variant="outlined"
                          clickable
                        />
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
                {index < filteredDocuments.length - 1 && <Box sx={{ px: 2 }}><Divider /></Box>}
              </React.Fragment>
            ))}
          </List>
        </Card>
      ) : (
        <EmptyState
          icon={<FolderIcon sx={{ fontSize: 48 }} />}
          title="No Documents"
          description="You don't have any documents in this category yet. Documents uploaded by your employer will appear here."
        />
      )}

      {/* Upload File Dialog (Files tab) */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Upload File
          <IconButton onClick={handleCloseUploadDialog} size="small" disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={uploading}
              sx={{ justifyContent: "flex-start" }}
            >
              Choose PDF
              <input
                hidden
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setUploadSelectedFile(e.target.files?.[0] || null)}
              />
            </Button>

            <Typography variant="body2" color="text.secondary">
              {uploadSelectedFile ? `Selected: ${uploadSelectedFile.name}` : "No file selected"}
            </Typography>

            <TextField
              label="Display name (optional)"
              value={uploadDisplayName}
              onChange={(e) => setUploadDisplayName(e.target.value)}
              disabled={uploading}
              size="small"
              fullWidth
              placeholder="e.g. Passport (08/02/2026)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseUploadDialog} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadEmployeeFile}
            disabled={!uploadSelectedFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog
        open={viewContractDialogOpen}
        onClose={handleCloseViewContract}
        fullWidth
        maxWidth="md"
        fullScreen={typeof window !== 'undefined' && window.innerWidth < 600}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {contractToView?.contractTitle || contractToView?.name || "Contract"}
          </Typography>
          <IconButton onClick={handleCloseViewContract} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {contractToView && (
            <Box>
              {/* Contract Details */}
              <Box sx={{ mb: 3, p: 2, bgcolor: "background.default", borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Contract Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Type</Typography>
                    <Typography variant="body2">{contractToView.type || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Typography variant="body2">{contractToView.status || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Start Date</Typography>
                    <Typography variant="body2">
                      {contractToView.startDate ? formatDate(contractToView.startDate) : 'N/A'}
                    </Typography>
                  </Box>
                  {contractToView.endDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">End Date</Typography>
                      <Typography variant="body2">{formatDate(contractToView.endDate)}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Contract Body */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: "divider",
                  maxHeight: '60vh',
                  overflow: 'auto',
                  '& p': {
                    marginBottom: '1em',
                    marginTop: 0,
                    lineHeight: 1.6,
                  },
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    marginTop: '1em',
                    marginBottom: '0.5em',
                    fontWeight: 600,
                  },
                  '& ul, & ol': {
                    marginBottom: '1em',
                    paddingLeft: '1.5em',
                  },
                  '& li': {
                    marginBottom: '0.5em',
                  },
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: contractToView.bodyHtml || '<p>No contract content available.</p>'
                  }}
                />
              </Paper>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseViewContract}>Close</Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            {contractToView && !(contractToView.signedDate || contractToView.signedAt) && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => {
                  handleCloseViewContract()
                  // Find the document and open sign dialog
                  const contractDoc = allDocuments.find(
                    (doc) => doc.category === "contract" && doc.contractData?.id === contractToView.id
                  )
                  if (contractDoc) {
                    handleSignContract(contractDoc)
                  }
                }}
                color="primary"
              >
                Sign Contract
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={() => {
                if (contractToView) {
                  handleDownloadContractPDF(contractToView)
                }
              }}
              color="primary"
            >
              Export as PDF
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog
        open={signatureDialogOpen}
        onClose={() => setSignatureDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Sign Contract: {selectedContract?.name}
          <IconButton onClick={() => setSignatureDialogOpen(false)} size="small">
            <EditIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Digital Signature"
              placeholder="Type your full name to sign"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              fullWidth
              required
              helperText="By typing your name, you are providing your digital signature"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSignatureDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSignature}
            disabled={!signature.trim()}
          >
            Sign Contract
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ESSDocuments
