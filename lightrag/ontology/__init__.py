"""本体服务模块

提供本体的 CRUD 操作和版本管理，使用 KV Storage 存储。
"""

from .models import OntologySpec, ValidationResult
from .validator import OntologyValidator
from .prompts import OntologyPromptInjector
from .service import OntologyService

__all__ = ["OntologyService", "OntologyValidator", "OntologyPromptInjector", "OntologySpec", "ValidationResult"]
