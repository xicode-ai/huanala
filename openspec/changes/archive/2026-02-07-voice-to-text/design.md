## Context

花哪了（Hua Na Le）是一个基于 React 19 + TypeScript + Vite 的移动端优先记账应用，当前处于 Demo/Prototype 阶段，所有数据均为 Mock。Home 页和 Chat 页均已预留语音入口 UI（麦克风按钮、录音波形动画），但录音和转写功能未实现。应用后续将通过 Capacitor 打包为 Android 和 iOS 原生应用。

关键约束：

- **延迟要求极高**：用户停止说话到转写结果可用 < 500ms
- **跨三端运行**：Web 浏览器（开发调试）、Capacitor Android、Capacitor iOS
- **语言**：中文（普通话）和英文，需支持中英混合
- **Capacitor 已就绪**：项目已集成 Capacitor 8.x（`@capacitor/core` 8.0.2），Android 和 iOS 原生项目已生成，本次变更在此基础上集成语音识别插件

## Goals / Non-Goals

**Goals:**

- 实现端到端语音转文字能力，满足 < 500ms 转写延迟
- 提供跨平台统一的 `useSpeechToText` React Hook API
- 设计可扩展的引擎抽象层，支持未来新增 STT 引擎（如云服务）
- 改造 Home 页语音记账和 Chat 页语音输入，接入真实转写流程
- 支持实时中间结果（interim transcript）以提升用户体验

**Non-Goals:**

- 不实现语音唤醒 / 持续监听 / VAD（Voice Activity Detection）
- 不实现录音文件的存储、回放、或上传到服务器
- 不实现多语言自动检测（用户手动选择或使用系统默认语言）
- 不接入云端 STT 服务（留在未来迭代）
- 不发布到应用商店（但确保可以本地构建和真机调试）

## Decisions

### Decision 1: STT 引擎策略 — 原生优先 + Web 降级

**选择**: 采用分层混合策略（Native-First Hybrid）

| 环境               | 引擎                    | 底层技术                                          | 预期延迟  |
| ------------------ | ----------------------- | ------------------------------------------------- | --------- |
| Capacitor Android  | `CapacitorSpeechEngine` | Android SpeechRecognizer (Google Speech Services) | 100-300ms |
| Capacitor iOS      | `CapacitorSpeechEngine` | Apple Speech Framework (SFSpeechRecognizer)       | 100-300ms |
| Web Chrome / Edge  | `WebSpeechEngine`       | Web Speech API (`webkitSpeechRecognition`)        | 200-500ms |
| Web Safari         | `WebSpeechEngine`       | Web Speech API (有限支持)                         | 300-800ms |
| Web Firefox / 其他 | 不可用                  | —                                                 | —         |

**原因**:

- 原生语音引擎（Android / iOS 系统内置）延迟最低（100-300ms），完全满足 < 500ms 要求
- 原生引擎免费、无需 API Key、支持离线、中英文识别准确率高
- Web Speech API 在 Chrome 中表现良好，适合开发调试阶段使用
- 未来可扩展 `CloudSpeechEngine`（Deepgram / Azure / 讯飞等）作为第三种引擎

**否决方案**:

- ❌ **纯云端 STT（Deepgram / Azure / Google Cloud Speech）**: 网络往返 200-500ms + 处理时间，难以稳定保证 < 500ms；需要 API Key 管理和付费；离线不可用
- ❌ **WASM Whisper（本地模型）**: 模型加载 5-10 秒，单次转写 1-5 秒，远超 500ms 要求；WASM 在移动端性能不佳
- ❌ **纯 Web Speech API**: iOS WKWebView（Capacitor iOS）不支持 Web Speech API，无法覆盖全部目标平台

### Decision 2: 语音识别插件 — @capacitor-community/speech-recognition

**选择**: 使用 `@capacitor-community/speech-recognition` (v7.x)

**原因**:

- 社区最活跃的 Capacitor 语音识别插件，持续维护至 2025 年（最新 v7.0.1）
- 内置 partial results 支持（中间转写结果）
- 内置权限管理（Android / iOS）
- TypeScript 类型声明完备
- 同时支持 Android SpeechRecognizer 和 iOS SFSpeechRecognizer

**新增依赖**: `@capacitor-community/speech-recognition` (v7.x)

**原生权限配置**（需在已有原生项目中添加）:

- Android: `AndroidManifest.xml` 添加 `<uses-permission android:name="android.permission.RECORD_AUDIO"/>`
- iOS: `Info.plist` 添加 `NSSpeechRecognitionUsageDescription` 和 `NSMicrophoneUsageDescription`

**集成方式**: 作为 `CapacitorSpeechEngine` 的底层实现。Capacitor 环境下直接 import 该插件，Web 环境通过平台检测跳过。

### Decision 3: 架构分层 — 策略模式 + Hook 封装

