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
      default: '#ffffff',
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
  shape: { borderRadius: 16 },
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
          backgroundColor: '#ffffff',
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
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
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
