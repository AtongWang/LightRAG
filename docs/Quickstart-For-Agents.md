# 🚀 文化基因库前端开发 - 快速启动指南

## 📋 概述

这是一份给5个AI智能体的快速启动指南，每个智能体都有明确的职责和任务清单。

---

## 🤖 智能体职责总览

### 🟦 Agent 1: 基础架构师
**主要工作**：搭建项目基础架构
**工作周期**：Week 1-2（密集），之后提供技术支持
**技能要求**：React、TypeScript、Vite、状态管理、API设计

### 🟩 Agent 2: UI组件开发者
**主要工作**：开发通用UI组件和布局
**工作周期**：全程持续
**技能要求**：Tailwind CSS、Radix UI、响应式设计、主题系统

### 🟨 Agent 3: 业务模块开发者A
**主要工作**：项目管理、本体管理、文档管理
**工作周期**：Week 3-6（密集）
**技能要求**：表单处理、数据展示、API集成

### 🟧 Agent 4: 业务模块开发者B
**主要工作**：图谱可视化、表格视图
**工作周期**：Week 7-10（密集）
**技能要求**：Sigma.js、数据可视化、表格组件

### 🟪 Agent 5: 高级功能开发者
**主要工作**：LLM属性生成、智能问答
**工作周期**：Week 11-13（密集）
**技能要求**：LLM集成、WebSocket、实时通信

---

## 📂 项目结构

### 初始目录结构（Agent 1创建）

```bash
meme_library_frontend/
├── .env.example              # 环境变量模板
├── .eslintrc.json           # ESLint配置
├── .prettierrc              # Prettier配置
├── index.html               # HTML入口
├── package.json             # 依赖配置
├── tsconfig.json            # TypeScript配置
├── vite.config.ts           # Vite配置
├── tailwind.config.js       # Tailwind配置
│
├── public/                  # 静态资源
│   └── favicon.ico
│
├── src/
│   ├── api/                 # API客户端（🟦负责）
│   │   └── lightrag.ts     # 主API文件
│   │
│   ├── assets/             # 资源文件
│   │   └── styles/
│   │
│   ├── components/         # 通用组件（🟩负责）
│   │   ├── ui/            # 基础UI组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   ├── layout/        # 布局组件
│   │   │   ├── MainLayout.tsx
│   │   │   ├── ProjectLayout.tsx
│   │   │   ├── TopNavigation.tsx
│   │   │   └── ProjectTabs.tsx
│   │   └── ...
│   │
│   ├── features/          # 功能模块
│   │   ├── projects/      # 项目管理（🟨负责）
│   │   │   ├── ProjectsList.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   └── CreateProjectDialog.tsx
│   │   │
│   │   ├── ontology/      # 本体管理（🟨负责）
│   │   │   ├── OntologyEditor.tsx
│   │   │   ├── EntityTypeList.tsx
│   │   │   └── RelationTypeList.tsx
│   │   │
│   │   ├── documents/     # 文档管理（🟨负责）
│   │   │   ├── DocumentUploader.tsx
│   │   │   ├── FileList.tsx
│   │   │   └── ParseResultViewer.tsx
│   │   │
│   │   ├── graph/         # 图谱可视化（🟧负责）
│   │   │   ├── GraphViewer.tsx（扩展）
│   │   │   ├── ImageNodeRenderer.tsx
│   │   │   ├── NodePropertiesPanel.tsx
│   │   │   └── GraphFilters.tsx
│   │   │
│   │   ├── table/         # 表格视图（🟧负责）
│   │   │   ├── TableView.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── TableFilters.tsx
│   │   │
│   │   ├── attributes/    # 属性编辑（🟪负责）
│   │   │   ├── AttributeEditDialog.tsx
│   │   │   ├── LLMEnrichmentPanel.tsx
│   │   │   └── PromptTemplateSelector.tsx
│   │   │
│   │   └── chat/          # 智能问答（🟪负责）
│   │       ├── ChatInterface.tsx（扩展）
│   │       ├── MultimodalInput.tsx
│   │       └── CitationViewer.tsx
│   │
│   ├── hooks/             # 自定义Hooks
│   │   ├── useProjectStore.ts
│   │   ├── useOntologyStore.ts
│   │   └── useGraphStore.ts
│   │
│   ├── lib/               # 工具库
│   │   └── constants.ts
│   │
│   ├── stores/            # Zustand Stores（🟦负责）
│   │   ├── project.ts
│   │   ├── ontology.ts
│   │   ├── graph.ts
│   │   └── ui.ts
│   │
│   ├── types/             # TypeScript类型（🟦负责）
│   │   ├── project.ts
│   │   ├── ontology.ts
│   │   ├── entity.ts
│   │   └── index.ts
│   │
│   ├── utils/             # 工具函数
│   │   ├── cn.ts          # className合并
│   │   └── format.ts      # 格式化工具
│   │
│   ├── App.tsx            # 根组件
│   ├── AppRouter.tsx      # 路由配置（🟦负责）
│   └── main.tsx           # 应用入口
│
└── README.md              # 项目说明
```

