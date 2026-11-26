// Builds LaunchBox / Big Box media for the cabinet from the game itself: title and gameplay screenshots,
// a 30 s gameplay video snap, a transparent clear logo, a box front, a banner and a background fanart.
//
//   node scripts/launchbox-media.mjs [--ref latest] [--art-only]
//
// --art-only skips the game and recomposes the logo and posters from the screenshots already in docs/launchbox/.
//
// --ref picks the build to capture: a git ref (default `latest`, the release the cabinet runs) is checked out
// into a temporary worktree and built there; `--ref .` captures this checkout as it is. Needs Google Chrome
// (Playwright's `chrome` channel) and ffmpeg. Output mirrors LaunchBox's own folders under docs/launchbox/, so
// installing is a copy of that tree over C:\Users\arcade\LaunchBox (see docs/launchbox/README.md).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { extname } from 'node:path';

// --- Per-game settings ----------------------------------------------------------------------------------------
const GAME = {
  title: 'Tower Stacker',
  tagline: 'Stop. Stack. Reach the sky!',
  query: '?test&paused=0&seed=7',
  ready: () => Boolean(window.__towerStackerTestApi && document.querySelector('canvas')),
  // src/styles.css .intro-title: bold Georgia, warm ivory on a midnight-blue scene. No bundled font.
  logo: { font: '700 {size}px Georgia, "Times New Roman", serif', fill: '#f7efe0', ink: '#050811', gloss: 'rgba(255,255,255,0.35)' },
  colors: { dark: '#091120', mid: '#10213b', accent: '#f0c970', text: '#f7efe0' },
  // Box front key art: the gameplay shot from below the machine's own topper sign (cropTop, screen px),
  // placed under the poster's logo (boxTop, poster px).
  // focusY: the screen row the fanart's close-up centres on (the coin pile).
  scene: { cropTop: 500, boxTop: 290, focusY: 1000 },
  /** Observe live motion, then release Space near alignment. Never step or teleport the simulation. */
  async play(page, ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await page.waitForFunction(() => {
        const s = window.__towerStackerTestApi.getState();
        if (s.gameState !== 'playing') throw new Error(`Unexpected ${s.gameState}`);
        return s.activePosition && Math.abs(s.activePosition[s.activeAxis]) < 0.16;
      }, null, { polling: 'raf', timeout: 15000 });
      await page.keyboard.press('Space');
      await page.waitForTimeout(650);
    }
    const state = await page.evaluate(() => window.__towerStackerTestApi.getState());
    console.log(`live play: score=${state.score}, state=${state.gameState}`);
  },
};
// ---------------------------------------------------------------------------------------------------------------

