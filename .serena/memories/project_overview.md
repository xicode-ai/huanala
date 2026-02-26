# 花哪了 (Hua Na Le) - 项目深度分析

## 项目概述

**名称**: 花哪了 (Hua Na Le)  
**类型**: 移动优先的个人记账与财务管理应用，集成 AI 智能助手  
**阶段**: 早期开发 (Demo/Prototype)  
**仓库路径**: `/Users/louis/Documents/idea_workspace/github/xicode-ai/huanala`

## 技术栈

### 前端核心

| 技术             | 版本   | 用途                          |
| ---------------- | ------ | ----------------------------- |
| React            | 19.2.4 | UI 框架，使用最新版本         |
| TypeScript       | 5.8.2  | 类型安全                      |
| Vite             | 6.2.0  | 构建工具，开发服务器端口 3000 |
| Tailwind CSS     | 3.4.19 | 样式系统                      |
| Zustand          | 5.0.11 | 轻量级状态管理                |
| React Router DOM | 7.13.0 | 路由（HashRouter）            |
| ECharts          | 5.4.3  | 图表可视化                    |

### 后端与数据

| 技术       | 用途                                        |
| ---------- | ------------------------------------------- |
| Supabase   | BaaS 平台，提供认证、数据库、Edge Functions |
| Gemini API | AI 功能（聊天、语音处理、账单识别）         |

### 移动端

| 技术               | 版本  | 用途               |
| ------------------ | ----- | ------------------ |
| Capacitor Core     | 8.0.2 | 跨平台移动应用框架 |
| Capacitor iOS      | 8.0.2 | iOS 原生支持       |
| Capacitor Android  | 8.0.2 | Android 原生支持   |
| Speech Recognition | 7.0.1 | 语音识别插件       |

### 开发工具

- **ESLint 9** + TypeScript ESLint
- **Prettier** (2 空格缩进，单引号，分号，120 字符行宽)
- **Vitest** 测试框架 + Testing Library
- **PostCSS + Autoprefixer**

## 项目架构

```
huanala/
├── pages/                    # 页面级组件（路由）
│   ├── Home.tsx             # 主页仪表盘
│   ├── Chat.tsx             # AI 聊天页面
│   ├── LoginOneClick.tsx    # 登录页（OTP 验证）
│   ├── ProfileSettings.tsx  # 个人设置
│   ├── SystemSettings.tsx   # 系统设置
│   └── Sidebar.tsx          # 侧边栏导航
├── components/              # 可复用 UI 组件
│   ├── MobileLayout.tsx     # 移动端布局容器
│   ├── EChartsPie.tsx       # 饼图组件
│   ├── Icon.tsx             # 图标组件
│   └── Skeleton.tsx         # 骨架屏加载
├── stores/                  # Zustand 状态管理
│   ├── useUserStore.ts      # 用户认证状态
│   ├── useTransactionStore.ts # 交易记录状态
│   ├── useChatStore.ts      # AI 聊天状态
│   └── index.ts             # 导出入口
├── services/                # API 服务层
│   ├── supabase.ts          # Supabase 客户端配置
│   ├── authService.ts       # 认证服务（OTP）
│   ├── userService.ts       # 用户数据服务
│   ├── transactionService.ts # 交易记录服务
│   ├── chatService.ts       # AI 聊天服务
│   └── speech/              # 语音识别模块
├── hooks/                   # 自定义 Hooks
│   └── useSpeechToText.ts   # 语音转文字 Hook
├── supabase/               # Supabase 配置与 Edge Functions
│   ├── config.toml         # Supabase 本地配置
│   └── functions/          # Edge Functions
│       ├── ai-chat/        # AI 聊天处理
│       ├── process-bill/   # 账单图片识别
│       ├── process-voice/  # 语音记账处理
│       └── _shared/        # 共享模块（Gemini、CORS、Auth）
├── tests/                  # 测试文件目录
├── ios/                    # iOS 原生项目
├── android/                # Android 原生项目
├── App.tsx                 # 应用入口，路由配置
├── types.ts                # 全局类型定义
├── index.tsx               # React 挂载点
└── index.css               # 全局样式
```

