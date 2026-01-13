"""Prompt 注入器

将本体信息注入到抽取 Prompt 中。
"""

from typing import Dict, Any
from .models import OntologySpec


class OntologyPromptInjector:
    """本体驱动 Prompt 注入器"""

    def inject(self, spec: OntologySpec) -> Dict[str, str]:
        """注入本体到 Prompt 变量"""
        return {
            # 新增变量
            "entity_types": ",".join(spec.entity_types),
            "relation_types": ",".join(spec.relation_types),
            "entity_schema": self._format_entity_schema(spec.entity_attributes),
            "relation_schema": self._format_relation_schema(spec.relation_attributes),
            "normalization_rules": self._format_normalization_rules(spec.normalization_rules),
        }

    def inject_into_extraction_prompt(self, spec: OntologySpec, language: str = "zh") -> str:
        """将本体信息格式化为可直接注入抽取 System Prompt 的文本块。

        注意：抽取 prompt 目前只要求输出 entity/relation 的固定字段。
        本体在抽取阶段的主要作用是：
        - 限定 entity_type / relation_type 的取值范围
        - 提供属性 schema/归一化规则作为软约束（是否严格遵循取决于模型）
        """
        injected = self.inject(spec)
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
                "实体属性Schema(供参考/尽量遵循)：\n"
                f"{injected.get('entity_schema', '{}')}\n"
                "\n"
                "关系属性Schema(供参考/尽量遵循)：\n"
                f"{injected.get('relation_schema', '{}')}\n"
                "\n"
                "归一化规则(供参考/尽量遵循)：\n"
                f"{injected.get('normalization_rules', '无特殊归一化规则')}\n"
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
            "Entity attribute schema (reference):\n"
            f"{injected.get('entity_schema', '{}')}\n"
            "\n"
            "Relation attribute schema (reference):\n"
            f"{injected.get('relation_schema', '{}')}\n"
            "\n"
            "Normalization rules (reference):\n"
            f"{injected.get('normalization_rules', 'None')}\n"
        )

    def _format_entity_schema(self, attrs: Dict[str, Dict[str, Any]]) -> str:
        """格式化实体属性 schema 为 Prompt"""
        if not attrs:
            return "{}"

        schema_parts = []
        for entity_type, attr_defs in attrs.items():
            attr_parts = []
            for attr_name, attr_def in attr_defs.items():
                type_str = attr_def.get("type", "string")
                required_str = "required" if attr_def.get("required") else "optional"
                desc_str = attr_def.get("desc") or attr_def.get("description") or ""
                attr_parts.append(f"    - {attr_name}: {type_str} ({required_str}) - {desc_str}")

            schema_parts.append(f"{entity_type}:\n" + "\n".join(attr_parts))

        return "\n\n".join(schema_parts)

    def _format_relation_schema(self, attrs: Dict[str, Dict[str, Any]]) -> str:
        """格式化关系属性 schema 为 Prompt"""
        if not attrs:
            return "{}"

        schema_parts = []
        for relation_type, attr_defs in attrs.items():
            attr_parts = []
            for attr_name, attr_def in attr_defs.items():
                type_str = attr_def.get("type", "string")
                required_str = "required" if attr_def.get("required") else "optional"
                desc_str = attr_def.get("desc") or attr_def.get("description") or ""
                attr_parts.append(f"    - {attr_name}: {type_str} ({required_str}) - {desc_str}")

            schema_parts.append(f"{relation_type}:\n" + "\n".join(attr_parts))

        return "\n\n".join(schema_parts)

    def _format_normalization_rules(self, rules: Dict[str, Any] | None) -> str:
        """格式化归一化规则"""
        if not rules:
            return "无特殊归一化规则"

        rules_parts = []
        if "alias" in rules:
            alias_parts = []
            for canonical, aliases in rules["alias"].items():
                alias_str = ",".join(aliases)
                alias_parts.append(f"    {canonical} → {alias_str}")
            rules_parts.append("别名归一化:\n" + "\n".join(alias_parts))

        if "blacklist_entities" in rules:
            blacklist_str = ",".join(rules["blacklist_entities"])
            rules_parts.append(f"黑名单实体: {blacklist_str}")

        return "\n\n".join(rules_parts) if rules_parts else "无特殊归一化规则"
