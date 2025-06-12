// src/components/ClientLayout.tsx
'use client';

import React from 'react';
import { useTheme, useMediaQuery, Box, Toolbar } from '@mui/material';
import OffcanvasSidebar from './Sidebar';

const DRAWER_WIDTH = 280;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  // now this runs only in the browser
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <>
      {/* sidebar always mounted; it internally switches between permanent/temporary */}
      <OffcanvasSidebar />

      {/* push content left by drawer width on desktop */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pr: isDesktop ? `${DRAWER_WIDTH}px` : 0,
          // optional transition for smoothness
          transition: theme.transitions.create('padding', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* This toolbar matches the one inside your Drawer for spacing */}
        <Toolbar />
        {children}
      </Box>
    </>
  );
}
