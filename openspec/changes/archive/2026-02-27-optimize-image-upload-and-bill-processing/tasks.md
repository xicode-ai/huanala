## 1. 图片压缩优化

- [x] 1.1 修改 `services/imageCompression.ts` — 将 `MAX_DIMENSION` 从 2048 降为 1600，将默认 `quality` 从 0.7 改为 0.55
- [x] 1.2 修改 `services/imageCompression.ts` — 在 `compressImage` 中 canvas context 设置 `imageSmoothingEnabled = true` 和 `imageSmoothingQuality = 'high'`
- [x] 1.3 修改 `services/imageCompression.ts` — 将输出格式从 `image/jpeg` 改为 `image/webp`（quality 0.55），增加 WebP 不支持时 fallback 到 JPEG（quality 0.6）的逻辑：检查输出 blob 的 type 是否为 `image/webp`，若不是则重新用 JPEG 编码
- [x] 1.4 修改 `services/imageCompression.ts` — `compressImage` 返回值需携带实际输出的 MIME type 信息，以便上传时使用正确的 contentType 和文件扩展名（考虑返回 `{ blob, mimeType }` 或在 blob 上直接使用 `.type`）
- [x] 1.5 修改 `services/transactionService.ts` — `uploadBill` 中根据压缩后 blob 的 type 设置正确的 `contentType`（`image/webp` 或 `image/jpeg`）和文件扩展名（`.webp` 或 `.jpg`）
- [x] 1.6 验证压缩效果 — 用 230KB 左右的测试图片确认压缩后体积 ≤115KB（50%+ 压缩率），且图片文字清晰可辨（需运行时手动验证）

## 2. process-bill 性能日志

- [x] 2.1 修改 `supabase/functions/process-bill/index.ts` — 在图片下载+base64 编码步骤前后添加计时日志：`{ event: "perf", step: "image_download", durationMs, meta: { storagePath, imageSizeBytes } }`
- [x] 2.2 修改 `supabase/functions/process-bill/index.ts` — 在 AI 请求前后添加计时日志：`{ event: "perf", step: "ai_request", durationMs, meta: { model, streamMode, totalTokens } }`
- [x] 2.3 修改 `supabase/functions/process-bill/index.ts` — 在数据库操作前后添加计时日志：`{ event: "perf", step: "db_operations", durationMs, meta: { sessionCreated, transactionsInserted } }`
- [x] 2.4 修改 `supabase/functions/process-bill/index.ts` — 在整个处理流程结束时添加总计时日志：`{ event: "perf", step: "total", durationMs, meta: { success, transactionCount } }`

## 3. Qwen 流式 API 支持

- [x] 3.1 修改 `supabase/functions/_shared/qwen.js` — 新增 `generateVisionJsonStream(prompt, imageUrl, onChunk)` 函数，调用 DashScope API 时设置 `stream: true`
- [x] 3.2 实现 `generateVisionJsonStream` 中的 SSE 解析逻辑 — 从 `response.body` ReadableStream 中按行读取，解析 `data: ` 前缀的 SSE 行，提取 `choices[0].delta.content`，调用 `onChunk(delta)`
- [x] 3.3 实现 `generateVisionJsonStream` 中的流结束处理 — 检测 `data: [DONE]` 行，返回累积的完整文本；对非 2xx 响应抛出 `AI_REQUEST_FAILED` 错误

## 4. process-bill 流式处理重构

- [x] 4.1 修改 `supabase/functions/process-bill/index.ts` — 将响应改为 SSE 流式：创建 `TransformStream`，返回 `new Response(readable, { headers: { 'Content-Type': 'text/event-stream', ... } })`
- [x] 4.2 修改 `supabase/functions/process-bill/index.ts` — 在流式开始前创建 `input_session`（record_count: 0, total_amount: 0）
- [x] 4.3 修改 `supabase/functions/process-bill/index.ts` — 调用 `generateVisionJsonStream` 替代 `generateVisionJson`，在 `onChunk` 回调中累积文本并实现增量 JSON 对象提取逻辑（检测完整的 `{...}` 对象边界）
- [x] 4.4 实现逐条入库逻辑 — 每提取一个完整 transaction 对象后，`normalizeTransaction()` + INSERT 到数据库，并通过 SSE 发送 `transaction_inserted` 事件给前端
- [x] 4.5 实现流结束处理 — DashScope 流结束后，对完整文本做最终 JSON 解析，补插入遗漏的 transaction 对象；更新 `input_session` 的 `record_count` 和 `total_amount`；发送 `completed` 事件并关闭流
- [x] 4.6 实现错误处理 — 不可恢复错误时发送 `error` SSE 事件并关闭流；单条 INSERT 失败时记录日志但不中断流程

## 5. 前端流式消费

- [ ] 5.1 修改 `services/transactionService.ts` — `uploadBill` 改为直接 `fetch` Edge Function URL（不使用 `supabase.functions.invoke`），手动设置 `Authorization: Bearer <token>` header
- [ ] 5.2 修改 `services/transactionService.ts` — 实现 SSE 流读取逻辑，从 `response.body` ReadableStream 中解析 SSE 事件
- [ ] 5.3 修改 `services/transactionService.ts` — 处理 `transaction_inserted` 事件时累积 transactions 数组，处理 `completed` 事件时组装最终的 `{ session, transactions }` 返回值
- [ ] 5.4 修改 `services/transactionService.ts` — `uploadBill` 签名增加可选的 `onProgress` 回调参数（如 `onProgress?: (info: { completed: number; latest: Transaction }) => void`），每收到一条 transaction 时调用
- [ ] 5.5 修改 `stores/useTransactionStore.ts` — `uploadBill` action 传入 `onProgress` 回调，更新 store 状态以便 UI 展示实时进度
- [ ] 5.6 修改 `pages/Home.tsx` — 在上传处理过程中展示实时进度信息（如"已识别 N 条记录"）

## 6. 测试与验证

- [ ] 6.1 更新 `services/imageCompression.ts` 相关的单元测试（如有），验证 WebP 输出、fallback 逻辑、新尺寸和质量参数
- [ ] 6.2 端到端验证 — 上传含多条记录的账单图片，确认流式返回正常、进度实时更新、最终数据完整
- [ ] 6.3 运行 `pnpm lint` 和 `pnpm build` 确认无编译和 lint 错误
