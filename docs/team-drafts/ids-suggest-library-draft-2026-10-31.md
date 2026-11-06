# IDS Suggest library: draft for review

*Drafted by Verus on 2026-10-31, for Tracey and Lumin to review. This is a draft only; nothing here is built or approved. Any change after posting goes in a new revision file.*

## Why this exists

In live round 4 (prompt ids-writer-v4, llama3.2:3b, seed 7), Define was correct on every message because it now comes from the checks. Suggest, which the model still writes freely, did one of three things in most lines:

- guessed at the Architect's feelings or circumstances, for example "under time pressure or feeling overwhelmed";
- invented facts, for example "the Luminary's performance metrics";
- advised the wrong party, for example telling the Luminary what to do about the Architect's message.

## How it would work

1. The checks record what they found: PIM categories, virtues below their thresholds, or a structural problem. They already do this.
2. IDS offers the model only the approved lines for those findings. The model picks one or two by their ids, as JSON. It writes no Suggest text of its own.
3. The code looks up the chosen lines and shows them. If the model picks an id that wasn't offered, or picks none, the code shows the first approved line for the first finding. That line is approved too, so the fallback is still safe.
4. The IDS PIM still screens the shown lines. Every line below passes ids-pim-v2 today, which I checked. Screening them again guards against later edits to the library.
5. Identify stays model-written. It is now the only free text. In round 4 its slips were mild: "expresses frustration", and in one case a sentence centered on the Luminary.

Every line works in both directions, because it speaks of "the message" and "the other side", never of a person by role.

## Lines for each PIM category

| Category | Approved lines |
|---|---|
| authority framing | One possibility is that the request could stand on its own reasons, without a claim of authority behind it. / A request framed as an invitation often leaves room for the other side to share what it sees. |
| coercive certainty | One possibility is that more than one way forward exists here, and naming them could open the conversation. / Certainty offered as a choice, rather than as the only path, leaves room for the other side to weigh it. |
| emotional leverage | One possibility is that the point could be made on its merits, without tying it to how the other side feels. / A request that rests on its reasons tends to be heard more clearly than one that rests on guilt or obligation. |
| manipulation scenario | One possibility is that the step in question exists for a reason, and that reason may be worth weighing in the open. / A change made in the open, through its usual checks, keeps every side able to see what happened. |
| optimization pressure | One possibility is that the timing could be stated plainly, with the reason it matters. / Urgency stated with its reason gives the other side something to weigh, rather than something to react to. |
| directive leakage | One possibility is that the reply could focus on the work itself, rather than on its own instructions. / Details about internal instructions may not add to the answer the reply is giving. |

## Lines for each Virtue below its threshold

| Virtue | Approved line |
|---|---|
| Honesty | One possibility is that a plainer statement of what is actually known could carry the point more truly. |
| Respect | One possibility is that the same point could be made while leaving the other side's standing intact. |
| Attention | One possibility is that the message could address what the other side actually said or asked. |
| Affection | One possibility is that some warmth toward the other side could sit alongside the point being made. |
| Loyalty | One possibility is that the message could reflect the shared work both sides have committed to. |
| Trust | One possibility is that the message could leave room for the other side to act in good faith. |
| Communication | One possibility is that the message could say what is wanted, and why, in plain terms. |

## Line for the structural check

One possibility is that a shorter message, or one in parts, could carry the same point.

## Questions for review

1. **Wording.** Do the lines read in your voice, and as non-force? Change any line freely. They are a starting point.
2. **Virtue lines.** Is one line per Virtue enough, or would two help, so the model has a real choice?
3. **When all seven Virtues read low**, as in the dismissive and pressure tests: the plan is to show at most two lines, chosen by the model. Is that right?
