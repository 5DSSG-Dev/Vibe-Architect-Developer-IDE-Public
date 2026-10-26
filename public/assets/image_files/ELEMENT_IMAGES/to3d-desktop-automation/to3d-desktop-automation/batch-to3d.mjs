import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const configPath = path.resolve(args.get("--config") ?? "config.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function cleanBaseName(filePath) {
  return path.basename(filePath, path.extname(filePath)).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

async function nextAvailablePath(dir, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = path.join(dir, fileName);
  let count = 1;

  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(dir, `${base}-${count}${ext}`);
      count += 1;
    } catch {
      return candidate;
    }
  }
}

async function listImages(sourceDir, extensions) {
  const allowed = new Set(extensions.map((ext) => ext.toLowerCase()));
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && allowed.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(sourceDir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function moveFile(sourcePath, targetDir) {
  await ensureDir(targetDir);
  const targetPath = await nextAvailablePath(targetDir, path.basename(sourcePath));
  await fs.rename(sourcePath, targetPath);
  return targetPath;
}

async function waitForOptionalHidden(page, selector, timeout) {
  if (!selector) return;
  try {
    await page.locator(selector).first().waitFor({ state: "hidden", timeout });
  } catch {
    // Some UIs remove or rename progress text during generation. The download wait is authoritative.
  }
}

async function uploadAndDownload(page, imagePath) {
  const selectors = config.selectors;
  const timeouts = config.timeouts;
  const sourceBase = cleanBaseName(imagePath);

  await page.locator(selectors.fileInput).setInputFiles(imagePath, {
    timeout: timeouts.pageReadyMs
  });

  if (selectors.submitButton) {
    await page.locator(selectors.submitButton).first().click({
      timeout: timeouts.pageReadyMs
    });
  }

  await waitForOptionalHidden(page, selectors.busyIndicator, timeouts.generationMs);

  const downloadPromise = page.waitForEvent("download", {
    timeout: timeouts.generationMs
  });
  await page.locator(selectors.downloadButton).first().click({
    timeout: timeouts.generationMs
  });

  const download = await downloadPromise;
  const suggestedName = download.suggestedFilename();
  const downloadExt = path.extname(suggestedName) || ".glb";
  const finalName = config.outputNameMode === "source-name"
    ? `${sourceBase}${downloadExt}`
    : suggestedName;
  const finalPath = await nextAvailablePath(config.completedDir, finalName);

  await download.saveAs(finalPath);
  return finalPath;
}

for (const dir of [
  config.sourceDir,
  config.completedDir,
  config.processedSourceDir,
  config.failedDir,
  config.browserProfileDir
]) {
  await ensureDir(dir);
}

const images = await listImages(config.sourceDir, config.supportedExtensions);
if (images.length === 0) {
  console.log(`No source images found in ${config.sourceDir}`);
  process.exit(0);
}

console.log(`Found ${images.length} image(s). Opening browser profile...`);

const browser = await chromium.launchPersistentContext(config.browserProfileDir, {
  acceptDownloads: true,
  headless: false
});

const page = browser.pages()[0] ?? await browser.newPage();
await page.goto(config.to3dUrl, {
  waitUntil: "domcontentloaded",
  timeout: config.timeouts.pageReadyMs
});

console.log("If login or manual navigation is needed, do it in the opened browser.");
console.log("The automation will continue after the upload input is visible.");
await page.locator(config.selectors.fileInput).first().waitFor({
  state: "attached",
  timeout: 0
});

for (const imagePath of images) {
  const imageName = path.basename(imagePath);
  console.log(`Processing ${imageName}...`);

  try {
    const modelPath = await uploadAndDownload(page, imagePath);
    const archivedPath = await moveFile(imagePath, config.processedSourceDir);
    console.log(`Done: ${imageName}`);
    console.log(`  model: ${modelPath}`);
    console.log(`  source archived: ${archivedPath}`);
  } catch (error) {
    const failedPath = await moveFile(imagePath, config.failedDir);
    console.error(`Failed: ${imageName}`);
    console.error(`  source moved to: ${failedPath}`);
    console.error(`  reason: ${error instanceof Error ? error.message : String(error)}`);
  }

  await sleep(config.timeouts.betweenImagesMs);
}

await browser.close();
console.log("Batch complete.");
