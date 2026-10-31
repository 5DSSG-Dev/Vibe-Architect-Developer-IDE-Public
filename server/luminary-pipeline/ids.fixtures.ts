// A deterministic stand-in for the IDS embedded model, for tests only. It writes Define from
// what the checks recorded and a Suggest worded as an observation, never quoting the message.

import { thresholdFor } from './irg.js';
import type { IdsWriter, IdsWriteRequest } from './ids.js';

export function fakeIdsWriter(onWrite?: (request: IdsWriteRequest) => void): IdsWriter & { requests: IdsWriteRequest[] } {
  const requests: IdsWriteRequest[] = [];
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
        suggest: ['One possibility is that the point could be stated more plainly.'],
      };
    },
  };
}
