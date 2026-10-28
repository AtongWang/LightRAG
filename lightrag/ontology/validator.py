"""本体验证器

提供本体字段和结构的验证逻辑。
"""

from typing import List
import re
from .models import ValidationResult, OntologySpec


class OntologyValidator:
    """本体验证器"""

    @staticmethod
    def validate_entity_types(entity_types: List[str]) -> ValidationResult:
        """验证实体类型列表"""
        if not isinstance(entity_types, list) or not entity_types:
            return ValidationResult(False, "entity_types 不能为空")
        if "Other" not in entity_types:
            return ValidationResult(False, "entity_types 必须包含 'Other'")
        for et in entity_types:
            if not isinstance(et, str) or not et.strip():
                return ValidationResult(False, f"无效的 entity_type: '{et}'")
        if len({et.replace(" ", "").lower() for et in entity_types}) != len(entity_types):
            return ValidationResult(False, "entity_types contain ambiguous duplicate names")
        return ValidationResult(True)

    @staticmethod
    def validate_relation_types(relation_types: List[str]) -> ValidationResult:
        """验证关系类型列表"""
        if not isinstance(relation_types, list) or not relation_types:
            return ValidationResult(False, "relation_types 不能为空")
        if "Other" not in relation_types:
            return ValidationResult(False, "relation_types 必须包含 'Other'")
        for rt in relation_types:
            if not isinstance(rt, str) or not rt.strip():
                return ValidationResult(False, f"无效的 relation_type: '{rt}'")
        if len({rt.replace(" ", "").replace("_", "").lower() for rt in relation_types}) != len(relation_types):
            return ValidationResult(False, "relation_types contain ambiguous duplicate names")
        return ValidationResult(True)

    @staticmethod
    def validate(spec: OntologySpec) -> ValidationResult:
        """完整验证本体规格"""
        if not isinstance(spec.version, str) or not re.fullmatch(r"[0-9]+(?:\.[0-9]+){0,2}", spec.version):
            return ValidationResult(False, "version must contain one to three numeric components")
        result = OntologyValidator.validate_entity_types(spec.entity_types)
        if not result.is_valid:
            return result

        result = OntologyValidator.validate_relation_types(spec.relation_types)
        if not result.is_valid:
            return result

        if not isinstance(spec.relation_constraints, dict):
            return ValidationResult(False, "relation_constraints must be an object")
        for relation, constraint in spec.relation_constraints.items():
            if relation not in spec.relation_types or not isinstance(constraint, dict):
                return ValidationResult(False, f"Invalid relation constraint: {relation}")
            if set(constraint) - {"source_types", "target_types"}:
                return ValidationResult(False, f"Unknown constraint fields: {relation}")
            for endpoint in ("source_types", "target_types"):
                types = constraint.get(endpoint, [])
                if not isinstance(types, list) or not types or any(t not in spec.entity_types for t in types):
                    return ValidationResult(False, f"Invalid {endpoint} for {relation}")

        return ValidationResult(True)