---

## 🎯 Week 1 任务详解

### 🟦 Agent 1：项目初始化（Day 1-2）

#### 任务清单

```bash
# Day 1 上午
1. 创建开发分支
2. 复制lightrag_webui到新项目
3. 更新package.json

# Day 1 下午
4. 清理不需要的代码
5. 配置Vite
6. 配置ESLint和Prettier

# Day 2 上午
7. 配置Tailwind CSS
8. 创建基础目录结构
9. 配置路径别名

# Day 2 下午
10. 配置环境变量
11. 测试项目运行
12. 提交代码
```

#### 详细步骤

**Step 1: 创建分支并复制项目**
```bash
# 在LightRAG根目录
cd /home/frankw/LightRAG

# 创建新分支
git checkout -b feature/meme-library-frontend

# 复制项目
cp -r lightrag_webui meme_library_frontend
cd meme_library_frontend

# 初始化新的git仓库（如果需要独立管理）
rm -rf .git
git init
```

**Step 2: 更新package.json**
```json
{
  "name": "meme-library-frontend",
  "private": true,
  "version": "1.0.0",
  "description": "文化基因库前端系统",
  "type": "module",
  "scripts": {
    "dev": "bunx --bun vite",
    "build": "bunx --bun vite build",
    "preview": "bunx --bun vite preview",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

**Step 3: 清理不需要的代码**
```bash
# 保留这些核心文件：
- src/components/ui/
- src/features/GraphViewer.tsx（参考）
- src/features/DocumentManager.tsx（参考）
- src/features/RetrievalTesting.tsx（参考）
- src/hooks/
- src/lib/
- src/utils/

# 删除或重构这些业务特定文件：
- src/features/LoginPage.tsx（保留，需要调整）
- src/features/SiteHeader.tsx（保留，需要调整）
- 其他业务特定功能（根据需要）
```

**Step 4: 配置Vite**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9621',
        changeOrigin: true,
      }
    }
  }
})
```

**Step 5: 配置Tailwind**
```javascript
// tailwind.config.js
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#8B5CF6',
          secondary: '#EC4899',
        },
        entity: {
          artifact: '#8B5CF6',
          person: '#3B82F6',
          location: '#10B981',
          event: '#F59E0B',
          concept: '#EC4899',
          other: '#6B7280',
        }
      }
    }
  }
}
```

**Step 6: 创建目录结构**
```bash
cd src

# 创建功能模块目录
mkdir -p features/{projects,ontology,graph,table,documents,attributes,chat}

# 创建布局组件目录
mkdir -p components/layout

# 创建stores和types目录
mkdir -p stores types

# 验证结构
tree -L 2
```

