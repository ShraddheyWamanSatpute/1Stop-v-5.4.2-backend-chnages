import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useCompany } from '../../../backend/context/CompanyContext';

interface DataSection {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
}

const dataSections: DataSection[] = [
  {
    id: 'pos',
    name: 'Point of Sale',
    description: 'Manage sales, orders, and payments',
    defaultEnabled: true
  },
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Track stock levels, orders, and suppliers',
    defaultEnabled: true
  },
  {
    id: 'hr',
    name: 'Human Resources',
    description: 'Manage employees, schedules, and payroll',
    defaultEnabled: true
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Handle accounting, expenses, and reporting',
    defaultEnabled: true
  },
  {
    id: 'bookings',
    name: 'Bookings',
    description: 'Manage reservations and appointments',
    defaultEnabled: false
  },
  {
    id: 'messenger',
    name: 'Messenger',
    description: 'Internal communication system',
    defaultEnabled: true
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Business insights and reporting',
    defaultEnabled: true
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Campaigns and customer engagement',
    defaultEnabled: false
  },
  {
    id: 'customers',
    name: 'Customer Management',
    description: 'Customer profiles and loyalty programs',
    defaultEnabled: true
  },
  {
    id: 'suppliers',
    name: 'Supplier Management',
    description: 'Manage vendors and purchasing',
    defaultEnabled: true
  }
];

const CreateSiteManagement: React.FC = () => {
  const { state: companyState, fetchDataConfiguration, saveDataConfiguration } = useCompany();
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const loadCurrentConfiguration = async () => {
      if (!companyState.companyID) return;

      setLoading(true);
      try {
        const cfg = await fetchDataConfiguration();
        if (cfg && Object.keys(cfg).length > 0) {
          setEnabledSections(cfg);
        } else {
          const defaultConfig = dataSections.reduce((acc, section) => ({
            ...acc,
            [section.id]: section.defaultEnabled
          }), {} as Record<string, boolean>);
          setEnabledSections(defaultConfig);
        }
      } catch (error) {
        console.error('Error loading data configuration:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load configuration',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    loadCurrentConfiguration();
  }, [companyState.companyID]);

  const handleToggleSection = (sectionId: string) => {
    setEnabledSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleSaveConfiguration = async () => {
    if (!companyState.companyID) {
      setSnackbar({
        open: true,
        message: 'No company selected',
        severity: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      await saveDataConfiguration(enabledSections, true);

      setSnackbar({
        open: true,
        message: 'Configuration saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save configuration',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // No loading indicators — UI renders and fills as data arrives

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Configure Data Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select which data sections you want to enable for your company. You can modify these settings later.
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {dataSections.map(section => (
              <Grid item xs={12} sm={6} key={section.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={enabledSections[section.id] ?? section.defaultEnabled}
                            onChange={() => handleToggleSection(section.id)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="subtitle1">{section.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {section.description}
                            </Typography>
                          </Box>
                        }
                      />
                    </FormGroup>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveConfiguration}
              disabled={saving}
            >
              Save Configuration
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateSiteManagement;
