import React from 'react';
import { Box } from '@mui/material';

interface EmptyCardStateProps {
  message?: string;
  height?: number | string;
}

const EmptyCardState: React.FC<EmptyCardStateProps> = ({
  // Intentionally unused: we no longer show "no data" UI inside dashboards/widgets.
  // Leaving the prop keeps API compatibility without visual noise.
  message: _message,
  height = '100%',
}) => {
  return (
    <Box
      sx={{
        height,
        width: '100%',
        // Keep layout space reserved, but render no UI.
      }}
    >
      {/* intentionally blank */}
    </Box>
  );
};

export default EmptyCardState;

