import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileUploadResult {
  blob: Blob;
  previewUrl: string;       // object URL for image preview or PDF icon placeholder
  fileName: string;
  fileType: 'image' | 'pdf';
  mimeType: string;
}

interface FileUploadProps {
  label: string;
  onFile: (result: FileUploadResult | null) => void;
  result: FileUploadResult | null;
  hint?: string;
  /** Whether camera tab is available (default true) */
  allowCamera?: boolean;
  /** Default tab: 'camera' | 'upload' (default 'camera') */
  defaultTab?: 'camera' | 'upload';
  facingMode?: 'user' | 'environment';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

function blobToResult(blob: Blob, fileName: string): FileUploadResult {
  const fileType: 'image' | 'pdf' = blob.type === 'application/pdf' ? 'pdf' : 'image';
  const previewUrl = fileType === 'image' ? URL.createObjectURL(blob) : '';
  return { blob, previewUrl, fileName, fileType, mimeType: blob.type };
}

// ─── Component ────────────────────────────────────────────────────────────────

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onFile,
  result,
  hint,
  allowCamera = true,
  defaultTab = 'camera',
  facingMode: defaultFacing = 'environment',
}) => {
  const [tab, setTab]           = useState<'camera' | 'upload'>(allowCamera ? defaultTab : 'upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facing, setFacing]     = useState<'user' | 'environment'>(defaultFacing);
  const [dragOver, setDragOver] = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setCameraLoading(true);
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
      setCameraActive(true);
    } catch {
      setCameraError('Camera access denied or unavailable. Please allow camera permissions.');
    } finally {
      setCameraLoading(false);
    }
  }, [facing, stopStream]);

  // Restart when facing changes
  const prevFacing = useRef(facing);
  useEffect(() => {
    if (cameraActive && prevFacing.current !== facing) {
      prevFacing.current = facing;
      startCamera();
    }
  }, [facing, cameraActive, startCamera]);

  useEffect(() => () => stopStream(), [stopStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const r = blobToResult(blob, `capture_${Date.now()}.jpg`);
      onFile(r);
      stopStream();
      setCameraActive(false);
    }, 'image/jpeg', 0.92);
  };

  const handleFileInput = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    // Validate type
    if (!['image/jpeg','image/png','image/webp','image/heic','application/pdf'].includes(file.type)) {
      setCameraError('Only images (JPG, PNG, WEBP) and PDF files are accepted.');
      return;
    }
    // 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      setCameraError('File is too large. Maximum size is 20MB.');
      return;
    }
    setCameraError('');
    const r = blobToResult(file, file.name);
    onFile(r);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileInput(e.dataTransfer.files);
  };

  const retake = () => {
    onFile(null);
    if (tab === 'camera') startCamera();
  };

  const borderColor = result
    ? '#2E7D32'
    : dragOver
    ? '#111111'
    : 'rgba(201,151,58,0.3)';

  return (
    <Box
      sx={{
        border: `1.5px dashed ${borderColor}`,
        borderRadius: 3,
        p: 2,
        background: dragOver ? 'rgba(201,151,58,0.04)' : 'rgba(201,151,58,0.02)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Label */}
      <Typography
        variant="caption"
        sx={{ color: '#666666', mb: 1, display: 'block', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.7rem' }}
      >
        {label}
      </Typography>

      {/* Hint */}
      {hint && !result && (
        <Alert
          severity="info"
          sx={{
            mb: 1.5, py: 0.5, fontSize: '0.8rem',
            background: 'rgba(107,142,107,0.08)',
            color: '#4A6A4A',
            border: '1px solid rgba(107,142,107,0.25)',
            '& .MuiAlert-icon': { color: '#4A6A4A' },
          }}
        >
          {hint}
        </Alert>
      )}

      {/* Error */}
      {cameraError && (
        <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: '0.8rem' }}>{cameraError}</Alert>
      )}

      {/* ── Preview (file was provided) ─────────────────────────────────── */}
      {result && !cameraActive && (
        <Box sx={{ mb: 1.5 }}>
          {result.fileType === 'image' ? (
            <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
              <img
                src={result.previewUrl}
                alt="preview"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block', borderRadius: 8 }}
              />
              <Box sx={{ position: 'absolute', top: 8, right: 8, background: '#2E7D32', borderRadius: '50%', display: 'flex' }}>
                <CheckCircleIcon sx={{ color: '#fff', fontSize: 26 }} />
              </Box>
            </Box>
          ) : (
            /* PDF preview tile */
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                background: 'rgba(201,151,58,0.06)',
                border: '1px solid rgba(201,151,58,0.2)',
                borderRadius: 2, position: 'relative',
              }}
            >
              <PictureAsPdfIcon sx={{ fontSize: 40, color: '#C0392B' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#111111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.fileName}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#666666' }}>
                  PDF · {(result.blob.size / 1024).toFixed(0)} KB
                </Typography>
              </Box>
              <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: 24, flexShrink: 0 }} />
            </Box>
          )}
        </Box>
      )}

      {/* ── Live camera viewfinder ──────────────────────────────────────── */}
      {cameraActive && (
        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', mb: 1.5, background: '#000' }}>
          <video
            ref={videoRef}
            playsInline muted
            style={{
              width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block',
              transform: facing === 'user' ? 'scaleX(-1)' : 'none',
            }}
          />
          <Tooltip title="Flip camera">
            <IconButton
              onClick={() => setFacing((f) => f === 'user' ? 'environment' : 'user')}
              size="small"
              sx={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { background: 'rgba(0,0,0,0.7)' } }}
            >
              <FlipCameraIosIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Tabs (Camera / Upload) — only shown when no result yet ─────── */}
      {!result && (
        <>
          {allowCamera && (
            <Tabs
              value={tab}
              onChange={(_, v) => { setTab(v); stopStream(); setCameraActive(false); setCameraError(''); }}
              sx={{
                mb: 1.5, minHeight: 36,
                '& .MuiTabs-indicator': { background: '#111111', height: 2 },
                '& .MuiTab-root': {
                  minHeight: 36, textTransform: 'none', fontSize: '0.8rem',
                  fontFamily: '"Sora", sans-serif', fontWeight: 600, color: '#666666',
                  '&.Mui-selected': { color: '#111111' },
                },
              }}
            >
              <Tab value="camera" icon={<CameraAltIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Camera" />
              <Tab value="upload" icon={<UploadFileIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Upload File" />
            </Tabs>
          )}

          {/* Camera tab */}
          {tab === 'camera' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!cameraActive ? (
                <Button
                  variant="outlined" size="small" fullWidth
                  startIcon={cameraLoading ? <CircularProgress size={14} /> : <CameraAltIcon />}
                  onClick={startCamera} disabled={cameraLoading}
                  sx={{ borderColor: 'rgba(201,151,58,0.4)', color: '#111111', '&:hover': { borderColor: '#111111', background: 'rgba(201,151,58,0.06)' } }}
                >
                  {cameraLoading ? 'Starting…' : 'Open Camera'}
                </Button>
              ) : (
                <Button
                  variant="contained" size="small" fullWidth
                  startIcon={<CameraAltIcon />}
                  onClick={capturePhoto}
                >
                  Capture Photo
                </Button>
              )}
            </Box>
          )}

          {/* Upload tab */}
          {tab === 'upload' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                style={{ display: 'none' }}
                onChange={(e) => handleFileInput(e.target.files)}
              />
              <Box
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: `2px dashed ${dragOver ? '#111111' : 'rgba(201,151,58,0.3)'}`,
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(201,151,58,0.06)' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { background: 'rgba(201,151,58,0.04)', borderColor: 'rgba(201,151,58,0.5)' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                  <ImageIcon sx={{ fontSize: 28, color: '#111111', opacity: 0.7 }} />
                  <PictureAsPdfIcon sx={{ fontSize: 28, color: '#C0392B', opacity: 0.7 }} />
                </Box>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#111111', mb: 0.5 }}>
                  Click to browse or drag & drop
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#666666' }}>
                  JPG, PNG, WEBP or PDF · Max 20MB
                </Typography>
              </Box>
            </>
          )}
        </>
      )}

      {/* Retake / Remove button — shown after a file is provided */}
      {result && (
        <Button
          variant="outlined" size="small" fullWidth
          startIcon={result.fileType === 'image' && tab === 'camera' ? <ReplayIcon /> : <DeleteOutlineIcon />}
          onClick={retake}
          sx={{ mt: 1, borderColor: 'rgba(201,151,58,0.3)', color: '#666666', '&:hover': { borderColor: '#111111', color: '#111111' } }}
        >
          {result.fileType === 'image' && tab === 'camera' ? 'Retake Photo' : 'Remove File'}
        </Button>
      )}
    </Box>
  );
};

export default FileUpload;