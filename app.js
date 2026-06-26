// store.ts
import { createStore } from "https://esm.sh/zustand@5/vanilla";

// lib.ts
var CANVAS_DEFAULT_WIDTH = 800;
var CANVAS_DEFAULT_HEIGHT = 600;
var MAX_HISTORY = 50;

// store.ts
function createLayerCanvas(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  return c;
}
var layerCounter = 0;
function makeLayer(name, w, h) {
  return {
    id: `layer-${++layerCounter}`,
    name,
    visible: true,
    opacity: 1,
    canvas: createLayerCanvas(w, h)
  };
}
var store = createStore((set, get) => ({
  tool: "pen",
  color: "#7c5cfc",
  size: 4,
  opacity: 1,
  layers: [],
  activeLayerIndex: 0,
  history: [],
  historyIndex: -1,
  viewport: { x: 0, y: 0, zoom: 1 },
  isFullscreen: false,
  showGrid: false,
  isDrawing: false,
  canvasWidth: CANVAS_DEFAULT_WIDTH,
  canvasHeight: CANVAS_DEFAULT_HEIGHT,
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
  setOpacity: (opacity) => set({ opacity }),
  setActiveLayerIndex: (index) => set({ activeLayerIndex: index }),
  setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),
  setIsFullscreen: (v) => set({ isFullscreen: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  setIsDrawing: (v) => set({ isDrawing: v }),
  resetCanvas: (width, height) => {
    layerCounter = 0;
    const bg = makeLayer("Background", width, height);
    const l1 = makeLayer("Layer 1", width, height);
    set({
      canvasWidth: width,
      canvasHeight: height,
      layers: [bg, l1],
      activeLayerIndex: 1,
      history: [],
      historyIndex: -1,
      viewport: { x: 0, y: 0, zoom: 1 }
    });
  },
  addLayer: (layer) => set((s) => {
    if (s.layers.length >= 10)
      return s;
    const layers = [...s.layers, layer];
    return { layers, activeLayerIndex: layers.length - 1 };
  }),
  removeLayer: (id) => set((s) => {
    if (s.layers.length <= 2)
      return s;
    const idx = s.layers.findIndex((l) => l.id === id);
    if (idx < 0)
      return s;
    const layers = s.layers.filter((l) => l.id !== id);
    let activeLayerIndex = s.activeLayerIndex;
    if (activeLayerIndex >= layers.length)
      activeLayerIndex = layers.length - 1;
    if (idx < s.activeLayerIndex)
      activeLayerIndex--;
    return { layers, activeLayerIndex };
  }),
  reorderLayer: (from, to) => set((s) => {
    const layers = [...s.layers];
    const [moved] = layers.splice(from, 1);
    layers.splice(to, 0, moved);
    let activeLayerIndex = s.activeLayerIndex;
    if (from === s.activeLayerIndex) {
      activeLayerIndex = to;
    } else {
      if (from < s.activeLayerIndex && to >= s.activeLayerIndex)
        activeLayerIndex--;
      if (from > s.activeLayerIndex && to <= s.activeLayerIndex)
        activeLayerIndex++;
    }
    return { layers, activeLayerIndex };
  }),
  setLayerVisibility: (id, visible) => set((s) => ({
    layers: s.layers.map((l) => l.id === id ? { ...l, visible } : l)
  })),
  setLayerOpacity: (id, opacity) => set((s) => ({
    layers: s.layers.map((l) => l.id === id ? { ...l, opacity } : l)
  })),
  renameLayer: (id, name) => set((s) => ({
    layers: s.layers.map((l) => l.id === id ? { ...l, name } : l)
  })),
  pushHistory: (entry) => set((s) => {
    const history = s.history.slice(0, s.historyIndex + 1);
    history.push(entry);
    if (history.length > MAX_HISTORY)
      history.shift();
    return { history, historyIndex: history.length - 1 };
  }),
  undo: () => {
    const s = get();
    if (s.historyIndex <= 0)
      return null;
    const newIdx = s.historyIndex - 1;
    set({ historyIndex: newIdx });
    return s.history[newIdx];
  },
  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1)
      return null;
    const newIdx = s.historyIndex + 1;
    set({ historyIndex: newIdx });
    return s.history[newIdx];
  },
  clearHistory: () => set({ history: [], historyIndex: -1 })
}));
function subscribeSelector(selector, callback) {
  let prev = selector(store.getState());
  return store.subscribe(() => {
    const curr = selector(store.getState());
    if (curr !== prev) {
      prev = curr;
      callback(curr);
    }
  });
}

