// A deterministic stand-in for the IDQ embedded model, for tests only. It writes Define from
// what the checks recorded and a Question worded as an observation, never quoting the message.

import { thresholdFor } from './irg.js';
import type { IdqWriter, IdqWriteRequest } from './idq.js';

export function fakeIdqWriter(onWrite?: (request: IdqWriteRequest) => void): IdqWriter & { requests: IdqWriteRequest[] } {
  const requests: IdqWriteRequest[] = [];
  return {
    requests,
    write: async (request) => {
      requests.push(request);
      onWrite?.(request);
      const define = request.irg
        ? request.irg.belowThreshold.map((v) => `${v} reads ${request.irg!.readings[v]}, below the threshold of ${thresholdFor(request.irg!.threshold, v)}.`)
        : request.pimFindings.map((f) => `The pattern screen recorded ${f.category.replace(/_/g, ' ')}.`);
      if (define.length === 0) define.push('The structural check recorded the message as not well-formed.');
      return {
        identify: request.irg ? 'The message makes a request.' : 'The message makes a request the pattern screen flagged.',
        define,
        question: ['How could the same point be expressed more plainly?'],
      };
    },
  };
}
