import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import recapCharacter from '../assets/recap-buddies-char-rotated.png';
import recapCharacterLogo from '../assets/recap-char-logo.png';
import {
  fetchLandingPageData,
  getLandingAssetUrl,
  getPublicDeviceImageUrl,
} from '../services/landingPageService';
import {
  DEFAULT_LANDING_SETTINGS,
  type LandingPageData,
} from '../types/landingPage';

const INK = '#101010';
const MUTED = '#666666';
const BORDER = 'rgba(16,16,16,0.11)';
const YELLOW = '#FFC21C';
const SOFT_YELLOW = '#FFF8DE';

const EMPTY_DATA: LandingPageData = {
  settings: DEFAULT_LANDING_SETTINGS,
  featured_cameras: [],
  content_items: [],
  testimonials: [],
  gallery: [],
};

const sectionTitleSx = {
  color: INK,
  fontSize: { xs: '2rem', md: '3rem' },
  lineHeight: 1.04,
  letterSpacing: '-0.04em',
  maxWidth: 700,
};

const contentIcon = (key: string | null) => {
  const sx = { fontSize: 26 };
  if (key === 'verified') return <VerifiedUserOutlinedIcon sx={sx} />;
  if (key === 'delivery') return <LocalShippingOutlinedIcon sx={sx} />;
  if (key === 'support') return <SupportAgentOutlinedIcon sx={sx} />;
  if (key === 'spark') return <AutoAwesomeIcon sx={sx} />;
  return <CameraAltOutlinedIcon sx={sx} />;
};

