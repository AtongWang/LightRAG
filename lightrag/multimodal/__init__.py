"""多模态文档解析模块

提供与 RAGAnything 服务的集成，支持 PDF、图片、表格等多模态文档解析。
"""

from .parser import MultimodalParser, ParseResult
from .client import RAGAnythingClient

__all__ = ["MultimodalParser", "ParseResult", "RAGAnythingClient"]