```
┌─────────────────────────────────────────┐
│           Page Components               │
│     (Home.tsx / Chat.tsx)               │
│         ↓ uses hook                     │
├─────────────────────────────────────────┤
│       useSpeechToText Hook              │
│  (hooks/useSpeechToText.ts)             │
│  - React 状态管理 (status, transcript)  │
│  - 录音计时器                           │
│  - 生命周期 (mount/unmount cleanup)     │
│         ↓ delegates to                  │
├─────────────────────────────────────────┤
│     SpeechToTextService                 │
│  (services/speech/SpeechToTextService)  │
│  - 平台检测 & 引擎选择                 │
│  - 引擎实例化 & 缓存                   │
│  - 统一事件回调分发                     │
│         ↓ selects engine                │
├─────────────────────────────────────────┤
│          STT Engines                    │
│  ┌──────────────┐ ┌──────────────────┐  │
│  │WebSpeechEngine│ │CapacitorSpeech  │  │
│  │              │ │    Engine        │  │
│  │ Web Speech   │ │ @capacitor-     │  │
│  │ API          │ │ community/      │  │
│  │              │ │ speech-         │  │
│  │ (Chrome/Edge)│ │ recognition     │  │
│  └──────────────┘ └──────────────────┘  │
│         ↓ future                        │
│  ┌──────────────┐                       │
│  │CloudSpeech   │                       │
│  │Engine (预留) │                       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

**原因**:

- 策略模式使引擎可插拔，新增引擎只需实现 `SpeechEngine` 接口
- Hook 层隔离 React 关注点（状态、副作用、清理），Service 层关注平台逻辑
- 动态 import Capacitor 插件，避免 Web 环境打包不必要的原生依赖

### Decision 4: 文件组织

```
services/
  speech/
    types.ts                    # SpeechEngine 接口、事件类型、配置类型
    SpeechToTextService.ts      # 平台检测 + 引擎选择 + 统一 API
    engines/
      WebSpeechEngine.ts        # Web Speech API 实现
      CapacitorSpeechEngine.ts  # Capacitor 插件封装
hooks/
  useSpeechToText.ts            # React Hook（新建 hooks/ 目录）
```

**原因**:

- 遵循现有的 `services/` 目录约定，语音服务是新的服务模块
- `hooks/` 目录为新建，用于存放自定义 React Hook，与 `stores/`（Zustand）、`components/` 平级
- 引擎实现隔离在 `engines/` 子目录，便于未来扩展

### Decision 5: 平台检测策略

```typescript
function detectPlatform(): 'capacitor' | 'web' {
  // Capacitor 注入的全局对象
  if (typeof (window as any).Capacitor !== 'undefined') {
    return 'capacitor';
  }
  return 'web';
}
```

**原因**:

- Capacitor 打包后会在全局注入 `window.Capacitor` 对象，这是最可靠的检测方式
- 无需额外依赖 `@capacitor/core`，保持 Web 开发时的零 Capacitor 依赖
- 开发阶段（纯 Web）自动使用 WebSpeechEngine，无需手动切换

### Decision 6: 页面集成方式

**Home 页（语音记账）**:

- 替换现有空壳的 `handleStartRecording` / `handleStopRecording`
- 录音完成后，`transcript` 文本通过 Store 的新方法提交（替代原 `uploadVoice(null)`）
- 录音波形动画保留，绑定到 hook 的 `status === 'recording'` 状态

**Chat 页（语音输入）**:

- 麦克风按钮接入 `useSpeechToText`
- 转写文本自动填入 `inputValue`（通过 `setInputValue`）
- 用户可在发送前编辑转写结果

**两个页面共享同一个 Hook**，但各自独立实例化（不共享状态），避免页面切换时的状态冲突。

## Risks / Trade-offs

### [Risk] Web Speech API 浏览器兼容性有限

Web Speech API 在 Firefox 和部分浏览器中不可用，iOS Safari 支持有限。
→ **Mitigation**: Web 端定位为开发调试环境，生产环境以 Capacitor 原生为主。不支持的浏览器显示友好的降级提示，引导用户使用 Chrome 或安装 App。

### [Risk] 语音插件在 Web 环境的 fallback

`@capacitor-community/speech-recognition` 在纯 Web 环境（非 Capacitor WebView）无法工作。
→ **Mitigation**: 平台检测在引擎选择前执行。Web 环境自动使用 `WebSpeechEngine`，不会尝试加载 Capacitor 插件。

### [Risk] 原生语音识别的中英混合准确率

Android / iOS 原生引擎对中英混合语音的识别准确率不如专用云服务。
→ **Mitigation**: 当前阶段接受原生引擎的混合语言能力。后续可通过新增 `CloudSpeechEngine` 提供更高准确率选项。

### [Risk] 首次使用的权限弹窗影响体验

用户首次使用语音功能时会弹出系统权限请求。
→ **Mitigation**: 在用户点击录音按钮时才请求权限（而非应用启动时），减少侵入感。权限被拒绝后显示清晰的引导信息。

## Open Questions

1. **语言选择 UX**: 是否需要在 UI 上提供语言切换（中文/英文），还是跟随系统语言自动检测？初版建议跟随系统语言，后续根据用户反馈迭代。
2. **录音最大时长**: 是否需要限制单次录音最大时长（如 60 秒）？建议初版设置 30 秒上限，避免超长录音导致转写质量下降。
