import React from 'react';
import { Box, Typography } from '@mui/material';
import recapChar from '../assets/recap-buddies-char-rotated.png';

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
        className="page-root"
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
          className="left-content"
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: '900px',
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

        <Box className="right-hero">
          <div className="hero-text">
            <h1>recap buddies</h1>
            <h3>Camera Rental and Creatives</h3>
            <p>Professional cameras for every creative vision. Capture your story.</p>
          </div>
          <img src={recapChar} className="hero-peek-img" alt="decorative character" />
        </Box>
      </Box>
    </Box>
  );
};

export default PageLayout;
