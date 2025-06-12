// src/components/ChatLog.tsx
import { Box, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';

export interface HistoryItem {
  ActionBy:    string;
  ActionType:  string;
  ActionNote?: string;
  ActionDate:  string;
}

export function ChatLog({
  history,
  currentUser,
}: {
  history: HistoryItem[];
  currentUser: { role: string; name: string };
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <Box
      sx={{
        maxHeight: 300,
        overflowY: 'auto',
        px: 1,
        py: 1,
        bgcolor: 'background.paper',
        borderRadius: 1,
        mb: 2,
      }}
    >
      {history.map((h, i) => {
        const by = `${currentUser.role} – ${currentUser.name}`;
        const isMine = h.ActionBy === by;
        return (
          <Box
            key={i}
            sx={{
              display: 'flex',
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              mb: 1,
            }}
          >
            <Box
              sx={{
                bgcolor: isMine ? 'primary.light' : 'grey.200',
                color: isMine ? 'primary.contrastText' : 'text.primary',
                p: 1.5,
                borderRadius: 2,
                maxWidth: '80%',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {h.ActionType}
              </Typography>
              {h.ActionNote && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {h.ActionNote}
                </Typography>
              )}
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
              >
                {new Date(h.ActionDate).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        );
      })}
      <div ref={endRef} />
    </Box>
  );
}
