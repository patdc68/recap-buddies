import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ADMIN_COLORS, adminSurfaceSx } from './adminDesignTokens';

interface AdminPageIntroProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function AdminPageIntro({ eyebrow, title, description, action }: AdminPageIntroProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
      <Box sx={{ maxWidth: 720 }}>
        {eyebrow && <Typography sx={{ color: ADMIN_COLORS.muted, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', mb: 0.75 }}>{eyebrow}</Typography>}
        <Typography component="h1" sx={{ color: ADMIN_COLORS.ink, fontSize: { xs: '1.75rem', md: '2.15rem' }, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.08 }}>{title}</Typography>
        <Typography sx={{ color: ADMIN_COLORS.muted, mt: 1, lineHeight: 1.55 }}>{description}</Typography>
      </Box>
      {action}
    </Box>
  );
}

export function AdminEmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <Paper elevation={0} sx={{ ...adminSurfaceSx, p: { xs: 3, md: 5 }, textAlign: 'center', borderStyle: 'dashed', boxShadow: 'none' }}>
      {icon && <Box sx={{ color: '#999', mb: 1 }}>{icon}</Box>}
      <Typography sx={{ color: ADMIN_COLORS.ink, fontWeight: 700 }}>{title}</Typography>
      {description && <Typography sx={{ color: ADMIN_COLORS.muted, mt: 0.5 }}>{description}</Typography>}
    </Paper>
  );
}
