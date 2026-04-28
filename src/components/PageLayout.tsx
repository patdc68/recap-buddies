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
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <Box
        sx={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: { xs: 4, md: 6 },
          px: { xs: 3, md: '60px' },
          py: { xs: 4, md: '40px' },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: '500px',
            textAlign: 'left',
            order: 1,
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

        <Box
          sx={{
            flex: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            order: { xs: 2, md: 2 },
          }}
        >
          <Box
            component="img"
            src={recapCharacter}
            alt="Recap Buddies character"
            sx={{
              width: '100%',
              maxWidth: { xs: '350px', md: '550px' },
              transform: { xs: 'scale(1)', md: 'scale(1.1)' },
              transformOrigin: 'center',
              objectFit: 'contain',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PageLayout;
