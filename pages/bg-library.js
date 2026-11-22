/* ============================================================================
   MARGIN · 背景图库
   ----------------------------------------------------------------------------
   给「背景」加一个「我的图片」来源：把本地图片压成 JPEG data URL 存在扩展本机
   （chrome.storage.local），随机背景就能把它们和内置样式一起轮换。

   存储：
     margin:bg-images      索引 [{id, name, thumb, w, h, bytes, addedAt}]
     margin:bg-img:<id>    全图 data URL（长边 ≤ 1920，JPEG q.82）
     margin:bg-image       「图片」模式当前用的那一张（沿用旧键，data URL）

   为什么不用 File System Access：内容脚本按 bilibili.com 站点授权，每个会话还
   要再点一次「允许」，Firefox 也不支持。这里改成一次性导入 + 复制进本机存储，
   想跟着文件夹更新时再点一次「从文件夹导入」。
   ========================================================================== */

export const INDEX_KEY = 'margin:bg-images';
export const CURRENT_KEY = 'margin:bg-image';
const DATA_PREFIX = 'margin:bg-img:';
const MAX_IMAGES = 200;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_EDGE = 1920;
const QUALITY = 0.82;
const THUMB_W = 320;
const THUMB_H = 180;
const NAME_MAX = 40;

const dataKey = (id) => DATA_PREFIX + id;
const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const store = {
  async get(key, fallback = null) {
    try {
      const got = await chrome.storage.local.get(key);
      const v = got?.[key];
      return v === undefined ? fallback : v;
    } catch {
      return fallback;
    }
  },
  async set(obj) {
    await chrome.storage.local.set(obj);
  },
  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
    } catch {}
  },
};

export async function getIndex() {
  const list = await store.get(INDEX_KEY, []);
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.id === 'string')
    .map((e) => (e.on === false ? { ...e, on: false } : { ...e, on: true }));
}

export async function ids() {
  return (await getIndex()).map((e) => e.id);
}

/** 参与随机的那几张（每张卡片右上角可以单独关掉） */
export async function randomIds() {
  return (await getIndex()).filter((e) => e.on !== false).map((e) => e.id);
}

/** 开 / 关某张图的随机参与 */
export async function setRandom(id, on) {
  const index = await getIndex();
  const hit = index.find((e) => e.id === id);
  if (!hit) return null;
  hit.on = !!on;
  await store.set({ [INDEX_KEY]: index });
  return hit.on;
}

export async function data(id) {
  if (!id) return '';
  return await store.get(dataKey(id), '');
}

/** 从图库里随机取一张（可排除上一张），只看参与随机的那几张 */
export async function pickRandom(exclude = '') {
  const list = (await getIndex()).filter((e) => e.on !== false);
  if (!list.length) return null;
  const pool = list.length > 1 && exclude ? list.filter((e) => e.id !== exclude) : list;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const url = await data(pick.id);
  return url ? { id: pick.id, name: pick.name, data: url } : null;
}

/** 图库当前的总占用（data URL 长度近似字节数） */
export async function usage() {
  const list = await getIndex();
  return { count: list.length, bytes: list.reduce((n, e) => n + (Number(e.bytes) || 0), 0) };
}

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|bmp|jfif)$/i;

export function looksLikeImage(file) {
  if (!file) return false;
  if (file.type && /^image\//i.test(file.type)) return true;
  return IMAGE_EXT.test(file.name || '');
}

function baseName(name) {
  const raw = String(name || '').replace(/\.[^.]+$/, '').trim();
  return (raw || '未命名').slice(0, NAME_MAX);
}

function uniqueName(name, taken) {
  if (!taken.has(name)) return name;
  for (let i = 2; i < 1000; i++) {
    const cand = `${name} (${i})`.slice(0, NAME_MAX);
    if (!taken.has(cand)) return cand;
  }
  return `${name} ${Date.now().toString(36)}`.slice(0, NAME_MAX);
}

function fillColor(host) {
  try {
    const cs = getComputedStyle(host || document.documentElement);
    const v = cs.getPropertyValue('--canvas').trim();
    if (v) return v;
  } catch {}
  return '#ffffff';
}

function drawCover(ctx, bitmap, w, h) {
  const scale = Math.max(w / bitmap.width, h / bitmap.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, w, h);
}

/** 解码 + 缩放 + 压缩，返回 {data, thumb, w, h} */
async function encode(file, host) {
  if (file.size > MAX_SOURCE_BYTES) throw new Error('too-big');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('decode');
  }
  if (!bitmap.width || !bitmap.height) throw new Error('decode');

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fillColor(host);
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const full = canvas.toDataURL('image/jpeg', QUALITY);

  const tiny = document.createElement('canvas');
  tiny.width = THUMB_W;
  tiny.height = THUMB_H;
  const tctx = tiny.getContext('2d');
  tctx.fillStyle = fillColor(host);
  tctx.fillRect(0, 0, THUMB_W, THUMB_H);
  drawCover(tctx, bitmap, THUMB_W, THUMB_H);
  const thumb = tiny.toDataURL('image/jpeg', 0.72);

  if (typeof bitmap.close === 'function') bitmap.close();
  return { data: full, thumb, w, h };
}

