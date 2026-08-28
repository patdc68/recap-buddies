import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { normalizeLegacyAgreementMarkdown } from '../admin/termsMarkdown';

export default function AgreementMarkdownViewer({ markdown }: { markdown: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: true, autolink: true, defaultProtocol: 'https' } }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
    ],
    content: normalizeLegacyAgreementMarkdown(markdown),
    contentType: 'markdown',
    editable: false,
    editorProps: {
      attributes: {
        class: 'recap-agreement-editor recap-agreement-viewer',
        'aria-label': 'Official rental contract agreement',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(normalizeLegacyAgreementMarkdown(markdown), { contentType: 'markdown', emitUpdate: false });
  }, [editor, markdown]);

  if (!editor) return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;
  return <EditorContent editor={editor} />;
}
