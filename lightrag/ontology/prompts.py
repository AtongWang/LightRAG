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
                desc_str = attr_def.get("desc", "")
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
                desc_str = attr_def.get("desc", "")
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
