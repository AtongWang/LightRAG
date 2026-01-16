# 多模态 RAG 实现指南

本文档描述了 LightRAG 完整多模态 RAG 系统的实现，基于 RAGAnything 的设计模式。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    多模态 RAG 完整流程                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │  文档上传     │ ──► │  文档解析     │ ──► │  内容分离     │   │
│  │  (PDF/DOCX)  │     │  (MinerU)    │     │  (文本/多模态) │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│                                                   │             │
│         ┌─────────────────────────────────────────┴───┐        │
│         ▼                                             ▼        │
│  ┌──────────────┐                          ┌──────────────┐   │
│  │  文本处理     │                          │  多模态处理   │   │
│  │  (分块)      │                          │  (LLM描述生成) │   │
│  └──────────────┘                          └──────────────┘   │
│         │                                             │        │
│         └─────────────────────┬───────────────────────┘        │
│                               ▼                                │
│                    ┌──────────────────┐                       │
│                    │  知识图谱构建     │                       │
│                    │  (实体/关系抽取)  │                       │
│                    └──────────────────┘                       │
│                               │                                │
│                               ▼                                │
│                    ┌──────────────────┐                       │
│                    │  向量化存储       │                       │
│                    │  (Chunks VDB)    │                       │
│                    └──────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 新增模块

### 1. 文档解析器 (`lightrag/parsers/`)

```
lightrag/parsers/
├── __init__.py           # 模块导出
├── base.py               # 基类定义
│   ├── ContentType       # 内容类型枚举
│   ├── ContentBlock      # 内容块数据类
│   ├── ParseResult       # 解析结果
│   ├── ParserConfig      # 解析器配置
│   └── BaseParser        # 解析器抽象基类
├── mineru_api.py         # MinerU Docker API 解析器
└── mineru_local.py       # MinerU 本地 CLI 解析器
```

### 2. 多模态处理器 (`lightrag/kg/multimodal_processor.py`)

- `ImageProcessor`: 图片内容处理，调用视觉模型生成描述
- `TableProcessor`: 表格内容处理，HTML转Markdown并生成描述
- `EquationProcessor`: 公式内容处理，LaTeX解释生成
- `MultimodalProcessor`: 协调器，管理所有内容类型处理器

### 3. 文档处理管道 (`lightrag/kg/doc_pipeline.py`)

- `DocumentPipeline`: 整合解析和处理的完整管道
- `PipelineConfig`: 管道配置
- `ProcessedDocument`: 处理结果数据类

### 4. 增强解析器 (`lightrag/multimodal/parser.py`)

- `EnhancedMultimodalParser`: 新版解析器，整合多种后端

## 配置参数

在 `LightRAG` 类中新增以下配置：

```python
# 多模态解析器配置
multimodal_enabled: bool = False          # 启用多模态解析
multimodal_parser_type: str = "auto"      # 解析器类型
mineru_api_url: str = "http://localhost:8000"  # MinerU API 地址
mineru_backend: str = "hybrid-auto-engine"     # MinerU 后端
multimodal_output_dir: str = "./parsed_docs"   # 解析输出目录
```

环境变量：
```bash
MULTIMODAL_ENABLED=true
MULTIMODAL_PARSER_TYPE=auto  # auto, mineru_api, mineru_local, raganything
MINERU_API_URL=http://localhost:8000
MINERU_BACKEND=hybrid-auto-engine
MULTIMODAL_OUTPUT_DIR=./parsed_docs
```

## API 端点

### 新增路由

| 端点 | 方法 | 描述 |
|------|------|------|
| `/multimodal/parsers/status` | GET | 检查解析器可用性 |
| `/multimodal/documents/upload` | POST | 上传并处理多模态文档 |
| `/multimodal/documents/parse-preview` | POST | 预览解析结果（不插入） |

### 使用示例

```bash
# 检查解析器状态
curl http://localhost:8020/multimodal/parsers/status

# 上传多模态文档
curl -X POST "http://localhost:8020/multimodal/documents/upload" \
    -F "file=@document.pdf" \
    -F "enable_multimodal_processing=true"

# 预览解析
curl -X POST "http://localhost:8020/multimodal/documents/parse-preview" \
    -F "file=@document.pdf"
```

## Python API 使用

### 基础用法

```python
from lightrag import LightRAG

# 初始化（启用多模态）
rag = LightRAG(
    working_dir="./rag_storage",
    multimodal_enabled=True,
    multimodal_parser_type="auto",
    mineru_api_url="http://localhost:8000",
)

# 插入多模态文档
track_id = await rag.ainsert_multimodal(
    file_paths="document.pdf",
    enable_multimodal_processing=True,
)

# 查询
result = await rag.aquery("文档中有哪些图表？")
```

### 单独使用解析管道

```python
from lightrag.kg.doc_pipeline import DocumentPipeline, PipelineConfig

# 配置
config = PipelineConfig(
    parser_type="mineru_api",
    mineru_api_url="http://localhost:8000",
    enable_multimodal=True,
)

# 创建管道
pipeline = DocumentPipeline(
    llm_func=your_llm_func,
    vision_func=your_vision_func,
    config=config,
)

# 处理文档
result = await pipeline.process_document("document.pdf")

# 访问结果
print(f"文本块: {len(result.text_chunks)}")
print(f"多模态项: {len(result.multimodal_items)}")
for item in result.multimodal_items:
    print(f"  - {item.content_type}: {item.description[:100]}")
```

## 启动 MinerU Docker API

```bash
# 进入 MinerU 目录
cd /path/to/MinerU

# 启动 API 服务
docker compose --profile api up -d

# 查看日志
docker compose logs -f

# API 文档
open http://localhost:8000/docs
```

## 内容类型支持

| 类型 | 描述 | 处理方式 |
|------|------|---------|
| `text` | 文本内容 | 直接分块存储 |
| `title` | 标题 | 作为文本处理 |
| `image` | 图片 | 视觉模型生成描述 |
| `table` | 表格 | HTML转Markdown + LLM描述 |
| `equation` | 行内公式 | LaTeX + LLM解释 |
| `interline_equation` | 行间公式 | LaTeX + LLM解释 |

## 数据流

```
PDF/DOCX 文件
    │
    ▼
MinerU API/CLI 解析
    │
    ├── content_list.json (结构化内容)
    ├── images/ (提取的图片)
    └── document.md (Markdown)
    │
    ▼
ContentBlock 标准化
    │
    ├── text blocks ──────► 文本分块
    │                           │
    └── multimodal blocks       │
          │                     │
          ├── ImageProcessor    │
          ├── TableProcessor    │
          └── EquationProcessor │
                  │             │
                  ▼             ▼
          LLM/Vision 描述生成   │
                  │             │
                  └─────────────┤
                                ▼
                    Combined Chunks
                                │
                                ▼
                    LightRAG 存储
                    (KG + Vector DB)
```

## 注意事项

1. **MinerU 服务**: 推荐使用 Docker API 模式，更稳定
2. **Vision 模型**: 如需高质量图片描述，需配置支持视觉的模型
3. **资源消耗**: 大型 PDF 解析可能需要较多内存和时间
4. **输出目录**: 解析输出（图片等）会保存到 `multimodal_output_dir`

## 后续开发计划

- [ ] Docling 解析器支持
- [ ] 多模态查询结果展示增强
- [ ] 前端 ChatInterface 多模态展示
- [ ] 批量文档处理优化
- [ ] 增量解析支持
