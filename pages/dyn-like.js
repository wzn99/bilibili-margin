/* ============================================================================
   MARGIN · 动态点赞
   ----------------------------------------------------------------------------
   动态卡片底部的「赞 N」原本只是文字，想点赞得点进详情页。这里把它换成按钮，
   直接调 B 站的动态点赞接口，乐观更新数字，失败再回滚。

   接口：POST https://api.bilibili.com/x/dynamic/feed/dyn/thumb?csrf=<bili_jct>
   正文：{ dyn_id_str: 动态 id, up: 1 点赞 / 2 取消点赞 }
   ========================================================================== */

import { H as ICONS, X as svg } from './chunk-CddtFuE1.js';

const ENDPOINT = 'https://api.bilibili.com/x/dynamic/feed/dyn/thumb';

const csrf = () => document.cookie.match(/(?:^|;\s*)bili_jct=([^;]+)/)?.[1] ?? '';

const format = (fmt, n) => (typeof fmt === 'function' ? fmt(n) : String(n));

/** 轻提示：挂在 .app 里，能继承 app 的 CSS 变量 */
function toast(root, text) {
  if (!root || typeof root.querySelector !== 'function') return;
  const host = root.querySelector('.app') ?? root;
  host.querySelector('.dy-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'dy-toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  host.append(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2900);
}

async function thumb(id, up) {
  const token = csrf();
  if (!token) throw Error('未登录');
  const res = await fetch(`${ENDPOINT}?csrf=${encodeURIComponent(token)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dyn_id_str: String(id),
      up,
      spmid: '333.1369.0.0',
      from_spmid: '333.999.0.0',
    }),
  });
  const data = await res.json().catch(() => ({ code: -1, message: `HTTP ${res.status}` }));
  if (data.code !== 0) {
    const msg = data.message && data.message !== '0' ? data.message : `code ${data.code}`;
    throw Error(msg);
  }
  return data;
}

/**
 * 把一条动态的「赞 N」换成可点的按钮。
 * @param {object} item 动态数据（需要 id / stat.like / stat.liked）
 * @param {(n: number) => string} fmt 数字格式化函数（和卡片其它数字保持一致）
 */
export function like(item, fmt) {
  const stat = item?.stat ?? {};
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dy-act dy-like';
  if (item?.id) button.dataset.dyn = String(item.id);

  const number = document.createElement('span');
  number.className = 'dy-n';
  button.append(svg(ICONS.thumb), number);

  const render = (liked, count) => {
    button.setAttribute('aria-pressed', String(liked));
    button.title = liked ? '取消点赞' : '点赞这条动态';
    button.setAttribute('aria-label', `${liked ? '已赞' : '赞'}${count ? ` ${format(fmt, count)}` : ''}`);
    number.textContent = count ? format(fmt, count) : '';
    number.hidden = !count;
  };
  render(stat.liked === true, stat.like ?? 0);

  let busy = false;
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy || !item?.id) return;
    const root = button.getRootNode();
    if (!csrf()) {
      toast(root, '登录 B 站后才能点赞');
      return;
    }
    const wasLiked = stat.liked === true;
    const wasCount = Number(stat.like) || 0;
    const next = !wasLiked;
    const nextCount = Math.max(0, wasCount + (next ? 1 : -1));

    render(next, nextCount); // 先动起来，请求失败再回滚
    busy = true;
    button.disabled = true;
    try {
      await thumb(item.id, next ? 1 : 2);
      stat.liked = next;
      stat.like = nextCount;
    } catch (err) {
      stat.liked = wasLiked;
      stat.like = wasCount;
      render(wasLiked, wasCount);
      toast(root, `${next ? '点赞' : '取消点赞'}失败：${err?.message ?? '网络错误'}`);
    } finally {
      busy = false;
      button.disabled = false;
    }
  });

  return button;
}
