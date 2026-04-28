import React, { useState, useEffect, type ChangeEvent } from 'react';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Paper, Divider, Chip,
  FormHelperText, type SelectChangeEvent,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type { RbBranch, UserRole } from '../service/supabaseClient';
import PageLayout from '../components/PageLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminRegForm {
  user_fname: string;
  user_lname: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole | '';
  branch_id: string;
  invite_code: string;   // simple guard so random users can't self-register
}

type FormErrors = Partial<Record<keyof AdminRegForm, string>>;

// ─── Guard code (set this in your .env as VITE_ADMIN_INVITE_CODE) ─────────────
const INVITE_CODE = import.meta.env.VITE_ADMIN_INVITE_CODE;

// ─── Component ────────────────────────────────────────────────────────────────

const AdminRegistration: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm]         = useState<AdminRegForm>({
    user_fname: '', user_lname: '', email: '', password: '',
    confirmPassword: '', role: '', branch_id: '', invite_code: '',
  });
  const [errors, setErrors]     = useState<FormErrors>({});
  const [branches, setBranches] = useState<RbBranch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone]         = useState(false);

  useEffect(() => {
    supabase.from('RB_BRANCHES').select('*').order('location_name')
      .then(({ data }) => { if (data) setBranches(data as RbBranch[]); });
  }, []);

  const onText = (field: keyof AdminRegForm) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
    setSubmitError('');
  };

  const onSelect = (field: keyof AdminRegForm) => (e: SelectChangeEvent) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.invite_code.trim())        e.invite_code     = 'Invite code is required';
    else if (form.invite_code !== INVITE_CODE) e.invite_code = 'Invalid invite code';
    if (!form.user_fname.trim())         e.user_fname      = 'First name is required';
    if (!form.user_lname.trim())         e.user_lname      = 'Last name is required';
    if (!form.email.trim())              e.email           = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = 'Enter a valid email';
    if (!form.password)                  e.password        = 'Password is required';
    else if (form.password.length < 8)   e.password        = 'Minimum 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.role)                      e.role            = 'Select a role';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw new Error(authError.message);
      const auth_user_id = authData.user?.id;
      if (!auth_user_id) throw new Error('No user ID returned. Disable email confirmations in Supabase.');

      // 2. Insert into RB_USER
      const { error: insertError } = await supabase.from('RB_USER').insert({
        auth_user_id,
        role:       form.role,
        branch_id_fk:  form.branch_id || null,
        user_fname: form.user_fname,
        user_lname: form.user_lname,
      });
      if (insertError) throw new Error(`DB error: ${insertError.message}`);

      setDone(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────

  if (done) {
    return (
      <PageLayout>
        <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
            background: 'rgba(105,219,124,0.12)', border: '2px solid rgba(105,219,124,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: '#69DB7C' }} />
          </Box>
          <Typography variant="h3" sx={{ color: '#111111', mb: 1 }}>Account Created!</Typography>
          <Typography variant="body1" sx={{ color: '#666666', mb: 4 }}>
            The {form.role} account for <strong>{form.user_fname} {form.user_lname}</strong> has been created.
          </Typography>
          <Button variant="contained" startIcon={<LoginIcon />} onClick={() => navigate('/admin/login')}>
            Go to Admin Login
          </Button>
        </Box>
      </PageLayout>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <Box sx={{ maxWidth: 560, mx: 'auto', py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Chip
            icon={<AdminPanelSettingsIcon sx={{ fontSize: '0.9rem !important' }} />}
            label="ADMIN / STAFF REGISTRATION"
            size="small"
            sx={{
              background: 'rgba(201,151,58,0.15)', color: '#111111',
              border: '1px solid rgba(201,151,58,0.25)',
              fontFamily: '"Sora", sans-serif', letterSpacing: '0.08em', mb: 1.5,
            }}
          />
          <Typography variant="h3" sx={{ color: '#111111', mb: 0.5 }}>Staff Registration</Typography>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Create an admin or staff account. An invite code is required.
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: '1px solid rgba(201,151,58,0.15)', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Invite code */}
            <Box>
              <Typography variant="caption" sx={{ color: '#111111', letterSpacing: '0.1em', mb: 1, display: 'block' }}>
                ACCESS CODE
              </Typography>
              <TextField
                label="Invite Code" fullWidth required type="password"
                value={form.invite_code} onChange={onText('invite_code')}
                error={!!errors.invite_code} helperText={errors.invite_code ?? 'Required to create staff accounts'}
              />
            </Box>

            <Divider sx={{ borderColor: 'rgba(201,151,58,0.12)' }} />

            {/* Role */}
            <Box>
              <Typography variant="caption" sx={{ color: '#111111', letterSpacing: '0.1em', mb: 1, display: 'block' }}>
                ROLE & BRANCH
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 160px' }}>
                  <FormControl fullWidth error={!!errors.role}>
                    <InputLabel>Role</InputLabel>
                    <Select value={form.role} onChange={onSelect('role')} label="Role">
                      <MenuItem value="admin">
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111111' }}>Admin</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem' }}>Full access · can manage devices</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="staff">
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111111' }}>Staff</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.72rem' }}>Can manage items & rentals</Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                    {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
                  </FormControl>
                </Box>
                <Box sx={{ flex: '1 1 160px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Branch (optional)</InputLabel>
                    <Select value={form.branch_id} onChange={onSelect('branch_id')} label="Branch (optional)">
                      <MenuItem value=""><em>No specific branch</em></MenuItem>
                      {branches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>{b.location_name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(201,151,58,0.12)' }} />

            {/* Personal info */}
            <Box>
              <Typography variant="caption" sx={{ color: '#111111', letterSpacing: '0.1em', mb: 1, display: 'block' }}>
                PERSONAL INFORMATION
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 160px' }}>
                  <TextField
                    label="First Name" fullWidth required
                    value={form.user_fname} onChange={onText('user_fname')}
                    error={!!errors.user_fname} helperText={errors.user_fname}
                  />
                </Box>
                <Box sx={{ flex: '1 1 160px' }}>
                  <TextField
                    label="Last Name" fullWidth required
                    value={form.user_lname} onChange={onText('user_lname')}
                    error={!!errors.user_lname} helperText={errors.user_lname}
                  />
                </Box>
              </Box>
            </Box>

            {/* Account credentials */}
            <Box>
              <Typography variant="caption" sx={{ color: '#111111', letterSpacing: '0.1em', mb: 1, display: 'block' }}>
                ACCOUNT CREDENTIALS
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Email Address" type="email" fullWidth required
                  value={form.email} onChange={onText('email')}
                  error={!!errors.email} helperText={errors.email}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: '1 1 160px' }}>
                    <TextField
                      label="Password" type="password" fullWidth required
                      value={form.password} onChange={onText('password')}
                      error={!!errors.password} helperText={errors.password ?? 'Min. 8 characters'}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 160px' }}>
                    <TextField
                      label="Confirm Password" type="password" fullWidth required
                      value={form.confirmPassword} onChange={onText('confirmPassword')}
                      error={!!errors.confirmPassword} helperText={errors.confirmPassword}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {submitError && <Alert severity="error">{submitError}</Alert>}

            <Button
              variant="contained" size="large" fullWidth
              onClick={handleSubmit} disabled={submitting}
              endIcon={submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CheckCircleIcon />}
            >
              {submitting ? 'Creating Account…' : 'Create Account'}
            </Button>
          </Box>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button variant="text" size="small" onClick={() => navigate('/admin/login')}
            sx={{ color: '#111111', fontFamily: '"Sora", sans-serif', fontSize: '0.8rem' }}>
            Already have an account? Sign in
          </Button>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default AdminRegistration;