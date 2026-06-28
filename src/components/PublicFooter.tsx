import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Link, Stack, Typography } from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { DEFAULT_CONTACT_SETTINGS, loadContactSettings, loadFooterContent, type FooterContactSettings, type FooterContentKey } from '../services/footerContentService';

const CONTENT_LABELS: Record<FooterContentKey, string> = {
  faqs: 'FAQs',
  terms: 'Terms and Agreement',
  privacy: 'Privacy Policy',
};

const isHtml = (value: string) => /<[^>]+>/.test(value);

const PublicFooter: React.FC = () => {
  const [contact, setContact] = useState<FooterContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [dialog, setDialog] = useState<FooterContentKey | 'contact' | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContactSettings().then(setContact).catch(() => setContact(DEFAULT_CONTACT_SETTINGS));
  }, []);

  const openContentDialog = (key: FooterContentKey) => {
    setDialog(key);
    setLoading(true);
    setError('');
    loadFooterContent(key)
      .then(setContent)
      .catch((err) => {
        setContent('');
        setError(err instanceof Error ? err.message : 'Unable to load content.');
      })
      .finally(() => setLoading(false));
  };

  const email = contact.email.trim();
  const instagram = contact.instagram.trim();
  const facebook = contact.facebook.trim();
  const hasContact = !!(email || instagram || facebook);

  return (
    <Box component="footer" sx={{ flexShrink: 0, width: '100%', boxSizing: 'border-box', mt: 0, py: 3, px: 2, borderTop: '1px solid rgba(17,17,17,0.10)', background: '#fffaf0' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" justifyContent="center" flexWrap="wrap">
        {(Object.keys(CONTENT_LABELS) as FooterContentKey[]).map((key) => (
          <Button key={key} size="small" onClick={() => openContentDialog(key)} sx={{ color: '#111', borderRadius: 999 }}>{CONTENT_LABELS[key]}</Button>
        ))}
        {hasContact && <Button size="small" onClick={() => setDialog('contact')} sx={{ color: '#111', borderRadius: 999 }}>Contact Us</Button>}
        {email && <Link href={`mailto:${email}`} color="inherit" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}><EmailOutlinedIcon fontSize="small" />{email}</Link>}
        {instagram && <IconButton aria-label="Instagram" component="a" href={instagram} target="_blank" rel="noopener noreferrer" sx={{ color: '#111' }}><InstagramIcon /></IconButton>}
        {facebook && <IconButton aria-label="Facebook" component="a" href={facebook} target="_blank" rel="noopener noreferrer" sx={{ color: '#111' }}><FacebookIcon /></IconButton>}
      </Stack>
      <Typography sx={{ mt: 1.5, textAlign: 'center', color: '#666', fontSize: '0.82rem' }}>© {new Date().getFullYear()} Recap Buddies</Typography>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{dialog === 'contact' ? 'Contact Us' : dialog ? CONTENT_LABELS[dialog] : ''}</DialogTitle>
        <DialogContent dividers>
          {dialog === 'contact' ? (
            <Stack spacing={1.5}>
              {email && <Link href={`mailto:${email}`} color="inherit" underline="hover"><EmailOutlinedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />{email}</Link>}
              {instagram && <Link href={instagram} target="_blank" rel="noopener noreferrer" color="inherit"><InstagramIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Instagram</Link>}
              {facebook && <Link href={facebook} target="_blank" rel="noopener noreferrer" color="inherit"><FacebookIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Facebook</Link>}
            </Stack>
          ) : loading ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 3 }}><CircularProgress size={18} /> Loading…</Box>
          ) : error ? <Alert severity="error">{error}</Alert> : isHtml(content) ? (
            <Box sx={{ lineHeight: 1.7, color: '#111', '& p': { mt: 0, mb: 1.5 } }} dangerouslySetInnerHTML={{ __html: content }} />
          ) : <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{content || 'No content has been published yet.'}</Typography>}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PublicFooter;