## 核心功能模块

### 1. 用户认证

- **OTP 邮箱验证登录**
- 状态: `useUserStore` 管理
- 服务: `authService` (sendOtp, verifyOtp, getSession, signOut)
- 支持会话持久化和自动刷新

### 2. 交易记录管理

- **CRUD 操作**: 增删改查交易记录
- **语音记账**: 语音输入 → AI 解析 → 自动创建记录
- **账单拍照**: 图片识别 → AI 解析 → 自动创建记录
- 状态: `useTransactionStore`
- 服务: `transactionService` (fetchAll, insert, uploadBill, processVoice)

### 3. AI 智能助手

- **自然语言交互**: 查询消费、分析报表
- **图表生成**: 支持返回饼图等可视化数据
- **交易列表展示**: AI 可返回交易列表类型消息
- 状态: `useChatStore`
- 服务: `chatService` (fetchHistory, sendMessage)

### 4. 数据可视化

- **月度消费饼图**: ECharts 饼图展示分类消费
- **预算进度**: 显示预算使用百分比
- **每日可用**: 计算每日可用金额

## 数据模型

### User (用户)

```typescript
interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  isPremium: boolean;
  phone: string;
  balance: number;
  monthlyExpenses: number;
  dailyAvailable: number;
  budgetUsedPercent: number;
  leftAmount: number;
}
```

### Transaction (交易)

```typescript
interface Transaction {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
  time: string;
  category: string;
  icon: string;
  iconBg: string; // Tailwind class
  iconColor: string; // Tailwind class
  type: 'expense' | 'income';
  note?: string;
  details?: {
    merchant?: string;
    description?: string;
    reward?: string;
  };
}
```

### Message (消息)

```typescript
interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  type: 'text' | 'chart' | 'transaction_list';
  chartData?: ChartData[];
  transactions?: Transaction[];
}
```

## Supabase Edge Functions

| 函数名          | 用途             | 技术          |
| --------------- | ---------------- | ------------- |
| `ai-chat`       | 处理 AI 聊天请求 | Gemini API    |
| `process-bill`  | 账单图片识别解析 | Gemini Vision |
| `process-voice` | 语音内容解析     | Gemini API    |

共享模块 (`_shared/`):

- `gemini.js` - Gemini API 客户端
- `auth.js` - 认证中间件
- `cors.js` - CORS 配置

## UI/UX 设计规范

### 颜色系统

- **主色**: `#2563EB` (primary), `#4361EE` (primary-soft)
- **强调色**: `#0052FF` (electric-blue), `#FFAD1F` (marigold)
- **背景**: `#FAFAFA` (light), `#F5F7FA` (soft)
- **文字**: `#1E293B` (main), `#64748B` (sub)
- **图表**: mint, coral, yellow

### 字体系统

- **Manrope**: 主显示字体
- **Noto Sans SC**: 中文字体
- **Inter**: 辅助字体

### 样式特点

- 移动优先 (`max-w-md` 容器)
- 圆角设计 (`rounded-2xl`, `rounded-4xl`)
- 柔和阴影 (`shadow-soft`, `shadow-glow`, `shadow-card`)
- Material Design 图标系统

## 路由结构

| 路径               | 组件            | 保护级别   |
| ------------------ | --------------- | ---------- |
| `/`                | Home            | Protected  |
| `/chat`            | Chat            | Protected  |
| `/settings`        | ProfileSettings | Protected  |
| `/system-settings` | SystemSettings  | Protected  |
| `/login`           | LoginOneClick   | Guest Only |

## 开发命令

```bash
# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test
pnpm test:watch
pnpm test:coverage

# 代码质量
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

## 环境变量

需要在 `.env.local` 中配置:

- `GEMINI_API_KEY` - Gemini API 密钥
- Supabase 相关配置 (在 `services/supabase.ts` 中使用)

## 待开发功能

根据项目结构分析，以下功能可能在规划中:

1. 预算设置与管理
2. 分类管理
3. 数据导出/导入
4. 多币种支持
5. 定期交易
6. 账户同步
