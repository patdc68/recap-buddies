import React from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ height: '100vh', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      <Box
        sx={{
          height: '100vh',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          overflow: 'hidden',
          px: { xs: 3, md: 0 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            width: '100%',
            overflowY: 'auto',
            minWidth: 0,
            px: { xs: 0, md: '60px' },
            py: { xs: 4, md: '40px' },
            textAlign: 'left',
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

        {!isMobile && (
          <Box
            sx={{
              flex: 1,
              position: 'sticky',
              top: 0,
              height: '100vh',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              overflow: 'visible',
              minWidth: 0,
            }}
          >
            <Box
              component="img"
              src={recapCharacter}
              alt="Recap Buddies character"
              sx={{
                height: '50vh',
                maxHeight: '600px',
                width: 'auto',
                objectFit: 'contain',
                transform: 'scale(1.1) translateY(20px)',
                filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.15))',
                marginBottom: 0,
                paddingBottom: 0,
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PageLayout;
