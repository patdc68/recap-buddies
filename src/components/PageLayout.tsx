import React from 'react';
import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import recapCharacter from '../assets/recap-char-logo.png';
import logo from '../assets/logo.svg';
import { supabase } from '../service/supabaseClient';

interface RenterInfo {
  fname: string;
  lname: string;
}

interface PageLayoutProps {
  children: React.ReactNode;
  renter?: RenterInfo | null;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, renter }) => {
  const navigate = useNavigate();

  const handleLogoClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/login');
      return;
    }

    const { data: rbUser } = await supabase
      .from('RB_USER')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    navigate(rbUser ? '/admin/dashboard' : '/dashboard');
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      <AppBar
        position="static"
        elevation={0}
        color="transparent"
        sx={{
          borderBottom: '1px solid rgba(201,151,58,0.15)',
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <Toolbar sx={{ maxWidth: '1200px', width: '100%', mx: 'auto', px: { xs: 2, md: 3 } }}>
          <Box
            component="button"
            onClick={handleLogoClick}
            sx={{
              border: 0,
              p: 0,
              m: 0,
              background: 'transparent',
              cursor: 'pointer',
              lineHeight: 0,
            }}
            aria-label="Go to your home page"
          >
            <Box
              component="img"
              src={logo}
              alt="Recap Buddies logo"
              sx={{
                height: { xs: 36, md: 42 },
                width: 'auto',
              }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="img"
        src={recapCharacter}
        alt=""
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: -60, md: -20 },
          bottom: { xs: -70, md: -40 },
          width: { xs: 320, md: 520, lg: 620 },
          maxWidth: '58vw',
          objectFit: 'contain',
          opacity: 0.2,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Box
        sx={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: { xs: 4, md: 6 },
          px: { xs: 3, md: '60px' },
          py: { xs: 4, md: '40px' },
          flexDirection: { xs: 'column', md: 'row' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
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

        <Box
          sx={{
            flex: { xs: '1 1 100%', md: '0 0 380px' },
            width: '100%',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            order: { xs: 2, md: 2 },
            minHeight: { md: 300 },
          }}
        >
          <Typography variant="h3" sx={{ color: '#111111', mb: 1 }}>
            Recap Buddies
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#666666',
              maxWidth: 340,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Camera Rental and Creatives
            <br />
            Professional cameras for every creative vision. Capture your story.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PageLayout;
