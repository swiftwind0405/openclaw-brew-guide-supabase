---
name: brew-guide
description: Use when the user wants to manage coffee beans, brewing notes, or other brew-guide records, including adding beans from images, recording brewing parameters, matching roaster names, querying/listing entries, or deleting records.
---

# Brew Guide Skill

Manage coffee beans, brewing notes, and related records with complete data standards.

## Core Principle

**NEVER create incomplete records.** Always collect complete information before saving to database.

## Available Tables

This plugin operates on four Supabase tables:

| Table | Description | Primary Tool |
|---|---|---|
| `coffee_beans` | 咖啡豆记录 | `brew_guide_upsert_bean` |
| `brewing_notes` | 冲煮记录 | `brew_guide_upsert_note` |
| `custom_equipments` | 自定义器具 | `brew_guide_list_recent` |
| `custom_methods` | 自定义冲煮方式 | `brew_guide_list_recent` |

All tables support `brew_guide_list_recent` (查询) and `brew_guide_delete_records` (软删除).

---

## Bean Entry Standard Workflow

When user wants to add a coffee bean (especially with an image):

### Step 1: Extract from Image
Parse the coffee bean packaging image and extract ALL visible information:
- Name (名称)
- Roaster (烘焙商)
- Origin/Region (产地/产区)
- Estate/Farm (庄园)
- Process method (处理法: 水洗/日晒/蜜处理/厌氧等)
- Variety (品种: Gesha/SL28/74158等)
- Roast level (烘焙程度: 浅度/中度/深度)
- Altitude (海拔)
- Capacity/Weight (规格/重量)
- Roast date (烘焙日期)
- Price (价格)
- Flavor notes (风味描述)
- Brewing suggestions (冲煮建议)

### Step 2: Match Roaster Name
Before showing extracted data, if a roaster name was recognized or later provided by the user, call `brew_guide_get_all_roasters` and match against the existing roaster list.

**Matching rules:**
- Normalize names before matching: ignore case, whitespace, and common suffixes such as `Coffee`, `Cafe`, `Roasters`, `Roastery`, `咖啡`.
- If an existing roaster matches, use the existing canonical name from the system.
- If nothing matches, keep the original recognized or user-provided roaster name.
- If the image does not contain a roaster but the user later补充了烘焙商，也要先执行同样的匹配流程。

### Step 3: Display Extracted Info
Show user what was found:
```
从图片识别到以下信息：
- 名称：秘鲁 美景庄园 SL-09 水洗
- 烘焙商：Finish Line Coffee（已匹配系统记录）
- 产地：秘鲁 卡哈马卡大区
- 庄园：VISTA ALEGRE
- 处理法：水洗
- 品种：SL-09
- 规格：150G
- 海拔：1920M
- 风味：清晰花香、橙子、水果茶、柑橘酸质
```

### Step 4: Interactive Confirmation Loop
Present extracted data and let user control the flow:

```
从图片识别到以下信息：
- 名称：秘鲁 美景庄园 SL-09 水洗
- 烘焙商：Finish Line Coffee（已匹配系统记录）
- 产地：秘鲁 卡哈马卡大区
- 庄园：VISTA ALEGRE
- 处理法：水洗
- 品种：SL-09
- 规格：150G
- 海拔：1920M
- 风味：清晰花香、橙子、水果茶、柑橘酸质

[目前缺少：烘焙日期、烘焙程度、价格、豆子类型]

请选择：
1. 补充某个字段（告诉我字段名和值）
2. 直接提交
3. 删除某个字段
```

**Loop until user chooses "提交":**
- User says "补充烘焙日期 2026-03-20" → 更新数据 → 重新展示
- User says "补充价格 55" → 更新数据 → 重新展示
- User says "提交" → 保存到数据库

This creates an interactive workflow where user can iteratively complete the record before final submission.

If the user corrects or supplements the roaster during this loop, run the roaster matching step again before final submission.

## Complete Bean Data Structure

When saving a coffee bean, include these fields:

