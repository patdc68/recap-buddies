import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#666666',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f6f6f3',
      paper: '#ffffff',
    },
    text: {
      primary: '#111111',
      secondary: '#666666',
    },
    divider: 'rgba(17, 17, 17, 0.12)',
  },
  typography: {
    fontFamily: 'GlacialIndifference, Arial, sans-serif',
    h1: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 700 },
    h2: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 700 },
    h3: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 700 },
    h4: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 700 },
    h5: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 700 },
    h6: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 700 },
    body1: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 400 },
    body2: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 400 },
    button: { fontFamily: 'GlacialIndifference, Arial, sans-serif', fontWeight: 700, textTransform: 'none' },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          backgroundColor: '#ffffff',
        },
        body: {
          backgroundColor: '#f6f6f3',
          color: '#111111',
          margin: 0,
          fontFamily: 'GlacialIndifference, Arial, sans-serif',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 14,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: '1px solid rgba(16,16,16,0.10)',
          boxShadow: '0 12px 34px rgba(16,16,16,0.055)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 40,
          paddingLeft: 16,
          paddingRight: 16,
          transition: 'background-color 0.2s ease, transform 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          backgroundColor: '#000000',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#222222',
          },
        },
        outlined: {
          borderColor: 'rgba(17,17,17,0.2)',
          color: '#111111',
          '&:hover': {
            borderColor: '#111111',
            backgroundColor: 'rgba(17,17,17,0.03)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderColor: 'rgba(17,17,17,0.16)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(17,17,17,0.32)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#111111',
              borderWidth: 1,
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#111111',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: '1px solid rgba(16,16,16,0.11)',
          borderRadius: 20,
          boxShadow: '0 28px 80px rgba(16,16,16,0.18)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '22px 24px 16px',
          fontSize: '1.2rem',
          fontWeight: 700,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 22px',
          borderTop: '1px solid rgba(16,16,16,0.08)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '3px solid rgba(255,194,28,0.42)',
            outlineOffset: 2,
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '18px !important',
          boxShadow: '0 8px 26px rgba(16,16,16,0.045)',
          overflow: 'hidden',
          '&:before': { display: 'none' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#000000',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#666666',
          '&.Mui-selected': {
            color: '#111111',
          },
        },
      },
    },
  },
});

export default theme;
