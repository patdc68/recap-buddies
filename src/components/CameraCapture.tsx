import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';

interface CameraCaptureProps {
  label: string;
  onCapture: (blob: Blob | null) => void;
  capturedUrl: string | null;
  hint?: string;
  facingMode?: 'user' | 'environment';
  variant?: 'default' | 'lightVerification';
}

const primaryButtonSx = {
  backgroundColor: '#111111',
  color: '#FFFFFF',
  borderRadius: '12px',
  fontWeight: 700,
  textTransform: 'none',
  boxShadow: '0 8px 18px rgba(17,17,17,0.14)',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#2A2A2A',
    boxShadow: '0 10px 22px rgba(17,17,17,0.18)',
    transform: 'translateY(-1px)',
  },
} as const;

const CameraCapture: React.FC<CameraCaptureProps> = ({
  label,
  onCapture,
  capturedUrl,
  hint,
  facingMode: defaultFacing = 'environment',
  variant = 'default',
}) => {
  const isLightVerification = variant === 'lightVerification';
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<'user' | 'environment'>(defaultFacing);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    setLoading(true);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError('Camera access denied or unavailable. Please allow camera permissions.');
    } finally {
      setLoading(false);
    }
  }, [facing, stopStream]);

  // Restart camera when facing changes (only if already active)
  const facingRef = useRef(facing);
  useEffect(() => {
    if (active && facingRef.current !== facing) {
      facingRef.current = facing;
      startCamera();
    }
  }, [facing, active, startCamera]);

  useEffect(() => () => stopStream(), [stopStream]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          stopStream();
          setActive(false);
        }
      },
      'image/jpeg',
      0.92,
    );
  };

  const retake = () => {
    onCapture(null);
    startCamera();
  };

  const borderColor = isLightVerification
    ? capturedUrl ? '#86C98B' : '#d6c3a3'
    : capturedUrl ? '#69DB7C' : 'rgba(201, 151, 58, 0.3)';

  return (
    <Box
      sx={{
        border: `1.5px dashed ${borderColor}`,
        borderRadius: isLightVerification ? '20px' : 3,
        p: 2,
        background: isLightVerification ? '#f9fafb' : 'rgba(201,151,58,0.04)',
        transition: 'border-color 0.3s, box-shadow 0.2s ease',
        boxShadow: isLightVerification ? 'inset 0 1px 0 rgba(255,255,255,0.8)' : 'none',
      }}
    >
      <Typography variant="caption" sx={{ color: isLightVerification ? '#374151' : '#666666', mb: 1, display: 'block', fontWeight: isLightVerification ? 700 : 400 }}>
        {label}
      </Typography>

      {hint && (
        <Alert
          severity="info"
          sx={{
            mb: 1.5,
            py: 0.5,
            fontSize: '0.8rem',
            background: isLightVerification ? '#f8fafc' : 'rgba(107,142,107,0.08)',
            color: isLightVerification ? '#374151' : '#4A6A4A',
            border: isLightVerification ? '1px solid #e5e7eb' : '1px solid rgba(107,142,107,0.25)',
            borderRadius: isLightVerification ? '14px' : undefined,
          }}
        >
          {hint}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: isLightVerification ? '14px' : undefined }}>
          {error}
        </Alert>
      )}

      {/* Captured preview */}
      {capturedUrl && !active && (
        <Box sx={{ position: 'relative', borderRadius: isLightVerification ? '16px' : 2, overflow: 'hidden', mb: 1.5, border: isLightVerification ? '1px solid #e5e7eb' : 'none', background: '#ffffff' }}>
          <img
            src={capturedUrl}
            alt="captured"
            style={{
              width: '100%',
              maxHeight: 220,
              objectFit: 'cover',
              display: 'block',
              borderRadius: isLightVerification ? 16 : 8,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: '#69DB7C',
              borderRadius: '50%',
              display: 'flex',
            }}
          >
            <CheckCircleIcon sx={{ color: '#0A0F1E', fontSize: 28 }} />
          </Box>
        </Box>
      )}

      {/* Live viewfinder */}
      {active && (
        <Box
          sx={{ position: 'relative', borderRadius: isLightVerification ? '16px' : 2, overflow: 'hidden', mb: 1.5, background: isLightVerification ? '#f3f4f6' : '#000', border: isLightVerification ? '1px solid #e5e7eb' : 'none' }}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxHeight: 260,
              objectFit: 'cover',
              display: 'block',
              transform: facing === 'user' ? 'scaleX(-1)' : 'none',
            }}
            playsInline
            muted
          />
          <Tooltip title="Flip camera">
            <IconButton
              onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: isLightVerification ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.5)',
                color: isLightVerification ? '#111111' : '#fff',
                border: isLightVerification ? '1px solid rgba(17,17,17,0.08)' : 'none',
                '&:hover': { background: isLightVerification ? '#ffffff' : 'rgba(0,0,0,0.7)' },
              }}
              size="small"
            >
              <FlipCameraIosIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Box sx={{ display: 'flex', gap: 1 }}>
        {!active && !capturedUrl && (
          <Button
            variant={isLightVerification ? 'contained' : 'outlined'}
            startIcon={loading ? <CircularProgress size={16} sx={{ color: isLightVerification ? '#FFFFFF' : undefined }} /> : <CameraAltIcon />}
            onClick={startCamera}
            disabled={loading}
            size="small"
            fullWidth
            sx={isLightVerification ? primaryButtonSx : { borderColor: 'rgba(201,151,58,0.5)', color: '#111111' }}
          >
            {loading ? 'Starting Camera…' : 'Open Camera'}
          </Button>
        )}
        {active && (
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={capture}
            size="small"
            fullWidth
            sx={isLightVerification ? primaryButtonSx : undefined}
          >
            Capture Photo
          </Button>
        )}
        {capturedUrl && !active && (
          <Button
            variant={isLightVerification ? 'contained' : 'outlined'}
            startIcon={<ReplayIcon />}
            onClick={retake}
            size="small"
            sx={isLightVerification ? primaryButtonSx : { borderColor: 'rgba(201,151,58,0.35)', color: '#666666' }}
          >
            Retake
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default CameraCapture;