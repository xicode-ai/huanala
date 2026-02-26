---
trigger: always_on
---

# 花哪了 (Hua Na Le)- rules

## 项目概述

- **名称**: 花哪了 (Hua Na Le)
- **类型**: 移动优先的个人记账与财务管理应用，集成 AI 智能助手
- **技术栈**: React 19, TypeScript, Vite, Tailwind CSS, Zustand, ECharts, Supabase, Capacitor
- **阶段**: 早期开发 (Demo/Prototype)

---

## 语言与类型规范

- 全部使用 **TypeScript** (`.tsx` / `.ts`)
- 接口使用 `interface` 关键字定义，而非 `type`
- 类型定义集中在 `types.ts`
- 组件 Props 命名为 `interface XxxProps`
- 避免使用 `any`，优先显式类型定义

---

## React 组件风格

- 使用 **函数式组件**，类型注解为 `React.FC<Props>`
- 使用 **命名导出**: `export const ComponentName` (例外: `App.tsx` 使用 `export default`)
- 使用 React Hooks: `useState`, `useEffect`, `useRef` 等
- **禁止使用 class 组件**
- 遵循 Hooks 规则，确保依赖数组正确

---

## 命名约定

| 类型      | 命名规范                | 示例                                    |
| --------- | ----------------------- | --------------------------------------- |
| 文件名    | PascalCase              | `LoginOneClick.tsx`, `MobileLayout.tsx` |
| 组件名    | PascalCase              | `Home`, `ChatMessage`                   |
| 变量/函数 | camelCase               | `handleClick`, `isLoading`              |
| 常量      | UPPER_SNAKE_CASE        | `MOCK_USER`, `API_BASE_URL`             |
| 接口      | PascalCase              | `User`, `Transaction`, `Message`        |
| Hooks     | use 前缀 + camelCase    | `useUserStore`, `useSpeechToText`       |
| Store     | use 前缀 + 名词 + Store | `useUserStore`, `useChatStore`          |
| Service   | 名词 + Service          | `authService`, `chatService`            |

---

## 项目结构

```
huanala/
├── pages/          # 页面级组件（路由）
├── components/     # 可复用 UI 组件
├── stores/         # Zustand 状态 stores
├── services/       # API 层与数据服务
├── hooks/          # 自定义 Hooks
├── tests/          # 测试文件（镜像源码结构）
├── supabase/       # Supabase 配置与 Edge Functions
├── types.ts        # 全局类型定义
├── App.tsx         # 应用入口，路由配置
└── index.css       # 全局样式
```

### 文件放置规则

- **页面组件** → `pages/`
- **可复用组件** → `components/`
- **状态管理** → `stores/`
- **API 调用** → `services/`
- **自定义 Hook** → `hooks/`
- **测试文件** → `tests/`，使用 `*.test.ts` / `*.test.tsx`

---

## 状态管理规范

### Zustand Store

- 全局/共享状态使用 Zustand stores
- Store 文件放在 `stores/` 目录
- Store 命名: `use${Name}Store`

### Store 方法命名

| 前缀     | 用途     | 示例                             |
| -------- | -------- | -------------------------------- |
| `fetch*` | 获取数据 | `fetchUser`, `fetchTransactions` |
| `set*`   | 设置值   | `setInputValue`, `setUser`       |
| 动词     | 操作     | `login`, `logout`, `sendMessage` |

### 示例结构

```typescript
interface XxxState {
  // 状态
  data: DataType;
  isLoading: boolean;
  error: string | null;

  // 方法
  fetchData: () => Promise<void>;
  setData: (data: DataType) => void;
  clearError: () => void;
}

export const useXxxStore = create<XxxState>((set, get) => ({
  // 实现
}));
```

---

## 样式规范

### Tailwind CSS

- 全部使用 **Tailwind CSS** utility classes
- 不使用 CSS Modules 或 styled-components
- 动态样式使用模板字符串: `` `text-${color}` ``

### 自定义主题

颜色定义在 `tailwind.config.ts`:

