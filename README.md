# brew-guide-supabase

OpenClaw 工具插件，让 agent 能直接操作 [brew-guide](https://github.com/chuthree/brew-guide) 的 Supabase 同步表。

## 功能

提供 4 个 agent 工具：

| 工具名 | 说明 | 类型 |
|--------|------|------|
| `brew_guide_upsert_bean` | 新增/更新咖啡豆记录 | optional（需 allowlist） |
| `brew_guide_upsert_note` | 新增/更新冲煮记录 | optional（需 allowlist） |
| `brew_guide_delete_records` | 软删除记录 | optional（需 allowlist） |
| `brew_guide_list_recent` | 查询最近记录 | required（默认可用） |

所有写入工具标记为 `optional`，需显式加入 allowlist 才能使用。查询工具 `list_recent` 无副作用，默认可用。

## 前置条件

- OpenClaw >= 2026.3.24-beta.2
- Node >= 22
- 一个已初始化 brew-guide schema 的 Supabase 项目

## 安装

```bash
# 从 npm 安装（推荐）
openclaw plugins install openclaw-brew-guide-supabase

# 从本地目录安装
openclaw plugins install ./brew-guide-plugin

# 开发模式（link，不拷贝文件）
openclaw plugins install -l ./brew-guide-plugin
```

安装后重启 gateway：

```bash
openclaw gateway restart
```

## OpenClaw 配置

在 `~/.openclaw/openclaw.json` 中添加以下配置：

### 最小配置

```json5
{
  // 插件配置
  plugins: {
    entries: {
      "brew-guide-supabase": {
        enabled: true,
        config: {
          "supabaseUrl": "https://your-project.supabase.co",
          "supabaseServiceRoleKey": "eyJhbGciOiJIUzI1NiIs..."
        }
      }
    }
  },

  // 允许 agent 使用写入工具
  tools: {
    allow: [
      "brew_guide_upsert_bean",
      "brew_guide_upsert_note",
      "brew_guide_delete_records",
      "brew_guide_list_recent"
    ]
  }
}
```

### 完整配置

```json5
{
  plugins: {
    entries: {
      "brew-guide-supabase": {
        enabled: true,
        config: {
          // [必填] Supabase 项目 URL
          "supabaseUrl": "https://your-project.supabase.co",

          // [必填] Supabase service role key（不要使用 anon key）
          "supabaseServiceRoleKey": "eyJhbGciOiJIUzI1NiIs...",

          // [可选] brew-guide 用户 ID，默认 "default_user"
          "brewGuideUserId": "default_user"
        }
      }
    }
  },

  tools: {
    // 方式一：逐个允许工具
    allow: [
      "brew_guide_upsert_bean",
      "brew_guide_upsert_note",
      "brew_guide_delete_records",
      "brew_guide_list_recent"
    ]

    // 方式二：允许该插件的所有工具（等价于上面）
    // allow: ["brew-guide-supabase"]
  }
}
```

### 配置字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `supabaseUrl` | ✅ | Supabase 项目 URL，格式为 `https://xxx.supabase.co` |
| `supabaseServiceRoleKey` | ✅ | Supabase service role key，拥有绕过 RLS 的完整权限 |
| `brewGuideUserId` | ❌ | brew-guide 的用户标识，默认 `default_user` |

> ⚠️ **安全提示**：`supabaseServiceRoleKey` 拥有数据库完整权限，切勿泄露。OpenClaw 在 manifest 中已将该字段标记为 `sensitive`，dashboard 中会以密文显示。

## 数据约束

本插件严格遵守 brew-guide 的 Supabase 同步模型：

- 固定 `user_id`（默认 `default_user`）
- 所有写入使用 `onConflict: 'id,user_id'` 做 upsert
- 每次修改自动更新 `updated_at`
- 删除仅做软删除（`deleted_at`），不做物理删除
- 业务数据存入 `data` JSONB 字段

## 项目结构

```
brew-guide-plugin/
├── index.ts                     # 插件入口 (definePluginEntry)
├── package.json
├── openclaw.plugin.json         # 插件 manifest
├── tsconfig.json
└── src/
    ├── config.ts                # 配置读取 (api.pluginConfig)
    ├── client.ts                # Supabase 客户端
    ├── tools/
    │   ├── upsertBean.ts        # brew_guide_upsert_bean
    │   ├── upsertNote.ts        # brew_guide_upsert_note
    │   ├── deleteRecords.ts     # brew_guide_delete_records
    │   └── listRecent.ts        # brew_guide_list_recent
    ├── lib/
    │   ├── ids.ts               # UUID 生成
    │   ├── timestamps.ts        # ISO 时间戳
    │   └── tables.ts            # 合法表名校验
    └── types/
        └── openclaw.d.ts        # OpenClaw SDK 类型声明
```

## 开发

```bash
# 安装依赖
npm install

# 类型检查
npx tsc --noEmit

# 运行回归测试
npm test
```

## License

MIT
