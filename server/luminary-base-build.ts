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
  const pending: { paths: string[]; retries: number }[] = [];
  for (let offset = 0; offset < allowedFiles.length; offset += 8) pending.push({ paths: allowedFiles.slice(offset, offset + 8), retries: 0 });
  let attempt = 0;
  while (pending.length) {
    const { paths: page, retries } = pending.shift()!;
    attempt++;
    const result = await ask(`${prompt}\n[Continuous base build: page ${attempt}]\nReturn one complete luminary-change block containing exactly these files: ${JSON.stringify(page)}. Implement them against the ENTIRE specification above. No placeholders or requests for routine confirmation.\nPreviously generated files (exact content):\n${JSON.stringify(files)}`);
    pages.push(result);
    if (!result.ok) throw new ExecutorShortfall('no_change', `Base-build governance stopped page ${attempt}: ${result.shortfall.code}: ${result.shortfall.message}`);
    if (modelId && modelId !== result.reply.modelId) throw new ExecutorShortfall('no_change', 'Base-build model changed between pages.');
    modelId = result.reply.modelId;
    const change = findChange(result.reply.content);
    const actual = typeof change === 'string' ? [] : change.files.map(file => file.path);
    const invalid = typeof change === 'string' ? change : actual.length !== page.length || new Set(actual).size !== page.length || page.some(path => !actual.includes(path)) ? 'Base-build page did not return every requested file exactly once.' : null;
    if (invalid) {
      // Regenerate through governance; never guess repairs to malformed model output.
      if (page.length > 1) {
        const midpoint = Math.ceil(page.length / 2);
        pending.unshift({ paths: page.slice(0, midpoint), retries: 0 }, { paths: page.slice(midpoint), retries: 0 });
        continue;
      }
      if (retries < 1) { pending.unshift({ paths: page, retries: retries + 1 }); continue; }
      throw new ExecutorShortfall('no_change', invalid);
    }
    if (typeof change === 'string') throw new ExecutorShortfall('no_change', change);
    files.push(...change.files);
  }
  return { change: { summary: 'Complete continuous base build', files }, modelId, pages };
}