const LandingHeader = ({ rentLabel }: { rentLabel: string }) => (
  <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 30, borderBottom: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)' }}>
    <Container maxWidth="lg" sx={{ minHeight: 72, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Link component={RouterLink} to="/" underline="none" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: INK }}>
        <Box component="img" src={recapCharacterLogo} alt="" sx={{ width: 38, height: 38, objectFit: 'contain' }} />
        <Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1, fontSize: '1.02rem', letterSpacing: '-0.02em' }}>recap buddies</Typography>
          <Typography sx={{ color: MUTED, fontSize: '0.58rem', letterSpacing: '0.12em', mt: 0.35 }}>CAMERA RENTAL & CREATIVES</Typography>
        </Box>
      </Link>
      <Box component="nav" aria-label="Main navigation" sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
        <Link href="#featured-cameras" color="inherit" underline="hover">Cameras</Link>
        <Link href="#how-it-works" color="inherit" underline="hover">How it works</Link>
        <Link href="#gallery" color="inherit" underline="hover">Gallery</Link>
        <Link href="#faq" color="inherit" underline="hover">FAQ</Link>
      </Box>
      <Button component={RouterLink} to="/renter" variant="contained" endIcon={<ArrowForwardIcon />} sx={{ ml: { xs: 'auto', md: 1 }, px: 2.25 }}>
        {rentLabel}
      </Button>
    </Container>
  </Box>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LandingPageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deviceImages, setDeviceImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    fetchLandingPageData()
      .then((nextData) => { if (active) setData(nextData); })
      .catch(() => { if (active) setLoadError('Some live content could not be loaded. Please refresh to try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadImages = async () => {
      const pairs = await Promise.all(data.featured_cameras.map(async (camera) => {
        if (camera.landing_image_path) return [camera.device_id, getLandingAssetUrl(camera.landing_image_path)] as const;
        return [camera.device_id, await getPublicDeviceImageUrl(camera.device_image)] as const;
      }));
      if (active) setDeviceImages(Object.fromEntries(pairs.filter((pair): pair is readonly [string, string] => Boolean(pair[1]))));
    };
    void loadImages();
    return () => { active = false; };
  }, [data.featured_cameras]);

  const settings = data.settings;
  const whyItems = useMemo(() => data.content_items.filter((item) => item.section === 'why'), [data.content_items]);
  const howItems = useMemo(() => data.content_items.filter((item) => item.section === 'how'), [data.content_items]);
  const faqItems = useMemo(() => data.content_items.filter((item) => item.section === 'faq'), [data.content_items]);
  const heroImage = getLandingAssetUrl(settings.hero_image_path) ?? deviceImages[data.featured_cameras[0]?.device_id];

  return (
    <Box sx={{ minHeight: '100vh', overflowX: 'hidden', background: '#fff', color: INK }}>
      <LandingHeader rentLabel={settings.rent_cta_label} />
      {loadError && <Alert severity="warning" sx={{ borderRadius: 0, justifyContent: 'center' }}>{loadError}</Alert>}

      <Box component="main">
        <Box component="section" sx={{ position: 'relative', pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 }, background: 'radial-gradient(circle at 78% 12%, rgba(255,194,28,0.16), transparent 34%), linear-gradient(180deg, #fff 0%, #fbfbf8 100%)' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.02fr) minmax(420px, .98fr)' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
              <Box>
                <Chip label={settings.hero_eyebrow} size="small" sx={{ mb: 2.5, bgcolor: SOFT_YELLOW, border: '1px solid rgba(255,194,28,.35)', fontWeight: 700, letterSpacing: '.09em' }} />
                <Typography component="h1" sx={{ fontSize: { xs: '3rem', sm: '4rem', md: '5.1rem' }, lineHeight: .94, letterSpacing: '-0.06em', fontWeight: 700, maxWidth: 720 }}>
                  {settings.hero_headline}
                </Typography>
                <Typography sx={{ mt: 3, color: '#3f3f3f', fontSize: { xs: '1.12rem', md: '1.35rem' }, lineHeight: 1.5, maxWidth: 620 }}>
                  {settings.hero_subheadline}
                </Typography>
                <Typography sx={{ mt: 1.4, color: MUTED, fontSize: '.98rem', lineHeight: 1.55, maxWidth: 590 }}>
                  {settings.hero_supporting_text}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'center' } }}>
                  <Button size="large" variant="contained" onClick={() => navigate('/renter')} endIcon={<ArrowForwardIcon />} sx={{ px: 3.5, py: 1.4 }}>
                    {settings.rent_cta_label}
                  </Button>
                  <Button size="large" variant="outlined" onClick={() => navigate('/returnee')} startIcon={<ReplayIcon />} sx={{ px: 3, py: 1.4, bgcolor: '#fff' }}>
                    {settings.returnee_cta_label}
                  </Button>
                  <Button size="large" href="#featured-cameras" sx={{ px: 2 }}>{settings.browse_cta_label}</Button>
                </Stack>
                <Stack direction="row" spacing={2.5} sx={{ mt: 4, color: MUTED, flexWrap: 'wrap', rowGap: 1 }}>
                  {['Secure review', 'Flexible coordination', 'Creator-ready gear'].map((label) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: .7 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#4f7c54' }} />
                      <Typography sx={{ fontSize: '.86rem' }}>{label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ position: 'relative', minHeight: { xs: 430, md: 570 } }}>
                <Box sx={{ position: 'absolute', inset: { xs: '0 0 42px 0', md: '0 18px 50px 0' }, borderRadius: { xs: '36px', md: '54px' }, overflow: 'hidden', border: `1px solid ${BORDER}`, background: 'linear-gradient(145deg, #f4f4f1 0%, #e8e8e3 100%)', boxShadow: '0 30px 80px rgba(0,0,0,.12)' }}>
                  {heroImage ? (
                    <Box component="img" src={heroImage} alt="Featured Recap Buddies camera" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CameraAltOutlinedIcon sx={{ fontSize: 110, color: '#aaa' }} /></Box>
                  )}
                </Box>
                <Box component="img" src={recapCharacter} alt="Recap Buddies yellow character peeking into the frame" sx={{ position: 'absolute', width: { xs: 190, md: 240 }, right: { xs: -72, md: -65 }, bottom: { xs: -28, md: -15 }, filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.18))', transform: 'rotate(-3deg)' }} />
              </Box>
            </Box>
          </Container>
        </Box>

        <Box component="section" id="featured-cameras" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 84 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 3, mb: 5 }}>
              <Box>
                <Typography sx={{ color: MUTED, fontWeight: 700, letterSpacing: '.12em', fontSize: '.75rem', mb: 1.5 }}>FEATURED CAMERAS</Typography>
                <Typography component="h2" sx={sectionTitleSx}>Gear that makes the moment feel bigger.</Typography>
              </Box>
              <Button component={RouterLink} to="/renter" endIcon={<ArrowForwardIcon />} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Start a booking</Button>
            </Box>
            {loading ? (
              <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}><CircularProgress color="inherit" /></Box>
            ) : data.featured_cameras.length ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                {data.featured_cameras.map((camera) => (
                  <Paper key={camera.device_id} elevation={0} sx={{ overflow: 'hidden', border: `1px solid ${BORDER}`, borderRadius: 4, transition: 'transform .25s ease, box-shadow .25s ease', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 24px 50px rgba(0,0,0,.10)' } }}>
                    <Box sx={{ position: 'relative', aspectRatio: '4 / 3', background: 'linear-gradient(145deg, #f3f3ef, #e8e8e2)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                      {deviceImages[camera.device_id] ? (
                        <Box component="img" src={deviceImages[camera.device_id]} alt={camera.cam_name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease', '&:hover': { transform: 'scale(1.035)' } }} />
                      ) : <CameraAltOutlinedIcon sx={{ fontSize: 72, color: '#aaa' }} />}
                      <Chip label="Featured" size="small" sx={{ position: 'absolute', top: 14, left: 14, bgcolor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', fontWeight: 700 }} />
                    </Box>
                    <Box sx={{ p: 3 }}>
                      <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1.35rem', lineHeight: 1.15 }}>{camera.cam_name}</Typography>
                      <Typography sx={{ color: INK, mt: 1.2, fontWeight: 700, fontSize: '.9rem' }}>{camera.tagline}</Typography>
                      <Typography sx={{ color: MUTED, mt: .8, lineHeight: 1.55, minHeight: 48 }}>{camera.description}</Typography>
                      <Button component={RouterLink} to="/renter" endIcon={<ArrowForwardIcon />} sx={{ mt: 2, px: 0 }}>Rent this camera</Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Paper elevation={0} sx={{ p: 5, border: `1px dashed ${BORDER}`, textAlign: 'center', bgcolor: '#fafaf8' }}>
                <CameraAltOutlinedIcon sx={{ fontSize: 54, color: '#999' }} />
                <Typography variant="h6" sx={{ mt: 1 }}>Featured cameras are being prepared.</Typography>
                <Typography sx={{ color: MUTED }}>You can still start a booking and view available camera choices.</Typography>
                <Button component={RouterLink} to="/renter" variant="contained" sx={{ mt: 2 }}>Rent now</Button>
              </Paper>
            )}
          </Container>
        </Box>

        <Box component="section" sx={{ py: { xs: 8, md: 11 }, background: '#111', color: '#fff' }}>
          <Container maxWidth="lg">
            <Typography sx={{ color: '#c9c9c9', fontWeight: 700, letterSpacing: '.12em', fontSize: '.75rem', mb: 1.5 }}>WHY RECAP BUDDIES</Typography>
            <Typography component="h2" sx={{ ...sectionTitleSx, color: '#fff', mb: 5 }}>Thoughtful service, from first click to final return.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: `repeat(${Math.min(Math.max(whyItems.length, 3), 5)}, 1fr)` }, gap: 1.5 }}>
              {whyItems.map((item) => (
                <Box key={item.id} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)' }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: YELLOW, color: INK, mb: 3 }}>{contentIcon(item.icon_key)}</Box>
                  <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1.12rem', lineHeight: 1.25 }}>{item.title}</Typography>
                  <Typography sx={{ color: '#bdbdbd', mt: 1.2, lineHeight: 1.55 }}>{item.body}</Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        <Box component="section" id="how-it-works" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 84 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '.75fr 1.25fr' }, gap: { xs: 5, md: 9 } }}>
              <Box>
                <Typography sx={{ color: MUTED, fontWeight: 700, letterSpacing: '.12em', fontSize: '.75rem', mb: 1.5 }}>HOW IT WORKS</Typography>
                <Typography component="h2" sx={sectionTitleSx}>A clear path from camera choice to confirmed booking.</Typography>
                <Typography sx={{ color: MUTED, mt: 2, fontSize: '1.05rem', lineHeight: 1.65 }}>First time? Complete the practical new-renter verification. Already a Buddy? Take the streamlined returnee route.</Typography>
                <Stack direction={{ xs: 'column', sm: 'row', md: 'column', lg: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                  <Button component={RouterLink} to="/renter" variant="contained">New renter</Button>
                  <Button component={RouterLink} to="/returnee" variant="outlined" startIcon={<ReplayIcon />}>Returning renter</Button>
                </Stack>
              </Box>
              <Box>
                {howItems.map((item, index) => (
                  <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 2, pb: index === howItems.length - 1 ? 0 : 3.5, position: 'relative' }}>
                    {index < howItems.length - 1 && <Box sx={{ position: 'absolute', left: 27, top: 54, bottom: 0, width: 1, bgcolor: BORDER }} />}
                    <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: index === 0 ? YELLOW : '#f4f4f2', border: `1px solid ${BORDER}`, fontWeight: 700, fontSize: '1.05rem', zIndex: 1 }}>{String(index + 1).padStart(2, '0')}</Box>
                    <Box sx={{ pt: .4 }}>
                      <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{item.title}</Typography>
                      <Typography sx={{ color: MUTED, mt: .6, lineHeight: 1.6 }}>{item.body}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Container>
        </Box>

        <Box component="section" sx={{ py: { xs: 8, md: 11 }, bgcolor: '#f6f6f3' }}>
          <Container maxWidth="lg">
            <Typography sx={{ color: MUTED, fontWeight: 700, letterSpacing: '.12em', fontSize: '.75rem', mb: 1.5 }}>RENTER FEEDBACK</Typography>
            <Typography component="h2" sx={{ ...sectionTitleSx, mb: 5 }}>Shared by the people behind the moments.</Typography>
            {data.testimonials.length ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                {data.testimonials.map((testimonial) => (
                  <Paper key={testimonial.id} elevation={0} sx={{ p: 3.5, border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
                    <Typography sx={{ fontSize: '3rem', lineHeight: .8, color: YELLOW, fontWeight: 700 }}>“</Typography>
                    <Typography sx={{ mt: 2, color: '#303030', fontSize: '1.06rem', lineHeight: 1.65 }}>{testimonial.feedback}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 'auto', pt: 3 }}>
                      <Avatar src={getLandingAssetUrl(testimonial.photo_path) ?? undefined} alt={testimonial.renter_name} sx={{ bgcolor: INK }}>{testimonial.renter_name.charAt(0)}</Avatar>
                      <Typography sx={{ fontWeight: 700 }}>{testimonial.renter_name}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3, bgcolor: '#fff' }}>
                <Avatar sx={{ width: 62, height: 62, bgcolor: YELLOW, color: INK }}><AutoAwesomeIcon /></Avatar>
                <Box><Typography variant="h6">Renter stories are coming soon.</Typography><Typography sx={{ color: MUTED }}>Verified feedback can be published here by the Recap Buddies team.</Typography></Box>
              </Paper>
            )}
          </Container>
        </Box>

        <Box component="section" id="gallery" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 84 }}>
          <Container maxWidth="lg">
            <Typography sx={{ color: MUTED, fontWeight: 700, letterSpacing: '.12em', fontSize: '.75rem', mb: 1.5 }}>SHOT BY RENTERS</Typography>
            <Typography component="h2" sx={{ ...sectionTitleSx, mb: 5 }}>A growing gallery of moments worth keeping.</Typography>
            {data.gallery.length ? (
              <Box sx={{ columns: { xs: 1, sm: 2, md: 3 }, columnGap: 2 }}>
                {data.gallery.map((item, index) => (
                  <Box key={item.id} sx={{ breakInside: 'avoid', mb: 2, position: 'relative', borderRadius: 3.5, overflow: 'hidden', background: '#eee' }}>
                    <Box component="img" src={getLandingAssetUrl(item.image_path) ?? undefined} alt={item.title ?? 'Photo captured by a Recap Buddies renter'} loading="lazy" sx={{ display: 'block', width: '100%', minHeight: index % 3 === 0 ? 360 : 250, maxHeight: 520, objectFit: 'cover' }} />
                    {(item.title || item.caption) && <Box sx={{ position: 'absolute', inset: 'auto 0 0', p: 2.5, color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,.78))', pt: 7 }}><Typography sx={{ fontWeight: 700 }}>{item.title}</Typography><Typography sx={{ fontSize: '.86rem', opacity: .85 }}>{item.caption}</Typography></Box>}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ minHeight: 330, borderRadius: 5, overflow: 'hidden', border: `1px solid ${BORDER}`, background: 'radial-gradient(circle at 20% 10%, rgba(255,194,28,.35), transparent 34%), linear-gradient(135deg, #161616, #303030)', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center', p: { xs: 3, md: 6 } }}>
                <Box sx={{ maxWidth: 520, zIndex: 1 }}><Typography variant="h3">The renter gallery is ready for its first story.</Typography><Typography sx={{ color: '#ccc', mt: 1.5, fontSize: '1.05rem' }}>Photos published by the Recap Buddies team will appear here in a flexible editorial grid.</Typography></Box>
                <Box component="img" src={recapCharacterLogo} alt="" sx={{ position: 'absolute', width: { xs: 230, md: 330 }, right: { xs: -90, md: 20 }, bottom: -80, opacity: .95 }} />
              </Box>
            )}
          </Container>
        </Box>

        <Box component="section" id="faq" sx={{ py: { xs: 8, md: 11 }, bgcolor: '#fafaf8', scrollMarginTop: 84 }}>
          <Container maxWidth="md">
            <Typography sx={{ color: MUTED, fontWeight: 700, letterSpacing: '.12em', fontSize: '.75rem', mb: 1.5, textAlign: 'center' }}>QUICK ANSWERS</Typography>
            <Typography component="h2" sx={{ ...sectionTitleSx, mx: 'auto', textAlign: 'center', mb: 5 }}>Good to know before you book.</Typography>
            {faqItems.map((item) => (
              <Accordion key={item.id} disableGutters elevation={0} sx={{ borderTop: `1px solid ${BORDER}`, bgcolor: 'transparent', '&:last-of-type': { borderBottom: `1px solid ${BORDER}` }, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, py: 1 }}><Typography sx={{ fontWeight: 700, fontSize: '1.08rem' }}>{item.title}</Typography></AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0, pb: 3, color: MUTED, lineHeight: 1.65 }}>{item.body}</AccordionDetails>
              </Accordion>
            ))}
          </Container>
        </Box>

        <Box component="section" sx={{ py: { xs: 8, md: 10 } }}>
          <Container maxWidth="lg">
            <Box sx={{ borderRadius: { xs: 4, md: 6 }, bgcolor: YELLOW, p: { xs: 4, sm: 6, md: 8 }, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ maxWidth: 700, position: 'relative', zIndex: 1 }}>
                <Typography component="h2" sx={{ fontSize: { xs: '2.35rem', md: '4rem' }, lineHeight: 1, letterSpacing: '-.045em', fontWeight: 700 }}>{settings.final_cta_headline}</Typography>
                <Typography sx={{ mt: 2, fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.55, maxWidth: 620 }}>{settings.final_cta_subheadline}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3.5 }}>
                  <Button component={RouterLink} to="/renter" variant="contained" endIcon={<ArrowForwardIcon />}>{settings.rent_cta_label}</Button>
                  <Button component={RouterLink} to="/returnee" variant="outlined" startIcon={<ReplayIcon />} sx={{ bgcolor: 'rgba(255,255,255,.55)' }}>{settings.returnee_cta_label}</Button>
                </Stack>
              </Box>
              <Box component="img" src={recapCharacter} alt="" sx={{ position: 'absolute', width: { xs: 220, md: 330 }, right: { xs: -110, md: 25 }, bottom: { xs: -100, md: -125 }, opacity: { xs: .38, md: .85 } }} />
            </Box>
          </Container>
        </Box>
      </Box>

      <Box component="footer" sx={{ bgcolor: '#111', color: '#fff', pt: 7, pb: 3 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr .8fr .8fr' }, gap: 5, pb: 5 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}><Box component="img" src={recapCharacterLogo} alt="" sx={{ width: 46 }} /><Typography sx={{ fontWeight: 700, fontSize: '1.25rem' }}>recap buddies</Typography></Box>
              <Typography sx={{ color: '#aaa', mt: 2, maxWidth: 390, lineHeight: 1.6 }}>Camera rental and creatives for stories, trips, milestones, and everything worth a recap.</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Quick links</Typography>
              {/* <Stack spacing={1}><Link href="#featured-cameras" color="#bbb" underline="hover">Featured cameras</Link><Link component={RouterLink} to="/renter" color="#bbb" underline="hover">New renter</Link><Link component={RouterLink} to="/returnee" color="#bbb" underline="hover">Returning renter</Link><Link component={RouterLink} to="/admin/login" color="#777" underline="hover">Admin</Link></Stack> */}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Stay connected</Typography>
              <Stack spacing={1.2}>
                <Link href={settings.facebook_url} target="_blank" rel="noreferrer" color="#bbb" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FacebookIcon fontSize="small" />{settings.facebook_label}</Link>
                <Link href={settings.instagram_url} target="_blank" rel="noreferrer" color="#bbb" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><InstagramIcon fontSize="small" />{settings.instagram_label}</Link>
                <Link href={`mailto:${settings.contact_email}`} color="#bbb" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EmailOutlinedIcon fontSize="small" />{settings.contact_email}</Link>
              </Stack>
            </Box>
          </Box>
          <Divider sx={{ borderColor: '#2b2b2b' }} />
          <Box sx={{ pt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, justifyContent: 'space-between', color: '#777' }}><Typography sx={{ fontSize: '.82rem' }}>© {new Date().getFullYear()} Recap Buddies. All rights reserved.</Typography><Typography sx={{ fontSize: '.82rem' }}>Capture it. Enjoy it. Recap it.</Typography></Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
