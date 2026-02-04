"""Prompt 注入器

将本体信息注入到抽取 Prompt 中。
"""

from typing import Dict
from .models import OntologySpec


class OntologyPromptInjector:
    """本体驱动 Prompt 注入器"""

    def inject(self, spec: OntologySpec) -> Dict[str, str]:
        """注入本体到 Prompt 变量"""
        return {
            "entity_types": ",".join(spec.entity_types),
            "relation_types": ",".join(spec.relation_types),
        }

    def inject_into_extraction_prompt(
        self, spec: OntologySpec, language: str = "zh"
    ) -> str:
        """将本体信息格式化为可直接注入抽取 System Prompt 的文本块。

        注意：抽取 prompt 目前只要求输出 entity/relation 的固定字段。
        本体在抽取阶段的主要作用是：
        - 限定 entity_type / relation_type 的取值范围
        - 提供类型约束（是否严格遵循取决于模型）
        """
        if str(language).lower().startswith("zh"):
            return (
                "---Ontology (Injected)---\n"
                f"本体名称: {spec.name}\n"
                f"本体版本: {spec.version}\n"
                "\n"
                "实体类型(entity_types)必须从下列列表中选择：\n"
                f"{', '.join(spec.entity_types)}\n"
                "\n"
                "关系类型(relation_types)必须从下列列表中选择：\n"
                f"{', '.join(spec.relation_types)}\n"
                "\n"
                "仅需从上述类型中选择，不需要输出额外属性 Schema。\n"
            )

        return (
            "---Ontology (Injected)---\n"
            f"Ontology Name: {spec.name}\n"
            f"Ontology Version: {spec.version}\n"
            "\n"
            "Entity types (entity_types) must be chosen from:\n"
            f"{', '.join(spec.entity_types)}\n"
            "\n"
            "Relation types (relation_types) must be chosen from:\n"
            f"{', '.join(spec.relation_types)}\n"
            "\n"
            "Choose only from the above types; no extra attribute schema is required.\n"
        )
