# to3D Desktop Batch Automation

This is a local desktop runner for batching source images through the to3D web/plugin interface.

It opens a real Chromium browser, uses your normal login session, uploads one image at a time, waits for the model download, saves the model into a completed folder, then archives the source image so the batch can be restarted safely.

## Folder Flow

| Folder | Purpose |
| --- | --- |
| `sourceDir` | Put images waiting for conversion here. |
| `completedDir` | Finished downloaded 3D model files are saved here. |
| `processedSourceDir` | Source images move here only after the download succeeds. |
| `failedDir` | Source images move here if upload, generation, or download fails. |
| `browserProfileDir` | Browser login/session storage for the automation. |

## Setup

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Run:

```powershell
npm install
npx playwright install chromium
copy config.example.json config.json
```

4. Edit `config.json` and set your folders.
5. Set `to3dUrl` to the page where the to3D upload UI is available.

## Run

```powershell
npm start
```

The first run opens Chromium. Log in and navigate to the to3D upload screen if needed. Once the upload input exists on the page, the batch continues automatically.

## Selector Tuning

The defaults look for common labels:

```json
{
  "fileInput": "input[type='file']",
  "submitButton": "button:has-text('Generate'), button:has-text('Create'), button:has-text('Convert')",
  "downloadButton": "a:has-text('Download'), button:has-text('Download')",
  "busyIndicator": "text=/generating|processing|converting|queued/i"
}
```

If to3D uses different button text, update `submitButton` and `downloadButton` in `config.json`.

## Notes

- The currently exposed to3D plugin tool accepts image URLs programmatically. It does not expose a direct local-file batch upload API.
- This runner handles local desktop files by controlling the upload UI in a browser.
- Keep the browser visible while running. It is easier to recover from login prompts, usage-limit prompts, or unexpected UI changes.
- If the browser closes or the script stops, put anything from `failedDir` back into `sourceDir` and run again.
