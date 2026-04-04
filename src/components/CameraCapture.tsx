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
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  label,
  onCapture,
  capturedUrl,
  hint,
  facingMode: defaultFacing = 'environment',
}) => {
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

  const borderColor = capturedUrl ? '#69DB7C' : 'rgba(201, 151, 58, 0.3)';

  return (
    <Box
      sx={{
        border: `1.5px dashed ${borderColor}`,
        borderRadius: 3,
        p: 2,
        background: 'rgba(201,151,58,0.04)',
        transition: 'border-color 0.3s',
      }}
    >
      <Typography variant="caption" sx={{ color: '#7A6040', mb: 1, display: 'block' }}>
        {label}
      </Typography>

      {hint && (
        <Alert
          severity="info"
          sx={{
            mb: 1.5,
            py: 0.5,
            fontSize: '0.8rem',
            background: 'rgba(107,142,107,0.08)',
            color: '#4A6A4A',
            border: '1px solid rgba(107,142,107,0.25)',
          }}
        >
          {hint}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {/* Captured preview */}
      {capturedUrl && !active && (
        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
          <img
            src={capturedUrl}
            alt="captured"
            style={{
              width: '100%',
              maxHeight: 220,
              objectFit: 'cover',
              display: 'block',
              borderRadius: 8,
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
          sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', mb: 1.5, background: '#000' }}
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
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                '&:hover': { background: 'rgba(0,0,0,0.7)' },
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
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <CameraAltIcon />}
            onClick={startCamera}
            disabled={loading}
            size="small"
            fullWidth
            sx={{ borderColor: 'rgba(201,151,58,0.5)', color: '#C9973A' }}
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
          >
            Capture Photo
          </Button>
        )}
        {capturedUrl && !active && (
          <Button
            variant="outlined"
            startIcon={<ReplayIcon />}
            onClick={retake}
            size="small"
            sx={{ borderColor: 'rgba(201,151,58,0.35)', color: '#7A6040' }}
          >
            Retake
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default CameraCapture;