/** 递归展开拖进来的文件夹（Chromium 的 webkitGetAsEntry） */
export async function filesFromDataTransfer(dt) {
  const out = [];
  const items = dt?.items ? [...dt.items] : [];
  const roots = [];
  for (const it of items) {
    const entry = it.kind === 'file' && typeof it.webkitGetAsEntry === 'function' ? it.webkitGetAsEntry() : null;
    if (entry) roots.push(entry);
    else {
      const f = it.getAsFile?.();
      if (f) out.push(f);
    }
  }
  if (!roots.length) {
    for (const f of dt?.files ?? []) out.push(f);
    return out;
  }
  const readAll = async (entry) => {
    if (entry.isFile) {
      const f = await new Promise((res, rej) => entry.file(res, rej));
      out.push(f);
      return;
    }
    if (!entry.isDirectory) return;
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const child of batch) await readAll(child);
    }
  };
  for (const r of roots) await readAll(r);
  return out;
}

/**
 * 导入一批文件。跳过的会在结果里说明原因。
 * @returns {{added:number, skipped:{tooBig:number, decode:number, limit:number, dup:number, space:number}}}
 */
export async function importFiles(files, { host, onProgress } = {}) {
  const list = [...files].filter(looksLikeImage);
  const skipped = { tooBig: 0, decode: 0, limit: 0, dup: 0, space: 0 };
  const index = await getIndex();
  const taken = new Set(index.map((e) => e.name));
  const seen = new Set(index.map((e) => `${e.name}|${Number(e.src) || -1}`));
  let bytes = index.reduce((n, e) => n + (Number(e.bytes) || 0), 0);
  const fresh = [];
  let done = 0;

  for (const file of list) {
    done++;
    onProgress?.(done, list.length, file.name);
    if (index.length + fresh.length >= MAX_IMAGES) {
      skipped.limit++;
      continue;
    }
    const sig = `${baseName(file.name)}|${file.size}`;
    if (seen.has(sig)) {
      skipped.dup++;
      continue;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      skipped.tooBig++;
      continue;
    }
    let enc;
    try {
      enc = await encode(file, host);
    } catch (e) {
      if (e.message === 'too-big') skipped.tooBig++;
      else skipped.decode++;
      continue;
    }
    const size = enc.data.length + enc.thumb.length;
    if (bytes + size > MAX_TOTAL_BYTES) {
      skipped.space++;
      continue;
    }
    bytes += size;
    const name = uniqueName(baseName(file.name), taken);
    taken.add(name);
    seen.add(sig);
    const entry = {
      id: uid(),
      name,
      thumb: enc.thumb,
      w: enc.w,
      h: enc.h,
      bytes: size,
      src: file.size,
      addedAt: Date.now(),
    };
    fresh.push({ entry, data: enc.data });
  }

  // 全图逐张写（一张一个键），最后写索引
  for (const it of fresh) {
    try {
      await store.set({ [dataKey(it.entry.id)]: it.data });
    } catch {
      it.entry.dead = true;
    }
  }
  const good = fresh.filter((it) => !it.entry.dead);
  const next = [...index, ...good.map((it) => it.entry)];
  await store.set({ [INDEX_KEY]: next });

  // 还没有「图片」模式的当前图时，把第一张设成当前
  const current = await store.get(CURRENT_KEY, '');
  if (!current && good.length) await store.set({ [CURRENT_KEY]: good[0].data });

  return { added: good.length, skipped };
}

export async function rename(id, name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || '未命名';
  const index = await getIndex();
  const hit = index.find((e) => e.id === id);
  if (!hit) return null;
  const others = new Set(index.filter((e) => e.id !== id).map((e) => e.name));
  hit.name = uniqueName(clean, others);
  await store.set({ [INDEX_KEY]: index });
  return hit.name;
}

