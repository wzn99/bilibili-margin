/* ============================================================================
   MARGIN · 动态评论内联展开
   ----------------------------------------------------------------------------
   动态卡片底部的「评论 N」原本是一条跳去详情页的链接。这里改成按钮：
   点一下在卡片里直接展开前几条评论，再点收起，不用离开动态流。

   评论接口（按 basic.comment_type / basic.comment_id_str 取）：
     旧版 GET /x/v2/reply?type=&oid=&pn=1&ps=10
     新版 GET /x/v2/reply/wbi/main?type=&oid=&mode=3&pagination_str=...
   ========================================================================== */

import { Pt as wbiGet, H as ICONS, X as svg } from './chunk-CddtFuE1.js';

const API = 'https://api.bilibili.com';
const MAX_ROWS = 6;

function plain(path, params) {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  return fetch(`${API}${path}?${query}`, { credentials: 'include' })
    .then((res) => res.json())
    .then((data) => {
      if (data?.code !== 0) throw Error(data?.message || `code ${data?.code}`);
      return data.data;
    });
}

/** 两种返回结构的字段基本一致，统一成一种 */
function normalize(data) {
  const replies = Array.isArray(data?.replies) ? data.replies : [];
  return replies
    .filter((row) => row && !row.invisible)
    .map((row) => ({
      id: String(row.rpid ?? ''),
      name: row.member?.uname ?? '匿名用户',
      face: row.member?.avatar ?? '',
      text: row.content?.message ?? '',
      emotes: row.content?.emote || null,
      time: Number(row.ctime) || 0,
      like: Number(row.like) || 0,
      rcount: Number(row.rcount) || 0,
    }));
}

async function fetchComments(item) {
  const base = { type: item.cmtType, oid: item.cmtOid };
  try {
    const data = await plain('/x/v2/reply', { ...base, pn: 1, ps: 10, plat: 1, web_location: 1315875 });
    if (Array.isArray(data?.replies) || (data?.page?.count ?? 0) === 0) return normalize(data);
  } catch {
    /* 旧接口不行就走新版 */
  }
  const data = await wbiGet('/x/v2/reply/wbi/main', {
    ...base,
    mode: 3,
    plat: 1,
    web_location: 1315875,
    seek_rpid: '',
    pagination_str: JSON.stringify({ offset: '' }),
  });
  return normalize(data);
}

/** 把 [doge] 这类表情转义换成图片，其余按纯文本插入 */
function contentNodes(text, emotes) {
  const frag = document.createDocumentFragment();
  if (!text) return frag;
  const tokens = emotes ? Object.keys(emotes).sort((a, b) => b.length - a.length) : [];
  let rest = text;
  while (rest) {
    let hit = -1;
    let token = '';
    for (const key of tokens) {
      const index = rest.indexOf(key);
      if (index >= 0 && (hit < 0 || index < hit)) {
        hit = index;
        token = key;
      }
    }
    if (hit < 0) {
      frag.append(document.createTextNode(rest));
      break;
    }
    if (hit > 0) frag.append(document.createTextNode(rest.slice(0, hit)));
    const image = document.createElement('img');
    image.className = 'dy-cmt-emo';
    image.src = emotes[token]?.url ?? '';
    image.alt = token;
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    frag.append(image);
    rest = rest.slice(hit + token.length);
  }
  return frag;
}

function rowEl(row, ago) {
  const li = document.createElement('li');
  li.className = 'dy-cmt-row';

  if (row.face) {
    const face = document.createElement('img');
    face.className = 'dy-cmt-face';
    face.src = `${row.face}@64w_64h_1c.webp`;
    face.alt = '';
    face.loading = 'lazy';
    face.referrerPolicy = 'no-referrer';
    li.append(face);
  }

  const body = document.createElement('div');
  body.className = 'dy-cmt-b';

  const head = document.createElement('div');
  head.className = 'dy-cmt-h';
  const name = document.createElement('b');
  name.textContent = row.name;
  head.append(name);
  if (row.time) {
    const time = document.createElement('span');
    time.className = 'dy-cmt-time';
    let label = '';
    try {
      label = ago ? ago(row.time) : '';
    } catch {
      label = '';
    }
    time.textContent = label || new Date(row.time * 1000).toLocaleDateString();
    head.append(time);
  }
  if (row.like > 0) {
    // 和卡片底部「赞」用同一个大拇指，而不是爱心
    const like = document.createElement('span');
    like.className = 'dy-cmt-like';
    like.title = `${row.like} 人赞过`;
    const num = document.createElement('span');
    num.textContent = String(row.like);
    like.append(svg(ICONS.thumb), num);
    head.append(like);
  }
  body.append(head);

  const text = document.createElement('p');
  text.className = 'dy-cmt-t';
  text.append(contentNodes(row.text, row.emotes));
  body.append(text);

  if (row.rcount > 0) {
    const more = document.createElement('span');
    more.className = 'dy-cmt-sub';
    more.textContent = `共 ${row.rcount} 条回复`;
    body.append(more);
  }

  li.append(body);
  return li;
}

