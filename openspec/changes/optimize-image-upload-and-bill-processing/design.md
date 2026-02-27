## Context

当前图片记账流程：用户选择图片 → `compressImage()` 压缩（OffscreenCanvas, JPEG 0.7, max 2048px）→ 上传 Supabase Storage → 调用 `process-bill` Edge Function → AI 识别全部完成 → 批量插入数据库 → 返回完整结果给前端。

两个核心问题：

1. **压缩效率低**：230KB 图片仅压缩到 ~170KB（26%），因为 JPEG 0.7 在 2048px 大图上压缩空间有限。
2. **处理速度慢**：45 条手写记录时，AI 推理耗时长（预估 10-30 秒），用户无进度反馈，全程白等。且无任何性能日志，无法数据驱动优化。

相关已有实现：

- `services/imageCompression.ts`：OffscreenCanvas + createImageBitmap，无第三方依赖
- `supabase/functions/process-bill/index.ts`：非流式调用 `qwen3.5-plus`，单次批量 `.insert(rows)`
- `supabase/functions/_shared/qwen.js`：`generateVisionJson()` 非流式实现
- `services/transactionService.ts`：`uploadBill()` 调用 `supabase.functions.invoke('process-bill')` 等待完整响应

## Goals / Non-Goals

**Goals:**

- 图片压缩率达到 50%+（230KB → ≤115KB），同时保持 OCR 可识别的清晰度
- 在 `process-bill` 中增加关键步骤的耗时日志，量化各阶段瓶颈
- 缩短用户感知等待时间——通过流式处理让用户尽早看到识别结果
- 前端展示实时处理进度（已识别 N 条）

**Non-Goals:**

- 不更换 AI 模型（继续使用 qwen3.5-plus）
- 不修改数据库 schema
- 不改变图片存储策略（仍上传到 Supabase Storage）
- 不做离线/本地 OCR

## Decisions

### Decision 1: 图片压缩 — 优化原生 OffscreenCanvas 方案，不引入新依赖

**选择**：调整现有 OffscreenCanvas 参数（降低最大尺寸 + 切换 WebP 格式 + 降低质量参数），不引入 `browser-image-compression` 等第三方库。

**替代方案**：

- `browser-image-compression`（~25KB gzip）：功能强大，支持 Web Worker，但对于我们的简单场景过重
- `Compressor.js`（~5KB gzip）：轻量但底层也是 canvas，与原生方案无本质区别
- `pica`（~25KB gzip）：Lanczos3 高质量缩放，但 OCR 场景不需要这种精度

**理由**：

- 当前方案的瓶颈不在库的选择，而在参数配置——2048px + JPEG 0.7 对于 OCR 场景过于保守
- OCR 识别只需要文字清晰，1600px + WebP 0.6 即可满足，无需额外依赖
- 零新增包体积，零新增风险

**具体参数调整**：

| 参数                  | 当前值     | 新值                        | 理由                                           |
| --------------------- | ---------- | --------------------------- | ---------------------------------------------- |
| MAX_DIMENSION         | 2048px     | 1600px                      | OCR 文字识别的 Goldilocks 区间，等效 300 DPI   |
| 输出格式              | image/jpeg | image/webp（fallback jpeg） | WebP 在同体积下文字边缘更清晰，压缩率高 40-50% |
| quality               | 0.7        | 0.55                        | WebP 0.55 的视觉质量 ≈ JPEG 0.75，但体积更小   |
| imageSmoothingQuality | 未设置     | 'high'                      | 防止缩放时文字锯齿化                           |

**预期效果**：230KB → 60-80KB（65-70% 压缩率），远超 50% 目标。

### Decision 2: process-bill 性能日志 — 结构化 console.log 计时

**选择**：在 Edge Function 中用 `performance.now()` 或 `Date.now()` 对关键步骤计时，输出结构化 JSON 日志。

**日志点**：

1. 图片下载耗时（Storage download + base64 编码）
2. AI 请求耗时（从发送到完整接收）
3. 数据库操作耗时（session 创建 + transactions 批量插入）
4. 总耗时

**格式**：`console.log(JSON.stringify({ event: 'perf', step: '...', durationMs: N, meta: {...} }))`

**理由**：Supabase 日志面板可直接查看，JSON 格式便于后续搜索和分析。无需引入外部监控工具。

### Decision 3: 流式处理架构 — DashScope SSE + 增量 JSON 解析 + 逐条入库

**选择**：将 `process-bill` 改为流式架构：DashScope `stream: true` → SSE 解析 → 增量 JSON 提取 → 逐条插入数据库 → SSE 推送进度到前端。

**替代方案**：

