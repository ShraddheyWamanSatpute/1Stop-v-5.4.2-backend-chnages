import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCompany } from '../../../backend/context/CompanyContext';

interface GenerateJoinCodeProps {
  onSuccess?: () => void;
}

const GenerateJoinCode: React.FC<GenerateJoinCodeProps> = ({ onSuccess }) => {
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { generateJoinCode, state } = useCompany();

  const canGenerate = useMemo(() => {
    if (!state.companyID) return false;
    // Allow if a site is selected or we already have at least one site loaded
    const hasSiteContext = Boolean(state.selectedSiteID || (state.sites && state.sites.length > 0));
    return hasSiteContext;
  }, [state.companyID, state.selectedSiteID, state.sites]);

  const handleGenerateCode = async () => {
    setLoading(true);
    setError(null);

    try {
      const code = await generateJoinCode();
      setJoinCode(code);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to generate join code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateJoinLink = () => {
    if (!joinCode) return '';
    // Create a join link that includes the code
    // This would typically point to your join page with the code as a parameter
    return `${window.location.origin}/join?code=${joinCode}`;
  };

  const handleCopyLink = () => {
    const link = generateJoinLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Company Join Code
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate a code that allows others to join {state.company?.companyName || 'your company'}
      </Typography>

      {!canGenerate && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Select a company and ensure at least one site exists or is selected before generating a join code.
        </Alert>
      )}

      {joinCode ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Join Code (valid for 7 days):
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              fullWidth
              value={joinCode}
              variant="outlined"
              InputProps={{
                readOnly: true,
              }}
              sx={{ mr: 1 }}
            />
            <Tooltip title="Copy code">
              <IconButton onClick={handleCopyCode} color="primary">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Join Link:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              value={generateJoinLink()}
              variant="outlined"
              InputProps={{
                readOnly: true,
              }}
              sx={{ mr: 1 }}
            />
            <Tooltip title="Copy link">
              <IconButton onClick={handleCopyLink} color="primary">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      ) : null}

      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handleGenerateCode}
        disabled={loading || !canGenerate}
        startIcon={joinCode ? <RefreshIcon /> : undefined}
        sx={{ mt: 2 }}
      >
        {loading ? (
          <CircularProgress size={24} />
        ) : joinCode ? (
          'Generate New Code'
        ) : (
          'Generate Join Code'
        )}
      </Button>

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
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
      >
        <Alert onClose={() => setCopied(false)} severity="success" sx={{ width: '100%' }}>
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default GenerateJoinCode;
