// The rehearsal stand-in reply source for the Luminary (STP-0002 P19). It lets the whole Luminary
// flow be built and run before the main Meta model is connected, without any reply posing as a
// model answer: every reply declares the model id `rehearsal-stand-in`, says in its text that it is
// a rehearsal, and is governed and gauged exactly like a real reply. It is never a default; it is
// chosen only by LUMINARY_REPLY_SOURCE=rehearsal.
//
// Replies are scripted from the Architect's message so each role can be exercised:
//   "outage" / "shortfall"           -> throws, so the panel shows an honest upstream Shortfall
//   a [Task] frame (coding task)     -> a luminary-change block, inside the allowed files only
//   "draft" / "note" / "offer"       -> a luminary-offering block (a Markdown artifact)
//   an Element code request (P25)    -> the Element's current source with a small, marked addition
//   "code" / "snippet" / "function"  -> a code snippet, explained at the chosen level
//   anything else                    -> an explanation of the current mode

import { readPromptFrame, type ExplanationLevel } from '../src/luminary/blocks.js';
import { ELEMENT_CODE_MARKER } from '../src/luminary/elementCode.js';
import type { AskModel } from './luminary-reply-router.js';

export const REHEARSAL_MODEL_ID = 'rehearsal-stand-in';
export const REHEARSAL_OUTAGE_MESSAGE = 'Rehearsal outage: the stand-in was asked to show what an unavailable model looks like.';

const NOTICE = 'Rehearsal reply from the stand-in, not a model.';

const MODE_NOTES: Record<string, string> = {
  DESIGN: 'In Design you place and connect the POD building blocks: Orbs, Satellites, Actuators and the conduits between them.',
  CODE: 'In Code you look at the source behind an element. Changes are proposed on a working branch and join the project only when you accept them.',
  SIMULATE: 'In Simulate you raise load or inject a fault and watch whether containment holds.',
  DEPLOY: 'In Deploy the invariant audit runs and a signed package can be exported.',
};

const SNIPPET = `export function orbLabel(name: string, satellites: number): string {
  return satellites === 1 ? \`\${name} (1 satellite)\` : \`\${name} (\${satellites} satellites)\`;
}`;

function explainSnippet(level: ExplanationLevel): string {
  if (level === 'plain') {
    return 'This makes a short label for an Orb, such as "Core (2 satellites)". You can copy it, or ask me to explain more.';
  }
  if (level === 'guided') {
    return [
      'This makes a short label for an Orb.',
      '',
      '```ts',
      SNIPPET,
      '```',
      '',
      'It takes the Orb\'s name and how many Satellites it has, and writes "satellite" or "satellites" to match the number.',
    ].join('\n');
  }
  return [
    'A pure helper with no side effects; the ternary handles the singular case.',
    '',
    '```ts',
    SNIPPET,
    '```',
    '',
    'Typed parameters keep callers honest; a test would cover 0, 1 and 2 satellites.',
  ].join('\n');
}

function offering(): string {
  const block = {
    title: 'Orb design note',
    purpose: 'A short record of the Orb being designed, so the decision is kept with the project.',
    sections: [
      { heading: 'What the Orb does', body: 'Holds one bounded capability and exposes it through its sockets.' },
      { heading: 'Connections', body: 'Satellites attach through umbilicals; a broken handshake shows as a broken model.' },
    ],
  };
  return [
    'I can draft an Orb design note for you, if you want it. Nothing is written unless you accept.',
    '',
    '```luminary-offering',
    JSON.stringify(block, null, 2),
    '```',
  ].join('\n');
}

function change(allowedFiles: string[], message: string, level: ExplanationLevel): string {
  const target = allowedFiles[0];
  if (!target) return 'This coding task names no allowed files, so there is nothing I can change. Add at least one file to the task.';
  const block = {
    summary: `Rehearsal change to ${target} for: ${message.slice(0, 120)}`,
    files: [{ path: target, content: `# Rehearsal change\n\nWritten by the Luminary stand-in for the task: ${message}\n` }],
  };
  const explanation = level === 'technical'
    ? `I propose rewriting ${target} with a short Markdown record. It is staged on my own branch; the type check runs before you see it.`
    : `I propose a small change to ${target}. It goes on my own branch first, the checks run, and it joins the project only if you accept it.`;
  return [explanation, '', '```luminary-change', JSON.stringify(block, null, 2), '```'].join('\n');
}

/** Rehearse P25 without a model: return the current source, unchanged except for one marked line. */
function elementCode(prompt: string, message: string): string {
  const frame = /\[Context: Element code frame\]\nLanguage: (.+)\nFile: (.+)\nEntrypoint: .+\nCurrent source:\n```([A-Za-z0-9_-]*)\n([\s\S]*?)\n```/.exec(prompt);
  if (!frame) return 'I could not find the Element\'s code in the request, so I have not written any.';
  const [, language, fileName, fence, source] = frame;
  const comment = language === 'Python' ? '#' : language === 'JSON' ? null : '//';
  const request = message.split('\n')[0].slice(0, 120);
  const code = comment ? `${comment} Rehearsal: the Luminary would change this for "${request}".\n${source}` : source;
  return [`This is a rehearsal of writing ${fileName}: I have kept your code and marked where my change would go. A real model would write the change itself.`, '', `\`\`\`${fence}`, code, '```'].join('\n');
}

/** Names the Element the Luminary's focus attached (N57), so a rehearsal shows the focus arriving. */
function focusNote(prompt: string): string {
  const focus = /\[Context: (Looking at|Inside): (.+)\]/.exec(prompt);
  if (!focus) return '';
  return focus[1] === 'Inside' ? `You are inside ${focus[2]}, and my answer is about it. ` : `You are looking at ${focus[2]}, and my answer is about it. `;
}

/** The rehearsal reply source. It never calls a model and never spends credits. */
export const rehearsalAskModel: AskModel = async (prompt) => {
  const { mode, level, allowedFiles, message } = readPromptFrame(prompt);
  const lower = message.toLowerCase();
  if (/\b(outage|shortfall)\b/.test(lower)) throw new Error(REHEARSAL_OUTAGE_MESSAGE);

  let body: string;
  if (allowedFiles) body = change(allowedFiles, message, level);
  else if (message.includes(ELEMENT_CODE_MARKER)) body = elementCode(prompt, message);
  else if (/\b(draft|note|offer)\b/.test(lower)) body = offering();
  else if (/\b(code|snippet|function)\b/.test(lower)) body = explainSnippet(level);
  else body = `${focusNote(prompt)}${MODE_NOTES[mode] ?? MODE_NOTES.DESIGN} Ask me to explain anything on screen, to write code, or to draft a note.`;

  return { modelId: REHEARSAL_MODEL_ID, content: `${NOTICE}\n\n${body}` };
};