export async function remove(id) {
  const index = await getIndex();
  const hit = index.find((e) => e.id === id);
  const url = hit ? await data(id) : '';
  await store.set({ [INDEX_KEY]: index.filter((e) => e.id !== id) });
  await store.remove(dataKey(id));
  const current = await store.get(CURRENT_KEY, '');
  const wasCurrent = !!url && url === current;
  if (wasCurrent) await store.remove(CURRENT_KEY);
  return { removed: !!hit, wasCurrent };
}

export async function move(id, toIndex) {
  const index = await getIndex();
  const from = index.findIndex((e) => e.id === id);
  if (from < 0) return false;
  const to = Math.max(0, Math.min(index.length - 1, toIndex));
  if (from === to) return false;
  const [it] = index.splice(from, 1);
  index.splice(to, 0, it);
  await store.set({ [INDEX_KEY]: index });
  return true;
}

/** 把某张图设为「图片」模式的当前图 */
export async function useImage(id) {
  const url = await data(id);
  if (!url) return false;
  await store.set({ [CURRENT_KEY]: url });
  return true;
}

const STYLE_ID = 'margin-bglib-style';
const CSS = `
.bglib{display:grid;gap:12px}
.bglib-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.bglib-count{font:500 11px/1 var(--mono);letter-spacing:.08em;color:var(--faint);margin-right:auto}
.bglib-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.bglib-item{position:relative;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface);display:flex;flex-direction:column;margin:0;min-width:0}
.bglib-item[data-drag]{opacity:.45}
.bglib-item[data-over]{box-shadow:0 0 0 2px var(--accent)}
.bglib-thumb{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--chip)}
.bglib-on{position:absolute;top:6px;right:6px;appearance:none;border:0;border-radius:999px;padding:3px 8px;font:500 10px/1 var(--sans);letter-spacing:.02em;cursor:pointer;color:var(--muted);background:color-mix(in srgb, var(--canvas) 78%, transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.bglib-on:hover{color:var(--ink)}
.bglib-on[aria-pressed=true]{color:#fff;background:var(--accent)}
.bglib-on[aria-pressed=false]{opacity:.9}
.bglib-item[data-off] .bglib-thumb{opacity:.42}
.bglib-item[data-off] .bglib-name{color:var(--faint)}
.bglib-name{font:500 11px/1.3 var(--sans);color:var(--muted);padding:6px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bglib-name input{width:100%;font:inherit;color:var(--ink);background:var(--canvas);border:1px solid var(--accent);border-radius:6px;padding:2px 4px;outline:none}
.bglib-acts{display:flex;border-top:1px solid var(--line)}
.bglib-acts button{flex:1;appearance:none;background:0 0;border:0;color:var(--faint);font:500 11px/1 var(--sans);padding:7px 0;cursor:pointer;white-space:nowrap}
.bglib-acts button+button{border-left:1px solid var(--line)}
.bglib-acts button:hover{color:var(--ink);background:var(--chip)}
.bglib-acts button[data-act=del]:hover{color:#f0576f}
.bglib-empty{color:var(--muted);font:500 13px/1.6 var(--sans);margin:0;padding:10px 0 2px;grid-column:1/-1}
.bglib-drop{border:1px dashed var(--line);border-radius:12px;padding:10px;color:var(--faint);font:500 12px/1.5 var(--sans);text-align:center}
.bglib[data-over] .bglib-drop{border-color:var(--accent);color:var(--ink)}
.bglib-note{color:var(--faint);font:500 11px/1.6 var(--sans);margin:0}
`;

/**
 * 在设置面板里挂一个图库。
 * opts: { get(): settings, patch(obj), toast(text), onCount(n) }
 */
