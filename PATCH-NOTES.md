# MARGIN 0.49.1 构建产物 + 本地补丁

这个分支放的是**扩展的构建产物**（`dist`），不是源码。上游源码在 `jiuyang5354/bilibili-margin` 的 `main`，本 fork 的 `main` 也还是上游源码，没有被动过。

- 基线：MARGIN **0.49.1** 的已构建扩展（`manifest.json` / `content.js` / `pages/**`）
- 补丁：下表共 23 处，全部直接改在压缩后的产物里，**重新构建会被覆盖**
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
| `595e6b6` | 直播页进入**全屏 / 宽屏**时隐藏顶部菜单栏（原来只有视频页会按 `data-screen` 隐藏，直播页没有 `.bpx-player-container`，播放器铺满窗口后顶栏一直压在最上层）。判断条件：直播页且（`body` 带 `player-full-win`，或播放器容器贴住视口顶部 `top∈[-6,8]` 且高度 ≥ 视口 40%）；退出全屏自动恢复。判断结果进缓存比较，并监听 `body` 的 class 变化 | `src/content/watch.ts`（`watchScreen`）、直播页皮肤 |
| `a956c52` | 空间页「动态」搜索升级成主页搜索框那样：输入即出**联想下拉**（已载入动态的标题/正文，命中词高亮，最多 8 条，带日期），`↑↓` 选择、`Enter` 跳到那条并短暂高亮闪一下、`Esc` 清空、滚动即收起；输入框内补 `×` 清除按钮；查询支持**空格分词 AND**，卡片正文里命中词用 `<mark>` 高亮；回车 = **全量检索**（最多 120 页、每页 300ms，右侧出现「停止」可中断），普通输入只翻到第一个命中就停；有查询时关掉无限滚动，避免筛掉全部卡片后哨兵连续触发请求 | `src/content/space*.ts`（空间页）、空间页样式 |
| `5c0df43` | 动态 / 空间 / 视频详情 / 历史 / 消息这些页的**顶栏搜索框**接到命令面板，和首页、视频页一致。原来共享外壳只传了 `filter`、没传 `onSearch`，顶栏搜索是个哑表单：敲完回车直接新标签打开 `search.bilibili.com`。现在外壳自己建一份面板挂进 `app`，`onSearch` 打开它，于是这些页也有联想词 / 最近搜索 / bilibili 热搜 / 跳转与操作命令，`↑↓` 选择、`Tab` 切搜索↔命令、`Enter` 执行、`Esc` 关闭、`Ctrl K` 与 `/` 呼出 | `src/content/shell*.ts`（顶栏外壳）、`src/content/command-palette*.ts` |
| `7eb53d9` | **置顶动态显示「置顶」标记**：映射层从 `modules.module_tag.text` 取置顶标记，卡片在标题上方加一行 accent 色「↑ 置顶」（和 B 站自己的动态卡一致）。空间页按时间跳转时跳过置顶条，避免置顶的旧动态把首尾日期判错 | `src/content/api`（动态映射）、动态卡片组件与 `.dy-pin` 样式 |
| `a9f5688` | 空间页动态搜索**改成回车触发**：原来输入停顿 220ms 就自动往前翻页检索（一边打字一边吃请求），现在输入只更新本地过滤和联想下拉（**零请求**），按回车才开始检索——每次回车往前翻最多 12 页或翻到一条新的命中即停；「继续检索」仍是翻到底（可停止）。日期框保持选完即查（含游标直达） | `src/content/space*.ts`（空间页） |
| `986acb6` | 空间页动态**按时间查找改成游标直达**：动态 id 的高 32 位就是发布时间（相对 2017-07-01 00:00 +08 的秒数，抓了 12 条实测全部吻合），于是能直接算出某一天对应的 `offset`，一次请求跳到那天，不再从最新一条条翻。跳转结果会校验首尾日期是否覆盖目标日：覆盖就采用（列表整体换成那一段，`offset` 接着往回翻），不覆盖或空返回则回退线性扫描；只有确认「接口不认合成游标」才停用直达（-352 限流不误判）。另加：动态分页**页缓存**（同会话内重搜不重复请求）、限流时文案改成「B站限流了，等 1~2 分钟再点重试」、清除日期时回到最新 | `src/content/space*.ts`（空间页） |
| `f098794` | WebGPU 初始化**不再传 `powerPreference`**：`flux.js` 的 `pn()` 原来调 `navigator.gpu.requestAdapter({powerPreference})`，Chrome 在 Windows 上会打一条 “The powerPreference option is currently ignored…”（crbug 369219127）的告警，被当成页面错误弹出来。现在 `requestAdapter()` 不带参数（这个选项在 Windows 上本来就无效），`navigator.gpu` 缺失时给明确报错而不是 TypeError；适配器拿不到时 `start()` 照旧 catch 并退回 WebGL 版流光 | 背景引擎 `flux.js`（WebGPU 初始化） |

> 一次性迁移的标记存在页面 `localStorage` 里（`margin:defaults-off-v2`），所以每个 b 站子域第一次加载都会跑一次，之后手动打开这些开关不会被覆盖。
