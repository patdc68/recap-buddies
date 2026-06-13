import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Link, Stack, Typography, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { loadFooterContactSettings, loadFooterMarkdown, type FooterContactSettings, type FooterRichContentKey } from '../services/footerContentService';

const renderMarkdown = (content: string) => content.split('\n').map((line, idx) => {
  if (line.startsWith('### ')) return <Typography key={idx} variant="h6" sx={{ mt: 2, fontWeight: 800 }}>{line.slice(4)}</Typography>;
  if (line.startsWith('## ')) return <Typography key={idx} variant="h5" sx={{ mt: 2, fontWeight: 800 }}>{line.slice(3)}</Typography>;
  if (line.startsWith('# ')) return <Typography key={idx} variant="h4" sx={{ mt: 2, fontWeight: 900 }}>{line.slice(2)}</Typography>;
  if (line.trim().startsWith('- ')) return <Typography key={idx} component="li" sx={{ ml: 2, color: '#333' }}>{line.trim().slice(2)}</Typography>;
  if (!line.trim()) return <Box key={idx} sx={{ height: 10 }} />;
  return <Typography key={idx} sx={{ color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{line}</Typography>;
});

const CONTENT_META: Record<FooterRichContentKey, string> = {
  faqs: 'FAQs',
  terms: 'Terms and Agreement',
  privacy: 'Privacy Policy',
};

const PublicFooter: React.FC = () => {
  const [contact, setContact] = useState<FooterContactSettings>({ email: '', instagram: '', facebook: '' });
  const [dialog, setDialog] = useState<FooterRichContentKey | 'contact' | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { void loadFooterContactSettings().then(setContact).catch(() => undefined); }, []);

  useEffect(() => {
    if (!dialog || dialog === 'contact') return;
    void Promise.resolve().then(() => {
      setLoading(true);
      return loadFooterMarkdown(dialog)
        .then(setContent)
        .catch((e) => setContent(e instanceof Error ? e.message : 'Content is not available.'))
        .finally(() => setLoading(false));
    });
  }, [dialog]);

  const safeUrl = (url: string) => /^https?:\/\//i.test(url) ? url : `https://${url}`;

  return (
    <Box component="footer" sx={{ mt: 'auto', px: { xs: 2, md: 4 }, py: 3, borderTop: '1px solid rgba(17,17,17,0.1)', background: '#fffdf7' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ maxWidth: 1180, mx: 'auto' }}>
        <Typography sx={{ fontWeight: 900, letterSpacing: 0.3, color: '#111' }}>Recap Buddies</Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center">
          <Button size="small" onClick={() => setDialog('faqs')}>FAQs</Button>
          <Button size="small" onClick={() => setDialog('terms')}>Terms and Agreement</Button>
          <Button size="small" onClick={() => setDialog('privacy')}>Privacy Policy</Button>
          {(contact.email || contact.instagram || contact.facebook) && <Button size="small" onClick={() => setDialog('contact')}>Contact Us</Button>}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {contact.email && <IconButton component="a" href={`mailto:${contact.email}`} size="small" aria-label="Email"><EmailOutlinedIcon /></IconButton>}
          {contact.instagram && <IconButton component="a" href={safeUrl(contact.instagram)} target="_blank" rel="noreferrer" size="small" aria-label="Instagram"><InstagramIcon /></IconButton>}
          {contact.facebook && <IconButton component="a" href={safeUrl(contact.facebook)} target="_blank" rel="noreferrer" size="small" aria-label="Facebook"><FacebookIcon /></IconButton>}
        </Stack>
      </Stack>
      <Dialog open={!!dialog} onClose={() => setDialog(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, pr: 6 }}>{dialog === 'contact' ? 'Contact Us' : dialog ? CONTENT_META[dialog] : ''}<IconButton onClick={() => setDialog(null)} sx={{ position: 'absolute', right: 12, top: 10 }}><CloseIcon /></IconButton></DialogTitle>
        <DialogContent dividers sx={{ minHeight: 180 }}>
          {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box> : dialog === 'contact' ? (
            <Stack spacing={1.5}>{contact.email && <Link href={`mailto:${contact.email}`}>{contact.email}</Link>}{contact.instagram && <Link href={safeUrl(contact.instagram)} target="_blank" rel="noreferrer">Instagram</Link>}{contact.facebook && <Link href={safeUrl(contact.facebook)} target="_blank" rel="noreferrer">Facebook</Link>}</Stack>
          ) : content.trim() ? renderMarkdown(content) : <Typography color="text.secondary">Content is not available yet.</Typography>}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PublicFooter;
