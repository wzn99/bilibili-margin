# MARGIN 0.49.1 构建产物 + 本地补丁

这个分支放的是**扩展的构建产物**（`dist`），不是源码。上游源码在 `jiuyang5354/bilibili-margin` 的 `main`，本 fork 的 `main` 也还是上游源码，没有被动过。

- 基线：MARGIN **0.49.1** 的已构建扩展（`manifest.json` / `content.js` / `pages/**`）
- 补丁：下面 7 处，全部直接改在压缩后的产物里，**重新构建会被覆盖**
- 用法：Chrome / Edge「加载已解压的扩展程序」选这个目录即可

## 补丁清单

| 提交 | 改动 | 对应源码位置（大致） |
| --- | --- | --- |
| `0c3286b` | 稍后再看页去掉两块原生白底板（工具条 + 网格），卡片并入 canvas 画布；顺带调了工具条按钮、卡片排版 | `src/content/watch-later*.css` / 顶栏与列表样式 |
| `8d0b9a2` | 动态卡片「赞 N」改成可点按钮，调 `/x/dynamic/feed/dyn/thumb`（`up=1/2`），乐观更新 + 失败回滚；映射补 `module_stat.like.status` | `src/content/ui/*`（动态卡片）、`src/content/api` 请求层 |
| `f524762` | 动态卡片「评论 N」原地展开前 6 条评论（旧接口 `/x/v2/reply` 为主，失败兜底 `/x/v2/reply/wbi/main`）；映射补 `basic.comment_type / comment_id_str` | 同上，评论组件 |
| `60bf2f6` | 顶栏入口补充「投稿 / 主题 / 头像」隐藏开关（复用 `headHide`） | `src/shared/settings.ts`、顶栏组件与设置面板 |
| `fa1cac9` | 顶栏图标改为四叶风车（动态）、五角星（收藏）、带缺口播放圆环（稍后再看） | 图标表（`src/content/icons.ts` 一类） |
| `0e560b0` | `footprint` / `weather` 默认关闭，并做一次性迁移；动态卡片「转发 / 评论 / 赞」改成统一药丸按钮（padding 8×12），点击区域从 11px 文字扩大到约 54×27 | `src/shared/settings.ts`、动态卡片与列表 CSS |
| `baad404` | `intro`（开场动画）默认关闭，迁移标记升到 `v2` | `src/shared/settings.ts` |
| `4a30bb0` | `popup.js` 里的第三份默认值表同步（否则首次从弹窗写设置会用旧默认覆盖） | `src/popup/popup.ts`、`src/shared/settings.ts` |
| `bc72193` | 动态页右下角「回到顶部」按钮（滚动 720px 后浮出，遵守 `reduceMotion`）；合集更新（`ugc_season`）从 `jump_url` 取 BV 后按视频块渲染，封面右上角补上「稍后再看」 | `src/content/feed.ts`、`src/content/dynamic*.ts`、`src/content/feed.css` |

> 一次性迁移的标记存在页面 `localStorage` 里（`margin:defaults-off-v2`），所以每个 b 站子域第一次加载都会跑一次，之后手动打开这些开关不会被覆盖。
