import React, { useMemo, useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { useCompany } from '../../../backend/context/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../backend/context/SettingsContext';

interface JoinCompanyByCodeProps {
  onSuccess?: () => void;
  initialCode?: string;
}

const JoinCompanyByCode: React.FC<JoinCompanyByCodeProps> = ({ onSuccess, initialCode = '' }) => {
  const [joinCode, setJoinCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { joinCompanyByCode } = useCompany();
  const navigate = useNavigate();
  const { state: settingsState } = useSettings();

  const isAuthenticated = useMemo(() => Boolean(settingsState.auth?.uid), [settingsState.auth?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    if (!isAuthenticated) {
      setError('You must be logged in to join a company.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const joined = await joinCompanyByCode(joinCode.trim().toUpperCase());
      
      if (joined) {
        setSuccess(true);
        setJoinCode('');
        
        // Wait a moment before redirecting or calling onSuccess
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate('/dashboard');
          }
        }, 1500);
      } else {
        setError('Invalid or expired join code');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to join company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Join a Company
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the join code provided by your company administrator
      </Typography>

      {!isAuthenticated && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You must be signed in to accept a company invite.
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label="Join Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          margin="normal"
          variant="outlined"
          placeholder="Enter 6-character code"
          inputProps={{ maxLength: 6 }}
          autoComplete="off"
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={loading || !isAuthenticated}
          sx={{ mt: 2, mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Join Company'}
        </Button>
      </Box>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(false)}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Successfully joined company! Redirecting...
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default JoinCompanyByCode;
