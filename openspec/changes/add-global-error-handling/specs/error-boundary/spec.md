## ADDED Requirements

### Requirement: React Error Boundary 捕获渲染异常

系统 SHALL 提供 ErrorBoundary 组件，包裹应用组件树，捕获子组件在渲染阶段（render、lifecycle、constructor）抛出的未处理异常，防止整个应用白屏。

#### Scenario: 子组件渲染异常时展示降级 UI

- **WHEN** ErrorBoundary 内部的子组件在渲染过程中抛出未捕获异常
- **THEN** ErrorBoundary SHALL 捕获该异常，展示降级 UI（Fallback），而非白屏
- **THEN** 降级 UI SHALL 包含错误提示信息和"重试"操作入口

#### Scenario: 正常渲染时透明传递

- **WHEN** 子组件正常渲染无异常
- **THEN** ErrorBoundary SHALL 透明地渲染子组件，不影响正常功能

#### Scenario: 用户点击重试恢复正常

- **WHEN** 用户在降级 UI 中点击"重试"按钮
- **THEN** ErrorBoundary SHALL 重置内部错误状态，重新尝试渲染子组件

### Requirement: ErrorBoundary 在应用根级别包裹

ErrorBoundary SHALL 在 App 组件中包裹路由组件树，作为最外层的渲染异常防护。

#### Scenario: 路由组件崩溃不影响全局 UI

- **WHEN** 某个路由页面组件渲染崩溃
- **THEN** ErrorBoundary SHALL 仅在该页面区域展示降级 UI
- **THEN** 全局组件（如 ToastContainer）SHALL 不受影响，继续正常工作
