## 1. 依赖安装与原生权限配置

- [x] 1.1 安装 `@capacitor-community/speech-recognition` 插件并执行 `npx cap sync`
- [x] 1.2 Android 权限配置：在 `android/app/src/main/AndroidManifest.xml` 中添加 `RECORD_AUDIO` 权限声明
- [x] 1.3 iOS 权限配置：在 `ios/App/App/Info.plist` 中添加 `NSSpeechRecognitionUsageDescription` 和 `NSMicrophoneUsageDescription` 描述文本

## 2. 核心类型与接口定义

- [x] 2.1 创建 `services/speech/types.ts`：定义 `SpeechEngine` 接口（`start`, `stop`, `cancel`, `onResult`, `onInterim`, `onError`, `isAvailable`）、`SpeechStatus` 类型（`idle | recording | transcribing | error`）、`SpeechResult` 类型、`SpeechError` 类型和 `SpeechConfig` 配置类型（language, maxDuration 等）

## 3. STT 引擎实现

- [x] 3.1 创建 `services/speech/engines/WebSpeechEngine.ts`：实现 `SpeechEngine` 接口，封装 Web Speech API（`webkitSpeechRecognition` / `SpeechRecognition`），支持 interim results、语言设置、错误映射和可用性检测
- [x] 3.2 创建 `services/speech/engines/CapacitorSpeechEngine.ts`：实现 `SpeechEngine` 接口，封装 `@capacitor-community/speech-recognition` 插件，包含权限请求（`requestPermissions`）、partial results 处理、语言设置和可用性检测
- [x] 3.3 两个引擎均实现并发录音防护：若已在录音状态则拒绝新的 `start()` 请求

## 4. 服务层 — SpeechToTextService

- [x] 4.1 创建 `services/speech/SpeechToTextService.ts`：实现平台检测函数（`window.Capacitor` 检测）、引擎自动选择逻辑（Capacitor 环境用 CapacitorSpeechEngine，Web 环境用 WebSpeechEngine）、引擎实例缓存和统一的 start/stop/cancel API
- [x] 4.2 实现引擎降级逻辑：若首选引擎不可用（如浏览器不支持 Web Speech API），返回明确的不可用状态和错误信息

## 5. React Hook — useSpeechToText

- [x] 5.1 创建 `hooks/useSpeechToText.ts`：封装 SpeechToTextService，管理 React 状态（`status`, `transcript`, `interimTranscript`, `error`, `duration`），暴露 `startRecording()`, `stopRecording()`, `cancelRecording()` 方法
- [x] 5.2 实现录音计时器：录音开始时启动 interval 更新 `duration`（秒），停止/取消时清除
- [x] 5.3 实现最大录音时长限制（默认 30 秒）：到达上限时自动停止录音并返回当前转写结果
- [x] 5.4 实现组件卸载清理：在 `useEffect` cleanup 中自动停止录音、释放麦克风、清除计时器，防止内存泄漏

## 6. Home 页集成 — 语音记账

- [x] 6.1 在 `pages/Home.tsx` 中引入 `useSpeechToText` Hook，替换现有空壳的 `handleStartRecording` 和 `handleStopRecording` 为 Hook 的 `startRecording()` / `stopRecording()`
- [x] 6.2 将录音波形动画的显示条件绑定到 Hook 的 `status === 'recording'` 状态
- [x] 6.3 录音完成后（`status` 从 `transcribing` 变为 `idle` 且 `transcript` 非空），将转写文本通过 Store 提交（重构 `uploadVoice` 方法接收文字参数）
- [x] 6.4 显示错误状态：权限被拒绝、引擎不可用、空录音等场景的用户提示

## 7. Chat 页集成 — 语音输入

- [x] 7.1 在 `pages/Chat.tsx` 中引入 `useSpeechToText` Hook，将聊天输入栏的麦克风按钮（`<Icon name="mic">`）绑定到 `startRecording()` / `stopRecording()`
- [x] 7.2 录音过程中切换麦克风按钮为录音中状态（如按钮高亮/动画），并显示 interim transcript
- [x] 7.3 录音完成后将 `transcript` 填入 `inputValue`（通过 `setInputValue`），用户可编辑后发送
- [x] 7.4 显示错误状态：权限被拒绝、引擎不可用等场景的用户提示

## 8. Store 重构

- [x] 8.1 重构 `useTransactionStore` 中的 `uploadVoice` 方法：将参数从 `audioData: any` 改为 `transcriptText: string`，基于转写文本创建交易记录（保持现有 Mock 逻辑）

## 9. 验证与测试

- [x] 9.1 Web 端验证：在 Chrome 浏览器中测试完整的语音录制→转写→提交流程（Home 页和 Chat 页）
- [x] 9.2 验证不支持 Web Speech API 的浏览器（如 Firefox）显示友好的降级提示
- [x] 9.3 验证录音状态管理：确保 start → recording → stop → transcribing → idle 完整生命周期，以及 cancel 正确丢弃音频
- [x] 9.4 验证错误处理：权限拒绝、空录音、并发录音防护等场景