**Step 7: 配置路径别名**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 8: 测试项目运行**
```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 访问 http://localhost:3000
# 应该能看到空白页面（正常）
```

**Step 9: 提交代码**
```bash
git add .
git commit -m "feat: initialize meme-library-frontend project

- Set up project structure
- Configure Vite, TypeScript, Tailwind
- Create base directories
- Ready for development"
```

---

### 🟩 Agent 2：布局组件准备（Day 3-5）

#### 前置条件
等待Agent 1完成项目初始化

#### 任务清单

**Day 3: MainLayout组件**
```tsx
// src/components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom'
import { TopNavigation } from './TopNavigation'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
```

**Day 4: ProjectLayout组件**
```tsx
// src/components/layout/ProjectLayout.tsx
import { Outlet, useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/project'
import { ProjectHeader } from './ProjectHeader'
import { ProjectTabs } from './ProjectTabs'

export function ProjectLayout() {
  const { projectId } = useParams()
  const { currentProject } = useProjectStore()

  return (
    <div className="space-y-6">
      <ProjectHeader project={currentProject} />
      <ProjectTabs />
      <Outlet />
    </div>
  )
}
```

**Day 5: 主题系统**
```css
/* src/assets/styles/index.css */
@layer base {
  :root {
    --brand-primary: 8B5CF6;
    --brand-secondary: EC4899;
    --bg-primary: #FFFFFF;
    --bg-secondary: #F3F4F6;
    --text-primary: #111827;
    --text-secondary: #6B7280;
  }

  .dark {
    --bg-primary: #0F172A;
    --bg-secondary: #1E293B;
    --text-primary: #F9FAFB;
    --text-secondary: #9CA3AF;
  }
}
```

---

### 🟨 Agent 3：准备工作（Week 1）

#### 任务清单

**研究现有代码**
```bash
# 研究这些组件作为参考：
1. src/features/DocumentManager.tsx
   - 理解文档上传流程
   - 学习文件列表展示
   - 了解状态管理方式

2. src/api/lightrag.ts
   - 理解API调用模式
   - 学习错误处理

3. src/hooks/useLightragGraph.tsx
   - 理解数据获取模式
   - 学习缓存策略
```

**设计项目管理模块**
```markdown
# 项目管理模块设计

## 组件列表
1. ProjectsList - 项目列表页
2. ProjectCard - 项目卡片
3. CreateProjectDialog - 创建项目对话框
4. ProjectSelector - 项目选择器

## API接口
- GET /projects/ - 列出所有项目
- POST /projects/create - 创建项目
- GET /projects/:id - 获取项目详情
- PUT /projects/:id - 更新项目
- DELETE /projects/:id - 删除项目

## 数据流
ProjectsList → useProjectStore → projectApi → 后端
```

---

### 🟧 Agent 4：准备工作（Week 1）

#### 任务清单

**研究图谱可视化**
```bash
# 重点研究：
1. src/features/GraphViewer.tsx
   - 理解Sigma.js的使用
   - 学习节点渲染方式
   - 了解事件处理

2. src/components/graph/
   - 研究现有图谱组件
   - 理解布局算法

3. @react-sigma/core 文档
   - 了解自定义节点渲染
   - 学习图片节点实现
```

**设计图片节点方案**
```markdown
# 图片节点设计方案

## 方案1：SVG <image> 标签
优点：
- 原生SVG支持
- 性能较好
- 可以clip-path裁剪

缺点：
- 大图性能差
- 不支持交互

## 方案2：HTML + DOM渲染
优点：
- 支持完整HTML
- 可以添加交互
- 样式灵活

缺点：
- 性能开销大
- 需要额外库

## 推荐方案：混合使用
- 小图用SVG image
- 大图用HTML overlay
```

---

### 🟪 Agent 5：准备工作（Week 1）

#### 任务清单

