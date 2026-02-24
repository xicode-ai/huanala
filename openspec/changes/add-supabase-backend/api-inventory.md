# Backend API Inventory — 后端接口清单

> 通过分析整个前端项目代码整理出的完整后端接口清单。
> 所有接口目前均为 Mock 实现（`services/api.ts`），需要用 Supabase 替换。

---

## 总览

| #   | Mock 方法               | 调用方 (Store)                          | 使用页面                         | Supabase 实现方式                                  |
| --- | ----------------------- | --------------------------------------- | -------------------------------- | -------------------------------------------------- |
| 1   | `Api.login(phone)`      | `useUserStore.login`                    | LoginOneClick, LoginVerification | Supabase Auth (`signInWithPassword` / `signUp`)    |
| 2   | `Api.getUser()`         | `useUserStore.fetchUser`                | Home, Chat, ProfileSettings      | Supabase Auth (`getUser`) + `profiles` 表          |
| 3   | `Api.getTransactions()` | `useTransactionStore.fetchTransactions` | Home                             | Supabase DB (`transactions` 表 `select`)           |
| 4   | `Api.getChatHistory()`  | `useChatStore.fetchChatHistory`         | Chat                             | Supabase DB (`messages` 表 `select`)               |
| 5   | `Api.sendMessage(text)` | `useChatStore.sendMessage`              | Chat                             | Edge Function `ai-chat` → Gemini API               |
| 6   | `Api.uploadBill(file)`  | `useTransactionStore.uploadBill`        | Home (拍照/相册)                 | Supabase Storage + Edge Function `process-bill`    |
| 7   | `Api.uploadVoice(text)` | `useTransactionStore.uploadVoice`       | Home (语音记账)                  | Edge Function `process-voice` → AI 解析 → 插入交易 |

---

## 接口详细设计

### 1. 用户认证 — `login` / `signUp`

**当前 Mock**:

```ts
login(phone: string): Promise<User>  // 返回硬编码 MOCK_USER
```

**Supabase 实现**:

- **注册**: `supabase.auth.signUp({ email, password })`
- **登录**: `supabase.auth.signInWithPassword({ email, password })`
- **登出**: `supabase.auth.signOut()`
- **会话恢复**: `supabase.auth.getSession()` + `onAuthStateChange` 监听

**数据流**:

```
LoginPage → supabase.auth.signInWithPassword → session 写入 localStorage
         → onAuthStateChange 触发 → useUserStore 更新 → navigate('/home')
```

---

### 2. 获取用户信息 — `getUser`

**当前 Mock**:

```ts
getUser(): Promise<User>  // 返回含 balance, monthlyExpenses 等字段的 MOCK_USER
```

**Supabase 实现**:

- Auth 用户基础信息: `supabase.auth.getUser()` → `id`, `email`
- 扩展用户数据: `supabase.from('profiles').select('*').eq('id', userId).single()`

**需要的 `profiles` 表**:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  handle TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**注意**: `balance`, `monthlyExpenses`, `dailyAvailable`, `budgetUsedPercent`, `leftAmount` 应从 `transactions` 表实时聚合计算（Edge Function 或 Postgres View），不存储在 profiles 中。

---

### 3. 获取交易记录 — `getTransactions`

**当前 Mock**:

```ts
getTransactions(): Promise<Transaction[]>  // 返回 3 条硬编码交易
```

**Supabase 实现**:

```ts
supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
```

**需要的 `transactions` 表**:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT '¥',
  category TEXT NOT NULL,
  icon TEXT DEFAULT 'receipt',
  icon_bg TEXT DEFAULT 'bg-slate-50',
  icon_color TEXT DEFAULT 'text-slate-500',
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  note TEXT,
  merchant TEXT,
  description TEXT,
  source TEXT CHECK (source IN ('manual', 'voice', 'bill_scan')) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略: 用户只能访问自己的交易
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);
```

---

### 4. 获取聊天历史 — `getChatHistory`

**当前 Mock**:

```ts
getChatHistory(): Promise<Message[]>  // 返回 3 条硬编码消息 (含图表数据)
```

**Supabase 实现**:

```ts
supabase.from('messages').select('*').eq('user_id', userId).order('created_at', { ascending: true });
```

**需要的 `messages` 表**:

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender TEXT CHECK (sender IN ('user', 'ai')) NOT NULL,
  text TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'chart', 'transaction_list')) DEFAULT 'text',
  chart_data JSONB,        -- 存储 ChartData[] (饼图数据)
  transaction_ids UUID[],  -- 关联交易 ID
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own messages" ON messages
  FOR ALL USING (auth.uid() = user_id);
```

