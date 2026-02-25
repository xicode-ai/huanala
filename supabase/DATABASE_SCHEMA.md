# 花哪了 数据库 Schema

> 通过 Supabase MCP 从远程数据库同步，时间：2026-02-09

## 概述

本文档描述了花哪了（Huanala）个人记账应用的数据库结构。

## 迁移记录

| 版本           | 名称                      | 描述                                |
| -------------- | ------------------------- | ----------------------------------- |
| 20260207141132 | create_profiles_table     | 创建用户资料表                      |
| 20260207141143 | create_transactions_table | 创建交易记录表                      |
| 20260207141152 | create_messages_table     | 创建聊天消息表                      |
| 20260207141202 | create_profile_trigger    | 创建自动触发器                      |
| 20260224150000 | create_input_sessions     | 创建输入会话表，交易表加 session_id |

---

## 数据表

### `profiles` - 用户资料表

存储用户个人信息，关联 `auth.users` 认证表。

| 字段         | 类型        | 默认值  | 描述                       |
| ------------ | ----------- | ------- | -------------------------- |
| `id`         | UUID (主键) | -       | 关联 `auth.users(id)`      |
| `name`       | TEXT        | -       | 显示名称                   |
| `handle`     | TEXT        | -       | 用户标识（如 `@username`） |
| `avatar_url` | TEXT        | -       | 头像 URL                   |
| `is_premium` | BOOLEAN     | `false` | 是否为付费会员             |
| `phone`      | TEXT        | -       | 手机号码                   |
| `created_at` | TIMESTAMPTZ | `now()` | 创建时间                   |
| `updated_at` | TIMESTAMPTZ | `now()` | 更新时间                   |

---

### `transactions` - 交易记录表

存储用户的收支记录。

| 字段          | 类型        | 默认值              | 描述                                                             |
| ------------- | ----------- | ------------------- | ---------------------------------------------------------------- |
| `id`          | UUID (主键) | `gen_random_uuid()` | 自动生成                                                         |
| `user_id`     | UUID (外键) | -                   | 关联 `auth.users(id)`                                            |
| `title`       | TEXT        | -                   | 交易标题                                                         |
| `amount`      | NUMERIC     | -                   | 金额                                                             |
| `currency`    | TEXT        | `'¥'`               | 货币符号                                                         |
| `category`    | TEXT        | -                   | 分类名称                                                         |
| `icon`        | TEXT        | `'receipt'`         | Material 图标名                                                  |
| `icon_bg`     | TEXT        | `'bg-slate-50'`     | Tailwind 背景色                                                  |
| `icon_color`  | TEXT        | `'text-slate-500'`  | Tailwind 文字色                                                  |
| `type`        | TEXT        | -                   | 类型：`expense`（支出）或 `income`（收入）                       |
| `note`        | TEXT        | -                   | 备注                                                             |
| `merchant`    | TEXT        | -                   | 商户名称                                                         |
| `description` | TEXT        | -                   | 详细描述                                                         |
| `source`      | TEXT        | `'manual'`          | 来源：`manual`（手动）/ `voice`（语音）/ `bill_scan`（账单扫描） |
| `created_at`  | TIMESTAMPTZ | `now()`             | 创建时间                                                         |
| `updated_at`  | TIMESTAMPTZ | `now()`             | 更新时间                                                         |
| `session_id`  | UUID (外键) | -                   | 关联 `input_sessions(id)`，可空，ON DELETE SET NULL              |

---

### `input_sessions` - 输入会话表

记录一次用户输入（语音/图片/手动）产生的多条交易记录的会话信息。

| 字段            | 类型        | 默认值              | 描述                                                             |
| --------------- | ----------- | ------------------- | ---------------------------------------------------------------- |
| `id`            | UUID (主键) | `gen_random_uuid()` | 自动生成                                                         |
| `user_id`       | UUID (外键) | -                   | 关联 `auth.users(id)`                                            |
| `source`        | TEXT        | -                   | 来源：`voice`（语音）/ `bill_scan`（账单扫描）/ `manual`（手动） |
| `raw_input`     | TEXT        | -                   | 原始输入（语音转文字结果 / 图片 storage_path）                   |
| `ai_raw_output` | JSONB       | -                   | AI 返回的原始 JSON（调试用）                                     |
| `record_count`  | INTEGER     | `0`                 | 本次会话创建的交易记录数                                         |
| `created_at`    | TIMESTAMPTZ | `now()`             | 创建时间                                                         |

---

### `messages` - 聊天消息表

存储用户与 AI 的对话记录。

| 字段              | 类型        | 默认值              | 描述                                                                      |
| ----------------- | ----------- | ------------------- | ------------------------------------------------------------------------- |
| `id`              | UUID (主键) | `gen_random_uuid()` | 自动生成                                                                  |
| `user_id`         | UUID (外键) | -                   | 关联 `auth.users(id)`                                                     |
| `sender`          | TEXT        | -                   | 发送者：`user`（用户）或 `ai`（AI）                                       |
| `text`            | TEXT        | -                   | 消息内容                                                                  |
| `type`            | TEXT        | `'text'`            | 消息类型：`text`（文本）/ `chart`（图表）/ `transaction_list`（交易列表） |
| `chart_data`      | JSONB       | -                   | 图表可视化数据                                                            |
| `transaction_ids` | UUID[]      | -                   | 关联的交易 ID 数组                                                        |
| `created_at`      | TIMESTAMPTZ | `now()`             | 创建时间                                                                  |

---

## 行级安全策略 (RLS)

所有表均启用了 RLS，用户只能访问自己的数据。

## 触发器

1. **`on_auth_user_created`**：新用户注册时自动创建 `profiles` 记录
2. **`update_*_updated_at`**：更新记录时自动刷新 `updated_at` 字段
