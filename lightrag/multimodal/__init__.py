"""多模态文档解析模块

提供多模态文档解析支持：
- RAGAnything 服务集成（旧接口，兼容）
- MinerU Docker API（推荐）
- MinerU 本地 CLI
- 增强处理管道

支持解析 PDF、图片、表格等多模态文档，自动生成语义描述。
"""

from .parser import MultimodalParser, ParseResult, EnhancedMultimodalParser
from .client import RAGAnythingClient

__all__ = [
    "MultimodalParser",
    "EnhancedMultimodalParser",
    "ParseResult",
    "RAGAnythingClient",
]
