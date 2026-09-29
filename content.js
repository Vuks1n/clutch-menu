const DEFAULTS = {
  silentAim: false, wallbang: false, rageFov: 60,
  aimbot: false, aimFov: 30, smooth: 3, visCheck: true,
  esp: true, espName: true, espHealth: true, espSnap: false, espHead: false, espDist: false,
  espColor: "#ff3b3b",
  radar: false, radarSize: 140, radarRange: 60,
  fovChanger: false, fovValue: 110, showFov: true,
  watermark: true,
  antiRecoil: false, bhop: false,
  menuKey: "Insert", panicKey: "Delete", accent: "#5b8cff"
};

window.__clutchMenuConfig = window.__clutchMenuConfig || { ...DEFAULTS };
const config = window.__clutchMenuConfig;
try { Object.assign(config, JSON.parse(localStorage.getItem('clutchmenu_cfg') || '{}')); } catch {}
function saveCfg() { try { localStorage.setItem('clutchmenu_cfg', JSON.stringify(config)); } catch {} }

const norm = k => (k && k.length === 1 ? k.toLowerCase() : k);
let toastEl = null, toastTimer = null;
function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'cheat-toast'; document.body.appendChild(toastEl); }
  toastEl.style.setProperty('--ac', config.accent);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function worldToScreen(x, y, z) {
  const cam = window.game?.camera;
  if (!cam) return { x: 0, y: 0, visible: false };
  let V3 = window.THREE ? window.THREE.Vector3 : cam.position.constructor;
  let vec = new V3(x, y, z);
  vec.project(cam);
  return {
    x: (vec.x * 0.5 + 0.5) * canvas.width,
    y: (-vec.y * 0.5 + 0.5) * canvas.height,
    visible: vec.z < 1
  };
}

function pickTarget(p, ents, requireOnScreen, maxAngleDeg = 180) {
  let best = null, bestDist = Infinity;
  const maxRad = maxAngleDeg * Math.PI / 180;
  const cosLimit = Math.cos(maxRad);
  for (let ent of ents) {
    if (!ent || ent === p || !ent.alive || ent.health <= 0 || ent.team === p.team) continue;
    if (requireOnScreen) {
      const head = worldToScreen(ent.x, ent.y + ent.eyeH, ent.z);
      const feet = worldToScreen(ent.x, ent.y, ent.z);
      if (!head.visible || !feet.visible) continue;
    }
    const dx = ent.x - p.x, dy = (ent.y + ent.eyeH) - (p.y + p.eyeH), dz = ent.z - p.z;
    if (maxAngleDeg < 180) {
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const cp = Math.cos(p.pitch);
      const fx = -Math.sin(p.yaw) * cp, fy = Math.sin(p.pitch), fz = -Math.cos(p.yaw) * cp;
      if ((dx * fx + dy * fy + dz * fz) / len < cosLimit) continue;
    }
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestDist) { bestDist = d; best = ent; }
  }
  return best;
}

function aimAngles(p, ent) {
  const dx = ent.x - p.x, dy = (ent.y + ent.eyeH) - (p.y + p.eyeH), dz = ent.z - p.z;
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.sqrt(dx * dx + dz * dz))
  };
}
function aimAt(p, ent) {
  const a = aimAngles(p, ent);
  p.yaw = a.yaw; p.pitch = a.pitch;
}
function aimAtSmooth(p, ent, smooth) {
  const a = aimAngles(p, ent);
  if (!smooth || smooth <= 1) { p.yaw = a.yaw; p.pitch = a.pitch; return; }
  const wrap = d => ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  p.yaw += wrap(a.yaw - p.yaw) / smooth;
  p.pitch += (a.pitch - p.pitch) / smooth;
}

function withNoGrid(fn) {
  const grid = window.game?.physics?.grid;
  if (!config.wallbang || !grid || typeof grid.get !== 'function') return fn();
  const origGet = grid.get;
  grid.get = function () { return []; };
  try { return fn(); } finally { grid.get = origGet; }
}

let gui = null, activeTab = 'rage';
let mkBtn = null, pkBtn = null, capturing = null;

