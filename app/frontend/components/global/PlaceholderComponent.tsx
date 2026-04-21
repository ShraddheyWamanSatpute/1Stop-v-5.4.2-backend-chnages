import React from 'react';
import { Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

interface PlaceholderComponentProps {
  componentName: string;
  description?: string;
}

/**
 * A reusable placeholder component to use for components that are referenced but not yet implemented.
 * This helps prevent import errors while clearly indicating the component is a placeholder.
 */
const PlaceholderComponent: React.FC<PlaceholderComponentProps> = ({ 
  componentName, 
  description = 'This component is under development'
}) => {
  return (
    <Paper 
      sx={{ 
        p: 2, 
        m: 1, 
        border: '1px dashed',
        borderColor: 'divider',
        backgroundColor: 'action.hover',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px'
      }}
    >
      <ConstructionIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {componentName}
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center">
        {description}
      </Typography>
    </Paper>
  );
};

export default PlaceholderComponent;
