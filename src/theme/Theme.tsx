import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    surface: { card: string; elevated: string; border: string };
  }
  interface PaletteOptions {
    surface?: { card?: string; elevated?: string; border?: string };
  }
}

// ── Palette tokens ────────────────────────────────────────────────────────────
// Warm cream light theme — amber gold primary, dark espresso text
const AMBER       = '#C9973A';
const AMBER_LIGHT = '#E5B85C';
const AMBER_DARK  = '#9A6F24';
const CREAM       = '#FFFBF4';      // page background
const PAPER       = '#FFFFFF';      // cards / paper
const CARD        = '#FDF6E8';      // slightly tinted card surface
const ESPRESSO    = '#1A1008';      // darkest text
const INK         = '#3D2B0F';      // primary text
const MUTED       = '#7A6040';      // secondary text
const BORDER      = 'rgba(201,151,58,0.18)';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: AMBER,
      light: AMBER_LIGHT,
      dark: AMBER_DARK,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#6B8E6B',
      light: '#8FAF8F',
      dark: '#4A6A4A',
      contrastText: '#FFFFFF',
    },
    background: {
      default: CREAM,
      paper: PAPER,
    },
    surface: {
      card: CARD,
      elevated: '#FFF8ED',
      border: BORDER,
    },
    text: {
      primary: INK,
      secondary: MUTED,
      disabled: '#B8A080',
    },
    error:   { main: '#C0392B' },
    success: { main: '#2E7D32' },
    warning: { main: '#E65100' },
    divider: BORDER,
  },

  typography: {
    fontFamily: '"Sora", "DM Sans", sans-serif',
    h1: { fontFamily: '"Playfair Display", serif', fontWeight: 700, letterSpacing: '-0.02em', color: ESPRESSO },
    h2: { fontFamily: '"Playfair Display", serif', fontWeight: 700, letterSpacing: '-0.02em', color: ESPRESSO },
    h3: { fontFamily: '"Playfair Display", serif', fontWeight: 600, color: ESPRESSO },
    h4: { fontFamily: '"Sora", sans-serif', fontWeight: 700, letterSpacing: '-0.01em', color: INK },
    h5: { fontFamily: '"Sora", sans-serif', fontWeight: 600, color: INK },
    h6: { fontFamily: '"Sora", sans-serif', fontWeight: 600, color: INK },
    subtitle1: { fontFamily: '"DM Sans", sans-serif', fontWeight: 500, letterSpacing: '0.01em' },
    subtitle2: { fontFamily: '"DM Sans", sans-serif', fontWeight: 500 },
    body1: { fontFamily: '"DM Sans", sans-serif', lineHeight: 1.7, color: INK },
    body2: { fontFamily: '"DM Sans", sans-serif', lineHeight: 1.6, color: MUTED },
    caption: {
      fontFamily: '"Sora", sans-serif',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontSize: '0.7rem',
      color: MUTED,
    },
    button: { fontFamily: '"Sora", sans-serif', fontWeight: 600, letterSpacing: '0.03em' },
  },

  shape: { borderRadius: 12 },

  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: ${CREAM}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F5ECE0; }
        ::-webkit-scrollbar-thumb { background: ${AMBER}66; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${AMBER}AA; }
      `,
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          textTransform: 'none',
          fontSize: '0.9rem',
          transition: 'all 0.2s ease',
        },
        contained: {
          background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_LIGHT} 100%)`,
          color: '#FFFFFF',
          boxShadow: `0 4px 16px ${AMBER}40`,
          '&:hover': {
            background: `linear-gradient(135deg, ${AMBER_DARK} 0%, ${AMBER} 100%)`,
            boxShadow: `0 6px 24px ${AMBER}55`,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: `${AMBER}66`,
          color: AMBER_DARK,
          '&:hover': {
            borderColor: AMBER,
            background: `${AMBER}0A`,
          },
        },
        text: {
          color: AMBER_DARK,
          '&:hover': { background: `${AMBER}0A` },
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            background: PAPER,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: `${AMBER}88` },
            '&.Mui-focused fieldset': { borderColor: AMBER, borderWidth: 1.5 },
          },
          '& .MuiInputLabel-root': { color: MUTED },
          '& .MuiInputLabel-root.Mui-focused': { color: AMBER_DARK },
          '& .MuiInputBase-input': { color: INK },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          background: PAPER,
          color: INK,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${AMBER}88` },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: AMBER, borderWidth: 1.5 },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          background: PAPER,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          backgroundImage: 'none',
          boxShadow: '0 2px 12px rgba(201,151,58,0.08)',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 2px 12px rgba(201,151,58,0.08)',
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: `${AMBER}30`,
          '&.Mui-active': { color: AMBER },
          '&.Mui-completed': { color: '#2E7D32' },
        },
      },
    },

    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: MUTED,
          '&.Mui-active': { color: AMBER_DARK, fontWeight: 600 },
          '&.Mui-completed': { color: '#2E7D32' },
        },
      },
    },

    MuiStepConnector: {
      styleOverrides: {
        line: { borderColor: BORDER },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontFamily: '"Sora", sans-serif', fontSize: '0.75rem' },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontFamily: '"DM Sans", sans-serif' },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          background: PAPER,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(201,151,58,0.12)',
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: INK,
          '&:hover': { background: `${AMBER}0A` },
          '&.Mui-selected': { background: `${AMBER}14`, color: AMBER_DARK },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { color: MUTED },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: BORDER },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { background: `${AMBER}18` },
        bar: { background: `linear-gradient(90deg, ${AMBER}, ${AMBER_LIGHT})` },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: MUTED,
          borderColor: BORDER,
          '&.Mui-selected': {
            color: AMBER_DARK,
            background: `${AMBER}12`,
            borderColor: `${AMBER}88`,
          },
          '&:hover': { background: `${AMBER}08` },
        },
      },
    },
  },
});

export default theme;