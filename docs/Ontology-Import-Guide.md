# 本体导入格式说明

本文档说明 LightRAG 本体导入功能所需的 JSON 格式规范。

## 快速开始

1. 复制 `ontology_import_template.json` 作为模板
2. 根据你的领域需求修改实体类型、关系类型和属性定义
3. 在项目的「本体设置」页面点击「导入」按钮上传 JSON 文件

## JSON 格式规范

### 完整结构

```json
{
  "name": "本体名称",
  "description": "本体描述",
  "language": "zh",
  "entity_types": ["实体类型1", "实体类型2", "Other"],
  "relation_types": ["关系类型1", "关系类型2", "Other"],
  "entity_attributes": { ... },
  "relation_attributes": { ... },
  "normalization_rules": { ... }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 本体名称 |
| `description` | string | ✅ | 本体描述 |
| `language` | string | ✅ | 语言：`"zh"` 或 `"en"` |
| `entity_types` | string[] | ✅ | 实体类型列表，**必须包含 `"Other"`** |
| `relation_types` | string[] | ✅ | 关系类型列表，**必须包含 `"Other"`** |
| `entity_attributes` | object | ❌ | 实体类型的属性定义 |
| `relation_attributes` | object | ❌ | 关系类型的属性定义 |
| `normalization_rules` | object | ❌ | 规范化规则（可选） |

### 属性定义格式

每个属性定义包含以下字段：

```json
{
  "属性名": {
    "type": "string",
    "required": false,
    "description": "属性描述",
    "enum_values": ["选项1", "选项2"],
    "min_value": 0,
    "max_value": 100
  }
}
```

#### 属性字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 数据类型：`string`, `number`, `boolean`, `date`, `image`, `array` |
| `required` | boolean | ✅ | 是否必填 |
| `description` | string | ✅ | 属性描述 |
| `enum_values` | string[] | ❌ | 枚举值（仅 `type: "string"` 时有效） |
| `min_value` | number | ❌ | 最小值（仅 `type: "number"` 时有效） |
| `max_value` | number | ❌ | 最大值（仅 `type: "number"` 时有效） |

### 支持的属性类型

| 类型 | 说明 | 示例值 |
|------|------|--------|
| `string` | 文本 | `"北京"` |
| `number` | 数字 | `1949` |
| `boolean` | 布尔值 | `true` |
| `date` | 日期 | `"2026-01-11"` |
| `image` | 图片URL | `"https://..."` |
| `array` | 数组 | `["值1", "值2"]` |

## 示例

### 最小化示例

```json
{
  "name": "简单本体",
  "description": "最简单的本体示例",
  "language": "zh",
  "entity_types": ["Person", "Location", "Other"],
  "relation_types": ["关联", "Other"],
  "entity_attributes": {},
  "relation_attributes": {}
}
```

### 学术论文领域示例

```json
{
  "name": "学术论文知识图谱",
  "description": "用于学术论文分析的本体",
  "language": "zh",
  "entity_types": [
    "Author",
    "Paper",
    "Institution",
    "Dataset",
    "Method",
    "Other"
  ],
  "relation_types": [
    "撰写",
    "引用",
    "使用",
    "属于",
    "提出",
    "Other"
  ],
  "entity_attributes": {
    "Paper": {
      "title": {
        "type": "string",
        "required": true,
        "description": "论文标题"
      },
      "year": {
        "type": "number",
        "required": false,
        "description": "发表年份",
        "min_value": 1900,
        "max_value": 2100
      },
      "venue": {
        "type": "string",
        "required": false,
        "description": "发表会议/期刊"
      }
    },
    "Author": {
      "affiliation": {
        "type": "string",
        "required": false,
        "description": "所属机构"
      }
    }
  },
  "relation_attributes": {
    "引用": {
      "context": {
        "type": "string",
        "required": false,
        "description": "引用上下文"
      }
    }
  }
}
```

### 文化遗产领域示例

参见 `ontology_import_template.json` 文件。

## 重要注意事项

1. **`Other` 类型必须存在**
   - `entity_types` 和 `relation_types` 都必须包含 `"Other"`
   - 这是系统验证的强制要求，用于兜底分类

2. **属性定义是可选的**
   - 可以只定义实体和关系类型，不定义属性
   - `entity_attributes` 和 `relation_attributes` 可以为空对象 `{}`

3. **语言设置**
   - `language` 只支持 `"zh"`（中文）和 `"en"`（英文）
   - 影响系统的提示词和界面语言

4. **JSON 格式要求**
   - 必须是有效的 JSON 格式
   - 建议使用 UTF-8 编码
   - 不支持 JSON5 或带注释的 JSON

## API 导入

除了界面导入，也可以通过 API 导入本体：

```bash
curl -X POST "http://localhost:9621/ontology/import" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your_project_id",
    "name": "本体名称",
    "description": "描述",
    "language": "zh",
    "entity_types": ["Person", "Other"],
    "relation_types": ["关联", "Other"],
    "entity_attributes": {},
    "relation_attributes": {}
  }'
```

注意：API 调用需要额外提供 `project_id` 字段。
