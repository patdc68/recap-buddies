import React from 'react';
import { Box, Typography } from '@mui/material';
import recapCharacter from '../assets/recap-char-logo.png';

interface RenterInfo {
  fname: string;
  lname: string;
}

interface PageLayoutProps {
  children: React.ReactNode;
  renter?: RenterInfo | null;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, renter }) => {
  return (
    <Box className="page-root" sx={{ backgroundColor: '#ffffff' }}>
      <Box className="left-content">
        <Box
          sx={{
            maxWidth: '900px',
            margin: '0 auto',
            textAlign: 'left',
            py: { xs: 4, md: 5 },
          }}
        >
          {renter && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#666666' }}>
                Logged in as
              </Typography>
              <Typography variant="h6" sx={{ color: '#111111' }}>
                {renter.fname} {renter.lname}
              </Typography>
            </Box>
          )}
          {children}
        </Box>
      </Box>

      <Box className="right-image">
        <Box
          component="img"
          src={recapCharacter}
          alt="Recap Buddies character"
          className="right-image-asset"
        />
      </Box>
    </Box>
  );
};

export default PageLayout;