function buildGui() {
  const prev = document.getElementById('cheat-gui');
  let pos = null;
  if (prev) { const r = prev.getBoundingClientRect(); pos = { l: r.left, t: r.top }; prev.remove(); }

  gui = document.createElement('div');
  gui.id = 'cheat-gui';
  gui.style.setProperty('--ac', config.accent);
  gui.innerHTML = `
    <div class="hdr" id="wc-hdr">
      <div class="logo"></div><b>Clutch Menu</b><span class="ver">v1.0</span>
      <span class="sp"></span><button class="xbtn" id="wc-close">✕</button>
    </div>
    <div class="body">
      <div class="side" id="wc-side"></div>
      <div id="wc-pages" style="flex:1;display:flex;flex-direction:column;"></div>
    </div>`;
  document.body.appendChild(gui);
  if (pos) { gui.style.left = pos.l + 'px'; gui.style.top = pos.t + 'px'; gui.style.right = 'auto'; }

  gui.addEventListener('mousedown', e => e.stopPropagation());
  gui.querySelector('#wc-close').onclick = () => gui.style.display = 'none';

  const hdr = gui.querySelector('#wc-hdr');
  let dragging = false, ox = 0, oy = 0;
  hdr.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    const r = gui.getBoundingClientRect();
    ox = e.clientX - r.left; oy = e.clientY - r.top;
    gui.style.left = r.left + 'px'; gui.style.top = r.top + 'px'; gui.style.right = 'auto';
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    gui.style.left = (e.clientX - ox) + 'px';
    gui.style.top = (e.clientY - oy) + 'px';
  });
  window.addEventListener('mouseup', () => dragging = false);

  const side = gui.querySelector('#wc-side');
  const pages = gui.querySelector('#wc-pages');
  const tabEls = {};
  function addTab(name) {
    const t = document.createElement('div');
    t.className = 'tab'; t.textContent = name;
    t.onclick = () => switchTab(name);
    side.appendChild(t);
    const pg = document.createElement('div');
    pg.className = 'page'; pages.appendChild(pg);
    tabEls[name] = { tab: t, page: pg };
    return pg;
  }
  function switchTab(name) {
    activeTab = name;
    for (const k in tabEls) {
      tabEls[k].tab.classList.toggle('on', k === name);
      tabEls[k].page.classList.toggle('on', k === name);
    }
  }

  function sec(pg, title) {
    const s = document.createElement('div');
    s.className = 'sec'; s.innerHTML = `<h3>${title}</h3>`;
    pg.appendChild(s); return s;
  }
  function addToggle(s, label, key, after) {
    const r = document.createElement('div'); r.className = 'row';
    r.innerHTML = `<span class="lbl">${label}</span><label class="ck"><input type="checkbox" ${config[key] ? 'checked' : ''}><span class="bx"></span></label>`;
    const inp = r.querySelector('input');
    inp.onchange = () => { config[key] = inp.checked; saveCfg(); if (after) after(); };
    s.appendChild(r); return inp;
  }
  function addSlider(s, label, key, min, max, step, suffix = '') {
    const d = document.createElement('div'); d.className = 'sld';
    d.innerHTML = `<div class="top"><span class="lbl">${label}</span><span class="val">${config[key]}${suffix}</span></div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${config[key]}">`;
    const inp = d.querySelector('input'), val = d.querySelector('.val');
    inp.oninput = () => { config[key] = +inp.value; val.textContent = inp.value + suffix; saveCfg(); };
    s.appendChild(d);
  }
  function addColor(s, label, key) {
    const r = document.createElement('div'); r.className = 'row';
    r.innerHTML = `<span class="lbl">${label}</span><input type="color" value="${config[key]}" style="width:34px;height:20px;border:none;background:none;cursor:pointer;padding:0">`;
    r.querySelector('input').oninput = e => { config[key] = e.target.value; saveCfg(); };
    s.appendChild(r);
  }
  function addButton(s, label, fn, cls = '') {
    const b = document.createElement('button');
    b.className = 'btn ' + cls; b.textContent = label; b.onclick = fn;
    s.appendChild(b); return b;
  }
  function addKeybind(s, label, cfgKey) {
    const r = document.createElement('div'); r.className = 'row';
    const b = document.createElement('button');
    b.className = 'btn ghost'; b.style.cssText = 'width:90px;margin:2px 0';
    b.textContent = config[cfgKey];
    b.onclick = () => { capturing = cfgKey; b.textContent = 'press...'; toast('press any key'); };
    if (cfgKey === 'menuKey') mkBtn = b; else pkBtn = b;
    r.innerHTML = `<span class="lbl">${label}</span>`;
    r.appendChild(b);
    s.appendChild(r);
  }

  const pgRage = addTab('RAGE');
  {
    const s1 = sec(pgRage, 'aim');
    addToggle(s1, 'Silent Aim', 'silentAim');
    addToggle(s1, 'Wallbang', 'wallbang');
    addSlider(s1, 'FOV', 'rageFov', 5, 180, 5, '°');
    const s2 = sec(pgRage, 'preset');
    addButton(s2, 'ENABLE EVERYTHING', () => {
      Object.assign(config, { silentAim: true, wallbang: true, antiRecoil: true, bhop: true });
      saveCfg(); buildGui(); toast('rage preset on');
    }, 'danger');
  }

  const pgLegit = addTab('LEGIT');
  {
    const s1 = sec(pgLegit, 'aimbot');
    s1.appendChild((() => { const r = document.createElement('div'); r.className = 'row';
      r.innerHTML = `<span class="lbl">Enabled</span><label class="ck"><input type="checkbox" id="wc-aim-en" ${config.aimbot ? 'checked' : ''}><span class="bx"></span></label>`;
      r.querySelector('input').onchange = e => { config.aimbot = e.target.checked; saveCfg(); }; return r; })());
    addSlider(s1, 'FOV', 'aimFov', 1, 180, 1, '°');
    addSlider(s1, 'Smoothness', 'smooth', 1, 20, 1);
    addToggle(s1, 'Visibility Check', 'visCheck');
  }

  const pgVis = addTab('VISUALS');
  {
    const s1 = sec(pgVis, 'esp');
    addToggle(s1, 'Enabled', 'esp');
    addToggle(s1, 'Name', 'espName');
    addToggle(s1, 'Health Bar', 'espHealth');
    addToggle(s1, 'Snaplines', 'espSnap');
    addToggle(s1, 'Head Dot', 'espHead');
    addToggle(s1, 'Distance', 'espDist');
    addColor(s1, 'Color', 'espColor');
    const s2 = sec(pgVis, 'radar');
    addToggle(s2, 'Enabled', 'radar', updRadarVis);
    addSlider(s2, 'Size', 'radarSize', 100, 260, 10, 'px');
    addSlider(s2, 'Range', 'radarRange', 20, 200, 10, 'm');
    const s3 = sec(pgVis, 'world');
    addToggle(s3, 'FOV Changer', 'fovChanger');
    addSlider(s3, 'FOV Value', 'fovValue', 60, 140, 1, '°');
    addToggle(s3, 'Show FOV Circle', 'showFov');
    const s4 = sec(pgVis, 'overlay');
    addToggle(s4, 'Watermark', 'watermark', updWatermark);
  }

  const pgMisc = addTab('MISC');
  {
    const s1 = sec(pgMisc, 'movement');
    addToggle(s1, 'Bunny Hop', 'bhop');
    const s2 = sec(pgMisc, 'weapon');
    addToggle(s2, 'Anti-Recoil', 'antiRecoil');
  }

  const pgSet = addTab('SETTINGS');
  {
    const s1 = sec(pgSet, 'keybinds');
    addKeybind(s1, 'Menu', 'menuKey');
    addKeybind(s1, 'Panic', 'panicKey');
    const s2 = sec(pgSet, 'accent');
    const dots = document.createElement('div'); dots.className = 'dots';
    ['#5b8cff', '#ff69b4', '#9d5bff', '#00d4a2', '#ff9f2e'].forEach(c => {
      const d = document.createElement('div');
      d.className = 'dot' + (config.accent === c ? ' on' : '');
      d.style.background = c;
      d.onclick = () => {
        config.accent = c; saveCfg();
        gui.style.setProperty('--ac', c);
        dots.querySelectorAll('.dot').forEach(x => x.classList.toggle('on', x === d));
        if (toastEl) toastEl.style.setProperty('--ac', c);
      };
      dots.appendChild(d);
    });
    s2.appendChild(dots);
    const s3 = sec(pgSet, 'config');
    addButton(s3, 'COPY CONFIG', async () => {
      try { await navigator.clipboard.writeText(JSON.stringify(config)); toast('config copied'); }
      catch { toast('clipboard blocked'); }
    }, 'ghost');
    addButton(s3, 'PASTE CONFIG', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const imported = JSON.parse(text);
        if (imported === null || typeof imported !== 'object' || Array.isArray(imported)) throw new Error('bad cfg');
        for (const k of Object.keys(DEFAULTS)) {
          if (k in imported && typeof imported[k] === typeof DEFAULTS[k]) config[k] = imported[k];
        }
        saveCfg(); buildGui(); updWatermark(); updRadarVis(); toast('config imported');
      } catch { toast('invalid config in clipboard'); }
    }, 'ghost');
    addButton(s3, 'RESET CONFIG', () => {
      try { localStorage.removeItem('clutchmenu_cfg'); } catch {}
      Object.assign(config, DEFAULTS);
      buildGui(); updWatermark(); updRadarVis(); toast('config reset');
    }, 'danger');
  }

  const pgCredits = addTab('CREDITS');
  {
    const s1 = sec(pgCredits, 'author');
    const made = document.createElement('div'); made.className = 'credit';
    made.innerHTML = `<b>made by Vuks1n</b>`;
    s1.appendChild(made);
    const s2 = sec(pgCredits, 'contact');
    const contact = document.createElement('div'); contact.className = 'credit';
    contact.innerHTML = `<span class="clabel">discord</span><button class="btn ghost" id="wc-dc">sanity.kys</button>`;
    s2.appendChild(contact);
    contact.querySelector('#wc-dc').onclick = async () => {
      try { await navigator.clipboard.writeText('sanity.kys'); toast('discord copied'); }
      catch { toast('clipboard blocked'); }
    };
    const s3 = sec(pgCredits, 'about');
    const about = document.createElement('div'); about.className = 'credit small';
    about.textContent = 'research / educational overlay. for study of browser game internals only. not affiliated with clutcher.io.';
    s3.appendChild(about);
  }

  switchTab(activeTab);
}

