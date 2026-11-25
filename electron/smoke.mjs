import { app } from "electron";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function prepareSmoke(win, projectRoot) {
  const failures = [];
  const completedResources = [];
  const responses = new Map();
  // ResourceTiming omits custom-scheme assets. Observe actual Chromium requests.
  win.webContents.debugger.attach("1.3");
  const networkReady = win.webContents.debugger.sendCommand("Network.enable");
  win.webContents.debugger.on("message", (_event, method, params) => {
    if (method === "Network.responseReceived") {
      responses.set(params.requestId, params.response);
    } else if (method === "Network.loadingFinished") {
      const response = responses.get(params.requestId);
      if (response) {
        if (response.status >= 400) failures.push(`Resource failed: ${response.url}: HTTP ${response.status}`);
        completedResources.push(response.url);
        responses.delete(params.requestId);
      }
    }
  });
  win.webContents.on("console-message", (details) => {
    if (details.level === "error") {
      failures.push(details.message);
    }
  });
  win.webContents.on("did-fail-load", (_event, code, description) => {
    failures.push(`Page load failed: ${code} ${description}`);
  });
  win.webContents.session.webRequest.onErrorOccurred((details) => {
    failures.push(`Resource failed: ${details.url}: ${details.error}`);
  });
  const evaluate = (code) => win.webContents.executeJavaScript(code, true);
  const state = () => evaluate("window.__towerStackerTestApi.getState()");
  async function waitFor(check, description) {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      assert.deepEqual(failures, [], "Renderer/resource failures");
      if (await check()) return;
      await pause(100);
    }
    const screenshotPath = path.join(projectRoot, "dist_electron", "electron-smoke-failure.png");
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await writeFile(screenshotPath, (await win.webContents.capturePage()).toPNG());
    throw new Error(`Timed out waiting for ${description}; resources=${JSON.stringify(await resources())}; screenshot=${screenshotPath}`);
  }
  const resources = async () => completedResources;
  const animations = (urls) => urls.filter((url) => /(?:animation_inplace|dancing_inplace|dance_inplace)-[^/]+\.glb/.test(url));

  return async () => {
    await networkReady;
    await waitFor(() => evaluate("Boolean(document.querySelector('canvas'))"), "game startup");
    const renderer = await evaluate(`(() => {
      const canvas = document.querySelector('canvas');
      return { fallback: canvas?.dataset.renderer === 'fallback', width: canvas?.width, height: canvas?.height,
        webgl: Boolean(canvas?.getContext('webgl2')) };
    })()`);
    assert.equal(renderer.fallback, false, "Game must not use the no-WebGL fallback");
    assert.equal(renderer.webgl, true, "WebGL renderer must be active");
    assert.ok(renderer.width > 0 && renderer.height > 0, "Canvas must have a drawable viewport");

    // Test mode intentionally skips character preload. Exercise normal startup
    // first: the animation request follows actual GLTF model decode/rig creation.
    await waitFor(async () => animations(await resources()).length > 0, "decoded model and downloaded animation");
    await pause(750);
    // Current GLBs are uncompressed. Exercise the bundled decoder in a real blob
    // worker as Three.js does, so future compressed assets remain offline-capable.
    await evaluate(`(async () => {
      const [wrapper, wasm] = await Promise.all([
        fetch('/draco/draco_wasm_wrapper.js'), fetch('/draco/draco_decoder.wasm'),
      ]);
      if (!wrapper.ok || !wasm.ok) throw new Error('Bundled Draco decoder is unavailable');
      const source = await wrapper.text();
      const binary = await wasm.arrayBuffer();
      const workerUrl = URL.createObjectURL(new Blob([source,
        ';onmessage = ({data}) => { DracoDecoderModule({ wasmBinary: data, onModuleLoaded(module) { const decoder = new module.Decoder(); module.destroy(decoder); postMessage("ready"); } }); };'
      ], { type: 'text/javascript' }));
      const worker = new Worker(workerUrl);
      try {
        await new Promise((resolve, reject) => {
          worker.onmessage = ({data}) => data === 'ready' ? resolve() : reject(new Error('Unexpected decoder response'));
          worker.onerror = (event) => reject(new Error(event.message));
          worker.postMessage(binary, [binary]);
        });
      } finally {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      }
    })()`);
    const urls = await resources();
    assert.ok(urls.every((url) => url.startsWith("stack://app/") || url.startsWith("blob:")), "Game assets must remain local");
    await win.loadURL("stack://app/index.html?test&seed=42");
    await waitFor(() => evaluate("Boolean(window.__towerStackerTestApi)"), "deterministic gameplay startup");
    assert.equal((await state()).gameState, "playing");

    const initial = await state();
    await evaluate("window.__towerStackerTestApi.stepSimulation(5)");
    const moved = await state();
    assert.notDeepEqual(moved.activePosition, initial.activePosition, "Simulation must move the slab");
    await evaluate("window.__towerStackerTestApi.setActiveOffset(0)");
    win.webContents.sendInputEvent({ type: "keyDown", keyCode: "SPACE" });
    win.webContents.sendInputEvent({ type: "keyUp", keyCode: "SPACE" });
    await waitFor(async () => (await state()).score > initial.score, "real keyboard placement");
    await waitFor(async () => (await state()).feedback.audioUnlocked, "gesture-unlocked audio");
    await evaluate("window.__towerStackerTestApi.placeAtOffset(0)");
    const placed = await state();
    assert.equal(placed.lastPlacementOutcome, "perfect");
    assert.ok(placed.feedback.audioEventsPlayed > 0, "Placement audio must be synthesized");
    await evaluate("window.__towerStackerTestApi.stepSimulation(90)");
    await pause(250);
    const screenshotPath = path.join(projectRoot, "dist_electron", "electron-smoke.png");
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await writeFile(screenshotPath, (await win.webContents.capturePage()).toPNG());
    // A portrait window (vertical cabinet monitor) widens the vertical FOV so the slab's travel stays in frame.
    win.setContentSize(405, 720);
    await waitFor(() => evaluate("window.innerHeight > window.innerWidth"), "tall window");
    await pause(250);
    const bounds = await evaluate(`(() => {
      const api = window.__towerStackerTestApi;
      api.setActiveOffset(4.5);
      api.stepSimulation(1);
      api.setActiveOffset(4.5);
      return api.getState().activeScreenBounds;
    })()`);
    assert.ok(bounds && bounds.minX >= -1 && bounds.maxX <= 1, `Portrait slab must stay in frame: ${JSON.stringify(bounds)}`);
    const portraitPath = path.join(projectRoot, "dist_electron", "electron-smoke-portrait.png");
    await writeFile(portraitPath, (await win.webContents.capturePage()).toPNG());
    assert.deepEqual(failures, [], "Renderer/resource failures");
    console.log(`[electron-smoke] passed: WebGL, offline cast/animation/Draco, keyboard placement, audio, portrait framing; screenshots=${screenshotPath}, ${portraitPath}`);
    app.quit();
  };
}