export function mount(host, opts = {}) {
  const root = host.getRootNode?.() ?? document;
  if (!root.getElementById?.(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    root.append(style);
  }

  const bar = document.createElement('div');
  bar.className = 'bglib-bar';
  const count = document.createElement('span');
  count.className = 'bglib-count';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'ghost small';
  addBtn.textContent = '添加图片';
  const folderBtn = document.createElement('button');
  folderBtn.type = 'button';
  folderBtn.className = 'ghost small';
  folderBtn.textContent = '从文件夹导入';
  const pick = document.createElement('input');
  pick.type = 'file';
  pick.accept = 'image/*';
  pick.multiple = true;
  pick.hidden = true;
  const pickDir = document.createElement('input');
  pickDir.type = 'file';
  pickDir.accept = 'image/*';
  pickDir.multiple = true;
  pickDir.setAttribute('webkitdirectory', '');
  pickDir.hidden = true;
  bar.append(count, addBtn, folderBtn);

  const grid = document.createElement('div');
  grid.className = 'bglib-grid';
  const drop = document.createElement('div');
  drop.className = 'bglib-drop';
  drop.textContent = '也可以把图片或文件夹拖到这里';
  const note = document.createElement('p');
  note.className = 'bglib-note';
  note.textContent = `只收 jpg / png / webp / avif / gif / bmp；长边压到 ${MAX_EDGE}px 后存在本机，最多 ${MAX_IMAGES} 张。右上角「随机」控制这张要不要参与随机`;

  host.replaceChildren(bar, grid, drop, note, pick, pickDir);

  let index = [];
  let busy = false;

  const toast = (text) => opts.toast?.(text);

  const render = async () => {
    index = await getIndex();
    // 正在就地改名时不要重绘，否则输入框会被替换掉
    const editing = grid.querySelector('.bglib-name input');
    if (editing && root.activeElement === editing) return index;
    const onN = index.filter((e) => e.on !== false).length;
    count.textContent = index.length ? `${index.length} 张${onN === index.length ? '' : ` · 随机 ${onN} 张`}` : '';
    addBtn.disabled = busy;
    folderBtn.disabled = busy;
    drop.hidden = index.length > 0 ? false : false;
    grid.replaceChildren(
      ...index.map((it) => {
        const fig = document.createElement('figure');
        fig.className = 'bglib-item';
        fig.draggable = true;
        fig.dataset.id = it.id;
        const img = document.createElement('img');
        img.className = 'bglib-thumb';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = it.name;
        img.src = it.thumb;
        const name = document.createElement('figcaption');
        name.className = 'bglib-name';
        name.textContent = it.name;
        name.title = `${it.name} · ${it.w}×${it.h}`;
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'bglib-on';
        badge.dataset.act = 'toggle';
        badge.setAttribute('aria-pressed', String(it.on !== false));
        badge.title = it.on === false ? '加入随机' : '不参与随机';
        badge.textContent = '随机';
        fig.toggleAttribute('data-off', it.on === false);
        const acts = document.createElement('div');
        acts.className = 'bglib-acts';
        const mk = (label, act) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.dataset.act = act;
          return b;
        };
        acts.append(mk('设为背景', 'use'), mk('改名', 'rename'), mk('删除', 'del'));
        fig.append(img, badge, name, acts);
        return fig;
      }),
    );
    if (!index.length) {
      const empty = document.createElement('p');
      empty.className = 'bglib-empty';
      empty.textContent = '还没有图片。添加几张后，到「随机范围」里点亮「我的图片」就会一起随机。';
      grid.replaceChildren();
      grid.append(empty);
    }
    opts.onCount?.(index.length, index.filter((e) => e.on !== false).length);
    return index;
  };

  const runImport = async (files) => {
    if (busy || !files?.length) return;
    busy = true;
    count.textContent = '导入中…';
    let last = 0;
    const t0 = Date.now();
    try {
      const res = await importFiles(files, {
        host,
        onProgress: (done, total, name) => {
          if (Date.now() - last > 120) {
            last = Date.now();
            count.textContent = `导入中 ${done}/${total}`;
            if (name) addBtn.title = name;
          }
        },
      });
      await render();
      const skipped = Object.values(res.skipped).reduce((a, b) => a + b, 0);
      toast(res.added ? `已加入 ${res.added} 张图片${skipped ? `，跳过 ${skipped} 张` : ''}` : '没有可加入的图片');
      if (res.added && opts.get?.()?.bg?.mode === 'off') opts.patch?.({ bg: { ...opts.get().bg, mode: 'random' } });
    } catch (e) {
      toast('导入失败：' + (e?.message || '未知错误'));
      await render();
    } finally {
      busy = false;
      addBtn.disabled = false;
      folderBtn.disabled = false;
      addBtn.title = '';
    }
  };

  addBtn.onclick = () => pick.click();
  folderBtn.onclick = () => pickDir.click();
  pick.onchange = () => {
    const files = [...(pick.files ?? [])];
    pick.value = '';
    runImport(files);
  };
  pickDir.onchange = () => {
    const files = [...(pickDir.files ?? [])];
    pickDir.value = '';
    runImport(files);
  };

  // 拖拽导入（含文件夹）
  const setOver = (on) => host.toggleAttribute('data-over', on);
  for (const el of [host, drop, grid]) {
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      setOver(true);
    });
    el.addEventListener('dragleave', () => setOver(false));
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      const files = await filesFromDataTransfer(e.dataTransfer);
      runImport(files);
    });
  }

  // 图库内部拖拽排序
  let dragId = '';
  grid.addEventListener('dragstart', (e) => {
    const item = e.target.closest?.('.bglib-item');
    if (!item) return;
    dragId = item.dataset.id;
    item.setAttribute('data-drag', '');
    e.dataTransfer?.setData('text/plain', dragId);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragend', () => {
    dragId = '';
    grid.querySelectorAll('.bglib-item').forEach((el) => {
      el.removeAttribute('data-drag');
      el.removeAttribute('data-over');
    });
  });
  grid.addEventListener('dragover', (e) => {
    const item = e.target.closest?.('.bglib-item');
    if (!dragId || !item || item.dataset.id === dragId) return;
    e.preventDefault();
    grid.querySelectorAll('.bglib-item').forEach((el) => el.toggleAttribute('data-over', el === item));
  });
  grid.addEventListener('drop', async (e) => {
    const item = e.target.closest?.('.bglib-item');
    if (!dragId || !item || item.dataset.id === dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const to = index.findIndex((x) => x.id === item.dataset.id);
    if (to >= 0) {
      const ok = await move(dragId, to);
      dragId = '';
      if (ok) await render();
    }
    grid.querySelectorAll('.bglib-item').forEach((el) => el.removeAttribute('data-over'));
  });

  // 操作按钮
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest?.('button[data-act]');
    if (!btn) return;
    const fig = btn.closest('.bglib-item');
    const id = fig?.dataset.id;
    if (!id) return;
    const act = btn.dataset.act;
    if (act === 'toggle') {
      const it = index.find((x) => x.id === id);
      const next = !(it ? it.on !== false : true);
      const saved = await setRandom(id, next);
      if (saved === null) return;
      if (it) it.on = next;
      fig.toggleAttribute('data-off', !next);
      btn.setAttribute('aria-pressed', String(next));
      btn.title = next ? '不参与随机' : '加入随机';
      const total = index.length;
      const onN = index.filter((x) => x.on !== false).length;
      count.textContent = `${total} 张${onN === total ? '' : ` · 随机 ${onN} 张`}`;
      opts.onCount?.(total, onN);
      toast(next ? '已加入随机' : '已从随机里排除');
      return;
    }
    if (act === 'use') {
      if (await useImage(id)) {
        opts.patch?.({ bg: { ...(opts.get?.()?.bg ?? {}), mode: 'image' } });
        toast('已设为背景');
      } else toast('这张图读取失败');
      return;
    }
    if (act === 'del') {
      const res = await remove(id);
      if (res.wasCurrent) {
        opts.patch?.({ bg: { ...(opts.get?.()?.bg ?? {}), mode: 'random' } });
        toast('已删除，背景改回随机');
      } else toast(res.removed ? '已删除' : '这张图已经不在了');
      await render();
      return;
    }
    if (act === 'rename') {
      const nameEl = fig.querySelector('.bglib-name');
      if (!nameEl || nameEl.querySelector('input')) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = nameEl.textContent;
      input.maxLength = NAME_MAX;
      nameEl.replaceChildren(input);
      input.focus();
      input.select();
      let closed = false;
      const commit = async (save) => {
        if (closed) return;
        closed = true;
        if (save) {
          const next = await rename(id, input.value);
          if (next) toast('已改名为「' + next + '」');
        }
        await render();
      };
      input.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') commit(true);
        else if (ev.key === 'Escape') commit(false);
      });
      input.addEventListener('blur', () => commit(true));
    }
  });

  const ready = render();

  return {
    refresh: () => render(),
    async requestImage() {
      // 「图片」模式点进来时：已经有当前图就直接切过去；没有就去图库挑一张，图库还空着就去选文件
      const current = await store.get(CURRENT_KEY, '');
      if (current) {
        opts.patch?.({ bg: { ...(opts.get?.()?.bg ?? {}), mode: 'image' } });
        return true;
      }
      if (!index.length) {
        addBtn.click();
        return false;
      }
      const ok = await useImage(index[0].id);
      if (ok) opts.patch?.({ bg: { ...(opts.get?.()?.bg ?? {}), mode: 'image' } });
      return ok;
    },
    ready,
  };
}
