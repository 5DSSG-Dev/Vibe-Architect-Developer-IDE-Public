// Rewrite the generated "Elements in the Apothecary today" section of the Luminary's Knowledge Pack
// (STP-0002 P23) from the IDE's catalog. Run after changing DEFAULT_APOTHECARY_CATALOG.
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_APOTHECARY_CATALOG } from '../src/engine/relationEngine';
import { KNOWLEDGE_PACK_PATH, apothecaryKnowledge, withApothecarySection } from '../src/luminary/knowledge';

const pack = readFileSync(KNOWLEDGE_PACK_PATH, 'utf8');
const next = withApothecarySection(pack, apothecaryKnowledge(DEFAULT_APOTHECARY_CATALOG));
if (next === pack) {
  console.log('The Knowledge Pack already matches the Apothecary.');
} else {
  writeFileSync(KNOWLEDGE_PACK_PATH, next);
  console.log(`Updated ${KNOWLEDGE_PACK_PATH} from ${DEFAULT_APOTHECARY_CATALOG.length} Apothecary Elements.`);
}