// brushes.ts
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function interpPoints(a, b) {
  const d = dist(a, b);
  const steps = Math.max(1, Math.ceil(d / 2));
  const pts = [];
  for (let i = 0;i <= steps; i++) {
    pts.push(lerp(a, b, i / steps));
  }
  return pts;
}
var pen = (ctx, from, to, color, size, opacity) => {
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
};
var marker = (ctx, from, to, color, size, opacity) => {
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity * 0.3;
  ctx.lineWidth = size * 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
};
var spray = (ctx, from, to, color, size, opacity) => {
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity * 0.4;
  const pts = interpPoints(from, to);
  const radius = size / 2;
  for (const p of pts) {
    const density = Math.round(radius * 0.8);
    for (let i = 0;i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const sx = p.x + Math.cos(angle) * r;
      const sy = p.y + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
var calligraphy = (ctx, from, to, color, size, opacity) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const len = dist(from, to);
  if (len < 0.5) {
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.ellipse(from.x, from.y, size * 0.3, size * 0.7, angle, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(from.x, from.y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  const w = size * 0.3;
  const h = size * 0.7;
  ctx.beginPath();
  ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(len, 0, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(0, -h, len, h * 2);
  ctx.fill();
  ctx.restore();
};
var airbrush = (ctx, from, to, color, size, opacity) => {
  const pts = interpPoints(from, to);
  const radius = size * 1.5;
  for (const p of pts) {
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    const c = hexToRgba(color, opacity * 0.3);
    grad.addColorStop(0, c);
    grad.addColorStop(0.3, c);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
};
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// tools.ts
var brushMap = {
  pen,
  marker,
  spray,
  calligraphy,
  airbrush
};
var prevPoint = null;
var isDrawing = false;
var activeLayer = null;
function getActiveLayerCanvas() {
  const s = store.getState();
  const layer = s.layers[s.activeLayerIndex];
  if (!layer)
    return null;
  activeLayer = layer;
  return layer.canvas;
}
function getCanvasPoint(clientX, clientY) {
  const container = document.getElementById("canvas-container");
  const rect = container.getBoundingClientRect();
  const s = store.getState();
  const vp = s.viewport;
  return {
    x: (clientX - rect.left - vp.x) / vp.zoom,
    y: (clientY - rect.top - vp.y) / vp.zoom
  };
}
function handlePointerDown(clientX, clientY) {
  const s = store.getState();
  if (s.tool === "pan")
    return;
  const canvas = getActiveLayerCanvas();
  if (!canvas)
    return;
  const ctx = canvas.getContext("2d");
  const pt = getCanvasPoint(clientX, clientY);
  if (s.tool === "fill") {
    floodFill(ctx, Math.round(pt.x), Math.round(pt.y), s.color);
    s.setIsDrawing(false);
    return;
  }
  if (s.tool === "rect" || s.tool === "circle") {
    isDrawing = true;
    prevPoint = pt;
    return;
  }
  isDrawing = true;
  prevPoint = pt;
  ctx.save();
  const brush = brushMap[s.tool];
  if (brush) {
    brush(ctx, pt, pt, s.color, s.size, s.opacity);
  }
}
function handlePointerMove(clientX, clientY) {
  if (!isDrawing || !prevPoint)
    return;
  const s = store.getState();
  const canvas = getActiveLayerCanvas();
  if (!canvas)
    return;
  const ctx = canvas.getContext("2d");
  const pt = getCanvasPoint(clientX, clientY);
  if (s.tool === "rect" || s.tool === "circle") {
    drawShapePreview(ctx, prevPoint, pt, s.tool, s.color, s.size);
    return;
  }
  const brush = brushMap[s.tool];
  if (brush) {
    brush(ctx, prevPoint, pt, s.color, s.size, s.opacity);
  }
  prevPoint = pt;
}
function handlePointerUp(clientX, clientY) {
  if (!isDrawing)
    return;
  isDrawing = false;
  const s = store.getState();
  if (s.tool === "rect" || s.tool === "circle") {
    const canvas = getActiveLayerCanvas();
    if (!canvas || !prevPoint)
      return;
    const ctx = canvas.getContext("2d");
    const pt = getCanvasPoint(clientX, clientY);
    drawShape(ctx, prevPoint, pt, s.tool, s.color, s.size);
  }
  prevPoint = null;
  store.getState().setIsDrawing(false);
}
function drawShapePreview(ctx, from, to, tool, color, size) {
  const preview = document.getElementById("preview-canvas");
  if (!preview)
    return;
  const s = store.getState();
  preview.width = s.canvasWidth;
  preview.height = s.canvasHeight;
  const pctx = preview.getContext("2d");
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.strokeStyle = color;
  pctx.lineWidth = size;
  if (tool === "rect") {
    pctx.strokeRect(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  } else {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const rx = Math.abs(to.x - from.x) / 2;
    const ry = Math.abs(to.y - from.y) / 2;
    pctx.beginPath();
    pctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    pctx.stroke();
  }
}
function drawShape(ctx, from, to, tool, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  if (tool === "rect") {
    ctx.strokeRect(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.abs(to.x - from.x), Math.abs(to.y - to.y));
  } else {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const rx = Math.abs(to.x - from.x) / 2;
    const ry = Math.abs(to.y - from.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const preview = document.getElementById("preview-canvas");
  if (preview) {
    const pctx = preview.getContext("2d");
    pctx.clearRect(0, 0, preview.width, preview.height);
  }
}
function floodFill(ctx, startX, startY, fillColor) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const idx = (startY * w + startX) * 4;
  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];
  const targetA = data[idx + 3];
  const fill = hexToRgba2(fillColor, 1);
  const fillR = fill[0];
  const fillG = fill[1];
  const fillB = fill[2];
  const fillA = 255;
  if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA)
    return;
  const visited = new Uint8Array(w * h);
  const stack = [startX, startY];
  const matchColor = (i) => data[i] === targetR && data[i + 1] === targetG && data[i + 2] === targetB && data[i + 3] === targetA;
  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    const i = y * w + x;
    if (x < 0 || x >= w || y < 0 || y >= h)
      continue;
    if (visited[i])
      continue;
    visited[i] = 1;
    const pi = i * 4;
    if (!matchColor(pi))
      continue;
    data[pi] = fillR;
    data[pi + 1] = fillG;
    data[pi + 2] = fillB;
    data[pi + 3] = fillA;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  ctx.putImageData(imageData, 0, 0);
}
function hexToRgba2(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, Math.round(alpha * 255)];
}

// layers.ts
var layerCounter2 = 0;
function createLayerCanvas2(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  return c;
}
function makeLayer2(name, w, h) {
  return {
    id: `layer-${++layerCounter2}`,
    name,
    visible: true,
    opacity: 1,
    canvas: createLayerCanvas2(w, h)
  };
}
function compositeLayers(ctx) {
  const s = store.getState();
  for (const layer of s.layers) {
    if (!layer.visible)
      continue;
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(layer.canvas, 0, 0);
  }
  ctx.globalAlpha = 1;
}

// canvas.ts
var displayCanvas;
var displayCtx;
var previewCanvas;
var previewCtx;
var container;
var rafId;
function initCanvas() {
  container = document.getElementById("canvas-container");
  displayCanvas = document.getElementById("display-canvas");
  displayCtx = displayCanvas.getContext("2d");
  previewCanvas = document.getElementById("preview-canvas");
  previewCtx = previewCanvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  subscribeSelector((s) => [s.canvasWidth, s.canvasHeight], onSizeChange);
  subscribeSelector((s) => [s.layers, s.activeLayerIndex], scheduleRender);
  subscribeSelector((s) => s.viewport, scheduleRender);
  subscribeSelector((s) => s.showGrid, scheduleRender);
  setupPointerEvents();
  startRenderLoop();
}
function resize() {
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  displayCanvas.width = rect.width * dpr;
  displayCanvas.height = rect.height * dpr;
  displayCanvas.style.width = rect.width + "px";
  displayCanvas.style.height = rect.height + "px";
  const s = store.getState();
  if (s.canvasWidth === 800 && s.canvasHeight === 600) {
    store.getState().resetCanvas(rect.width, rect.height);
  }
  scheduleRender();
}
function onSizeChange() {
  const s = store.getState();
  previewCanvas.width = s.canvasWidth;
  previewCanvas.height = s.canvasHeight;
  scheduleRender();
}
var renderScheduled = false;
function scheduleRender() {
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(render);
  }
}
function render() {
  renderScheduled = false;
  const s = store.getState();
  const containerRect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(containerRect.width * dpr);
  const h = Math.round(containerRect.height * dpr);
  if (displayCanvas.width !== w || displayCanvas.height !== h) {
    displayCanvas.width = w;
    displayCanvas.height = h;
    displayCanvas.style.width = containerRect.width + "px";
    displayCanvas.style.height = containerRect.height + "px";
  }
  displayCtx.save();
  displayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  displayCtx.fillStyle = "#0a0a14";
  displayCtx.fillRect(0, 0, containerRect.width, containerRect.height);
  const vp = s.viewport;
  displayCtx.translate(vp.x, vp.y);
  displayCtx.scale(vp.zoom, vp.zoom);
  displayCtx.fillStyle = "white";
  displayCtx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);
  compositeLayers(displayCtx);
  if (s.showGrid) {
    drawGrid(displayCtx, s.canvasWidth, s.canvasHeight, vp.zoom);
  }
  displayCtx.restore();
}
function drawGrid(ctx, w, h, zoom) {
  const gridSize = 20;
  ctx.strokeStyle = "rgba(0,0,255,0.08)";
  ctx.lineWidth = 1 / zoom;
  for (let x = 0;x <= w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0;y <= h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}
function startRenderLoop() {
  function loop() {
    render();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}
function setupPointerEvents() {
  const events = ["pointerdown", "pointermove", "pointerup", "pointerleave"];
  for (const evt of events) {
    container.addEventListener(evt, (e) => {
      const s = store.getState();
      if (s.tool === "pan") {
        handlePan(e);
        return;
      }
      if (e.pointerType === "touch" && s.tool !== "pan") {}
      switch (evt) {
        case "pointerdown":
          s.setIsDrawing(true);
          handlePointerDown(e.clientX, e.clientY);
          break;
        case "pointermove":
          handlePointerMove(e.clientX, e.clientY);
          break;
        case "pointerup":
        case "pointerleave":
          if (s.isDrawing) {
            s.setIsDrawing(false);
            handlePointerUp(e.clientX, e.clientY);
            captureHistorySnapshot();
          }
          break;
      }
    });
  }
  let lastPinchDist = 0;
  container.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  });
  container.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist2 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastPinchDist > 0) {
        const scale = dist2 / lastPinchDist;
        const rect = container.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const s = store.getState();
        const newZoom = Math.min(10, Math.max(0.1, s.viewport.zoom * scale));
        store.getState().setViewport({
          zoom: newZoom,
          x: cx - (cx - s.viewport.x) * (newZoom / s.viewport.zoom),
          y: cy - (cy - s.viewport.y) * (newZoom / s.viewport.zoom)
        });
      }
      lastPinchDist = dist2;
    }
  });
  container.addEventListener("touchend", () => {
    lastPinchDist = 0;
  });
  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    const s = store.getState();
    const newZoom = Math.min(10, Math.max(0.1, s.viewport.zoom * (1 + delta)));
    store.getState().setViewport({
      zoom: newZoom,
      x: cx - (cx - s.viewport.x) * (newZoom / s.viewport.zoom),
      y: cy - (cy - s.viewport.y) * (newZoom / s.viewport.zoom)
    });
  });
}
var panStart = null;
var panViewport = null;
function handlePan(e) {
  switch (e.type) {
    case "pointerdown":
      panStart = { x: e.clientX, y: e.clientY };
      panViewport = { ...store.getState().viewport };
      break;
    case "pointermove":
      if (panStart && panViewport) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        store.getState().setViewport({
          x: panViewport.x + dx,
          y: panViewport.y + dy
        });
      }
      break;
    case "pointerup":
    case "pointerleave":
      panStart = null;
      panViewport = null;
      break;
  }
}
function captureHistorySnapshot() {
  const s = store.getState();
  const layers = s.layers;
  const entry = {
    layers: layers.map((l) => {
      const ctx = l.canvas.getContext("2d");
      return ctx.getImageData(0, 0, l.canvas.width, l.canvas.height);
    }),
    width: s.canvasWidth,
    height: s.canvasHeight
  };
  store.getState().pushHistory(entry);
}