| Token           | 色值    | 用途       |
| --------------- | ------- | ---------- |
| `primary`       | #2563EB | 主色       |
| `primary-soft`  | #4361EE | 主色柔和版 |
| `electric-blue` | #0052FF | 强调蓝     |
| `marigold`      | #FFAD1F | 强调黄     |
| `text-main`     | #1E293B | 主文字     |
| `text-sub`      | #64748B | 次文字     |

### 字体系统

- `font-display` (Manrope) - 主显示字体
- `font-sc` (Noto Sans SC) - 中文字体
- `font-inter` (Inter) - 辅助字体

### 阴影系统

- `shadow-soft` - 柔和阴影
- `shadow-glow` - 发光效果
- `shadow-card` - 卡片阴影

### 图标系统

- Google Material Symbols Outlined
- Font Awesome 6

---

## UI/UX 原则

- **移动优先**: `MobileLayout` 容器限制 `max-w-md`
- **全屏高度**: 使用 `100dvh` (dynamic viewport height)
- **圆角设计**: `rounded-2xl`, `rounded-4xl`
- **现代美学**: 渐变、毛玻璃效果、微动画

---

## 服务层规范

### 结构

```typescript
export const xxxService = {
  methodName: async (params: ParamsType): Promise<ReturnType> => {
    // 实现
  },
};
```

### 命名

- 文件: `xxxService.ts`
- 对象: `xxxService`
- 方法: 动词 + 名词 (如 `fetchAll`, `sendMessage`, `uploadBill`)

### 现有服务

| 服务                 | 用途                            |
| -------------------- | ------------------------------- |
| `authService`        | 认证（OTP 发送/验证、会话管理） |
| `userService`        | 用户数据 CRUD                   |
| `transactionService` | 交易记录 CRUD、语音/账单上传    |
| `chatService`        | AI 聊天消息                     |
| `supabase`           | Supabase 客户端配置             |

---

## 路由规范

- 使用 **HashRouter** (`react-router-dom`)
- 保护路由使用 `ProtectedRoute` 组件
- 访客路由使用 `GuestRoute` 组件

### 路由结构

| 路径        | 组件            | 保护级别   |
| ----------- | --------------- | ---------- |
| `/`         | Home            | Protected  |
| `/chat`     | Chat            | Protected  |
| `/settings` | ProfileSettings | Protected  |
| `/login`    | LoginOneClick   | Guest Only |

---

## 代码质量

### ESLint 规则

- 使用 ESLint 9 flat config
- 启用 typescript-eslint, react-hooks, react-refresh

### Prettier 配置

- 2 空格缩进
- 单引号
- 有分号
- 尾逗号 (es5)
- 120 字符行宽
- LF 换行符

---

## 测试规范

- 使用 **Vitest** 测试框架
- Testing Library: `@testing-library/react`
- 测试文件位于 `tests/` 目录
- 命名: `*.test.ts` / `*.test.tsx`

---

## 核心开发原则

1. **可测试性**: 编写可测试的代码，组件保持单一职责
2. **DRY 原则**: 避免重复代码，提取共用逻辑
3. **代码简洁**: 遵循 KISS 原则
4. **命名规范**: 使用描述性名称，反映用途和含义
5. **注释文档**: 为复杂逻辑添加注释
6. **异常处理**: 正确处理边缘情况，提供有用错误信息
7. **谨慎修改**: 仅针对明确需求进行更改
8. **避免引入新模式**: 修复问题时优先使用现有实现

---

## 禁止事项

- ❌ 使用 `any` 类型
- ❌ 使用 class 组件
- ❌ 使用 CSS Modules 或 styled-components
- ❌ 直接操作 DOM（使用 React refs）
- ❌ 在组件外部调用 Hooks
- ❌ 忽略 TypeScript 错误
- ❌ 硬编码颜色值（使用 Tailwind token）

---

## 常用命令

```bash
pnpm dev          # 开发服务器 (localhost:3000)
pnpm build        # 构建生产版本
pnpm lint         # 运行 ESLint
pnpm lint:fix     # 修复 lint 问题
pnpm format       # 格式化代码
pnpm test         # 运行测试
pnpm test:watch   # 监视模式测试
```

---

## 数据模型参考

详见 `types.ts`:

- `User` - 用户信息
- `Transaction` - 交易记录
- `Message` - 聊天消息
- `ChartData` - 图表数据
