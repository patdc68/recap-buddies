import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { supabase, type RbDevice } from '../service/supabaseClient';
import {
  getLandingAssetUrl,
  removeLandingAsset,
  uploadLandingAsset,
} from '../services/landingPageService';
import {
  DEFAULT_LANDING_SETTINGS,
  type LandingContentItem,
  type LandingContentSection,
  type LandingFeaturedCamera,
  type LandingGalleryItem,
  type LandingPageSettings,
  type LandingTestimonial,
} from '../types/landingPage';
import { AdminPageIntro } from './adminDesign';

const BORDER = 'rgba(17,17,17,.12)';
const MUTED = '#666';

type Notice = { open: boolean; message: string; severity: 'success' | 'error' | 'warning' };

interface LandingPageManagerProps {
  devices: RbDevice[];
}

const fileInputSx = { display: 'none' } as const;

const ImagePreview = ({ path, fallback, alt }: { path?: string | null; fallback?: string | null; alt: string }) => {
  const src = getLandingAssetUrl(path) ?? fallback ?? null;
  return (
    <Box sx={{ width: 140, height: 104, borderRadius: 3, overflow: 'hidden', bgcolor: '#f1f1ee', border: `1px solid ${BORDER}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {src ? <Box component="img" src={src} alt={alt} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <AddPhotoAlternateIcon sx={{ color: '#aaa' }} />}
    </Box>
  );
};

const SectionHeader = ({ title, description }: { title: string; description: string }) => (
  <Box>
    <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</Typography>
    <Typography sx={{ color: MUTED, fontSize: '.86rem', mt: .3 }}>{description}</Typography>
  </Box>
);

const LandingPageManager = ({ devices }: LandingPageManagerProps) => {
  const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_LANDING_SETTINGS);
  const [cameras, setCameras] = useState<LandingFeaturedCamera[]>([]);
  const [contentItems, setContentItems] = useState<LandingContentItem[]>([]);
  const [testimonials, setTestimonials] = useState<LandingTestimonial[]>([]);
  const [gallery, setGallery] = useState<LandingGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [cameraFiles, setCameraFiles] = useState<Record<string, File | null>>({});
  const [testimonialFiles, setTestimonialFiles] = useState<Record<string, File | null>>({});
  const [galleryFiles, setGalleryFiles] = useState<Record<string, File | null>>({});
  const [newTestimonial, setNewTestimonial] = useState({ renter_name: '', feedback: '', display_order: '0', file: null as File | null });
  const [newGallery, setNewGallery] = useState({ title: '', caption: '', display_order: '0', file: null as File | null });
  const [notice, setNotice] = useState<Notice>({ open: false, message: '', severity: 'success' });

  const notify = (message: string, severity: Notice['severity'] = 'success') => setNotice({ open: true, message, severity });

  const loadContent = useCallback(async () => {
    setLoading(true);
    const [settingsResult, camerasResult, contentResult, testimonialResult, galleryResult] = await Promise.all([
      supabase.from('RB_LANDING_PAGE_SETTINGS').select('*').eq('id', 1).single(),
      supabase.from('RB_LANDING_FEATURED_CAMERA').select('*').order('display_order'),
      supabase.from('RB_LANDING_CONTENT_ITEM').select('*').order('section').order('display_order'),
      supabase.from('RB_LANDING_TESTIMONIAL').select('*').order('display_order'),
      supabase.from('RB_LANDING_GALLERY').select('*').order('display_order'),
    ]);
    const error = settingsResult.error ?? camerasResult.error ?? contentResult.error ?? testimonialResult.error ?? galleryResult.error;
    if (error) {
      notify(`Unable to load landing content: ${error.message}`, 'error');
      setLoading(false);
      return;
    }
    setSettings(settingsResult.data as LandingPageSettings);
    const deviceMap = new Map(devices.map((device) => [device.id, device]));
    setCameras(((camerasResult.data ?? []) as Array<Omit<LandingFeaturedCamera, 'cam_name' | 'device_image'>>).map((camera) => ({
      ...camera,
      cam_name: deviceMap.get(camera.device_id)?.cam_name ?? 'Unknown camera',
      device_image: deviceMap.get(camera.device_id)?.device_img ?? null,
    })));
    setContentItems((contentResult.data ?? []) as LandingContentItem[]);
    setTestimonials((testimonialResult.data ?? []) as LandingTestimonial[]);
    setGallery((galleryResult.data ?? []) as LandingGalleryItem[]);
    setLoading(false);
  }, [devices]);

  useEffect(() => { void loadContent(); }, [loadContent]);

  const updateCamera = (deviceId: string, patch: Partial<LandingFeaturedCamera>) => setCameras((current) => current.map((camera) => camera.device_id === deviceId ? { ...camera, ...patch } : camera));
  const updateContent = (id: string, patch: Partial<LandingContentItem>) => setContentItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateTestimonial = (id: string, patch: Partial<LandingTestimonial>) => setTestimonials((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateGallery = (id: string, patch: Partial<LandingGalleryItem>) => setGallery((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  const saveSettings = async () => {
    setSavingKey('settings');
    const previousPath = settings.hero_image_path;
    let uploadedPath: string | null = null;
    try {
      if (heroFile) uploadedPath = await uploadLandingAsset(heroFile, 'hero');
      const nextSettings = { ...settings, id: 1, hero_image_path: uploadedPath ?? previousPath };
      delete nextSettings.updated_at;
      const { error } = await supabase.from('RB_LANDING_PAGE_SETTINGS').update(nextSettings).eq('id', 1);
      if (error) throw new Error(error.message);
      if (uploadedPath && previousPath && previousPath !== uploadedPath) await removeLandingAsset(previousPath);
      setSettings((current) => ({ ...current, hero_image_path: uploadedPath ?? previousPath }));
      setHeroFile(null);
      notify('Hero, calls to action, and footer settings saved.');
    } catch (error) {
      if (uploadedPath) await removeLandingAsset(uploadedPath).catch(() => undefined);
      notify(error instanceof Error ? error.message : 'Unable to save landing settings.', 'error');
    } finally {
      setSavingKey('');
    }
  };

  const saveCamera = async (camera: LandingFeaturedCamera) => {
    setSavingKey(`camera-${camera.device_id}`);
    const file = cameraFiles[camera.device_id];
    const previousPath = camera.landing_image_path;
    let uploadedPath: string | null = null;
    try {
      if (file) uploadedPath = await uploadLandingAsset(file, 'cameras');
      const { error } = await supabase.from('RB_LANDING_FEATURED_CAMERA').update({
        tagline: camera.tagline.trim(),
        description: camera.description.trim(),
        landing_image_path: uploadedPath ?? previousPath,
        is_visible: Boolean(camera.is_visible),
        display_order: Number(camera.display_order) || 0,
      }).eq('device_id', camera.device_id);
      if (error) throw new Error(error.message);
      if (uploadedPath && previousPath && uploadedPath !== previousPath) await removeLandingAsset(previousPath);
      updateCamera(camera.device_id, { landing_image_path: uploadedPath ?? previousPath });
      setCameraFiles((current) => ({ ...current, [camera.device_id]: null }));
      notify(`${camera.cam_name} landing card saved.`);
    } catch (error) {
      if (uploadedPath) await removeLandingAsset(uploadedPath).catch(() => undefined);
      notify(error instanceof Error ? error.message : 'Unable to save camera.', 'error');
    } finally {
      setSavingKey('');
    }
  };

  const saveContentItem = async (item: LandingContentItem) => {
    if (!item.title.trim() || !item.body.trim()) { notify('Title and body are required.', 'error'); return; }
    setSavingKey(`content-${item.id}`);
    const { error } = await supabase.from('RB_LANDING_CONTENT_ITEM').update({
      title: item.title.trim(),
      body: item.body.trim(),
      icon_key: item.icon_key?.trim() || null,
      display_order: Number(item.display_order) || 0,
      is_visible: Boolean(item.is_visible),
    }).eq('id', item.id);
    setSavingKey('');
    if (error) notify(error.message, 'error'); else notify('Content item saved.');
  };

  const addContentItem = async (section: LandingContentSection) => {
    const sectionItems = contentItems.filter((item) => item.section === section);
    setSavingKey(`add-${section}`);
    const { error } = await supabase.from('RB_LANDING_CONTENT_ITEM').insert({
      section,
      title: 'New item',
      body: 'Add the public-facing content here.',
      icon_key: section === 'why' ? 'spark' : null,
      is_visible: false,
      display_order: Math.max(0, ...sectionItems.map((item) => item.display_order)) + 1,
    });
    setSavingKey('');
    if (error) notify(error.message, 'error'); else { notify('Draft item added.'); await loadContent(); }
  };

  const deleteRecord = async (table: 'RB_LANDING_CONTENT_ITEM' | 'RB_LANDING_TESTIMONIAL' | 'RB_LANDING_GALLERY', id: string, assetPath?: string | null) => {
    if (!window.confirm('Delete this landing-page item? This cannot be undone.')) return;
    setSavingKey(`delete-${id}`);
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error && assetPath) await removeLandingAsset(assetPath).catch(() => notify('Item deleted, but its old image could not be removed.', 'warning'));
    setSavingKey('');
    if (error) notify(error.message, 'error'); else { notify('Item deleted.'); await loadContent(); }
  };

  const saveTestimonial = async (testimonial: LandingTestimonial) => {
    if (!testimonial.renter_name.trim() || !testimonial.feedback.trim()) { notify('Renter name and feedback are required.', 'error'); return; }
    setSavingKey(`testimonial-${testimonial.id}`);
    const file = testimonialFiles[testimonial.id];
    const previousPath = testimonial.photo_path;
    let uploadedPath: string | null = null;
    try {
      if (file) uploadedPath = await uploadLandingAsset(file, 'testimonials');
      const { error } = await supabase.from('RB_LANDING_TESTIMONIAL').update({
        renter_name: testimonial.renter_name.trim(),
        feedback: testimonial.feedback.trim(),
        photo_path: uploadedPath ?? previousPath,
        is_visible: Boolean(testimonial.is_visible),
        display_order: Number(testimonial.display_order) || 0,
      }).eq('id', testimonial.id);
      if (error) throw new Error(error.message);
      if (uploadedPath && previousPath) await removeLandingAsset(previousPath);
      updateTestimonial(testimonial.id, { photo_path: uploadedPath ?? previousPath });
      setTestimonialFiles((current) => ({ ...current, [testimonial.id]: null }));
      notify('Testimonial saved.');
    } catch (error) {
      if (uploadedPath) await removeLandingAsset(uploadedPath).catch(() => undefined);
      notify(error instanceof Error ? error.message : 'Unable to save testimonial.', 'error');
    } finally { setSavingKey(''); }
  };

  const createTestimonial = async () => {
    if (!newTestimonial.renter_name.trim() || !newTestimonial.feedback.trim()) { notify('Renter name and feedback are required.', 'error'); return; }
    setSavingKey('new-testimonial');
    let uploadedPath: string | null = null;
    try {
      if (newTestimonial.file) uploadedPath = await uploadLandingAsset(newTestimonial.file, 'testimonials');
      const { error } = await supabase.from('RB_LANDING_TESTIMONIAL').insert({
        renter_name: newTestimonial.renter_name.trim(),
        feedback: newTestimonial.feedback.trim(),
        photo_path: uploadedPath,
        display_order: Number(newTestimonial.display_order) || 0,
        is_visible: true,
      });
      if (error) throw new Error(error.message);
      setNewTestimonial({ renter_name: '', feedback: '', display_order: '0', file: null });
      notify('Testimonial created.');
      await loadContent();
    } catch (error) {
      if (uploadedPath) await removeLandingAsset(uploadedPath).catch(() => undefined);
      notify(error instanceof Error ? error.message : 'Unable to create testimonial.', 'error');
    } finally { setSavingKey(''); }
  };

  const saveGalleryItem = async (item: LandingGalleryItem) => {
    setSavingKey(`gallery-${item.id}`);
    const file = galleryFiles[item.id];
    const previousPath = item.image_path;
    let uploadedPath: string | null = null;
    try {
      if (file) uploadedPath = await uploadLandingAsset(file, 'gallery');
      const { error } = await supabase.from('RB_LANDING_GALLERY').update({
        image_path: uploadedPath ?? previousPath,
        title: item.title?.trim() || null,
        caption: item.caption?.trim() || null,
        display_order: Number(item.display_order) || 0,
        is_visible: Boolean(item.is_visible),
      }).eq('id', item.id);
      if (error) throw new Error(error.message);
      if (uploadedPath && previousPath) await removeLandingAsset(previousPath);
      updateGallery(item.id, { image_path: uploadedPath ?? previousPath });
      setGalleryFiles((current) => ({ ...current, [item.id]: null }));
      notify('Gallery item saved.');
    } catch (error) {
      if (uploadedPath) await removeLandingAsset(uploadedPath).catch(() => undefined);
      notify(error instanceof Error ? error.message : 'Unable to save gallery item.', 'error');
    } finally { setSavingKey(''); }
  };

  const createGalleryItem = async () => {
    if (!newGallery.file) { notify('Choose a gallery image first.', 'error'); return; }
    setSavingKey('new-gallery');
    let uploadedPath: string | null = null;
    try {
      uploadedPath = await uploadLandingAsset(newGallery.file, 'gallery');
      const { error } = await supabase.from('RB_LANDING_GALLERY').insert({
        image_path: uploadedPath,
        title: newGallery.title.trim() || null,
        caption: newGallery.caption.trim() || null,
        display_order: Number(newGallery.display_order) || 0,
        is_visible: true,
      });
      if (error) throw new Error(error.message);
      setNewGallery({ title: '', caption: '', display_order: '0', file: null });
      notify('Gallery item created.');
      await loadContent();
    } catch (error) {
      if (uploadedPath) await removeLandingAsset(uploadedPath).catch(() => undefined);
      notify(error instanceof Error ? error.message : 'Unable to create gallery item.', 'error');
    } finally { setSavingKey(''); }
  };

  const contentBySection = useMemo(() => ({
    why: contentItems.filter((item) => item.section === 'why'),
    how: contentItems.filter((item) => item.section === 'how'),
    faq: contentItems.filter((item) => item.section === 'faq'),
  }), [contentItems]);

  const chooseFile = (setter: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => setter(event.target.files?.[0] ?? null);

  if (loading) return <Box sx={{ minHeight: 440, display: 'grid', placeItems: 'center' }}><CircularProgress color="inherit" /></Box>;

  return (
    <Box>
      <AdminPageIntro eyebrow="Public experience" title="Landing Page" description="Manage homepage copy, featured cameras, renter stories, gallery, FAQ, and the single authoritative set of footer contact details." action={<Button href="/" target="_blank" rel="noreferrer" variant="outlined" endIcon={<OpenInNewIcon />}>Preview homepage</Button>} />

      <Stack spacing={2}>
        <Accordion defaultExpanded sx={{ border: `1px solid ${BORDER}`, '& .MuiAccordionSummary-root': { px: { xs: 2, md: 3 }, py: 1 }, '& .MuiAccordionDetails-root': { px: { xs: 2, md: 3 }, pb: 3 } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><SectionHeader title="Hero, final CTA, and footer" description="Main homepage message, calls to action, hero visual, and public contact links." /></AccordionSummary>
          <AccordionDetails>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Hero eyebrow" value={settings.hero_eyebrow} onChange={(event) => setSettings({ ...settings, hero_eyebrow: event.target.value })} />
              <TextField label="Hero headline" value={settings.hero_headline} onChange={(event) => setSettings({ ...settings, hero_headline: event.target.value })} />
              <TextField label="Hero subheadline" multiline minRows={3} value={settings.hero_subheadline} onChange={(event) => setSettings({ ...settings, hero_subheadline: event.target.value })} />
              <TextField label="Hero supporting text" multiline minRows={3} value={settings.hero_supporting_text} onChange={(event) => setSettings({ ...settings, hero_supporting_text: event.target.value })} />
              <TextField label="Rent CTA label" value={settings.rent_cta_label} onChange={(event) => setSettings({ ...settings, rent_cta_label: event.target.value })} />
              <TextField label="Returnee CTA label" value={settings.returnee_cta_label} onChange={(event) => setSettings({ ...settings, returnee_cta_label: event.target.value })} />
              <TextField label="Browse cameras CTA label" value={settings.browse_cta_label} onChange={(event) => setSettings({ ...settings, browse_cta_label: event.target.value })} />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}><ImagePreview path={settings.hero_image_path} alt="Current hero" /><Box><Button component="label" variant="outlined" startIcon={<AddPhotoAlternateIcon />}>Choose hero image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile(setHeroFile)} style={fileInputSx} /></Button><Typography sx={{ color: MUTED, fontSize: '.78rem', mt: 1 }}>{heroFile?.name ?? 'Optional · JPG, PNG, WebP, or GIF · max 10 MB'}</Typography></Box></Box>
              <TextField label="Final CTA headline" value={settings.final_cta_headline} onChange={(event) => setSettings({ ...settings, final_cta_headline: event.target.value })} />
              <TextField label="Final CTA supporting text" multiline minRows={2} value={settings.final_cta_subheadline} onChange={(event) => setSettings({ ...settings, final_cta_subheadline: event.target.value })} />
              <TextField label="Facebook handle / label" value={settings.facebook_label} onChange={(event) => setSettings({ ...settings, facebook_label: event.target.value })} />
              <TextField label="Facebook link" value={settings.facebook_url} onChange={(event) => setSettings({ ...settings, facebook_url: event.target.value })} />
              <TextField label="Instagram handle / label" value={settings.instagram_label} onChange={(event) => setSettings({ ...settings, instagram_label: event.target.value })} />
              <TextField label="Instagram link" value={settings.instagram_url} onChange={(event) => setSettings({ ...settings, instagram_url: event.target.value })} />
              <TextField label="Contact email" type="email" value={settings.contact_email} onChange={(event) => setSettings({ ...settings, contact_email: event.target.value })} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}><Button variant="contained" startIcon={<SaveOutlinedIcon />} disabled={savingKey === 'settings'} onClick={() => void saveSettings()}>{savingKey === 'settings' ? 'Saving…' : 'Save hero & footer'}</Button></Box>
          </AccordionDetails>
        </Accordion>

        <Accordion sx={{ border: `1px solid ${BORDER}` }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><SectionHeader title="Featured cameras" description="Camera names stay sourced from RB_DEVICES. Control landing imagery, copy, visibility, and order here." /></AccordionSummary>
          <AccordionDetails>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {cameras.map((camera) => (
                <Paper key={camera.device_id} variant="outlined" sx={{ p: 2.5, borderColor: BORDER }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5 }}>
                    <ImagePreview path={camera.landing_image_path} fallback={camera.device_image} alt={camera.cam_name} />
                    <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                      <Box><Typography sx={{ fontWeight: 700 }}>{camera.cam_name}</Typography><Chip label="RB_DEVICES" size="small" sx={{ mt: .6 }} /></Box>
                      <Stack direction="row" justifyContent={{ md: 'flex-end' }} alignItems="center" spacing={2}><FormControlLabel control={<Switch checked={Boolean(camera.is_visible)} onChange={(event) => updateCamera(camera.device_id, { is_visible: event.target.checked })} />} label="Visible" /><TextField label="Order" type="number" size="small" value={camera.display_order} onChange={(event) => updateCamera(camera.device_id, { display_order: Number(event.target.value) })} sx={{ width: 100 }} /></Stack>
                      <TextField label="Tagline" value={camera.tagline} onChange={(event) => updateCamera(camera.device_id, { tagline: event.target.value })} />
                      <TextField label="Description" value={camera.description} onChange={(event) => updateCamera(camera.device_id, { description: event.target.value })} />
                      <Box><Button component="label" variant="outlined" size="small" startIcon={<AddPhotoAlternateIcon />}>Replace landing image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile((file) => setCameraFiles((current) => ({ ...current, [camera.device_id]: file })))} style={fileInputSx} /></Button><Typography sx={{ color: MUTED, fontSize: '.75rem', mt: .7 }}>{cameraFiles[camera.device_id]?.name ?? 'Uses the catalogue image when empty.'}</Typography></Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'end' }}><Button variant="contained" size="small" startIcon={<SaveOutlinedIcon />} disabled={savingKey === `camera-${camera.device_id}`} onClick={() => void saveCamera(camera)}>Save camera</Button></Box>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {(['why', 'how', 'faq'] as LandingContentSection[]).map((section) => {
          const labels = section === 'why' ? ['Why choose us', 'Benefits shown as homepage feature cards.'] : section === 'how' ? ['How it works', 'Booking steps for new and returning renters.'] : ['FAQ', 'Common public booking questions and answers.'];
          return (
            <Accordion key={section} sx={{ border: `1px solid ${BORDER}` }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}><SectionHeader title={labels[0]} description={labels[1]} /></AccordionSummary>
              <AccordionDetails>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1.5}>
                  {contentBySection[section].map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2, borderColor: BORDER }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: section === 'why' ? '1fr 1.5fr 130px' : '1fr 1.7fr 130px' }, gap: 1.5 }}>
                        <TextField label={section === 'faq' ? 'Question' : 'Title'} value={item.title} onChange={(event) => updateContent(item.id, { title: event.target.value })} />
                        <TextField label={section === 'faq' ? 'Answer' : 'Description'} multiline minRows={2} value={item.body} onChange={(event) => updateContent(item.id, { body: event.target.value })} />
                        <TextField label="Order" type="number" value={item.display_order} onChange={(event) => updateContent(item.id, { display_order: Number(event.target.value) })} />
                        {section === 'why' && <TextField label="Icon key" helperText="camera, spark, verified, delivery, support" value={item.icon_key ?? ''} onChange={(event) => updateContent(item.id, { icon_key: event.target.value })} />}
                        <FormControlLabel control={<Switch checked={Boolean(item.is_visible)} onChange={(event) => updateContent(item.id, { is_visible: event.target.checked })} />} label="Visible" />
                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ gridColumn: { md: section === 'why' ? '2 / 4' : '2 / 4' } }}><Button color="error" startIcon={<DeleteOutlineIcon />} disabled={savingKey === `delete-${item.id}`} onClick={() => void deleteRecord('RB_LANDING_CONTENT_ITEM', item.id)}>Delete</Button><Button variant="contained" startIcon={<SaveOutlinedIcon />} disabled={savingKey === `content-${item.id}`} onClick={() => void saveContentItem(item)}>Save</Button></Stack>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
                <Button startIcon={<AddIcon />} sx={{ mt: 2 }} disabled={savingKey === `add-${section}`} onClick={() => void addContentItem(section)}>Add draft item</Button>
              </AccordionDetails>
            </Accordion>
          );
        })}

        <Accordion sx={{ border: `1px solid ${BORDER}` }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><SectionHeader title="Testimonials" description="Publish real renter feedback with an optional avatar or photo." /></AccordionSummary>
          <AccordionDetails>
            <Divider sx={{ mb: 2 }} />
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderColor: BORDER, bgcolor: '#fafafa' }}>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Add testimonial</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 110px' }, gap: 1.5 }}><TextField label="Renter name" value={newTestimonial.renter_name} onChange={(event) => setNewTestimonial({ ...newTestimonial, renter_name: event.target.value })} /><TextField label="Feedback" multiline minRows={2} value={newTestimonial.feedback} onChange={(event) => setNewTestimonial({ ...newTestimonial, feedback: event.target.value })} /><TextField label="Order" type="number" value={newTestimonial.display_order} onChange={(event) => setNewTestimonial({ ...newTestimonial, display_order: event.target.value })} /><Button component="label" variant="outlined" startIcon={<AddPhotoAlternateIcon />}>Photo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile((file) => setNewTestimonial({ ...newTestimonial, file }))} style={fileInputSx} /></Button><Typography sx={{ color: MUTED, alignSelf: 'center' }}>{newTestimonial.file?.name ?? 'Optional photo'}</Typography><Button variant="contained" startIcon={<AddIcon />} disabled={savingKey === 'new-testimonial'} onClick={() => void createTestimonial()}>Publish</Button></Box>
            </Paper>
            <Stack spacing={1.5}>{testimonials.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 2.5, borderColor: BORDER }}><Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}><ImagePreview path={item.photo_path} alt={item.renter_name} /><Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 110px' }, gap: 1.5 }}><TextField label="Renter name" value={item.renter_name} onChange={(event) => updateTestimonial(item.id, { renter_name: event.target.value })} /><TextField label="Feedback" multiline minRows={2} value={item.feedback} onChange={(event) => updateTestimonial(item.id, { feedback: event.target.value })} /><TextField label="Order" type="number" value={item.display_order} onChange={(event) => updateTestimonial(item.id, { display_order: Number(event.target.value) })} /><Button component="label" variant="outlined" size="small" startIcon={<AddPhotoAlternateIcon />}>Replace photo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile((file) => setTestimonialFiles((current) => ({ ...current, [item.id]: file })))} style={fileInputSx} /></Button><FormControlLabel control={<Switch checked={Boolean(item.is_visible)} onChange={(event) => updateTestimonial(item.id, { is_visible: event.target.checked })} />} label="Visible" /><Stack direction="row" spacing={1} justifyContent="flex-end"><Button color="error" onClick={() => void deleteRecord('RB_LANDING_TESTIMONIAL', item.id, item.photo_path)}>Delete</Button><Button variant="contained" onClick={() => void saveTestimonial(item)}>Save</Button></Stack></Box></Box></Paper>)}</Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion sx={{ border: `1px solid ${BORDER}` }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><SectionHeader title="Sample gallery" description="Upload renter-approved photos for the public masonry gallery." /></AccordionSummary>
          <AccordionDetails>
            <Divider sx={{ mb: 2 }} />
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderColor: BORDER, bgcolor: '#fafafa' }}><Typography sx={{ fontWeight: 700, mb: 1.5 }}>Add gallery photo</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr 110px' }, gap: 1.5 }}><TextField label="Title" value={newGallery.title} onChange={(event) => setNewGallery({ ...newGallery, title: event.target.value })} /><TextField label="Caption" value={newGallery.caption} onChange={(event) => setNewGallery({ ...newGallery, caption: event.target.value })} /><TextField label="Order" type="number" value={newGallery.display_order} onChange={(event) => setNewGallery({ ...newGallery, display_order: event.target.value })} /><Button component="label" variant="outlined" startIcon={<AddPhotoAlternateIcon />}>Choose image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile((file) => setNewGallery({ ...newGallery, file }))} style={fileInputSx} /></Button><Typography sx={{ color: MUTED, alignSelf: 'center' }}>{newGallery.file?.name ?? 'Image required'}</Typography><Button variant="contained" startIcon={<AddIcon />} disabled={savingKey === 'new-gallery'} onClick={() => void createGalleryItem()}>Publish</Button></Box></Paper>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 1.5 }}>{gallery.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 2.5, borderColor: BORDER }}><Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}><ImagePreview path={item.image_path} alt={item.title ?? 'Gallery item'} /><Stack spacing={1.3} sx={{ flex: 1 }}><TextField label="Title" value={item.title ?? ''} onChange={(event) => updateGallery(item.id, { title: event.target.value })} /><TextField label="Caption" value={item.caption ?? ''} onChange={(event) => updateGallery(item.id, { caption: event.target.value })} /><Stack direction="row" spacing={1}><TextField label="Order" type="number" size="small" value={item.display_order} onChange={(event) => updateGallery(item.id, { display_order: Number(event.target.value) })} sx={{ width: 95 }} /><FormControlLabel control={<Switch checked={Boolean(item.is_visible)} onChange={(event) => updateGallery(item.id, { is_visible: event.target.checked })} />} label="Visible" /></Stack><Button component="label" variant="outlined" size="small">Replace image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile((file) => setGalleryFiles((current) => ({ ...current, [item.id]: file })))} style={fileInputSx} /></Button><Stack direction="row" spacing={1} justifyContent="flex-end"><Button color="error" onClick={() => void deleteRecord('RB_LANDING_GALLERY', item.id, item.image_path)}>Delete</Button><Button variant="contained" onClick={() => void saveGalleryItem(item)}>Save</Button></Stack></Stack></Box></Paper>)}</Box>
          </AccordionDetails>
        </Accordion>
      </Stack>

      <Snackbar open={notice.open} autoHideDuration={4500} onClose={() => setNotice((current) => ({ ...current, open: false }))}><Alert severity={notice.severity} onClose={() => setNotice((current) => ({ ...current, open: false }))}>{notice.message}</Alert></Snackbar>
    </Box>
  );
};

export default LandingPageManager;