```json
{
  "name": "string (required)",
  "origin": "string (country/region)",
  "roaster": "string (required)",
  "process": "string (水洗/日晒/蜜处理/厌氧等)",
  "variety": "string (品种)",
  "roastLevel": "string (浅度烘焙/中度烘焙/深度烘焙)",
  "roastDate": "string (ISO date)",
  "price": "string or number",
  "capacity": "string (规格 如 150G)",
  "beanType": "string (filter/espresso)",
  "beanState": "string (roasted/green)",
  "startDay": "number (养豆期开始天数)",
  "endDay": "number (养豆期结束天数)",
  "remaining": "number (剩余量)",
  "flavor": ["array of flavor tags"],
  "notes": "string (free-form notes)",
  "blendComponents": [
    {
      "estate": "庄园名",
      "origin": "具体产地",
      "process": "处理法",
      "variety": "品种"
    }
  ]
}
```

## Field Extraction Rules

**From packaging text, ALWAYS extract:**
- `capacity` from "规格: 150G" or "150G"
- `flavor` array from "风味: xxx、yyy、zzz" (split by commas/Chinese commas)
- `roastLevel` from "浅度烘焙" / "中烘焙" / "深烘"
- `blendComponents` if multiple origins/varieties mentioned
- `roaster` should always be normalized through the roaster-matching step before saving

**Parse notes intelligently:**
- "庄园：VISTA ALEGRE" → extract to `blendComponents[].estate`
- "海拔：1920M" → include in notes, consider if altitude field exists
- "批次：SL-09-Lot1" → include in notes

## Example Complete Bean Entry

```
User: [image of coffee package]

Agent:
从图片识别到：
- 名称：秘鲁 美景庄园 SL-09 水洗
- 烘焙商：Finish Line Coffee（已匹配系统记录）
- 产地：秘鲁
- 产区：卡哈马卡大区
- 庄园：VISTA ALEGRE（美景庄园）
- 处理法：水洗
- 品种：SL-09
- 规格：150G
- 海拔：1920M
- 风味：清晰花香、橙子、水果茶、柑橘酸质

请问：
1. 烘焙日期是哪天？（包装上有写吗？）
2. 这是浅度、中度还是深度烘焙？
3. 价格多少？
4. 这是手冲豆还是意式豆？

[Wait for answers]

Agent:
好的，准备录入以下完整信息：
{
  name: "秘鲁 美景庄园 SL-09 水洗",
  origin: "秘鲁",
  roaster: "Finish Line Coffee",
  process: "水洗",
  variety: "SL-09",
  roastLevel: "浅度烘焙",
  roastDate: "2026-03-20",
  price: "55",
  capacity: "150",
  beanType: "filter",
  beanState: "roasted",
  flavor: ["清晰花香", "橙子", "水果茶", "柑橘酸质"],
  notes: "庄园：VISTA ALEGRE，产区：卡哈马卡大区，海拔：1920M",
  blendComponents: [{
    estate: "VISTA ALEGRE（美景庄园）",
    origin: "秘鲁 卡哈马卡大区",
    process: "水洗",
    variety: "SL-09"
  }]
}

确认无误后保存？

[User: 确认]

[Call brew_guide_upsert_bean with complete data]
```

## Bean Anti-Patterns (DO NOT DO)

❌ **NEVER** save record with only name and notes
❌ **NEVER** ignore capacity from "规格：150G"
❌ **NEVER** put flavor info only in notes, always extract to flavor array
❌ **NEVER** save a roaster name without first trying to match it against `brew_guide_get_all_roasters`
❌ **NEVER** skip asking for required fields (name, roaster, origin, process, variety)
❌ **NEVER** create record without checking existing data structure in database first

## Bean Required vs Optional Fields

**Required (must have):**
- name, roaster, origin, process, variety

**Recommended (should ask):**
- roastDate, roastLevel, price, capacity, beanType

**Optional (nice to have):**
- flavor, notes, blendComponents, altitude info in notes

---

## Brewing Notes Workflow

When user wants to record a brewing session, use `brew_guide_upsert_note`.

### Step 1: Collect Brewing Parameters

Ask for or extract the following information:

- **beanId** — 关联的咖啡豆 ID（可先用 `brew_guide_list_recent` 查询 `coffee_beans` 获取）
- **method** — 冲煮方式（V60, Kalita, AeroPress, Espresso, French Press 等）
- **grindSize** — 研磨度设置（如 "Comandante 24 clicks", "EK43 9.5"）
- **waterTemp** — 水温（摄氏度，数字）
- **ratio** — 粉水比（如 "1:15", "1:16.5"）
- **brewTime** — 总冲煮时间（如 "2:30", "3分钟"）
- **flavor** — 风味描述（文字描述本次冲煮的实际风味）
- **score** — 评分（0-100 分）
- **memo** — 备注（额外的观察或调整建议）
- **brewedAt** — 冲煮时间（ISO 日期字符串，默认当前时间）

