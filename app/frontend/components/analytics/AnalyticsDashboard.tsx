import React, { useState } from 'react';
import { useAnalytics } from '../../../backend/context/AnalyticsContext';
import { Box, Card, CardContent, Typography, Button, Grid, CircularProgress, Alert, TextField } from '@mui/material';

interface AnalysisResult {
  domain: string;
  insights: string;
  error?: string;
}

const AnalyticsDashboard: React.FC = () => {
  const {
    analyzeHR,
    analyzeStock,
    analyzeBookings,
    analyzeFinance,
    analyzePOS,
    analyzeCompany,
    loading
  } = useAnalytics();

  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleAnalysis = async (domain: string, analyzeFunction: (startDate?: string, endDate?: string) => Promise<string> | Promise<string>) => {
    try {
      const needsDates = domain === 'Bookings' || domain === 'Finance' || domain === 'POS';
      if (needsDates && ((startDate && !endDate) || (!startDate && endDate))) {
        throw new Error('Please provide both a start date and an end date for this analysis');
      }
      const validRange = startDate && endDate ? { startDate, endDate } : {};
      const insights = needsDates ? await analyzeFunction(validRange.startDate, validRange.endDate) : await analyzeFunction();
      setResults(prev => [...prev.filter(result => result.domain !== domain), { domain, insights }]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      setResults(prev => [...prev.filter(result => result.domain !== domain), { domain, insights: '', error: err instanceof Error ? err.message : 'Analysis failed' }]);
    }
  };

  const analysisButtons = [
    { label: 'Analyze HR', action: analyzeHR, domain: 'HR' },
    { label: 'Analyze Stock', action: analyzeStock, domain: 'Stock' },
    { label: 'Analyze Bookings', action: analyzeBookings, domain: 'Bookings' },
    { label: 'Analyze POS', action: analyzePOS, domain: 'POS' },
    { label: 'Analyze Finance', action: analyzeFinance, domain: 'Finance' },
    { label: 'Analyze Company', action: analyzeCompany, domain: 'Company' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Business Analytics Dashboard
      </Typography>

      <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
        <Grid item>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Grid>
        <Grid item>
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {analysisButtons.map(({ label, action, domain }) => (
          <Grid item key={domain}>
            <Button
              variant="contained"
              onClick={() => handleAnalysis(domain, action)}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : label}
            </Button>
          </Grid>
        ))}
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {results.map((result, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {result.domain} Analysis
                </Typography>
                {result.error ? (
                  <Alert severity="error">{result.error}</Alert>
                ) : (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {result.insights}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
