import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../backend/context/CompanyContext";
import { useSettings } from "../../../backend/context/SettingsContext";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import EmptyStateCard from "../../components/reusable/EmptyStateCard";
import jsPDF from "jspdf";
import type { ContractTemplate, CompanyContract } from "../../../backend/interfaces/Company";
import { db, ref, get, set, remove, push } from "../../../backend/services/Firebase";

const ContractManagement: React.FC = () => {
  const { state: companyState } = useCompany();
  const { state: settingsState } = useSettings();
  const navigate = useNavigate();
  
  const [templates, setTemplates] = useState<Record<string, ContractTemplate>>({});
  const [contracts, setContracts] = useState<Record<string, CompanyContract>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [selectedContract, setSelectedContract] = useState<CompanyContract | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [templateForm, setTemplateForm] = useState<Partial<ContractTemplate>>({
    name: "",
    description: "",
    templateContent: "",
    variables: [],
    isDefault: false,
  });

  const [contractForm, setContractForm] = useState<Partial<CompanyContract>>({
    templateId: "",
    contractNumber: "",
    startDate: Date.now(),
    terms: {},
  });

  useEffect(() => {
    if (companyState.companyID) {
      loadTemplates();
      loadContracts();
    }
  }, [companyState.companyID]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatesRef = ref(db, `companies/${companyState.companyID}/contractTemplates`);
      const snapshot = await get(templatesRef);
      if (snapshot.exists()) {
        const templatesData = snapshot.val();
        // Ensure all templates have variables array
        const normalizedTemplates: Record<string, ContractTemplate> = {};
        if (templatesData && typeof templatesData === 'object') {
          Object.keys(templatesData).forEach((key) => {
            normalizedTemplates[key] = {
              ...templatesData[key],
              variables: Array.isArray(templatesData[key]?.variables) 
                ? templatesData[key].variables 
                : [],
            };
          });
        }
        setTemplates(normalizedTemplates);
      } else {
        setTemplates({});
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      showSnackbar("Failed to load contract templates", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const contractsRef = ref(db, `companies/${companyState.companyID}/contracts`);
      const snapshot = await get(contractsRef);
      if (snapshot.exists()) {
        setContracts(snapshot.val());
      }
    } catch (error) {
      console.error("Error loading contracts:", error);
      showSnackbar("Failed to load contracts", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateForm({
      name: "",
      description: "",
      templateContent: "",
      variables: [],
      isDefault: false,
    });
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm(template);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.templateContent) {
      showSnackbar("Name and template content are required", "error");
      return;
    }

    try {
      const templatesRef = ref(db, `companies/${companyState.companyID}/contractTemplates`);
      
      if (selectedTemplate) {
        // Update existing
        await set(ref(db, `companies/${companyState.companyID}/contractTemplates/${selectedTemplate.id}`), {
          ...selectedTemplate,
          ...templateForm,
          updatedAt: Date.now(),
        });
        showSnackbar("Template updated successfully", "success");
      } else {
        // Create new
        const newTemplateRef = push(templatesRef);
        const newTemplate: ContractTemplate = {
          id: newTemplateRef.key!,
          name: templateForm.name!,
          description: templateForm.description || "",
          templateContent: templateForm.templateContent!,
          variables: templateForm.variables || [],
          isDefault: templateForm.isDefault || false,
          createdAt: Date.now(),
          createdBy: settingsState.auth?.uid || "",
        };
        await set(newTemplateRef, newTemplate);
        showSnackbar("Template created successfully", "success");
      }
      
      setTemplateDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      showSnackbar("Failed to save template", "error");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    // Prevent focus staying on the trigger while confirm/dialog flows run (helps avoid aria-hidden warning)
    try {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    } catch {}
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      await remove(ref(db, `companies/${companyState.companyID}/contractTemplates/${templateId}`));
      showSnackbar("Template deleted successfully", "success");
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      showSnackbar("Failed to delete template", "error");
    }
  };

  const handleCreateContract = () => {
    setSelectedContract(null);
    setContractForm({
      templateId: "",
      contractNumber: "",
      startDate: Date.now(),
      terms: {},
    });
    setContractDialogOpen(true);
  };

  const handleGenerateContract = async () => {
    if (!contractForm.templateId || !contractForm.contractNumber) {
      showSnackbar("Template and contract number are required", "error");
      return;
    }

    const template = templates[contractForm.templateId];
    if (!template) {
      showSnackbar("Template not found", "error");
      return;
    }

    try {
      const contractsRef = ref(db, `companies/${companyState.companyID}/contracts`);
      const newContractRef = push(contractsRef);
      
      const newContract: CompanyContract = {
        id: newContractRef.key!,
        companyId: companyState.companyID,
        templateId: contractForm.templateId,
        contractNumber: contractForm.contractNumber,
        status: "draft",
        startDate: contractForm.startDate || Date.now(),
        terms: contractForm.terms || {},
        createdAt: Date.now(),
        createdBy: settingsState.auth?.uid || "",
      };

      await set(newContractRef, newContract);
      
      // Generate PDF
      const pdfUrl = await generateContractPDF(template, newContract);
      await set(ref(db, `companies/${companyState.companyID}/contracts/${newContract.id}/pdfUrl`), pdfUrl);
      
      showSnackbar("Contract created and PDF generated successfully", "success");
      setContractDialogOpen(false);
      loadContracts();
    } catch (error) {
      console.error("Error creating contract:", error);
      showSnackbar("Failed to create contract", "error");
    }
  };

  const generateContractPDF = async (template: ContractTemplate, contract: CompanyContract): Promise<string> => {
    const doc = new jsPDF();
    
    // Replace template variables with actual values
    let content = template.templateContent;
    const company = companyState.company;
    
    // Default replacements
    content = content.replace(/\{\{companyName\}\}/g, company?.companyName || "");
    content = content.replace(/\{\{legalName\}\}/g, company?.companyName || "");
    content = content.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    content = content.replace(/\{\{contractNumber\}\}/g, contract.contractNumber);
    content = content.replace(/\{\{startDate\}\}/g, new Date(contract.startDate).toLocaleDateString());
    
    // Replace custom terms
    Object.entries(contract.terms).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
    });

    // Split content into lines and add to PDF
    const lines = content.split("\n");
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    doc.setFontSize(16);
    doc.text("Contract Agreement", margin, y);
    y += 10;

    doc.setFontSize(10);
    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    // Save PDF
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    return pdfUrl;
  };

  const handleDownloadPDF = (contract: CompanyContract) => {
    if (contract.pdfUrl) {
      const link = document.createElement("a");
      link.href = contract.pdfUrl;
      link.download = `contract_${contract.contractNumber}.pdf`;
      link.click();
    }
  };

  const handleViewContract = (contract: CompanyContract) => {
    setSelectedContract(contract);
    setViewDialogOpen(true);
  };

  // No loading indicators — UI renders and fills as data arrives

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 3 }}>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Contract Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage contract templates and generate contracts for {companyState.companyName}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<DescriptionIcon />} label="Templates" />
          <Tab icon={<PdfIcon />} label="Contracts" />
        </Tabs>
      </Paper>

      {/* Templates Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
              <Typography variant="h6">Contract Templates</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateTemplate}
              >
                Create Template
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Variables</TableCell>
                    <TableCell>Default</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(templates).map((template) => {
                    const variables = template.variables || [];
                    return (
                      <TableRow key={template.id}>
                        <TableCell>{template.name}</TableCell>
                        <TableCell>{template.description || "-"}</TableCell>
                        <TableCell>
                          {variables.length > 0
                            ? variables.map((v) => v?.key || "").join(", ")
                            : "None"}
                        </TableCell>
                      <TableCell>
                        <Chip
                          label={template.isDefault ? "Yes" : "No"}
                          color={template.isDefault ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTemplate(template.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {Object.keys(templates).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <EmptyStateCard
                          icon={DescriptionIcon}
                          title="No templates found"
                          description="Create your first template to get started."
                          cardSx={{ maxWidth: 560, mx: "auto" }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Contracts Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
              <Typography variant="h6">Company Contracts</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateContract}
                disabled={Object.keys(templates).length === 0}
              >
                Generate Contract
              </Button>
            </Box>

            {Object.keys(templates).length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You need to create at least one template before generating contracts.
              </Alert>
            )}

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contract Number</TableCell>
                    <TableCell>Template</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(contracts).map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>{contract.contractNumber}</TableCell>
                      <TableCell>{templates[contract.templateId]?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {new Date(contract.startDate).toLocaleDateString()}
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
                      <TableCell colSpan={5} align="center">
                        <EmptyStateCard
                          icon={DescriptionIcon}
                          title="No contracts found"
                          description="Generate your first contract to get started."
                          cardSx={{ maxWidth: 560, mx: "auto" }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTemplate ? "Edit Template" : "Create Template"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Template Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Template Content"
                value={templateForm.templateContent}
                onChange={(e) => setTemplateForm({ ...templateForm, templateContent: e.target.value })}
                multiline
                rows={10}
                required
                helperText="Use {{variableName}} for placeholders. Available: {{companyName}}, {{legalName}}, {{date}}, {{contractNumber}}, {{startDate}}"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={templateForm.isDefault || false}
                    onChange={(e) => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                  />
                }
                label="Set as default template"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={contractDialogOpen} onClose={() => setContractDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Contract</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Template</InputLabel>
                <Select
                  value={contractForm.templateId}
                  label="Template"
                  onChange={(e) => setContractForm({ ...contractForm, templateId: e.target.value })}
                >
                  {Object.values(templates).map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contract Number"
                value={contractForm.contractNumber}
                onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={contractForm.startDate ? new Date(contractForm.startDate).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    startDate: new Date(e.target.value).getTime(),
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleGenerateContract} variant="contained">
            Generate Contract & PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Contract Details</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Contract Number: {selectedContract.contractNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Template: {templates[selectedContract.templateId]?.name || "Unknown"}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status: {selectedContract.status}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Start Date: {new Date(selectedContract.startDate).toLocaleDateString()}
              </Typography>
              {selectedContract.endDate && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  End Date: {new Date(selectedContract.endDate).toLocaleDateString()}
                </Typography>
              )}
              {selectedContract.pdfUrl && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadPDF(selectedContract!)}
                  >
                    Download PDF
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractManagement;