### Step 2: Confirm and Save

展示收集到的信息，确认后调用 `brew_guide_upsert_note`。

### Complete Note Data Structure

```json
{
  "beanId": "string (associated coffee bean ID)",
  "method": "string (e.g. V60, Espresso)",
  "grindSize": "string (grind setting)",
  "waterTemp": "number (Celsius)",
  "ratio": "string (e.g. 1:15)",
  "brewTime": "string (total brew time)",
  "flavor": "string (flavor description)",
  "score": "number (0-100)",
  "memo": "string (additional notes)",
  "brewedAt": "string (ISO datetime)"
}
```

### Example Brewing Note Entry

```
User: 刚用 V60 冲了那个秘鲁豆子，记录一下

Agent:
好的！我先查一下你的咖啡豆记录。

[Call brew_guide_list_recent with table: "coffee_beans"]

找到了「秘鲁 美景庄园 SL-09 水洗」(bean_xxx)。请告诉我冲煮参数：
1. 研磨度？
2. 水温？
3. 粉水比？
4. 总冲煮时间？
5. 风味感受如何？
6. 评分（0-100）？

User: Comandante 24格，92度，1:15，2分30秒，柑橘酸很明亮，花香明显，85分

Agent:
准备录入冲煮记录：
{
  beanId: "bean_xxx",
  method: "V60",
  grindSize: "Comandante 24 clicks",
  waterTemp: 92,
  ratio: "1:15",
  brewTime: "2:30",
  flavor: "柑橘酸很明亮，花香明显",
  score: 85,
  brewedAt: "2026-04-01T07:30:00+08:00"
}

确认保存？

[User: 确认]

[Call brew_guide_upsert_note with complete data]
```

### Note Anti-Patterns

❌ **NEVER** record a brewing note without trying to associate it with a `beanId`
❌ **NEVER** skip asking for core parameters (method, grindSize, waterTemp, ratio)
❌ **NEVER** save score outside the 0-100 range

---

## Deleting Records

Use `brew_guide_delete_records` to soft-delete records. This sets `deleted_at` and `updated_at` timestamps — it does **NOT** physically remove data.

### Parameters

- **table** — 目标表名，必须是以下之一：`coffee_beans`, `brewing_notes`, `custom_equipments`, `custom_methods`
- **ids** — 要删除的记录 ID 数组（至少 1 个）

### Workflow

1. **Confirm before deleting** — Always show the record details (use `brew_guide_list_recent`) and ask user to confirm before deletion.
2. **Call `brew_guide_delete_records`** with the table name and record IDs.
3. **Report result** — Tell the user how many records were soft-deleted.

### Example

```
User: 把那个秘鲁豆子的记录删掉

Agent:
我先确认一下。你要删除的是这条记录吗？

- ID: bean_xxx
- 名称：秘鲁 美景庄园 SL-09 水洗
- 烘焙商：Finish Line Coffee

确认删除？（这是软删除，数据不会被物理移除）

[User: 确认]

[Call brew_guide_delete_records with table: "coffee_beans", ids: ["bean_xxx"]]

已软删除 1 条咖啡豆记录。
```

### Delete Anti-Patterns

❌ **NEVER** delete records without first showing record details and getting user confirmation
❌ **NEVER** use an invalid table name (only the four listed tables are allowed)

---

## Querying Records

Use `brew_guide_list_recent` to query any of the four tables, ordered by `updated_at` descending.

### Parameters

- **table** — `coffee_beans`, `brewing_notes`, `custom_equipments`, or `custom_methods`
- **limit** — 返回记录数量（可选）
- **includeDeleted** — 是否包含已软删除的记录（可选，默认 false）

### Usage Guidelines

- When user asks about beans → query `coffee_beans`
- When user asks about brewing history → query `brewing_notes`
- When user asks about equipment → query `custom_equipments`
- When user asks about brew methods → query `custom_methods`
- When showing records, display complete information including all structured fields
- Before creating a new record, use this tool to check for duplicates or context