---

### 5. 发送聊天消息 — `sendMessage`

**当前 Mock**:

```ts
sendMessage(text: string): Promise<Message>  // 返回固定回复文本
```

**Supabase 实现**: Edge Function `ai-chat`

```
POST /functions/v1/ai-chat
Authorization: Bearer <jwt>
Content-Type: application/json

Request:  { "message": "上周我花了多少钱?" }
Response: { "reply": "根据您的记录...", "type": "text" }
```

**Edge Function 逻辑**:

1. 验证 JWT → 获取 user_id
2. (可选) 查询用户近期交易作为上下文注入 Gemini prompt
3. 调用 Gemini 2.0 Flash `generateContent`
4. 存储用户消息 + AI 回复到 `messages` 表
5. 返回 AI 回复

---

### 6. 上传账单图片 — `uploadBill`

**当前 Mock**:

```ts
uploadBill(file: File): Promise<Transaction>  // 返回固定交易记录
```

**Supabase 实现**: Storage + Edge Function `process-bill`

```
步骤 1: 上传图片到 Supabase Storage
  supabase.storage.from('bills').upload(path, file)

步骤 2: 调用 Edge Function 处理
  POST /functions/v1/process-bill
  Authorization: Bearer <jwt>
  { "image_url": "<storage-public-url>" }

步骤 3: Edge Function 内部
  → 调用 Gemini Vision API 识别账单
  → 解析金额、商家、类别
  → 插入 transactions 表
  → 返回新创建的 Transaction

Response: { "transaction": { id, title, amount, category, ... } }
```

**需要的 Storage Bucket**:

```sql
-- 创建 bills bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('bills', 'bills', false);

-- RLS: 用户只能上传/读取自己的文件
CREATE POLICY "Users can upload own bills" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

### 7. 语音记账 — `uploadVoice`

**当前 Mock**:

```ts
uploadVoice(transcriptText: string): Promise<Transaction>  // 返回固定交易记录
```

**Supabase 实现**: Edge Function `process-voice`

```
POST /functions/v1/process-voice
Authorization: Bearer <jwt>
Content-Type: application/json

Request:  { "transcript": "今天打车花了45块" }
Response: { "transaction": { id, title: "打车", amount: 45.00, category: "Transport", ... } }
```

**Edge Function 逻辑**:

1. 验证 JWT → 获取 user_id
2. 将语音转写文本发送给 Gemini，prompt 要求解析出:
   - `title` (交易描述)
   - `amount` (金额)
   - `category` (分类)
   - `currency` (币种)
   - `type` (expense/income)
3. 插入 `transactions` 表
4. 返回新创建的 Transaction

---

## Supabase 资源汇总

### 数据库表

| 表名           | 说明                                | RLS            |
| -------------- | ----------------------------------- | -------------- |
| `profiles`     | 用户扩展信息 (名称、头像、会员状态) | 用户只读写自己 |
| `transactions` | 交易记录 (支出/收入)                | 用户只读写自己 |
| `messages`     | AI 聊天消息历史                     | 用户只读写自己 |

### Storage Buckets

| Bucket  | 说明         | 访问权限                               |
| ------- | ------------ | -------------------------------------- |
| `bills` | 账单图片存储 | 用户只能操作 `{user_id}/` 路径下的文件 |

### Edge Functions

| 函数名          | 说明                       | 认证     |
| --------------- | -------------------------- | -------- |
| `ai-chat`       | AI 聊天 → Gemini 2.0 Flash | JWT 必须 |
| `process-bill`  | 账单图片 OCR → 创建交易    | JWT 必须 |
| `process-voice` | 语音文本解析 → 创建交易    | JWT 必须 |

### Secrets

| Key              | 说明                                          |
| ---------------- | --------------------------------------------- |
| `GEMINI_API_KEY` | Google Gemini API 密钥，仅 Edge Function 使用 |

### 环境变量 (前端)

| 变量                            | 说明                            |
| ------------------------------- | ------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase 项目 URL               |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase 客户端 Publishable Key |
