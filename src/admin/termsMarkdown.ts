import type { JSONContent } from '@tiptap/core';

export const normalizeLegacyAgreementMarkdown = (markdown: string) => markdown
  .replace(/\r\n?/g, '\n')
  .split('\n')
  .map((line) => {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('●')) return line;
    const indentation = line.slice(0, line.length - trimmed.length);
    return `${indentation}- ${trimmed.slice(1).trimStart()}`;
  })
  .join('\n');

const collectDocumentText = (node: JSONContent | undefined): string => {
  if (!node) return '';
  const ownText = node.text ?? '';
  const childText = node.content?.map(collectDocumentText).join(' ') ?? '';
  return `${ownText} ${childText}`;
};

const normalizeComparableText = (value: string) => value
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim();

export const validateMarkdownSerialization = (
  markdown: string,
  editorText: string,
  parse: (value: string) => JSONContent,
) => {
  if (!markdown.trim() || !editorText.trim()) {
    return { valid: false, reason: 'The agreement cannot be empty.' };
  }

  try {
    const reparsed = parse(markdown);
    const reparsedText = normalizeComparableText(collectDocumentText(reparsed));
    const currentText = normalizeComparableText(editorText);
    if (!reparsedText || reparsedText !== currentText) {
      return { valid: false, reason: 'The Markdown safety check found a conversion mismatch. Reload the saved agreement before trying again.' };
    }
    return { valid: true, reason: '' };
  } catch {
    return { valid: false, reason: 'The editor could not produce valid Markdown. The saved agreement was not changed.' };
  }
};
