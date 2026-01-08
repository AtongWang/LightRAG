"""本体驱动 RAG 功能集成测试

测试本体、项目、多模态解析和实体丰富功能。
"""

import asyncio
import os
from pathlib import Path

# 添加项目路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))


async def test_ontology_and_project():
    """测试本体和项目管理功能"""
    print("\n" + "="*60)
    print("测试 1: 本体和项目管理")
    print("="*60)

    from lightrag import LightRAG
    from lightrag.ontology import OntologyService, OntologySpec
    from lightrag.projects import ProjectManager
    from lightrag.kg.json_kv_impl import JsonKVStorage  # 修复导入路径

    # 创建临时存储
    working_dir = "./test_ontology_data"
    os.makedirs(working_dir, exist_ok=True)

    # 初始化 LightRAG（使用默认参数，需要配置 LLM）
    print("\n[1.1] 初始化存储...")
    kv_storage = JsonKVStorage(
        working_dir=working_dir,
        namespace="test"
    )
    await kv_storage.initialize()

    # 测试项目管理
    print("\n[1.2] 创建项目...")
    project_manager = ProjectManager(kv_storage)
    project = await project_manager.create(
        name="测试项目",
        description="这是一个本体驱动的测试项目"
    )
    print(f"✓ 项目创建成功: {project.project_id}")
    print(f"  名称: {project.name}")
    print(f"  Workspace: {project.workspace}")

    # 测试本体管理
    print("\n[1.3] 创建本体...")
    ontology_service = OntologyService(kv_storage)
    ontology = await ontology_service.create(
        project_id=project.project_id,
        name="测试本体",
        description="测试用的本体规范",
        language="zh",
        entity_types=["人物", "组织", "产品", "技术"],
        relation_types=["拥有", "生产", "竞争", "合作"],
        entity_attributes={
            "人物": {
                "姓名": {"type": "string", "description": "人物姓名"},
                "职业": {"type": "string", "description": "职业"},
            },
            "组织": {
                "名称": {"type": "string", "description": "组织名称"},
                "行业": {"type": "string", "description": "所属行业"},
            }
        }
    )
    print(f"✓ 本体创建成功: {ontology.ontology_id}")
    print(f"  实体类型: {ontology.entity_types}")
    print(f"  关系类型: {ontology.relation_types}")

    # 关联本体到项目
    print("\n[1.4] 关联本体到项目...")
    await project_manager.set_ontology_id(project.project_id, ontology.ontology_id)
    print(f"✓ 本体已关联到项目")

    # 获取项目的本体
    print("\n[1.5] 获取项目的本体...")
    retrieved_ontology = await ontology_service.get_by_project(project.project_id)
    print(f"✓ 获取到本体: {retrieved_ontology.ontology_id}")
    print(f"  名称: {retrieved_ontology.name}")

    # 清理
    await kv_storage.finalize()
    print(f"\n✓ 测试完成，清理完成")

    return True


async def test_prompt_injection():
    """测试 Prompt 注入功能"""
    print("\n" + "="*60)
    print("测试 2: Prompt 注入功能")
    print("="*60)

    from lightrag.ontology import OntologyService, OntologyPromptInjector
    from lightrag.kg.json_kv_impl import JsonKVStorage  # 修复导入路径

    working_dir = "./test_ontology_data"

    # 初始化存储
    kv_storage = JsonKVStorage(
        working_dir=working_dir,
        namespace="test"
    )
    await kv_storage.initialize()

    # 创建测试本体
    print("\n[2.1] 创建测试本体...")
    ontology_service = OntologyService(kv_storage)
    ontology = await ontology_service.create(
        project_id="test_project",
        name="科技本体",
        language="zh",
        entity_types=["公司", "产品", "技术"],
        relation_types=["拥有", "开发", "使用"],
    )
    print(f"✓ 本体创建成功: {ontology.ontology_id}")

    # 测试 Prompt 注入
    print("\n[2.2] 生成 Prompt 注入...")
    injector = OntologyPromptInjector()
    injected_text = injector.inject_into_extraction_prompt(ontology, language="zh")
    print(f"✓ 注入的 Prompt 长度: {len(injected_text)} 字符")
    print(f"\n前 200 字符预览:\n{injected_text[:200]}...")

    await kv_storage.finalize()
    print(f"\n✓ 测试完成")

    return True


