# MARGIN 0.49.1 构建产物 + 本地补丁

这个分支放的是**扩展的构建产物**（`dist`），不是源码。上游源码在 `jiuyang5354/bilibili-margin` 的 `main`，本 fork 的 `main` 也还是上游源码，没有被动过。

- 基线：MARGIN **0.49.1** 的已构建扩展（`manifest.json` / `content.js` / `pages/**`）
- 补丁：下表共 30 处，全部直接改在压缩后的产物里，**重新构建会被覆盖**
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
| `028bb16` | 动态页「关注的人」那条横向 UP 主列表里，**第一个 UP 主的选中框（键盘焦点框）左边被裁掉**：`.fd-ups-row` 是横向滚动容器（`overflow-x:auto`，会裁掉溢出内容），而焦点框是画在元素外面的（`outline-offset:3px` + 2px 描边，即向外 5px），条带本身又没有任何内边距，所以第一个元素只剩右侧那条竖线、左下角被切掉；后面几个元素左侧有 6px 间距、不会超出容器，看起来就正常。给条带加 `padding:6px`、再用 `margin:-6px` 把元素位置补回（元素坐标一点没变），焦点框四边都完整了 | `src/content/feed*.css`（`.fd-ups-row`） |
| `1e48a66` | 同一条带：滚到最右边时**去掉右侧渐隐**。条带原本用 `mask-image` 在右端做 8% 渐隐（提示右边还有内容），但这层渐隐也会盖住最后一个 UP 主的焦点框，和上面是同一种「框发虚 / 被切」。现在滚动时用 `data-end` 记下是否已经到底（内容不足一屏时也算到底），到底就把 mask 关掉；滚动、筛选、重新渲染后都会重算 | `src/content/feed*.ts`（关注条带的滚动处理）、`.fd-ups-row[data-end]` 样式 |
| `b012496` | 动态卡片的**转发 / 评论 / 赞三个按钮放大**：图标 15→20px，内边距 8×12→10×14，数字 11→13px，点击区从 31px 高变成 40px 高（宽度也跟着变大），鼠标/手指更容易点中；`.dy-stat` 的左负边距同步从 -12px 改成 -14px，按钮仍和正文左对齐。空间页「动态」tab 用的是同一套卡片，一并变大 | `src/content/ui/*.css`（`.dy-like` / `.dy-act` / `.dy-cmt`）、`.dy-stat` |
| `8763435` | **彻底移除「足迹热力图」**：首页的脚印卡片、设置里的「足迹热力图」开关、命令面板的「看足迹」、顶栏的「足迹」入口全部删掉；同时停掉支撑它的本机计时采集（`content.js` 原来每 15 秒往 `margin:activity` 记时长）和 background 的 `margin:'fp'` 读写，设置备份（导出/导入 JSON）只留设置、不再带 `activity`；`footprint` 从三份默认值表里删掉，`.fp-*` 样式一并清掉，首页版块顺序里的「足迹与天气」改叫「天气」。注意：设置里「顶栏入口」的「足迹」是 B 站自己的顶栏按钮，不是这个功能，保留 | `src/content/home*`、`src/content/settings*`、`src/shared/settings.ts`、`src/background/*`、`.fp-*` 样式 |
| `6b5f241` | 背景新增**「我的图片」图库**，随机背景可与内置样式混搭：设置 › 背景 › 我的图片里可多选上传、拖到区块里、或「从文件夹导入」（`webkitdirectory`，一次性扫描，不留文件夹句柄，避免每会话授权弹窗）；导入时只收 jpg/png/webp/avif/gif/bmp，长边压到 1920px（JPEG q.82）并存本机，另存 320px 缩略图；每张可**改名 / 删除 / 拖拽排序**，同一张重复导入会跳过，上限 200 张 / 500MB（manifest 加 `unlimitedStorage`）。随机范围（chips）新增「我的图片」，勾上后随机命中会走图片渲染路径、记住上一张不连续重复；`bg.pool` 为空仍表示「全部内置样式」，老行为不变。新文件 `pages/bg-library.js` | 新文件 `pages/bg-library.js`、`src/content/settings*`、`src/content/background*`、`src/shared/settings.ts` |
| `af18f0c` | 随机池**逐项可控**：图库里每张卡片右上角新增「随机」开关（索引里存 `on` 字段），关掉的图片不会被抽到，卡片变暗、顶部计数显示「N 张 · 随机 M 张」，全关时「我的图片」chip 自动禁用；内置样式的逐个开关仍是「随机范围」的 chips，现在被排除的样式会同步**变暗**（`data-off`），一眼能看出谁在池里。随机顺序仍记住上一张，不连续重复 | `pages/bg-library.js`（图库卡片与 `randomIds`）、`src/content/settings*`（chips 与样式格） |
| `22ec93b` | 动态页「回到顶部」按钮从**窗口右下角**移到**右侧栏（热搜）那一列的左边缘**：按钮仍是 fixed，但 `right` 改成按侧栏的 `getBoundingClientRect()` 算（左边缘 +17px、垂直仍距底 28px），窗口缩放时重算；`width<=1240px` 右侧栏隐藏时自动清掉内联值、退回原来的右下角 | `src/content/feed.ts`（`placeTop`）、`.fd-top` 样式 |
| `663f847` | 动态页展开的评论**字号加大、更好读**：正文 14→15px、行高 1.6→1.7（超过 5 行才折叠的阈值同步放宽到 6 行），昵称 13→14px，时间 / 回复数 / 「还有 N 条」等小字 11→12px，头像 28→30px，条间距 12→14px，表情 18→19px，「去详情页看全部评论」13→14px；评论右侧的**爱心 ♥ 换成和卡片底部「赞」一模一样的大拇指图标**（同一套 `ICONS.thumb` 描边图标，14px，数字在右） | `pages/dyn-comments.js`（评论行结构）、`pages/chunk-B_kxoJ70.js`（`.dy-cmt-*` 样式） |

> 一次性迁移的标记存在页面 `localStorage` 里（`margin:defaults-off-v2`），所以每个 b 站子域第一次加载都会跑一次，之后手动打开这些开关不会被覆盖。
