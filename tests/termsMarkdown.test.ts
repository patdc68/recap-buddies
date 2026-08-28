import test from 'node:test';
import assert from 'node:assert/strict';
import StarterKit from '@tiptap/starter-kit';
import { MarkdownManager } from '@tiptap/markdown';
import { normalizeLegacyAgreementMarkdown, validateMarkdownSerialization } from '../src/admin/termsMarkdown.ts';

const markdown = new MarkdownManager({
  extensions: [StarterKit],
  markedOptions: { gfm: true, breaks: false },
});

test('normalizes legacy agreement bullets without changing their text', () => {
  const source = 'Intro\n\n● First responsibility\n  ● Nested responsibility\n\n***';
  assert.equal(
    normalizeLegacyAgreementMarkdown(source),
    'Intro\n\n- First responsibility\n  - Nested responsibility\n\n***',
  );
});

test('round trips the agreement formatting supported by the editor', () => {
  const source = '# Agreement\n\nA **bold**, *careful*, and [linked](https://example.com) paragraph.\n\n- First\n- Second\n\n1. One\n2. Two\n\n> Keep this note.\n\n---';
  const document = markdown.parse(source);
  const serialized = markdown.serialize(document);
  const text = 'Agreement A bold , careful , and linked paragraph. First Second One Two Keep this note.';
  const result = validateMarkdownSerialization(serialized, text, (value) => markdown.parse(value));

  assert.equal(result.valid, true, result.reason);
  assert.match(serialized, /# Agreement/);
  assert.match(serialized, /- First/);
  assert.match(serialized, /1\. One/);
  assert.match(serialized, /> Keep this note\./);
});

test('rejects empty or mismatched Markdown before storage replacement', () => {
  assert.equal(validateMarkdownSerialization('', 'Agreement', (value) => markdown.parse(value)).valid, false);
  assert.equal(validateMarkdownSerialization('Different text', 'Agreement', (value) => markdown.parse(value)).valid, false);
});
