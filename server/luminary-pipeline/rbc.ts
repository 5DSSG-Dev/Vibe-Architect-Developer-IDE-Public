// RBC — Resonance Buffer Chamber (STP-0002 P17). A mandatory pause and redirect. It does not
// judge and scores nothing of its own: it takes the IRG reading as given and selects the
// route. Coherent goes to the Prism (delivery); Incoherent goes to IDS.

import type { IrgReading } from './irg.js';

export type RbcRoute = 'prism' | 'ids';

export function routeRbc(irg: IrgReading): RbcRoute {
  return irg.coherent ? 'prism' : 'ids';
}
