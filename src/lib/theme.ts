import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    accent: true;
  }
}

export const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary:   { main: '#0077C8', contrastText: '#fff' },
    accent:    { main: '#00AEEF', contrastText: '#fff' },
    secondary: { main: '#FFC726', contrastText: '#000' },
    success:   { main: '#70BE44' },
    text:      { primary: '#4A4A4A', secondary: '#6E6E6E' },
    background:{ default: '#FAFAFA', paper: '#fff' },
  },
  typography: {
    fontFamily: ['"Almarai"', 'sans-serif'].join(','),
    button:     { textTransform: 'none' },
  },
});
