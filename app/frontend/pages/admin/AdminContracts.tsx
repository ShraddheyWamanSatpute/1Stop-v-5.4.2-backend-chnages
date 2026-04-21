import React, { useState, useEffect } from "react";
import { useCompany } from "../../../backend/context/CompanyContext";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from "@mui/material";
import {
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { db, ref, get } from "../../../backend/services/Firebase";
import type { CompanyContract, ContractTemplate } from "../../../backend/interfaces/Company";

const AdminContracts: React.FC = () => {
  const { state: companyState } = useCompany();
  const [contracts, setContracts] = useState<Record<string, CompanyContract>>({});
  const [templates, setTemplates] = useState<Record<string, ContractTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<CompanyContract | null>(null);

  useEffect(() => {
    if (companyState.companyID) {
      loadContracts();
      loadTemplates();
    }
  }, [companyState.companyID]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const contractsRef = ref(db, `companies/${companyState.companyID}/contracts`);
      const snapshot = await get(contractsRef);
      if (snapshot.exists()) {
        setContracts(snapshot.val());
      }
    } catch (error) {
      console.error("Error loading contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesRef = ref(db, `companies/${companyState.companyID}/contractTemplates`);
      const snapshot = await get(templatesRef);
      if (snapshot.exists()) {
        setTemplates(snapshot.val());
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handleViewContract = (contract: CompanyContract) => {
    setSelectedContract(contract);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = (contract: CompanyContract) => {
    if (contract.pdfUrl) {
      const link = document.createElement("a");
      link.href = contract.pdfUrl;
      link.download = `contract_${contract.contractNumber}.pdf`;
      link.click();
    }
  };

  if (!companyState.companyID) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Please select a company to view contracts
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Contracts - {companyState.companyName}
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Contract Number</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(contracts).map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>{contract.contractNumber}</TableCell>
                    <TableCell>
                      {templates[contract.templateId]?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {new Date(contract.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {contract.endDate
                        ? new Date(contract.endDate).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={contract.status}
                        color={
                          contract.status === "active"
                            ? "success"
                            : contract.status === "draft"
                            ? "default"
                            : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleViewContract(contract)}
                      >
                        <ViewIcon />
                      </IconButton>
                      {contract.pdfUrl && (
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadPDF(contract)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(contracts).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">
                        No contracts found for this company
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* View Contract Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Contract Details</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contract Number"
                  value={selectedContract.contractNumber}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Status"
                  value={selectedContract.status}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  value={new Date(selectedContract.startDate).toLocaleDateString()}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              {selectedContract.endDate && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    value={new Date(selectedContract.endDate).toLocaleDateString()}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Template"
                  value={templates[selectedContract.templateId]?.name || "Unknown"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              {selectedContract.pdfUrl && (
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadPDF(selectedContract)}
                  >
                    Download PDF
                  </Button>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminContracts;
