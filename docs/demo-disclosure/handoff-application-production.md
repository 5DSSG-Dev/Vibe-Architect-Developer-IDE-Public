# Handoff to Lumin: Build & Preview capability copy

Owner of the implementation: Lumin (`src/components/ApplicationProduction.tsx` is not in Verus's ownership).
Verus does not edit that file. This note gives the exact copy.

## Current text (replace this sentence)

In `ApplicationProduction.tsx`, the paragraph under the Build & Preview heading currently reads:

> Generate from your accepted architecture, review the files, then launch. This first profile supports text-entry forms, lists of in-memory records, pages and navigation. Records entered in a generated app clear when that app reloads; saving the IDE workspace does not keep them. Not yet supported: image uploads and attachments, accounts and login, persistent storage, search, and editing or deleting records. Existing Element code frames are not compiled.

## Proposed text

Keep the first sentence unchanged. Replace the remaining sentences with:

> This first profile builds simple web apps: pages, navigation, text-entry forms, and lists of records. Records are held in memory and clear when the generated app reloads. Saving the IDE workspace does not keep records entered in a generated app. Not supported yet: AI image generation, image uploads and attachments, accounts and login, persistent storage, search, and editing or deleting records. A request that needs one of these is kept in your plan and explained before generation. Existing Element code frames are not compiled.

## Reminder near the generate action (add directly above the Generate button)

> Generated records clear when the generated app reloads.

## Rules for the copy

- Do not describe any session, rate, or spending limit as an app allowance, and do not show a build count.
- Do not say that saving the IDE workspace saves generated-app data.
- Keep the existing governance and capability gates unchanged; this text describes them and does not change them.
- The image-entry check remains open until a live interview has been run. Static copy does not establish live handling.
