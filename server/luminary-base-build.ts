import { findChange, type ChangeBlock } from '../src/luminary/blocks.js';
import { ExecutorShortfall } from './luminary-executor.js';
import type { GovernedAskResult } from './luminary-reply-router.js';

/** One user request, sequential governed pages, one atomic executor proposal. */
export async function generateBaseBuild(
  prompt: string, allowedFiles: string[], ask: (prompt: string) => Promise<GovernedAskResult>,
): Promise<{ change: ChangeBlock; modelId: string; pages: GovernedAskResult[] }> {
  const files: ChangeBlock['files'] = [];
  const pages: GovernedAskResult[] = [];
  let modelId = '';
  for (let offset = 0; offset < allowedFiles.length; offset += 8) {
    const page = allowedFiles.slice(offset, offset + 8);
    const result = await ask(`${prompt}\n[Continuous base build: page ${offset / 8 + 1}]\nReturn one complete luminary-change block containing exactly these files: ${JSON.stringify(page)}. Implement them against the ENTIRE specification above. No placeholders or requests for routine confirmation.\nPreviously generated files (exact content):\n${JSON.stringify(files)}`);
    pages.push(result);
    if (!result.ok) throw new ExecutorShortfall('no_change', `Base-build governance stopped page ${offset / 8 + 1}: ${result.shortfall.code}: ${result.shortfall.message}`);
    if (modelId && modelId !== result.reply.modelId) throw new ExecutorShortfall('no_change', 'Base-build model changed between pages.');
    modelId = result.reply.modelId;
    const change = findChange(result.reply.content);
    if (typeof change === 'string') throw new ExecutorShortfall('no_change', change);
    const actual = change.files.map(file => file.path);
    if (actual.length !== page.length || new Set(actual).size !== page.length || page.some(path => !actual.includes(path))) {
      throw new ExecutorShortfall('no_change', 'Base-build page did not return every requested file exactly once.');
    }
    files.push(...change.files);
  }
  return { change: { summary: 'Complete continuous base build', files }, modelId, pages };
}