document.getElementById('wc-esp-canvas')?.remove();
const canvas = document.createElement('canvas');
canvas.id = 'wc-esp-canvas';
canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:99999;';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
});

document.getElementById('wc-radar')?.remove();
const radar = document.createElement('canvas');
radar.id = 'wc-radar';
document.body.appendChild(radar);
const rctx = radar.getContext('2d');
function updRadarVis() { radar.style.display = config.radar ? 'block' : 'none'; }

let wmEl = null, frames = 0, fps = 0, fpsAt = performance.now();
function updWatermark() {
  if (config.watermark && !wmEl) {
    wmEl = document.createElement('div');
    wmEl.id = 'wc-wm';
    document.body.appendChild(wmEl);
  }
  if (wmEl) wmEl.style.display = config.watermark ? 'block' : 'none';
}

function drawRadar(p, ents) {
  const size = config.radarSize;
  if (radar.width !== size) { radar.width = size; radar.height = size; }
  rctx.clearRect(0, 0, size, size);
  if (!p || !ents) return;
  const cx = size / 2, cy = size / 2, k = (size / 2 - 6) / config.radarRange;
  const s = Math.sin(p.yaw), c = Math.cos(p.yaw);
  rctx.strokeStyle = 'rgba(255,255,255,0.15)';
  rctx.beginPath(); rctx.moveTo(cx, 0); rctx.lineTo(cx, size); rctx.moveTo(0, cy); rctx.lineTo(size, cy); rctx.stroke();
  for (let ent of ents) {
    if (!ent || ent === p || !ent.alive || ent.health <= 0 || ent.team === p.team) continue;
    const dx = ent.x - p.x, dz = ent.z - p.z;
    let px = (dx * c - dz * s) * k;
    let py = (dx * s + dz * c) * k;
    const m = Math.max(Math.abs(px), Math.abs(py));
    if (m > size / 2 - 6) { px *= (size / 2 - 6) / m; py *= (size / 2 - 6) / m; }
    rctx.fillStyle = config.espColor;
    rctx.beginPath(); rctx.arc(cx + px, cy + py, 3, 0, Math.PI * 2); rctx.fill();
  }
  rctx.fillStyle = '#fff';
  rctx.beginPath(); rctx.arc(cx, cy, 2.5, 0, Math.PI * 2); rctx.fill();
}