- 保持非流式，仅优化数据库批量插入 → 不解决 AI 推理等待时间的问题
- 非流式 AI + 前端轮询进度 → 增加复杂度且无法真正缩短处理时间
- WebSocket → Supabase Edge Function 不支持 WebSocket

**架构流程**：

```
前端                          Edge Function                    DashScope API
  │                               │                               │
  │── POST /process-bill ────────>│                               │
  │                               │── fetch(stream:true) ────────>│
  │                               │<── SSE: data chunk 1 ─────────│
  │                               │   (增量解析 JSON, 提取完整对象)  │
  │                               │── INSERT transaction 1 ──> DB │
  │<── SSE: {status:"inserted"} ──│                               │
  │                               │<── SSE: data chunk N ─────────│
  │                               │── INSERT transaction N ──> DB │
  │<── SSE: {status:"completed"} ─│                               │
```

**关键技术点**：

1. **DashScope 流式调用**：在请求 body 中加 `stream: true`，DashScope OpenAI 兼容端点支持 SSE 格式输出，视觉模型（qwen3.5-plus）支持流式。
2. **SSE 解析**：在 Deno 中使用 `ReadableStream` + `TextDecoderStream` 手动解析 `data: ...` 行，或使用轻量 SSE 解析器。不引入重型依赖。
3. **增量 JSON 解析**：AI 返回的是 `{"transactions": [{...}, {...}, ...]}` 格式。使用字符串累积 + 正则/手动提取完整对象的方式。当检测到一个完整的 `{...}` 对象且后面跟着 `,` 或 `]` 时，认为该对象完整可入库。不引入 `@promplate/partial-json` 等第三方库——Deno 环境中 JSR 包兼容性不确定，手动解析更可控。
4. **逐条入库**：每提取一个完整 transaction 对象后立即 `normalizeTransaction()` + `INSERT`，不等待全部完成。
5. **Session 创建时机**：流式开始前先创建 `input_session`（record_count 设为 0），流式结束后更新 `record_count` 和 `total_amount`。
6. **前端 SSE 消费**：`transactionService.uploadBill()` 改用 `fetch` 直接调用 Edge Function（不经过 `supabase.functions.invoke`，因其不支持流式响应），手动读取 SSE 流，实时更新 UI。

### Decision 4: 前端调用方式 — 绕过 supabase.functions.invoke，直接 fetch

**选择**：`uploadBill` 改为直接 `fetch` Edge Function URL + 手动设置 Authorization header，以支持流式响应读取。

**理由**：`supabase.functions.invoke()` 内部会 `await response.json()`，无法获取原始 `ReadableStream`。直接 fetch 是唯一能消费 SSE 流的方式。

**Auth 处理**：复用现有的 `supabase.auth.getSession()` 获取 access_token，手动设置 `Authorization: Bearer <token>` header。

## Risks / Trade-offs

### [风险] 增量 JSON 解析可能遗漏或误判对象边界

→ **缓解**：流式结束后，做最终的完整 JSON 解析作为兜底。如果流式过程中遗漏了某些对象，在最终解析时补插入。同时保留 `ai_raw_output` 字段存储完整 AI 输出，便于问题排查。

### [风险] 流式处理中部分 INSERT 成功、部分失败导致数据不一致

→ **缓解**：每条 INSERT 独立处理，失败时记录日志但不中断流程。流式结束后更新 session 的 `record_count` 为实际成功插入的数量。前端展示时以实际数据库记录为准。

### [风险] 前端绕过 supabase.functions.invoke 后丢失中间件能力

→ **缓解**：仅 `uploadBill` 这一个调用改为直接 fetch，其余所有 Edge Function 调用保持原样。手动添加 Authorization header 即可。Error handling 在 fetch 层面处理。

### [风险] WebP 格式在旧浏览器/WebView 中不支持

→ **缓解**：`compressImage` 中检测 `canvas.convertToBlob({ type: 'image/webp' })` 是否生成了 WebP 格式（通过检查输出 blob 的 type），如果不支持则 fallback 到 JPEG 0.6。Capacitor WebView（Android 4.2+、iOS 14+）和现代浏览器均支持 WebP。

### [Trade-off] 逐条 INSERT vs 批量 INSERT

逐条 INSERT 会增加数据库 round-trip 次数（45 条 = 45 次请求），但每次 INSERT 延迟极低（<10ms），总计 <500ms，相比 AI 推理的 10-30 秒可忽略不计。收益是用户能实时看到每条记录的入库进度。

### [Trade-off] 手动 SSE 解析 vs 第三方库

选择手动解析而非引入 JSR 包，增加了少量代码但消除了 Deno 兼容性风险。SSE 格式简单（`data: ...\n\n`），手动解析代码量 <30 行。
