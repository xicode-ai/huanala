## Why

当前图片记账存在两个体验瓶颈：（1）前端图片压缩效果不足——230KB 的图片仅压缩到 170KB（约 26% 压缩率），远低于用户期望的 50%+ 压缩率；（2）`process-bill` Edge Function 处理大量记录时速度极慢——上传一张包含约 45 条手写记录的清单，从 AI 识别到入库全流程耗时过长，且缺乏性能日志无法定位瓶颈。需要同时优化压缩算法和后端处理流程以提升用户体验。

## What Changes

- **升级图片压缩方案**：替换当前基于 OffscreenCanvas 的简单压缩为更高效的压缩策略——降低最大尺寸阈值（OCR 场景不需要 2048px）、采用更激进的质量参数、评估引入专业压缩库（如 browser-image-compression）或使用多步压缩策略（先缩放再压缩），目标实现 50%+ 的体积压缩同时保持 OCR 可识别的清晰度。
- **增加 process-bill 性能日志**：在 Edge Function 中添加关键步骤的耗时日志（图片下载、AI 请求、数据库操作），以数据驱动后续优化。
- **优化 process-bill 处理速度**：评估并实现 AI 流式输出 + 边解析边入库的方案——通过 DashScope 流式 API 逐步接收 AI 输出，实时解析出完整的 transaction 记录后立即入库，无需等待全部结果返回，大幅缩短用户等待时间。
- **前端进度反馈优化**：配合后端流式处理，考虑向前端提供处理进度信息（如已识别 N 条记录），提升用户感知速度。

## Capabilities

### New Capabilities

- `advanced-image-compression`: 定义升级后的图片压缩标准——压缩率目标、最大尺寸、质量参数范围、压缩库选型要求，以及 OCR 清晰度的最低保障。
- `bill-processing-performance`: 定义 process-bill 的性能日志规范和流式处理架构——包括关键步骤耗时记录、AI 流式输出解析、边解析边入库的处理流程、以及错误恢复机制。

### Modified Capabilities

- `qwen-ai-provider`: 新增流式输出支持——在现有 `generateVisionJson` 基础上增加流式变体，支持通过 DashScope streaming API 逐步接收和回调 AI 响应内容。

## Impact

- **前端代码**：`services/imageCompression.ts` 需要重写压缩逻辑；可能引入新的图片压缩依赖包。
- **Edge Function**：`supabase/functions/process-bill/index.ts` 需要重构为流式处理架构；`supabase/functions/_shared/qwen.js` 需要新增流式 API 调用能力。
- **API 契约**：`process-bill` 的响应方式可能从单次 JSON 响应变更为流式响应（SSE 或 chunked），前端调用方式需要相应调整。
- **依赖**：前端可能新增图片压缩库（如 `browser-image-compression`）；后端无新增依赖（DashScope API 原生支持流式）。
- **数据库**：无 schema 变更，仅影响写入时机（从一次性批量写入变为逐条/分批写入）。
