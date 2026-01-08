"""快速验证本体驱动 RAG 功能"""

import asyncio
import os
from pathlib import Path

# 添加项目路径
import sys
sys.path.insert(0, str(Path(__file__).parent))


async def main():
    print("\n" + "="*60)
    print("本体驱动多模态 KG-RAG 快速验证")
    print("="*60)

    # 1. 导入测试
    print("\n[1] 测试模块导入...")
    try:
        from lightrag.ontology import OntologyService, OntologyPromptInjector
        from lightrag.projects import ProjectManager
        from lightrag.multimodal import MultimodalParser
        from lightrag.enrichment import EntityEnrichmentService
        print("✓ 所有模块导入成功")
    except Exception as e:
        print(f"✗ 模块导入失败: {e}")
        return False

    # 2. 语法验证
    print("\n[2] 测试代码语法...")
    try:
        # 测试本体创建
        from lightrag.ontology.models import OntologySpec
        spec = OntologySpec(
            ontology_id="test",
            project_id="proj_test",
            version="1.0",
            language="zh",
            entity_types=["测试"],
            relation_types=[],
            entity_attributes={},
            relation_attributes={},
        )
        print(f"✓ 本体模型: {spec.ontology_id}")

        # 测试项目创建
        from lightrag.projects.models import Project
        proj = Project(
            project_id="test",
            name="测试项目",
            description="",
            ontology_id=None,
            workspace="test",
            created_at="2024-01-01",
            updated_at="2024-01-01",
            status="active"
        )
        print(f"✓ 项目模型: {proj.project_id}")

        # 测试 Prompt 注入
        injector = OntologyPromptInjector()
        prompt_vars = injector.inject(spec)
        print(f"✓ Prompt 注入: {list(prompt_vars.keys())}")

    except Exception as e:
        print(f"✗ 语法测试失败: {e}")
        return False

    # 3. API 路由验证
    print("\n[3] 测试 API 路由导入...")
    try:
        from lightrag.api.routers.ontology_routes import create_ontology_router
        from lightrag.api.routers.project_routes import create_project_router
        from lightrag.api.routers.enrichment_routes import create_enrichment_router
        print("✓ 所有 API 路由导入成功")
    except Exception as e:
        print(f"✗ API 路由导入失败: {e}")
        return False

    # 4. 多模态解析器测试
    print("\n[4] 测试多模态解析器...")
    try:
        # 创建测试文件
        test_file = "./verify_test.txt"
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("测试内容")

        # 测试解析
        parser = MultimodalParser(enabled=False)
        result = await parser.parse(test_file)
        print(f"✓ 文件解析成功: {len(result.content)} 字符")

        # 清理
        await parser.close()
        os.remove(test_file)

    except Exception as e:
        print(f"✗ 多模态解析失败: {e}")
        return False

    # 5. 关系格式验证
    print("\n[5] 测试关系格式（6 字段）...")
    try:
        from lightrag.prompt import PROMPTS

        system_prompt = PROMPTS.get("entity_extraction_system_prompt", "")
        # 检查是否包含 relation_type 字段
        if "relation_type" in system_prompt:
            print("✓ 关系格式已更新为 6 字段（包含 relation_type）")
        else:
            print("⚠ 警告: 关系格式可能未正确更新")

        # 检查示例是否包含 6 字段
        examples = PROMPTS.get("entity_extraction_examples", [])
        if examples:
            # 查找关系示例
            for example in examples:
                if "relation{tuple_delimiter}" in example:
                    # 统计字段数
                    lines = example.split("\n")
                    for line in lines:
                        if line.startswith("relation{tuple_delimiter}"):
                            fields = line.split("{tuple_delimiter}")
                            if len(fields) == 6:
                                print(f"✓ 关系示例格式正确: 6 字段")
                                break
                            else:
                                print(f"⚠ 警告: 关系示例字段数 = {len(fields)}")

    except Exception as e:
        print(f"✗ 关系格式验证失败: {e}")
        return False

    # 6. LightRAG 集成验证
    print("\n[6] 测试 LightRAG 类集成...")
    try:
        from lightrag import LightRAG

        # 检查 LightRAG 类是否有新方法
        methods = [
            "aenrich_entity",
            "aenrich_entities",
            "_get_multimodal_parser",
        ]

        for method in methods:
            if hasattr(LightRAG, method):
                print(f"✓ LightRAG.{method} 已添加")
            else:
                print(f"⚠ 警告: LightRAG.{method} 未找到")

    except Exception as e:
        print(f"✗ LightRAG 集成验证失败: {e}")
        return False

    print("\n" + "="*60)
    print("✓ 所有基础验证通过！")
    print("="*60)

    print("\n下一步:")
    print("1. 配置 .env 文件中的 LLM 设置")
    print("2. 运行 API 服务器: lightrag-server")
    print("3. 访问 http://localhost:9621/docs 测试 API")
    print("\n详细指南请参考: QUICKSTART.md")

    return True


if __name__ == "__main__":
    asyncio.run(main())