const SCREEN = { width: 1050, height: 1680 };
// CSS font shorthand for the posters; single quotes so it fits inside a style="" attribute.
const font = (px) => GAME.logo.font.replace('{size}', px).replaceAll('"', "'");
const { dark, mid, accent, text } = GAME.colors;
const VIDEO_SECONDS = 30;
const FFMPEG = process.env.FFMPEG ?? (existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(repo, 'docs/launchbox');
const ref = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : 'latest';
const artOnly = process.argv.includes('--art-only');
const name = `${GAME.title}-01`;
const image = (type) => join(out, 'Images/Arcade', type, `${name}.png`);
const run = (cmd, args, cwd = repo) => execFileSync(cmd, args, { cwd, timeout: 180000, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

const work = mkdtempSync(join(tmpdir(), 'launchbox-media-'));
let source = repo;
if (ref !== '.' && !artOnly) {
  source = join(work, 'src');
  run('git', ['worktree', 'add', '--detach', source, ref]);
  symlinkSync(join(repo, 'node_modules'), join(source, 'node_modules'));
}
const commit = run('git', ['rev-parse', '--short', 'HEAD'], source);
if (!artOnly) {
  console.log(`capturing ${GAME.title} at ${ref} (${commit})`);
  run('npm', ['run', 'build'], source);
}
// Serve the released build: ES modules, GLTF fetches and Draco workers need HTTP, not file://.
const server = createServer((req, res) => {
  const file = join(source, 'dist', decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  const path = file.endsWith('/') ? join(file, 'index.html') : file;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
  try { res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream'); res.end(readFileSync(path)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/${GAME.query}`;

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--autoplay-policy=no-user-gesture-required'] });
try {
  for (const type of ['Screenshot - Game Title', 'Screenshot - Gameplay', 'Clear Logo', 'Box - Front', 'Banner', 'Fanart - Background']) {
    mkdirSync(dirname(image(type)), { recursive: true });
  }
  mkdirSync(join(out, 'Videos/Arcade'), { recursive: true });
  if (!artOnly) await capture();

  // Artwork: the logo in the game's own lettering, then posters composed around the captured scene.
  const art = await browser.newPage({ viewport: { width: 2000, height: 2000 }, deviceScaleFactor: 1 });
  const logo = await art.evaluate(drawLogo, { text: GAME.title.toUpperCase(), ...GAME.logo });
  writeFileSync(image('Clear Logo'), Buffer.from(logo.split(',')[1], 'base64'));
  const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  const assets = { logo, play: dataUrl(image('Screenshot - Gameplay')), title: dataUrl(image('Screenshot - Game Title')) };
  await compose(art, image('Box - Front'), 1000, 1500, boxFront(assets));
  await compose(art, image('Banner'), 1000, 185, banner(assets));
  await compose(art, image('Fanart - Background'), SCREEN.width, SCREEN.height, fanart(assets));
  await art.close();
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  if (source !== repo) run('git', ['worktree', 'remove', '--force', source]);
  rmSync(work, { recursive: true, force: true });
}

/** Title and gameplay screenshots, then the video snap, each from a fresh run of the built game. */
async function capture() {
  // Screenshots from one run of the game.
  const errors = [];
  const page = await browser.newPage({ viewport: SCREEN, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(GAME.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: image('Screenshot - Game Title') });
  await GAME.play(page, 14_000);
  await page.waitForTimeout(250);
  await page.screenshot({ path: image('Screenshot - Gameplay') });
  await page.keyboard.up('Space');
  await page.close();
  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);

  // Video snap: record a fresh run, then cut the page load off the front.
  const videoDir = join(work, 'video');
  const context = await browser.newContext({ viewport: SCREEN, deviceScaleFactor: 1, recordVideo: { dir: videoDir, size: SCREEN } });
  const started = Date.now();
  const vpage = await context.newPage();
  await vpage.goto(url);
  await vpage.waitForFunction(GAME.ready);
  await vpage.waitForTimeout(1500);
  await vpage.evaluate(() => {
    window.captureFrames = [];
    const tick = (t) => { window.captureFrames.push(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const lead = (Date.now() - started) / 1000;
  await GAME.play(vpage, VIDEO_SECONDS * 1000 + 500);
  const fps = await vpage.evaluate(() => {
    const f = window.captureFrames;
    return (f.length - 1) * 1000 / (f.at(-1) - f[0]);
  });
  console.log(`capture requestAnimationFrame: ${fps.toFixed(1)} fps`);
  if (fps < 50) throw new Error(`Capture too slow: ${fps.toFixed(1)} fps; re-run without contention`);
  await context.close();
  const webm = join(videoDir, readdirSync(videoDir)[0]);
  run(FFMPEG, ['-nostdin', '-loglevel', 'error', '-y', '-ss', lead.toFixed(2), '-i', webm, '-t', String(VIDEO_SECONDS),
    '-vf', 'scale=720:-2,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    join(out, 'Videos/Arcade', `${name}.mp4`)]);
  writeFileSync(join(out, 'SOURCE.txt'), `${GAME.title} media captured from ${ref} (${commit}) by scripts/launchbox-media.mjs\n`);
}

/** Runs in the page: chunky inked lettering on a transparent canvas, trimmed to the ink. */
function drawLogo({ text, font, fill, ink, gloss }) {
  const size = 220;
  const c = document.createElement('canvas');
  c.width = 2400;
  c.height = 600;
  const g = c.getContext('2d');
  g.font = font.replace('{size}', size);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const x = c.width / 2;
  const y = c.height / 2;
  g.lineWidth = size * 0.22;
  g.strokeStyle = ink;
  g.strokeText(text, x, y + size * 0.06);
  g.fillStyle = fill;
  g.fillText(text, x, y);
  g.save();
  g.beginPath();
  g.rect(0, y - size * 0.5, c.width, size * 0.28);
  g.clip();
  g.fillStyle = gloss;
  g.fillText(text, x, y);
  g.restore();
  const { data } = g.getImageData(0, 0, c.width, c.height);
  let [l, t, r, b] = [c.width, c.height, 0, 0];
  for (let i = 3; i < data.length; i += 4) {
    if (!data[i]) continue;
    const p = (i - 3) / 4;
    const px = p % c.width;
    const py = (p - px) / c.width;
    l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py);
  }
  const pad = 12;
  const o = document.createElement('canvas');
  o.width = r - l + 1 + pad * 2;
  o.height = b - t + 1 + pad * 2;
  o.getContext('2d').drawImage(c, l, t, r - l + 1, b - t + 1, pad, pad, r - l + 1, b - t + 1);
  return o.toDataURL('image/png');
}

async function compose(page, file, width, height, html) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}</style>${html}`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await page.screenshot({ path: file });
}

function boxFront({ logo, play }) {
  return `<div style="position:relative;width:1000px;height:1500px;background:${dark};overflow:hidden;border:14px solid ${GAME.logo.ink}">
    <div style="position:absolute;left:-25px;top:${GAME.scene.boxTop}px;width:1050px;bottom:0;overflow:hidden">
      <img src="${play}" style="position:absolute;left:0;top:-${GAME.scene.cropTop}px;width:1050px;height:1680px">
    </div>
    <div style="position:absolute;inset:0;background:linear-gradient(${dark} 0%, ${dark}ee 14%, transparent 34%, transparent 72%, ${dark}f0 88%, ${dark} 100%)"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%, transparent 55%, ${dark}cc 100%)"></div>
    <img src="${logo}" style="position:absolute;left:50%;top:40px;width:900px;transform:translateX(-50%) rotate(-3deg);filter:drop-shadow(0 14px 0 ${GAME.logo.ink}) drop-shadow(0 0 40px ${accent}aa)">
    <div style="position:absolute;left:0;right:0;bottom:70px;text-align:center;font:${font(46)};white-space:nowrap;color:${text};-webkit-text-stroke:11px ${GAME.logo.ink};paint-order:stroke fill">${GAME.tagline}</div>
  </div>`;
}

function banner({ logo, play }) {
  return `<div style="position:relative;width:1000px;height:185px;background:${dark};overflow:hidden">
    <img src="${play}" style="position:absolute;left:0;top:-760px;width:1000px;filter:saturate(1.1)">
    <div style="position:absolute;inset:0;background:linear-gradient(90deg, ${dark}f2 0%, ${dark}c0 45%, transparent 100%)"></div>
    <img src="${logo}" style="position:absolute;left:36px;top:50%;width:928px;max-height:132px;object-fit:contain;transform:translateY(-50%);filter:drop-shadow(0 6px 0 ${GAME.logo.ink})">
  </div>`;
}

function fanart({ play }) {
  return `<div style="position:relative;width:${SCREEN.width}px;height:${SCREEN.height}px;background:${dark};overflow:hidden">
    <img src="${play}" style="position:absolute;width:${SCREEN.width * 1.9}px;height:${SCREEN.height * 1.9}px;left:${-(SCREEN.width * 0.95 - SCREEN.width / 2)}px;top:${-(GAME.scene.focusY * 1.9 - SCREEN.height / 2)}px;filter:blur(3px) saturate(1.2) brightness(0.72)">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, transparent 30%, ${dark}d9 95%)"></div>
  </div>`;
}
