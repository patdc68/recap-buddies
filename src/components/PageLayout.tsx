import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import recapCharacter from '../assets/recap-buddies-char-rotated.png';


interface RenterInfo {
  fname: string;
  lname: string;
}

interface PageLayoutProps {
  children: React.ReactNode;
  renter?: RenterInfo | null;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, renter }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
 <div className="page-root">
      <div className="left-content">
        <Box sx={{ maxWidth: '900px', textAlign: 'left', mx: 'auto' }}>
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
      </div>

      <div className="right-hero" aria-hidden="true">
        {isLoginPage && (
          <div className="hero-text" aria-hidden="false">
            <h1>recap buddies</h1>
            <h3>Camera Rental and Creatives</h3>
            <br></br>
            <br></br>
            <br></br>
            <p>
              Do you have what it takes to be
              #RBuddy?
            </p>
          </div>
        )}
        <img src={recapCharacter} className="hero-peek-img" alt="" />
      </div>
    </div>
  );
};

export default PageLayout;
