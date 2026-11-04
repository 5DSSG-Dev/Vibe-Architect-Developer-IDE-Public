import type { AppProposal } from './appCreation';
export interface BuildItem {
  id: string;
  text: string;
  verification?: { by: 'Architect' | 'Verified build'; evidence: string; at: string };
}
export interface AppBuildPlan {
  proposal: AppProposal;
  decisions: string;
  items: BuildItem[];
  /** Actionable construction tasks, separate from the lossless interview requirement ledger. */
  tasks?: BuildItem[];
  invitation: 'pending' | 'exploring' | 'entered';
}
export function journeyItems(plan: AppBuildPlan): BuildItem[] {
  return plan.tasks ?? (plan.proposal.gaps.length ? plan.proposal.gaps.map((text,index)=>({id:`build-task-${index+1}`,text})) : [{id:'build-task-verify',text:`Build and verify ${plan.proposal.name}: ${plan.proposal.purpose}`}]);
}
export function createBuildPlan(proposal: AppProposal, decisions = ''): AppBuildPlan {
  const snapshot = JSON.parse(JSON.stringify(proposal)) as AppProposal;
  const work = snapshot.requirements?.length ? [] : [...snapshot.gaps, 'Verify the requested app works, saves its data, and reopens successfully.'];
  return { proposal: snapshot, decisions, items: [...(snapshot.requirements ?? []).map(r=>({...r})), ...work.map(text => ({ id: crypto.randomUUID(), text }))], invitation: 'pending' };
}
export function verifyBuildItem(plan: AppBuildPlan, id: string, evidence: string): AppBuildPlan {
  if (!plan.items.some(item => item.id === id)) throw Error('ToDo item not found.');
  if (!evidence.trim() || evidence.length > 2000) throw Error('Describe your verification evidence in 1 to 2000 characters.');
  return { ...plan, items: plan.items.map(item => item.id === id ? { ...item, verification: { by: 'Architect', evidence: evidence.trim(), at: new Date().toISOString() } } : item) };
}
export function reopenBuildItem(plan: AppBuildPlan, id: string): AppBuildPlan {
  return { ...plan, items: plan.items.map(item => item.id === id ? { id: item.id, text: item.text } : item) };
}
export function isBuildPlan(value: unknown): value is AppBuildPlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as AppBuildPlan, a = p.proposal;
  const str = (v: unknown, limit: number) => typeof v === 'string' && v.length <= limit;
  return Boolean(a && str(a.name, 80) && str(a.purpose, 2000) && str(a.appType, 80) && str(a.crystalModel, 160)
    && Array.isArray(a.elements) && a.elements.length <= 32 && a.elements.every(e => e && str(e.id, 160) && (e.parentId === null || str(e.parentId, 160)) && str(e.reason, 700))
    && Array.isArray(a.gaps) && a.gaps.length <= 8 && a.gaps.every(g => str(g, 700))
    && str(p.decisions, 2_000_000) && ['pending', 'exploring', 'entered'].includes(p.invitation)
    && Array.isArray(p.items) && p.items.length <= 64 && p.items.every(i => i && str(i.id, 160) && i.id.length > 0 && str(i.text, 2000) && i.text.trim().length > 0
      && (i.verification === undefined || (i.verification && ['Architect','Verified build'].includes(i.verification.by) && str(i.verification.evidence, 2000) && i.verification.evidence.trim().length > 0 && str(i.verification.at, 40) && Number.isFinite(Date.parse(i.verification.at)))))
    && new Set(p.items.map(i => i.id)).size === p.items.length
    && (p.tasks===undefined || (Array.isArray(p.tasks) && p.tasks.length<=64 && p.tasks.every(i=>i && str(i.id,160) && i.id.length>0 && str(i.text,2000) && i.text.trim().length>0 && (i.verification===undefined || (['Architect','Verified build'].includes(i.verification.by) && str(i.verification.evidence,2000) && i.verification.evidence.trim().length>0 && str(i.verification.at,40) && Number.isFinite(Date.parse(i.verification.at))))) && new Set(p.tasks.map(i=>i.id)).size===p.tasks.length)));
}
export function nextBuildItem(plan: AppBuildPlan, selectedId?: string) {
  return plan.items.find(i => i.id === selectedId && !i.verification) ?? plan.items.find(i => !i.verification);
}
interface ElementFocus { key: string; label: string; text: string }
function excerpt(value: string, maxBytes: number): string {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  if (bytes(value) <= maxBytes) return value;
  const notice = '\n[Excerpt; full decisions remain saved in the app.]';
  let lo = 0, hi = value.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bytes(value.slice(0, mid) + notice) <= maxBytes) lo = mid; else hi = mid - 1;
  }
  return value.slice(0, lo) + notice;
}
function interviewContext(value: string): string {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  if (bytes(value) <= 7000) return value;
  let lo = 0, hi = value.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bytes(value.slice(value.length - mid)) <= 5500) lo = mid; else hi = mid - 1;
  }
  return excerpt(value, 1000) + '\n[Middle discussion omitted; full interview remains saved. Later explicit decisions supersede earlier ones.]\nLatest interview decisions:\n' + value.slice(value.length - lo);
}
export function buildItemFocus(coreId: string, plan: AppBuildPlan, id: string, current?: ElementFocus) {
  const item = journeyItems(plan).find(item => item.id === id) ?? plan.items.find(item => item.id === id);
  if (!item) return undefined;
  const text = [
    'The Architect selected this ToDo for assistance. Explain the next step and guide building or editing in the Apothecary. This is context, not authorization to execute or claim completion. Preserve agreed decisions and ask before changing scope.',
    'Selected work: ' + excerpt(item.text, 2000),
    'App: ' + plan.proposal.name + '\nPurpose: ' + excerpt(plan.proposal.purpose, 2000),
    current ? 'Current Element: ' + current.label + '\n' + excerpt(current.text, 4000) : '',
    'Verification: ' + excerpt(JSON.stringify(item.verification ?? null), 1000),
    'Architecture: ' + excerpt(JSON.stringify(plan.proposal.elements), 2000),
    'Agreed interview: ' + interviewContext(plan.decisions)
  ].filter(Boolean).join('\n\n');
  return {
    key: `todo:${coreId}:${item.id}:${current?.key ?? ''}`,
    label: 'ToDo: ' + item.text.slice(0, 50) + (current ? ' ? ' + current.label : ''),
    text: excerpt(text, 20000)
  };
}

