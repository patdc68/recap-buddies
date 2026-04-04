import React from 'react';
import { Box, Typography } from '@mui/material';

// ── Inlined SVGs ──────────────────────────────────────────────────────────────

const LogoSVG: React.FC<{ size?: number }> = ({ size = 100 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', filter: 'drop-shadow(0 4px 12px rgba(201,151,58,0.35))' }}
  >
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FB8C00" />
      </linearGradient>
    </defs>
    <path
      d="M256 40 C150 40 100 120 100 220 L100 380
         C100 440 180 440 220 420 C260 400 300 440 340 420
         C420 440 412 360 412 300 L412 220 C412 120 362 40 256 40Z"
      fill="url(#lg)"
    />
    <circle cx="200" cy="200" r="40" fill="#1A1008" />
    <circle cx="312" cy="200" r="40" fill="#1A1008" />
    <circle cx="185" cy="185" r="10" fill="#fff" />
    <circle cx="297" cy="185" r="10" fill="#fff" />
    <path d="M220 270 Q256 310 292 270" stroke="#8B0000" strokeWidth="8" fill="none" strokeLinecap="round" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface RenterInfo {
  fname: string;
  lname: string;
}

interface PageLayoutProps {
  children: React.ReactNode;
  renter?: RenterInfo | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

const PageLayout: React.FC<PageLayoutProps> = ({ children, renter }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#F5EFE4' }}>

      {/* ══ LEFT BRAND PANEL ════════════════════════════════════════════════ */}
      <Box
        sx={{
          width: { xs: 0, md: '300px' },
          minWidth: { xs: 0, md: '300px' },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          background: 'linear-gradient(160deg, #FDF6E8 0%, #F5EAD0 50%, #EED9B0 100%)',
          borderRight: '1px solid rgba(201,151,58,0.18)',
          boxShadow: '2px 0 20px rgba(201,151,58,0.08)',
          zIndex: 10,
          overflow: 'hidden',
          // subtle texture blobs
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-60px',
            left: '-60px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'rgba(201,151,58,0.10)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-80px',
            right: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(201,151,58,0.07)',
            pointerEvents: 'none',
          },
        }}
      >
        {/* Brand content — vertically centered */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 4,
            gap: 2.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Big logo mascot */}
          <LogoSVG size={120} />

          {/* Brand name block */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: '1.9rem',
                color: '#3D2B0F',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              recap buddies
            </Typography>
            <Box
              sx={{
                width: 40,
                height: 2.5,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #C9973A, #E5B85C)',
                mx: 'auto',
                my: 1,
              }}
            />
            <Typography
              sx={{
                fontFamily: '"Sora", sans-serif',
                fontSize: '0.65rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#9A6F24',
                fontWeight: 600,
              }}
            >
              Camera Rental and Creatives
            </Typography>
          </Box>

          {/* Tagline */}
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.82rem',
              color: '#7A6040',
              textAlign: 'center',
              lineHeight: 1.6,
              mt: 1,
              px: 1,
            }}
          >
            Professional cameras for every creative vision. Capture your story.
          </Typography>
        </Box>

        {/* Footer credit inside panel */}
        <Box sx={{ pb: 3, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Sora", sans-serif',
              fontSize: '0.62rem',
              letterSpacing: '0.07em',
              color: '#B8A080',
              textTransform: 'uppercase',
            }}
          >
            © {new Date().getFullYear()} Recap Buddies
          </Typography>
        </Box>
      </Box>

      {/* ══ RIGHT FORM AREA ═════════════════════════════════════════════════ */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          background: '#FFFBF4',
          position: 'relative',
          // subtle top-right glow
          '&::before': {
            content: '""',
            position: 'fixed',
            top: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(201,151,58,0.06) 0%, transparent 65%)',
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
      >
        {/* Top bar — shows on mobile (replaces left panel) + user info always top-right */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(255,251,244,0.95)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(201,151,58,0.13)',
            boxShadow: '0 1px 8px rgba(201,151,58,0.06)',
            px: { xs: 2, sm: 4 },
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 56,
          }}
        >
          {/* Mobile-only: compact logo + name */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <LogoSVG size={32} />
            <Typography sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1rem', color: '#3D2B0F' }}>
              recap buddies
            </Typography>
          </Box>

          {/* Desktop: empty left to balance the user info on right */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* User info — top right, always visible when renter is set */}
          {renter ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Avatar circle */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #C9973A, #E5B85C)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontFamily: '"Sora", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(201,151,58,0.35)',
                }}
              >
                {renter.fname[0]?.toUpperCase()}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#9A6F24', fontFamily: '"Sora", sans-serif', letterSpacing: '0.04em' }}>
                  Logged in as
                </Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#3D2B0F', fontFamily: '"Sora", sans-serif', lineHeight: 1.1 }}>
                  {renter.fname} {renter.lname}
                </Typography>
              </Box>
            </Box>
          ) : (
            /* Placeholder so top bar height is consistent even without user */
            <Box sx={{ height: 36 }} />
          )}
        </Box>

        {/* Scrollable form content */}
        <Box
          sx={{
            flex: 1,
            px: { xs: 2, sm: 4, md: 5 },
            py: { xs: 3, sm: 4 },
            maxWidth: 760,
            width: '100%',
            mx: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default PageLayout;