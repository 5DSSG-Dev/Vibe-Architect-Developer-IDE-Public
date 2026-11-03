# Folder Totem: output

Created: 2026-10-20T19:17:46.088Z

## Folder Reference

Record conventions, ownership, risks, and useful reference information for this folder here.

## Subfolder Elements

- design
- playwright

## Append Log



## 2026-11-02 | Lumen | Generated-project verification
- verify-application-generation.mjs materializes a uniquely named generated-app-* directory, runs generated behavior checks and Vite build, then verifies HTTP dev delivery and closes only its own server. Reuses ancestor installed dependencies; does not verify clean npm install or browser interaction. Successful generated-app-oaepbo has4 passing behavior tests and a production dist. Earlier generated-app-YCDVlO retained as first-run evidence. No source project is overwritten.


## 2026-11-03 | Lumen | Clean generated demo and preview activation evidence
- Unique generated-app-clean-8ac1db10-086b-435c-8f89-809943320678 contains a copy of the deterministic notes demo with its own npm-installed dependencies and package lock. Install used --ignore-scripts --no-audit --no-fund and passed; generated tests4/4 and local Vite production build passed. This supersedes ancestor-only dependency evidence for this demo, not for all generated projects or the full IDE.
- application-production-activation-build.log records passing IDE TypeScript/build; application-production-activation-app-tests.log records421/421 application tests. Configured preview gateway now serves current source at127.0.0.1:3012. Browser and live-provider rehearsal remain unverified; full details in chatgpt-work lane.
