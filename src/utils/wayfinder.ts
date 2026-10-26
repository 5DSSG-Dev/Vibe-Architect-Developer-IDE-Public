import { ApothecaryItem, isActuatorItem, isOrbItem } from '../engine/relationEngine';

export type IdeMode = 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY';

export interface WayfinderState {
  mode: IdeMode;
  /** Drill-down path from the CORE: Orb, then Satellite, then Actuator. */
  environmentStack: Pick<ApothecaryItem, 'name' | 'category'>[];
  /** Children of the current Environment (what the user can enter next). */
  childCount: number;
  /** Orbs docked to the CORE. */
  dockedOrbCount: number;
}

/**
 * One plain sentence telling the user where they are and what they can do
 * next. Shown in the Wayfinder so no screen is a dead end.
 */
export function describeCurrentTask(state: WayfinderState): string {
  switch (state.mode) {
    case 'CODE':
      return 'Edit a Stellar program, then Check or Run it.';
    case 'SIMULATE':
      return 'Raise the load or inject a fault, then watch containment hold.';
    case 'DEPLOY':
      return 'Review the invariant audit, then export the signed package.';
    case 'DESIGN':
      break;
  }

  const current = state.environmentStack[state.environmentStack.length - 1];
  if (!current) {
    return state.dockedOrbCount > 0
      ? 'Click a docked Orb in the scene to enter it, or dock another from the Apothecary.'
      : 'Pick an Orb in the Apothecary and dock it to the CORE.';
  }

  if (state.childCount === 0) {
    return `Inside ${current.name}. Nothing to enter below this level; use Back to return.`;
  }
  if (isOrbItem(current as ApothecaryItem)) {
    return `Inside ${current.name}. Click a Satellite to enter it.`;
  }
  if (isActuatorItem(current as ApothecaryItem)) {
    return `Inside ${current.name}. Use Back to return.`;
  }
  return `Inside ${current.name}. Click an Actuator to enter it.`;
}
