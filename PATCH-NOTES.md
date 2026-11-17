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
| `2b4851b` | 稍后再看浮窗：把「移出稍后再看」按钮从整行右上角挪到**封面右上角**并常显（半透明深色小胶囊，hover 变红），点击调 `/x/v2/history/toview/del` | `src/content/ui/drawer*.ts` / 对应的 `dw-x` 样式 |
| `4e5cd58` | 顶栏「稍后」的**悬停浮窗**（`.dp` 面板，之前漏掉的才是这个）每行补上移除按钮：`.dp-x` 小胶囊落在封面右上角，点击删接口后该行淡出移除，失败短暂标红 | `src/content/ui/header-popover*.ts` / `.dp-*` 样式 |
| `b061706` | 加入/移出稍后再看后派发 `margin:later-changed`；悬停浮窗收到事件后清掉 60 秒缓存并立即重新加载，不再需要整页刷新 | 同上的浮窗组件 + 稍后再看 API 封装 |
| `06e0946` | 动态卡片的「转发 / 评论 / 赞」改成**图标 + 数字**（新增 `share` / `comment` / `thumb` 三个描边图标，24×24 stroke 1.7），已赞时拇指填充 18%；按钮统一 inline-flex，点击区域不变 | `src/content/icons.ts`、`src/content/ui/dynamic-card*.ts`、`src/content/ui/*.css` |
| `35b4942` | 消息页「收到的赞」：从 `uri` 的 `#reply<rid>` 或 `native_uri` 的 `comment_root_id` 取评论 id，补 `comment_on=1&comment_root_id=...`，点开即定位到该评论楼层；点赞视频本身时链接不变（**取字段判断错，见下一条**） | `src/content/ui/message*.ts`（赞通知映射） |
| `8b817d9` | 修正上一条：消息页赞通知里评论 id 其实在 **`item.item_id`**，`uri` 是裸视频地址、`native_uri` 里也没有；按 B 站消息页自身逻辑改成 `uri + "#reply" + item_id`（已带 `#` 就不重复拼），`回复我的` / `@ 我的` 同样用 `source_id` 拼。无头 Chrome 实测：`bili-comments` 会读到 `seek-id` 并把目标楼层滚进视野（含未展开的楼中楼）；只有 `?comment_on=1&comment_root_id=` 参数时 B 站完全忽略 | `src/content/ui/message*.ts`（赞 / 回复 / @ 通知映射） |
| `02d5760` | UP 主空间「动态」页新增**搜索动态**和**按时间查找**：搜索框和日期框原来只在「视频」tab 显示，现在「动态」tab 也有一组（搜索框 + 日期选择 + 清除）。搜索按标题/正文/视频标题/专栏标题/合集标题/UP 名做本地过滤；有查询时自动往前翻页检索（每批最多 12 页、每页间隔 350ms，命中即停，接口报错即停，最多累计 60 页），顶栏右侧显示「命中 X / 已载 Y」，未翻完时可点「继续检索」再翻一批；日期框选某一天即只显示那天的动态，并自动翻到那一天（翻过之后显示「这天没有动态」）。筛选只用 `data-dyn-hide` 属性隐藏卡片，不重新请求 | `src/content/space*.ts`（空间页）、空间页样式 |

> 一次性迁移的标记存在页面 `localStorage` 里（`margin:defaults-off-v2`），所以每个 b 站子域第一次加载都会跑一次，之后手动打开这些开关不会被覆盖。