function panelEl(item, ago, list) {
  const panel = document.createElement('div');
  panel.className = 'dy-cmts';

  if (!list.length) {
    panel.dataset.state = 'empty';
    const empty = document.createElement('p');
    empty.className = 'dy-cmts-note';
    empty.textContent = '还没有评论';
    panel.append(empty);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'dy-cmts-list';
    list.slice(0, MAX_ROWS).forEach((row) => ul.append(rowEl(row, ago)));
    panel.append(ul);
    if (list.length > MAX_ROWS) {
      const note = document.createElement('p');
      note.className = 'dy-cmts-note';
      note.textContent = `还有 ${list.length - MAX_ROWS} 条…`;
      panel.append(note);
    }
  }

  if (item.url) {
    const foot = document.createElement('a');
    foot.className = 'dy-cmts-link';
    foot.href = `${item.url}#comment`;
    foot.target = '_blank';
    foot.rel = 'noopener';
    foot.textContent = '去详情页看全部评论 →';
    panel.append(foot);
  }

  return guard(panel);
}

/** 卡片本身是「点哪都跳详情」，评论区里的点击不要带出去 */
function guard(node) {
  for (const type of ['click', 'auxclick']) {
    node.addEventListener(type, (event) => event.stopPropagation());
  }
  return node;
}

/**
 * 把一条动态的「评论 N」换成可展开评论的按钮。
 * @param {object} item 动态数据（需要 stat.comment / cmtType / cmtOid / url）
 * @param {(n: number) => string} fmt 数字格式化
 * @param {(ts: number) => string} ago 相对时间格式化
 */
export function comments(item, fmt, ago) {
  const stat = item?.stat ?? {};
  const count = Number(stat.comment) || 0;

  // 没有评论坐标就退回原来的链接
  if (!item?.cmtType || !item?.cmtOid || !item?.url) {
    const link = document.createElement('a');
    link.className = 'dy-cmt';
    link.href = `${item?.url ?? '#'}#comment`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.title = '查看评论';
    const num = document.createElement('span');
    num.className = 'dy-n';
    num.textContent = count ? fmt(count) : '';
    num.hidden = !count;
    link.append(svg(ICONS.comment), num);
    link.setAttribute('aria-label', `评论${count ? ` ${fmt(count)}` : ''}`);
    return link;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dy-act dy-cmt-btn';
  const number = document.createElement('span');
  number.className = 'dy-n';
  number.textContent = count ? fmt(count) : '';
  number.hidden = !count;
  button.append(svg(ICONS.comment), number);
  button.setAttribute('aria-expanded', 'false');
  button.title = '展开评论';
  button.setAttribute('aria-label', `展开评论${count ? ` ${fmt(count)}` : ''}`);

  let panel = null;
  let loading = false;

  const collapse = () => {
    panel?.remove();
    panel = null;
    button.setAttribute('aria-expanded', 'false');
    button.title = '展开评论';
  };

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (panel) {
      collapse();
      return;
    }
    if (loading) return;

    const card = button.closest('.dy');
    const statRow = card?.querySelector('.dy-stat');
    if (!card || !statRow) return;

    panel = document.createElement('div');
    panel.className = 'dy-cmts';
    panel.dataset.state = 'loading';
    const loadingNote = document.createElement('p');
    loadingNote.className = 'dy-cmts-note';
    loadingNote.textContent = '正在加载评论…';
    panel.append(loadingNote);
    guard(panel);
    statRow.insertAdjacentElement('afterend', panel);

    button.setAttribute('aria-expanded', 'true');
    button.title = '收起评论';

    loading = true;
    try {
      const list = await fetchComments(item);
      if (!panel) return; // 加载期间被收起了
      const fresh = panelEl(item, ago, list);
      panel.replaceWith(fresh);
      panel = fresh;
    } catch (err) {
      if (!panel) return;
      const failed = document.createElement('div');
      failed.className = 'dy-cmts';
      const note = document.createElement('p');
      note.className = 'dy-cmts-note';
      note.textContent = `评论加载失败：${err?.message ?? '网络错误'}`;
      failed.append(note);
      if (item.url) {
        const link = document.createElement('a');
        link.className = 'dy-cmts-link';
        link.href = `${item.url}#comment`;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = '去详情页看评论 →';
        failed.append(link);
      }
      guard(failed);
      panel.replaceWith(failed);
      panel = failed;
    } finally {
      loading = false;
    }
  });

  return button;
}
