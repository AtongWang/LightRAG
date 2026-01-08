"""本体验证器

提供本体字段和结构的验证逻辑。
"""

from typing import List, Dict, Any
from .models import ValidationResult


class OntologyValidator:
    """本体验证器"""

    @staticmethod
    def validate_entity_types(entity_types: List[str]) -> ValidationResult:
        """验证实体类型列表"""
        if not entity_types:
            return ValidationResult(False, "entity_types 不能为空")
        if "Other" not in entity_types:
            return ValidationResult(False, "entity_types 必须包含 'Other'")
        for et in entity_types:
            if not et or not et.strip():
                return ValidationResult(False, f"无效的 entity_type: '{et}'")
        return ValidationResult(True)

    @staticmethod
    def validate_relation_types(relation_types: List[str]) -> ValidationResult:
        """验证关系类型列表"""
        if not relation_types:
            return ValidationResult(False, "relation_types 不能为空")
        if "Other" not in relation_types:
            return ValidationResult(False, "relation_types 必须包含 'Other'")
        for rt in relation_types:
            if not rt or not rt.strip():
                return ValidationResult(False, f"无效的 relation_type: '{rt}'")
        return ValidationResult(True)

    @staticmethod
    def validate_attributes_schema(schema: Dict) -> ValidationResult:
        """验证属性 schema"""
        valid_types = {"string", "string[]", "int", "float", "number[4]", "bool"}
        for entity_type, attrs in schema.items():
            if not isinstance(attrs, dict):
                return ValidationResult(False, f"{entity_type} 的属性必须是字典")

            for attr_name, attr_def in attrs.items():
                if "type" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 type 定义")
                if attr_def["type"] not in valid_types:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 无效的 type: {attr_def['type']}")
                if "required" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 required 定义")
                if "desc" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 desc 定义")

        return ValidationResult(True)

    @staticmethod
    def validate(spec: 'OntologySpec') -> ValidationResult:
        """完整验证本体规格"""
        result = OntologyValidator.validate_entity_types(spec.entity_types)
        if not result.is_valid:
            return result

        result = OntologyValidator.validate_relation_types(spec.relation_types)
        if not result.is_valid:
            return result

        result = OntologyValidator.validate_attributes_schema(spec.entity_attributes)
        if not result.is_valid:
            return result

        result = OntologyValidator.validate_attributes_schema(spec.relation_attributes)
        if not result.is_valid:
            return result

        return ValidationResult(True)
