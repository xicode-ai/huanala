## Why

应用的语音记账（Home 页）和 AI 洞察对话（Chat 页）都预留了语音入口（麦克风按钮、录音波形动画），但实际的语音录制和语音转文字功能尚未实现。用户无法通过语音与应用交互，而语音是移动端最自然高效的输入方式。

项目已集成 Capacitor 8.x（`@capacitor/core` 8.0.2），Android 和 iOS 原生项目已初始化（`appId: com.huanale.app`），具备打包为原生 App 的基础能力。这为使用原生语音识别引擎（Android SpeechRecognizer / iOS SFSpeechRecognizer）提供了条件，可以实现远优于纯 Web 方案的低延迟语音转写体验。

实现语音转文字是后续接入 AI 大模型（通过文字与 LLM 交互）的前置条件，也是产品从 Demo 迈向可用状态的关键一步。

## What Changes

- **新增实时语音录制能力**：支持跨平台（Web 浏览器 + Capacitor Android/iOS）的麦克风录音，提供统一的录制 API
- **新增语音转文字（STT）引擎集成**：将录制的音频实时转写为文字，要求端到端延迟 < 500ms，支持中文和英文。Capacitor 环境使用原生语音识别引擎（Android SpeechRecognizer / iOS SFSpeechRecognizer），Web 环境使用 Web Speech API
- **新增语音输入 Hook**：封装录音 + 转写的完整流程为可复用的 React Hook，供 Home 和 Chat 页面直接消费
- **改造 Home 页语音记账**：将现有的空壳录音交互（`handleStartRecording` / `handleStopRecording`）接入真实的语音转文字流程，录音结果以文字形式提交
- **改造 Chat 页语音输入**：将聊天输入栏的麦克风按钮接入语音转文字，转写文字自动填入输入框或直接发送

## Capabilities

### New Capabilities

- `speech-to-text`: 核心语音转文字能力——涵盖跨平台麦克风录音、实时音频流转写、转写结果回调、录音状态管理、错误处理，以及 Web / Capacitor 双环境适配策略。性能要求：转写延迟 < 500ms。

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **页面组件**: `pages/Home.tsx`（语音记账流程）、`pages/Chat.tsx`（语音输入）
- **新增模块**: 语音录制服务、STT 引擎适配层、`useSpeechToText` Hook
- **新增插件依赖**: 引入 `@capacitor-community/speech-recognition` 语音识别插件
- **权限**: 需要麦克风和语音识别权限（Web 端 `getUserMedia`，Android `RECORD_AUDIO`，iOS `NSSpeechRecognitionUsageDescription` + `NSMicrophoneUsageDescription`）
- **Store**: `useTransactionStore` 的 `uploadVoice` 方法需要重构以接收文字而非原始音频数据
- **原生项目**: 需要在 Android 和 iOS 原生项目中配置语音识别相关权限
