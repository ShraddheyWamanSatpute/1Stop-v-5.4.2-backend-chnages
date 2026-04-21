import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  // Switch, // TODO: Use when implementing switch functionality
  // FormControlLabel, // TODO: Use when implementing form control functionality
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  // Alert, // TODO: Use when implementing alert functionality
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  // Schedule as ScheduleIcon, // TODO: Use when implementing schedule functionality
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  // Refresh as RefreshIcon, // TODO: Use when implementing refresh functionality
} from '@mui/icons-material';
import { useDashboard } from '../../../backend/context/DashboardContext';
import { ReportTemplate, ReportGeneration } from '../../../backend/interfaces/Dashboard';

interface ReportGeneratorProps {
  module: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos' | 'global';
  title: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ module, title }) => {
  const dashboard = useDashboard();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generations, setGenerations] = useState<ReportGeneration[]>([]);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Load templates and generations on mount
  useEffect(() => {
    loadTemplates();
  }, [module]);

  useEffect(() => {
    loadGenerations();
  }, [module, templates, dashboard.settings.reportGenerations, dashboard.settings.reportTemplates]);

  const loadTemplates = async () => {
    try {
      const reportTemplates = await dashboard.getReportTemplates(module);
      setTemplates(reportTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadGenerations = async () => {
    const customTemplateIds = new Set(
      (dashboard.settings.reportTemplates || [])
        .filter((template) => template.module === module)
        .map((template) => template.id),
    );

    setGenerations(
      (dashboard.settings.reportGenerations || [])
        .filter((generation) => {
          const template = templates.find((item) => item.id === generation.templateId);
          return template?.module === module || customTemplateIds.has(generation.templateId) || generation.templateId === `default-${module}-summary`;
        })
        .slice(0, 10),
    );
  };

  const handleCreateTemplate = async (templateData: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTemplate = await dashboard.createReportTemplate(templateData);
      setTemplates(prev => [...prev, newTemplate]);
      setShowCreateTemplate(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async (templateId: string, updates: Partial<ReportTemplate>) => {
    try {
      await dashboard.updateReportTemplate(templateId, updates);
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ...updates } : t));
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await dashboard.deleteReportTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    try {
      setGenerating(true);
      const generation = await dashboard.generateReport(selectedTemplate);
      setGenerations(prev => [...prev, generation]);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = (generation: ReportGeneration) => {
    if (!generation.fileUrl) return;

    const template = templates.find((item) => item.id === generation.templateId);
    const link = document.createElement('a');
    link.href = generation.fileUrl;
    link.download = `${template?.name || 'report'}.${template?.config.format === 'csv' ? 'csv' : 'html'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'generating':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <DownloadIcon />;
      case 'failed':
        return <StopIcon />;
      case 'generating':
        return <CircularProgress size={16} />;
      default:
        return <PlayArrowIcon />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {title} Reports
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateTemplate(true)}
        >
          Create Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Templates Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Report Templates
              </Typography>
              <List>
                {templates.map((template) => (
                  <React.Fragment key={template.id}>
                    <ListItem>
                      <ListItemText
                        primary={template.name}
                        secondary={template.description}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => setEditingTemplate(template)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteTemplate(template.id)}
                              disabled={template.isDefault}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
                {templates.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No templates available"
                      secondary="Create your first report template"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Report Generation Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generate Report
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Select Template</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label="Select Template"
                  >
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={generating ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                  onClick={handleGenerateReport}
                  disabled={!selectedTemplate || generating}
                  fullWidth
                >
                  {generating ? 'Generating...' : 'Generate Report'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Recent Generations */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Generations
              </Typography>
              <List>
                {generations.map((generation) => (
                  <React.Fragment key={generation.id}>
                    <ListItem>
                      <ListItemText
                        primary={templates.find(t => t.id === generation.templateId)?.name || 'Unknown Template'}
                        secondary={`Status: ${generation.status} - ${new Date(generation.startedAt).toLocaleString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {generation.status === 'completed' && generation.fileUrl && (
                            <Tooltip title="Download">
                              <IconButton size="small" onClick={() => handleDownloadReport(generation)}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Chip
                            label={generation.status}
                            color={getStatusColor(generation.status)}
                            size="small"
                            icon={getStatusIcon(generation.status)}
                          />
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
                {generations.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No recent generations"
                      secondary="Generate your first report"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onClose={() => setShowCreateTemplate(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Report Template</DialogTitle>
        <DialogContent>
          <CreateTemplateForm
            module={module}
            createdBy={dashboard.settings.userId || 'current-user'}
            onSubmit={handleCreateTemplate}
            onCancel={() => setShowCreateTemplate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onClose={() => setEditingTemplate(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Report Template</DialogTitle>
        <DialogContent>
          {editingTemplate && (
            <EditTemplateForm
              template={editingTemplate}
              onSubmit={(updates) => handleUpdateTemplate(editingTemplate.id, updates)}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Create Template Form Component
interface CreateTemplateFormProps {
  module: string;
  createdBy: string;
  onSubmit: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const CreateTemplateForm: React.FC<CreateTemplateFormProps> = ({ module, createdBy, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'standard' as 'standard' | 'custom',
    config: {
      title: '',
      sections: [],
      filters: {},
      format: 'pdf' as 'pdf' | 'excel' | 'csv' | 'html',
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      module: module as any,
      isDefault: false,
      createdBy,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Template Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        fullWidth
        required
      />
      <TextField
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        fullWidth
        multiline
        rows={3}
      />
      <FormControl fullWidth>
        <InputLabel>Type</InputLabel>
        <Select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
          label="Type"
        >
          <MenuItem value="standard">Standard</MenuItem>
          <MenuItem value="custom">Custom</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Report Title"
        value={formData.config.title}
        onChange={(e) => setFormData(prev => ({ 
          ...prev, 
          config: { ...prev.config, title: e.target.value }
        }))}
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>Format</InputLabel>
        <Select
          value={formData.config.format}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            config: { ...prev.config, format: e.target.value as any }
          }))}
          label="Format"
        >
          <MenuItem value="pdf">PDF</MenuItem>
          <MenuItem value="excel">Excel</MenuItem>
          <MenuItem value="csv">CSV</MenuItem>
          <MenuItem value="html">HTML</MenuItem>
        </Select>
      </FormControl>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">Create Template</Button>
      </DialogActions>
    </Box>
  );
};

// Edit Template Form Component
interface EditTemplateFormProps {
  template: ReportTemplate;
  onSubmit: (updates: Partial<ReportTemplate>) => void;
  onCancel: () => void;
}

const EditTemplateForm: React.FC<EditTemplateFormProps> = ({ template, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description,
    config: template.config
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Template Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        fullWidth
        required
      />
      <TextField
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        fullWidth
        multiline
        rows={3}
      />
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">Update Template</Button>
      </DialogActions>
    </Box>
  );
};

export default ReportGenerator;