function drawFovCircle(fovDeg) {
  const camFov = window.game?.camera?.fov || 90;
  const r = Math.tan(fovDeg * Math.PI / 360) / Math.tan(camFov * Math.PI / 360) * (canvas.height / 2);
  if (!isFinite(r) || r <= 0 || r > canvas.height) return;
  ctx.strokeStyle = config.accent;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawESP() {
  requestAnimationFrame(drawESP);
  try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    frames++;
    const now = performance.now();
    if (now - fpsAt >= 500) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; }
    if (wmEl && config.watermark) {
      wmEl.textContent = `Clutch Menu v1.0  |  ${fps} fps`;
      wmEl.style.borderColor = config.accent;
    }

    if (config.showFov && (config.aimbot || config.silentAim)) {
      drawFovCircle(config.aimbot ? config.aimFov : config.rageFov);
    }

    const p = window.game?.player;
    const ents = window.game?._ents;
    if (config.esp && p && ents) {
      for (let ent of ents) {
        if (!ent || ent === p || !ent.alive || ent.health <= 0 || ent.team === p.team) continue;
        const head = worldToScreen(ent.x, ent.y + ent.eyeH, ent.z);
        const feet = worldToScreen(ent.x, ent.y, ent.z);
        if (!head.visible || !feet.visible) continue;
        const h = feet.y - head.y, w = h / 2, bx = head.x - w / 2;
        const dist = Math.sqrt((ent.x - p.x) ** 2 + (ent.y - p.y) ** 2 + (ent.z - p.z) ** 2);

        ctx.strokeStyle = config.espColor; ctx.lineWidth = 2;
        ctx.strokeRect(bx, head.y, w, h);

        if (config.espHealth) {
          const frac = Math.max(0, Math.min(1, (ent.health || 0) / 100));
          ctx.fillStyle = `hsl(${frac * 120}, 80%, 50%)`;
          ctx.fillRect(bx - 6, head.y + h * (1 - frac), 3, h * frac);
        }

        if (config.espHead) {
          ctx.fillStyle = config.espColor;
          ctx.beginPath(); ctx.arc(head.x, head.y, 3, 0, Math.PI * 2); ctx.fill();
        }

        if (config.espSnap) {
          ctx.strokeStyle = config.espColor; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(canvas.width / 2, canvas.height); ctx.lineTo(feet.x, feet.y); ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.font = '12px Arial'; ctx.textAlign = 'center';
        if (config.espName) {
          ctx.fillStyle = config.espColor;
          ctx.fillText(ent.name || 'enemy', head.x, head.y - 6);
        }
        if (config.espDist) {
          ctx.fillStyle = '#fff';
          ctx.fillText(`${Math.round(dist)}m`, head.x, feet.y + 14);
        }
        ctx.textAlign = 'start';
      }
    }

    if (config.radar) drawRadar(p, ents);
  } catch (err) {}
}

