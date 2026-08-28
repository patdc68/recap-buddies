import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import {
  Alert, Box, Button, CircularProgress, Divider, IconButton, Paper, Stack,
  Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { AdminPageIntro } from './adminDesign';
import { ADMIN_COLORS, adminSurfaceSx } from './adminDesignTokens';
import { normalizeLegacyAgreementMarkdown, validateMarkdownSerialization } from './termsMarkdown';

interface TermsAgreementEditorProps {
  markdown: string;
  loading: boolean;
  saving: boolean;
  onReload: () => void;
  onSave: (markdown: string) => Promise<boolean>;
}

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
];

const toolbarButtonSx = {
  width: 36,
  height: 34,
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: '9px !important',
  color: '#555',
  '&.Mui-selected': { bgcolor: ADMIN_COLORS.softYellow, color: ADMIN_COLORS.ink, borderColor: 'rgba(255,194,28,.55)' },
} as const;

export default function TermsAgreementEditor({ markdown, loading, saving, onReload, onSave }: TermsAgreementEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: editorExtensions,
    content: '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'recap-agreement-editor',
        'aria-label': 'Terms and Conditions document editor',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setDirty(true);
      setWordCount(updatedEditor.getText().trim().split(/\s+/).filter(Boolean).length);
      setSafetyError('');
    },
  });

  useEffect(() => {
    if (!editor || !markdown) return;
    const normalized = normalizeLegacyAgreementMarkdown(markdown);
    editor.commands.setContent(normalized, { contentType: 'markdown', emitUpdate: false });
    queueMicrotask(() => {
      setDirty(false);
      setSafetyError('');
      setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length);
    });
  }, [editor, markdown]);

  useEffect(() => {
    editor?.setEditable(mode === 'edit');
  }, [editor, mode]);

  if (loading || !editor) {
    return (
      <Paper elevation={0} sx={{ ...adminSurfaceSx, minHeight: 440, display: 'grid', placeItems: 'center' }}>
        <Stack alignItems="center" spacing={1.5}><CircularProgress size={30} color="inherit" /><Typography color="text.secondary">Loading agreement…</Typography></Stack>
      </Paper>
    );
  }

  const save = async () => {
    const markdownManager = editor.markdown;
    if (!markdownManager) {
      setSafetyError('The Markdown converter is unavailable. The saved agreement was not changed.');
      return;
    }
    const nextMarkdown = editor.getMarkdown().trim();
    const result = validateMarkdownSerialization(nextMarkdown, editor.getText(), (value) => markdownManager.parse(value));
    if (!result.valid) {
      setSafetyError(result.reason);
      return;
    }
    const saved = await onSave(`${nextMarkdown}\n`);
    if (saved) setDirty(false);
  };

  const applyLink = () => {
    const href = linkUrl.trim();
    if (!href) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setLinkEditorOpen(false);
    setLinkUrl('');
  };

  return (
    <Box>
      <AdminPageIntro
        eyebrow="Content & policy"
        title="Terms & Conditions"
        description="Edit the canonical renter agreement with a document-style editor. Content remains stored as Markdown for renter and booking PDF compatibility."
        action={<Button variant="outlined" startIcon={<RefreshIcon />} onClick={onReload} disabled={loading || saving}>Reload saved version</Button>}
      />

      <Paper elevation={0} sx={{ ...adminSurfaceSx, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, bgcolor: '#fbfbf9', borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
          <Tabs value={mode} onChange={(_event, value: 'edit' | 'preview') => setMode(value)} aria-label="Agreement editor mode">
            <Tab icon={<EditOutlinedIcon />} iconPosition="start" label="Edit" value="edit" />
            <Tab icon={<VisibilityOutlinedIcon />} iconPosition="start" label="Preview" value="preview" />
          </Tabs>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <Typography sx={{ color: ADMIN_COLORS.muted, fontSize: '0.78rem' }}>{wordCount.toLocaleString()} words{dirty ? ' · Unsaved' : ' · Saved'}</Typography>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={15} color="inherit" /> : <SaveOutlinedIcon />} disabled={saving || !dirty || !editor.getText().trim()} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save agreement'}
            </Button>
          </Stack>
        </Box>

        {mode === 'edit' && (
          <Box sx={{ px: { xs: 1.5, md: 2 }, py: 1.25, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', borderBottom: `1px solid ${ADMIN_COLORS.border}`, bgcolor: '#fff' }}>
            <ToggleButtonGroup exclusive size="small" aria-label="Text style">
              {([['paragraph', 'Paragraph'], ['heading-1', 'H1'], ['heading-2', 'H2'], ['heading-3', 'H3']] as const).map(([value, label]) => {
                const active = value === 'paragraph' ? editor.isActive('paragraph') : editor.isActive('heading', { level: Number(value.at(-1)) });
                return <ToggleButton key={value} value={value} selected={active} onClick={() => value === 'paragraph' ? editor.chain().focus().setParagraph().run() : editor.chain().focus().toggleHeading({ level: Number(value.at(-1)) as 1 | 2 | 3 }).run()} sx={{ ...toolbarButtonSx, width: value === 'paragraph' ? 82 : 40 }}>{label}</ToggleButton>;
              })}
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem />
            {[
              { label: 'Bold', icon: <FormatBoldIcon />, active: editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run() },
              { label: 'Italic', icon: <FormatItalicIcon />, active: editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run() },
              { label: 'Underline', icon: <FormatUnderlinedIcon />, active: editor.isActive('underline'), action: () => editor.chain().focus().toggleUnderline().run() },
              { label: 'Bullet list', icon: <FormatListBulletedIcon />, active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
              { label: 'Numbered list', icon: <FormatListNumberedIcon />, active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
              { label: 'Block quote', icon: <FormatQuoteIcon />, active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run() },
            ].map((item) => <Tooltip key={item.label} title={item.label}><ToggleButton value={item.label} selected={item.active} onClick={item.action} sx={toolbarButtonSx} aria-label={item.label}>{item.icon}</ToggleButton></Tooltip>)}
            <Tooltip title="Insert separator"><IconButton sx={toolbarButtonSx} onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Insert separator"><HorizontalRuleIcon /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Add or edit link"><IconButton sx={toolbarButtonSx} onClick={() => { setLinkUrl(editor.getAttributes('link').href ?? ''); setLinkEditorOpen((open) => !open); }} aria-label="Add or edit link"><LinkIcon /></IconButton></Tooltip>
            <Tooltip title="Remove link"><span><IconButton sx={toolbarButtonSx} disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()} aria-label="Remove link"><LinkOffIcon /></IconButton></span></Tooltip>
            <Tooltip title="Clear formatting"><IconButton sx={toolbarButtonSx} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} aria-label="Clear formatting"><FormatClearIcon /></IconButton></Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Undo"><span><IconButton sx={toolbarButtonSx} disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()} aria-label="Undo"><UndoIcon /></IconButton></span></Tooltip>
            <Tooltip title="Redo"><span><IconButton sx={toolbarButtonSx} disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()} aria-label="Redo"><RedoIcon /></IconButton></span></Tooltip>
            {linkEditorOpen && (
              <Box sx={{ flexBasis: '100%', display: 'flex', gap: 1, p: 1.25, mt: 0.5, bgcolor: ADMIN_COLORS.canvas, borderRadius: 2 }}>
                <TextField autoFocus size="small" fullWidth label="Link URL" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyLink(); }} placeholder="https://…" />
                <Button variant="contained" onClick={applyLink} disabled={!linkUrl.trim()}>Apply</Button>
                <Button onClick={() => setLinkEditorOpen(false)}>Cancel</Button>
              </Box>
            )}
          </Box>
        )}

        {safetyError && <Alert severity="error" sx={{ m: 2 }}>{safetyError}</Alert>}
        <Box className={mode === 'preview' ? 'agreement-preview' : undefined} sx={{ bgcolor: mode === 'preview' ? ADMIN_COLORS.canvas : '#fff', p: { xs: 2, md: mode === 'preview' ? 4 : 3 } }}>
          <Box sx={{ maxWidth: mode === 'preview' ? 820 : 'none', mx: 'auto', minHeight: 520, bgcolor: '#fff', border: mode === 'preview' ? `1px solid ${ADMIN_COLORS.border}` : 0, borderRadius: mode === 'preview' ? 3 : 0, boxShadow: mode === 'preview' ? '0 14px 35px rgba(16,16,16,.06)' : 'none', p: mode === 'preview' ? { xs: 2.5, md: 6 } : 0 }}>
            {mode === 'preview' && <><Typography sx={{ color: ADMIN_COLORS.muted, fontSize: '0.72rem', letterSpacing: '.12em', fontWeight: 700 }}>RECAP BUDDIES CAMERA RENTAL PH</Typography><Typography variant="h4" sx={{ mt: 1 }}>Official Rental Contract Agreement</Typography><Divider sx={{ my: 3 }} /></>}
            <EditorContent editor={editor} />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
