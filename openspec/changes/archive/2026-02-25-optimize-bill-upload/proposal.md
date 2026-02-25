## Why

目前，图片记账功能在处理时，需要先将图片上传至 Supabase Storage 获取公开 URL，Edge Function 再通过 URL 下载图片并调用大模型进行识别。此流程导致图片识别速度较慢，用户体验受到影响。此外，上传原图也消耗了更多的网络带宽和存储空间。本次优化的目的是通过前端压缩和调整图片处理流程（直接访问 Storage 并使用 base64 编码调用大模型），显著提升图片记账的整体速度。

## What Changes

- **前端图片压缩**：在用户选择图片后，将其上传至 Supabase Storage 之前，先在本地进行压缩，将图片质量控制在 0.65~0.8 之间，减少上传文件大小。
- **优化处理流程**：`process-bill` Edge Function 直接读取 Supabase Storage 中的图片内容，无需再通过 URL 下载。
- **大模型调用方式调整**：`process-bill` Edge Function 在调用大模型进行图片识别时，将原本通过图片 URL (image_url) 的传参方式修改为直接传递图片的 base64 编码 (data:image/jpg;base64,...)，减少大模型端的下载时间。

## Capabilities

### New Capabilities

- `bill-upload-optimization`: 定义图片上传前的压缩标准与质量要求。

### Modified Capabilities

- `process-bill-function`: 修改 `process-bill` 函数读取图片的方式（直读 Storage）以及调用大模型的传参方式（改为 base64）。

## Impact

- **前端代码**：需要引入或使用现有的图片压缩逻辑（如调用 Canvas API 或第三方库），并修改交易/上传相关的服务层代码。
- **Edge Function (`process-bill`)**：处理逻辑变更，不再依赖公网 URL 访问图片，并且传给大模型的 payload 结构将变化。
- **依赖**：可能需要前端添加图片压缩相关的轻量级依赖项（如果当前项目中没有）。