// history.ts
function captureSnapshot() {
  const s = store.getState();
  return {
    layers: s.layers.map((l) => {
      const ctx = l.canvas.getContext("2d");
      return ctx.getImageData(0, 0, l.canvas.width, l.canvas.height);
    }),
    width: s.canvasWidth,
    height: s.canvasHeight
  };
}
function applySnapshot(entry) {
  const s = store.getState();
  for (let i = 0;i < entry.layers.length && i < s.layers.length; i++) {
    const ctx = s.layers[i].canvas.getContext("2d");
    ctx.putImageData(entry.layers[i], 0, 0);
  }
}
function pushSnapshot() {
  store.getState().pushHistory(captureSnapshot());
}
function undo() {
  const entry = store.getState().undo();
  if (entry)
    applySnapshot(entry);
}
function redo() {
  const entry = store.getState().redo();
  if (entry)
    applySnapshot(entry);
}

// storage.ts
import { get, set, del } from "https://esm.sh/idb-keyval@6";
var GALLERY_KEY = "drawing-gallery";
async function saveCurrentDrawing(name) {
  const s = store.getState();
  const id = `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const layerBlobs = await Promise.all(s.layers.map(async (l) => {
    const blob = await new Promise((resolve) => l.canvas.toBlob((b) => resolve(b), "image/png"));
    return { name: l.name, data: blob };
  }));
  const canvas = document.createElement("canvas");
  canvas.width = s.canvasWidth;
  canvas.height = s.canvasHeight;
  const ctx = canvas.getContext("2d");
  const compositeCtx = canvas.getContext("2d");
  for (const layer of s.layers) {
    if (layer.visible) {
      compositeCtx.globalAlpha = layer.opacity;
      compositeCtx.drawImage(layer.canvas, 0, 0);
    }
  }
  const thumbnail = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.6));
  const drawing = {
    id,
    name,
    thumbnail,
    layers: layerBlobs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await set(id, drawing);
  const gallery = await get(GALLERY_KEY) ?? [];
  gallery.push(drawing);
  await set(GALLERY_KEY, gallery);
  return id;
}

// ui.ts
function initUI() {
  setupTools();
  setupColor();
  setupSize();
  setupOpacity();
  setupUndoRedo();
  setupClear();
  setupSave();
  setupFullscreen();
  setupGrid();
  setupLayers();
  setupLayerSheet();
  subscribeSelector((s) => s.layers, renderLayers);
  subscribeSelector((s) => s.activeLayerIndex, renderLayers);
  subscribeSelector((s) => s.tool, highlightTool);
}
function setupTools() {
  document.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      store.getState().setTool(tool);
      const container2 = document.getElementById("canvas-container");
      container2.classList.toggle("pan-mode", tool === "pan");
    });
  });
}
function highlightTool(tool) {
  document.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });
}
function setupColor() {
  const picker = document.getElementById("color-picker");
  picker.addEventListener("input", () => store.getState().setColor(picker.value));
}
function setupSize() {
  const slider = document.getElementById("size-slider");
  const display = document.getElementById("size-display");
  slider.addEventListener("input", () => {
    const v = parseInt(slider.value);
    store.getState().setSize(v);
    display.style.width = display.style.height = Math.max(4, v * 0.6) + "px";
  });
}
function setupOpacity() {
  const slider = document.getElementById("opacity-slider");
  slider.addEventListener("input", () => {
    store.getState().setOpacity(parseInt(slider.value) / 100);
  });
}
function setupUndoRedo() {
  document.getElementById("undo-btn").addEventListener("click", undo);
  document.getElementById("redo-btn").addEventListener("click", redo);
}
function setupClear() {
  document.getElementById("clear-btn").addEventListener("click", () => {
    if (!confirm("Clear all layers?"))
      return;
    const s = store.getState();
    for (const layer of s.layers) {
      const ctx = layer.canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    pushSnapshot();
  });
}
async function setupSave() {
  document.getElementById("save-btn").addEventListener("click", async () => {
    const name = prompt("Drawing name:", `Drawing ${new Date().toLocaleDateString()}`);
    if (!name)
      return;
    const id = await saveCurrentDrawing(name);
    showToast(`Saved "${name}"`);
  });
}
function setupFullscreen() {
  document.getElementById("fullscreen-btn").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      store.getState().setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      store.getState().setIsFullscreen(false);
    }
  });
}
function setupGrid() {
  document.getElementById("grid-btn").addEventListener("click", () => {
    const s = store.getState();
    store.getState().setShowGrid(!s.showGrid);
  });
}
function setupLayers() {
  const addBtn = document.getElementById("add-layer-btn");
  addBtn.addEventListener("click", () => {
    const s = store.getState();
    const layer = makeLayer2(`Layer ${s.layers.length}`, s.canvasWidth, s.canvasHeight);
    store.getState().addLayer(layer);
  });
}
function renderLayers() {
  const s = store.getState();
  const renderTo = (containerId) => {
    const container2 = document.getElementById(containerId);
    if (!container2)
      return;
    container2.innerHTML = s.layers.map((l, i) => `
      <div class="flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${i === s.activeLayerIndex ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-surface-2"}" data-layer-id="${l.id}">
        <button class="text-xs w-4 text-center ${l.visible ? "text-white" : "text-text-dim"}" data-toggle-vis>${l.visible ? "\uD83D\uDC41" : "—"}</button>
        <span class="text-xs truncate flex-1">${l.name}</span>
        <input type="range" min="0" max="100" value="${Math.round(l.opacity * 100)}" class="w-12 accent-primary" data-opacity />
      </div>
    `).join("");
    container2.querySelectorAll("[data-layer-id]").forEach((el) => {
      const id = el.dataset.layerId;
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-opacity]"))
          return;
        if (e.target.closest("[data-toggle-vis]"))
          return;
        const idx = s.layers.findIndex((l) => l.id === id);
        if (idx >= 0)
          store.getState().setActiveLayerIndex(idx);
      });
      el.querySelector("[data-toggle-vis]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const layer = s.layers.find((l) => l.id === id);
        if (layer)
          store.getState().setLayerVisibility(id, !layer.visible);
      });
      el.querySelector("[data-opacity]")?.addEventListener("input", (e) => {
        e.stopPropagation();
        const val = parseInt(e.target.value) / 100;
        store.getState().setLayerOpacity(id, val);
      });
    });
  };
  renderTo("layer-list");
  renderTo("layer-list-mobile");
}
function setupLayerSheet() {
  const layersBtn = document.getElementById("layers-toggle-btn");
  const sheet = document.getElementById("layer-sheet");
  const closeBtn = document.getElementById("close-layer-sheet");
  const addBtn = document.getElementById("add-layer-btn-mobile");
  layersBtn.addEventListener("click", () => {
    sheet.classList.toggle("hidden");
    sheet.classList.toggle("translate-y-full");
  });
  closeBtn.addEventListener("click", () => {
    sheet.classList.add("hidden");
    sheet.classList.remove("translate-y-full");
  });
  addBtn.addEventListener("click", () => {
    const s = store.getState();
    const layer = makeLayer2(`Layer ${s.layers.length}`, s.canvasWidth, s.canvasHeight);
    store.getState().addLayer(layer);
  });
}
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("opacity-0");
  el.classList.add("opacity-100");
  setTimeout(() => {
    el.classList.remove("opacity-100");
    el.classList.add("opacity-0");
  }, 2500);
}
window.__showToast = showToast;

// app.ts
async function main() {
  const container2 = document.getElementById("canvas-container");
  const rect = container2.getBoundingClientRect();
  store.getState().resetCanvas(Math.max(400, Math.round(rect.width)), Math.max(300, Math.round(rect.height)));
  initCanvas();
  initUI();
  pushSnapshot();
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch {}
  }
}
main();