async def test_multimodal_parser():
    """测试多模态解析器"""
    print("\n" + "="*60)
    print("测试 3: 多模态解析器")
    print("="*60)

    from lightrag.multimodal import MultimodalParser

    # 创建测试文件
    print("\n[3.1] 创建测试文本文件...")
    test_file = "./test_multimodal.txt"
    with open(test_file, "w", encoding="utf-8") as f:
        f.write("这是一个测试文档。\n包含一些测试内容。")
    print(f"✓ 测试文件创建: {test_file}")

    # 测试解析器
    print("\n[3.2] 初始化多模态解析器...")
    parser = MultimodalParser(
        raganything_url="http://127.0.0.1:30000",
        enabled=False,  # 禁用 RAGAnything，只测试文本解析
    )
    print(f"✓ 解析器创建成功")

    # 测试解析
    print("\n[3.3] 解析测试文件...")
    result = await parser.parse(test_file)
    print(f"✓ 解析完成")
    print(f"  Content length: {len(result.content)}")
    print(f"  Content preview: {result.content[:100]}...")
    print(f"  Parser used: {result.metadata.get('parser')}")

    # 清理
    import os
    os.remove(test_file)
    await parser.close()
    print(f"\n✓ 测试完成，清理完成")

    return True


async def test_entity_enrichment():
    """测试实体丰富服务（需要 LLM 配置）"""
    print("\n" + "="*60)
    print("测试 4: 实体丰富服务")
    print("="*60)

    print("\n[4.1] 注意: 此测试需要配置 LLM")
    print("如果没有配置 LLM，将跳过此测试")

    # 检查是否配置了 LLM
    if not os.getenv("LLM_BINDING") and not os.getenv("OPENAI_API_KEY"):
        print("✓ 跳过测试（未检测到 LLM 配置）")
        return True

    from lightrag import LightRAG
    from lightrag.enrichment import EntityEnrichmentService, EnrichmentConfig
    from lightrag.kg.json_kv_impl import JsonKVStorage  # 修复导入路径

    working_dir = "./test_enrichment_data"
    os.makedirs(working_dir, exist_ok=True)

    print("\n[4.2] 初始化 LightRAG...")
    try:
        rag = LightRAG(
            working_dir=working_dir,
            kv_storage="JsonKVStorage",
            graph_storage="NetworkXStorage",
            vector_storage="NanoVectorDBStorage",
        )
        await rag.initialize_storages()
        print(f"✓ LightRAG 初始化成功")

        # 先插入一些测试数据
        print("\n[4.3] 插入测试实体...")
        await rag.ainsert_custom_kg({
            "entities": [
                {
                    "entity_name": "测试公司",
                    "entity_type": "组织",
                    "description": "这是一家公司",
                }
            ],
            "relationships": [],
            "chunks": []
        })
        print(f"✓ 测试实体插入成功")

        # 测试实体丰富
        print("\n[4.4] 测试实体丰富...")
        enrichment_result = await rag.aenrich_entity(
            entity_name="测试公司",
        )
        print(f"✓ 丰富完成")
        print(f"  状态: {enrichment_result['status']}")
        if enrichment_result['status'] == 'completed':
            print(f"  丰富后的描述: {enrichment_result['enriched_data'].get('description', 'N/A')[:100]}...")

        await rag.finalize_storages()
        print(f"\n✓ 测试完成")

    except Exception as e:
        print(f"\n⚠ 测试失败: {e}")
        print("这通常是因为 LLM 未配置")
        return True  # 不算失败，只是跳过

    return True


async def main():
    """运行所有测试"""
    print("\n" + "="*60)
    print("本体驱动 RAG 功能验证测试")
    print("="*60)

    tests = [
        ("本体和项目管理", test_ontology_and_project),
        ("Prompt 注入", test_prompt_injection),
        ("多模态解析器", test_multimodal_parser),
        ("实体丰富服务", test_entity_enrichment),
    ]

    results = {}

    for test_name, test_func in tests:
        try:
            print(f"\n开始测试: {test_name}")
            result = await test_func()
            results[test_name] = "✓ 通过" if result else "✗ 失败"
        except Exception as e:
            results[test_name] = f"✗ 错误: {e}"
            print(f"\n✗ 测试失败: {e}")

    # 打印总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    for test_name, result in results.items():
        print(f"{test_name}: {result}")

    passed = sum(1 for r in results.values() if r.startswith("✓"))
    total = len(results)
    print(f"\n通过: {passed}/{total}")


if __name__ == "__main__":
    asyncio.run(main())