export interface VerifiedBuildReceipt {
 digest:string;context:{requirements?:{id:string;text:string}[]};
 gates?:{audit:{decision:string;artifactHash:string;coveredRequirementIds:string[]};ast:{requirementId:string}[];verification:{build:string;tests:string}};
}
/** A checkbox follows exact-task, exact-artifact successful execution evidence, never model prose. */
export function completeVerifiedBuildItems(plan:AppBuildPlan,receipt:VerifiedBuildReceipt):AppBuildPlan {
 const gates=receipt.gates;
 if(!gates || gates.audit.decision!=='pass' || gates.audit.artifactHash!==receipt.digest || gates.verification.build!=='passed' || !/pass\s+[1-9]/.test(gates.verification.tests) || !/fail\s+0(?:\s|$)/.test(gates.verification.tests))return plan;
 const at=new Date().toISOString();
 return {...plan,items:plan.items.map(item=>{
  if(item.verification || !receipt.context.requirements?.some(r=>r.id===item.id&&r.text===item.text) || !gates.audit.coveredRequirementIds.includes(item.id) || !gates.ast.some(n=>n.requirementId===item.id))return item;
  return {...item,verification:{by:'Verified build' as const,at,evidence:`Requirement ${item.id}: generated tests and build passed; AST mapping and secondary audit approved artifact ${receipt.digest}.`}};
 })};
}