let aimKey = false;
window.addEventListener('keydown', e => {
  if (e.target?.closest?.('#cheat-gui')) return;
  if (norm(e.key) === 'e') aimKey = true;
});
window.addEventListener('keyup', e => {
  if (norm(e.key) === 'e') aimKey = false;
});

function aimLoop() {
  requestAnimationFrame(aimLoop);
  try {
    const p = window.game?.player;
    const ents = window.game?._ents;
    if (config.aimbot && aimKey && p && ents) {
      const best = pickTarget(p, ents, config.visCheck, config.aimFov);
      if (best) aimAtSmooth(p, best, config.smooth);
    }
  } catch (err) {}
}

let spaceHeld = false;
window.addEventListener('keydown', e => { if (e.code === 'Space') spaceHeld = true; });
window.addEventListener('keyup', e => { if (e.code === 'Space') spaceHeld = false; });
setInterval(() => {
  if (!config.bhop || !spaceHeld) return;
  try {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
  } catch {}
}, 45);

setInterval(() => {
  if (!config.fovChanger) return;
  const cam = window.game?.camera;
  if (!cam) return;
  try {
    if ('fov' in cam && cam.fov !== config.fovValue) {
      cam.fov = config.fovValue;
      cam.updateProjectionMatrix?.();
    }
  } catch {}
}, 250);

