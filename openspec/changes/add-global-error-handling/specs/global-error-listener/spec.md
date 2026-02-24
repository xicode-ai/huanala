## ADDED Requirements

### Requirement: 全局未捕获 JavaScript 错误监听

系统 SHALL 注册 `window.addEventListener('error')` 监听器，捕获所有逃逸的运行时 JavaScript 错误，并向用户展示统一的错误提示。

#### Scenario: 未捕获的运行时错误触发 Toast

- **WHEN** 应用中发生未被任何 try/catch 或 Error Boundary 捕获的 JavaScript 运行时错误
- **THEN** 系统 SHALL 通过 Toast 向用户展示 `error` 类型的提示信息
- **THEN** 系统 SHALL 在控制台输出错误详情用于调试

#### Scenario: 浏览器扩展等非业务错误被过滤

- **WHEN** 捕获到的错误来源于非应用代码（如浏览器扩展注入的脚本）
- **THEN** 系统 SHALL 忽略该错误，不向用户展示 Toast

### Requirement: 全局未处理 Promise Rejection 监听

系统 SHALL 注册 `window.addEventListener('unhandledrejection')` 监听器，捕获所有未处理的 Promise rejection。

#### Scenario: 未处理的 Promise rejection 触发 Toast

- **WHEN** 某个 Promise 被 reject 且没有对应的 .catch() 或 try/catch 处理
- **THEN** 系统 SHALL 通过 Toast 向用户展示 `error` 类型的提示信息
- **THEN** 系统 SHALL 在控制台输出 rejection 详情用于调试

### Requirement: 监听器生命周期管理

全局错误监听器 SHALL 在应用根组件挂载时注册，在卸载时移除，避免内存泄漏。

#### Scenario: 应用启动时注册监听器

- **WHEN** App 根组件首次挂载
- **THEN** 系统 SHALL 注册 `error` 和 `unhandledrejection` 两个全局监听器

#### Scenario: 应用卸载时移除监听器

- **WHEN** App 根组件卸载
- **THEN** 系统 SHALL 移除之前注册的全局监听器，释放资源
