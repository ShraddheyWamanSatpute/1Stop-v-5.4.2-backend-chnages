"use client"

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import { useSettings } from '../../backend/context/SettingsContext';
import { useCompany } from '../../backend/context/CompanyContext';

const Join: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state } = useSettings();
  const { joinCompanyByCode } = useCompany();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    const joinCode = searchParams.get('code');
    
    if (!joinCode) {
      setError('No join code provided');
      setLoading(false);
      return;
    }

    // Employee invites use long alphanumeric codes stored under joinCodes/{code}.
    // Company "join by code" uses short codes (typically 6 chars).
    // If this looks like an employee invite, route to the dedicated JoinCompany flow
    // which provides sign-in / sign-up and invite acceptance UX.
    if (joinCode.length > 6) {
      navigate(`/JoinCompany?code=${encodeURIComponent(joinCode)}`, { replace: true });
      return;
    }

    if (!state.auth?.uid) {
      setError('Please log in to join a company');
      setLoading(false);
      return;
    }

    const processJoinCode = async () => {
      try {
        // Use context function to join company by code
        const success = await joinCompanyByCode(joinCode);
        
        if (!success) {
          setError('Invalid or expired join code');
          setLoading(false);
          return;
        }

        setCompanyName('Company'); // Context function handles company name internally
        setSuccess(true);
        setLoading(false);

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);

      } catch (error) {
        console.error('Error processing join code:', error);
        setError('An error occurred while processing the join code');
        setLoading(false);
      }
    };

    processJoinCode();
  }, [searchParams, state.auth, navigate, joinCompanyByCode]);

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
        >
          <CircularProgress />
          <Typography variant="h6">Processing join code...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
        >
          <Alert severity="error">{error}</Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </Box>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
        >
          <Alert severity="success">
            Successfully joined {companyName}! Redirecting to dashboard...
          </Alert>
        </Box>
      </Container>
    );
  }

  return null;
};

export default Join;