**研究enrichment API**
```bash
# 测试现有API
curl -X POST "http://localhost:9621/enrichment/entity" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_name": "测试文物",
    "ontology_id": "onto_xxx"
  }'

# 查看响应格式
# 了解参数要求
```

**设计属性生成界面**
```markdown
# LLM属性生成界面设计

## 组件结构
1. AttributeEditDialog - 主对话框
2. LLMEnrichmentPanel - LLM生成面板
3. PromptTemplateSelector - 模板选择器
4. ModelSelector - 模型选择器
5. GenerationProgress - 生成进度

## 用户流程
1. 用户选择节点
2. 点击"添加属性"
3. 选择"AI生成"
4. 选择模型（LLM/VLLM）
5. 选择/输入提示词
6. 点击"生成"
7. 查看结果
8. 保存属性

## 提示词模板
- 历史描述
- 文化解读
- 艺术分析
- 现代视角
```

---

## 📋 每日工作流程

### 上午工作（3小时）

1. **站会（15分钟）**
   - 汇报昨日进展
   - 说明今日计划
   - 提出阻塞问题

2. **编码工作（2.5小时）**
   - 按任务清单开发
   - 遇到问题及时沟通

3. **代码提交（15分钟）**
   - 提交代码到Git
   - 推送到远程

### 下午工作（3小时）

1. **编码工作（2.5小时）**
   - 继续上午任务
   - 开始新任务

2. **日报编写（15分钟）**
   - 更新任务清单
   - 记录遇到的问题
   - 规划明日任务

3. **代码审查（15分钟）**
   - 审查其他Agent的PR
   - 提供反馈意见

---

## 🔄 协作流程

### Git工作流

```bash
# 1. 每个Agent有自己的功能分支
feature/agent1-foundation
feature/agent2-ui-components
feature/agent3-projects
feature/agent4-graph
feature/agent5-llm

# 2. 完成功能后创建PR
git checkout develop
git pull origin develop
git checkout feature/agent3-projects
git merge develop
git push origin feature/agent3-projects

# 3. 在GitHub/GitLab创建Pull Request
# 标题：feat: add project list page
# 描述：功能说明、测试情况、截图

# 4. 其他Agent审查
# 5. 修改反馈
# 6. 合并到develop
```

### 沟通渠道

1. **每日站会**：早晨同步
2. **技术讨论**：随时发起
3. **Code Review**：PR时进行
4. **周例会**：每周五总结

---

## ✅ 验收标准

### Phase 1完成标准

**Agent 1**：
- ✅ 项目可以正常启动
- ✅ 路由可以正常切换
- ✅ Zustand stores可以正常使用
- ✅ API可以正常调用

**Agent 2**：
- ✅ MainLayout显示正常
- ✅ ProjectLayout显示正常
- ✅ 主题可以切换
- ✅ 响应式布局正常

**其他Agent**：
- ✅ 完成准备工作
- ✅ 理解现有代码
- ✅ 设计文档完成

---

## 🎯 下一步行动

### 立即开始（现在）

**Agent 1**：
```bash
# 开始执行任务1.1
cd /home/frankw/LightRAG
git checkout -b feature/meme-library-frontend
# ... 按照上面的步骤执行
```

**其他Agent**：
```bash
# 等待Agent 1完成项目初始化
# 然后开始各自的任务
```

### 本周目标（Week 1）

**所有Agent**：
- 🎉 完成Phase 1基础架构
- 🎉 项目可以运行
- 🎉 路由可以切换
- 🎉 准备好进入Phase 2

---

## 📞 联系方式

**问题反馈**：
- 在GitHub Issues创建issue
- 标记对应Agent
- 描述问题和期望结果

**技术讨论**：
- 在项目中创建Discussion
- 邀请相关Agent参与

**紧急情况**：
- 直接在群组@相关Agent
- 说明紧急程度和影响范围

---

**创建时间**：2025-01-08
**文档版本**：v1.0
**适用周期**：Week 1-2
**下次更新**：Week 3开始前
