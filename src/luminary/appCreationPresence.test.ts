import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppCreationActive, setAppCreationActive, subscribeAppCreationActive } from './appCreationPresence';

test('interview open/close notifies bubble subscribers without duplicates or leaked listeners', () => {
  setAppCreationActive(false);
  const seen: boolean[] = [];
  const stop = subscribeAppCreationActive(() => seen.push(isAppCreationActive()));
  try {
    setAppCreationActive(true);
    setAppCreationActive(true);
    setAppCreationActive(false);
    assert.deepEqual(seen, [true, false]);
    stop();
    setAppCreationActive(true);
    assert.equal(isAppCreationActive(), true);
    assert.deepEqual(seen, [true, false]);
  } finally {
    stop();
    setAppCreationActive(false);
  }
});
