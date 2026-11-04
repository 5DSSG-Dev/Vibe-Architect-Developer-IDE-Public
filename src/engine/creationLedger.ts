/** Lossless ordered ledger of distinct Architect statements and decisions.
 * Entries preserve source text; they are not claims of implemented requirements.
 */
export interface CreationTurn {
  role: string;
  text: string;
  state?: 'pending' | 'sent' | 'failed' | 'stopped';
}
export interface CreationLedgerEntry {
  id: string;
  firstTurn: number;
  text: string;
}
export function buildCreationLedger(turns: CreationTurn[]): CreationLedgerEntry[] {
  const seen = new Set<string>();
  const ledger: CreationLedgerEntry[] = [];
  turns.forEach((turn, index) => {
    if (turn.role !== 'architect' || turn.state === 'failed' || turn.state === 'stopped') return;
    const statement = turn.text.trim();
    if (!statement || seen.has(statement)) return;
    seen.add(statement);
    ledger.push({ id: 'R' + String(ledger.length + 1).padStart(3, '0'), firstTurn: index + 1, text: statement });
  });
  return ledger;
}
/** Never silently discard middle turns. The caller enforces the prompt byte cap. */
export function selectCreationTurns<T extends CreationTurn>(turns: T[]): T[] {
  return turns.filter(turn => turn.state !== 'failed' && turn.state !== 'stopped');
}

/** Stable source-derived ToDo IDs; the model cannot omit interview lines at acceptance. */
export function interviewRequirements(turns: CreationTurn[]): {id:string;text:string}[] {
  const accepted=turns.filter(turn=>turn.role==='architect' && (!turn.state||turn.state==='sent'));
  return buildCreationLedger(accepted).flatMap(entry=>entry.text.split(/\n+/).map(line=>line.trim()).filter(Boolean).map((text,index)=>({id:entry.id+'-'+String(index+1).padStart(2,'0'),text})));
}