function installHooks() {
  const game = window.game;
  if (!game || !game.weapons || typeof game.weapons.fire !== 'function') return;

  const weapons = game.weapons;
  if (!weapons.__wcPatched) {
    weapons.__wcPatched = true;
    const originalFire = weapons.fire;
    let firing = false;
    weapons.fire = function (...args) {
      if (firing || !config.silentAim) return originalFire.apply(this, args);
      firing = true;
      try {
        const p = game.player;
        const ents = game._ents;
        const best = (p && ents) ? pickTarget(p, ents, false, config.rageFov) : null;
        if (best) {
          const oy = p.yaw, op = p.pitch;
          aimAt(p, best);
          try {
            withNoGrid(() => originalFire.apply(this, args));
          } finally {
            p.yaw = oy; p.pitch = op;
          }
        } else {
          withNoGrid(() => originalFire.apply(this, args));
        }
      } finally {
        firing = false;
      }
    };
  }

  if (typeof game.playerShoot === 'function' && !game.__wcShootPatched) {
    game.__wcShootPatched = true;
    const originalShoot = game.playerShoot;
    game.playerShoot = function (...args) {
      if (!config.wallbang) return originalShoot.apply(this, args);
      return withNoGrid(() => originalShoot.apply(this, args));
    };
  }

  console.log("Clutch Menu hooks ready");
}
const hookPoller = setInterval(() => {
  try { installHooks(); } catch (err) {}
  if (window.game?.weapons?.__wcPatched) clearInterval(hookPoller);
}, 500);

setInterval(() => {
  if (!config.antiRecoil) return;
  const w = window.game?.weapons;
  if (!w) return;
  ['punch', 'punchP', 'punchY', 'sprayP', 'sprayY', 'shkP', 'shkY', 'shkR'].forEach(k => {
    if (typeof w[k] === 'number') w[k] = 0;
  });
}, 16);

function panic() {
  ['silentAim', 'wallbang', 'aimbot', 'esp', 'antiRecoil', 'bhop', 'radar',
   'fovChanger', 'showFov', 'watermark'].forEach(k => config[k] = false);
  saveCfg(); buildGui(); updWatermark(); updRadarVis();
  toast('panic — everything off');
}

document.addEventListener('keydown', e => {
  if (capturing) {
    config[capturing] = e.key;
    capturing = null;
    saveCfg();
    if (mkBtn) mkBtn.textContent = config.menuKey;
    if (pkBtn) pkBtn.textContent = config.panicKey;
    e.preventDefault();
    return;
  }
  if (norm(e.key) === norm(config.menuKey)) {
    if (!gui) return;
    gui.style.display = gui.style.display === 'none' || !gui.style.display ? 'block' : 'none';
  } else if (norm(e.key) === norm(config.panicKey)) {
    panic();
  }
});

buildGui();
updWatermark();
updRadarVis();
drawESP();
aimLoop();

console.log("Clutch Menu v1.0 loaded — press " + config.menuKey + " to toggle");
