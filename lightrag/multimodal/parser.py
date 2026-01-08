"""多模态文档解析器

提供统一的接口来解析多模态文档（PDF、图片等），使用 RAGAnything 服务。
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from pathlib import Path
import hashlib

from ..utils import logger
from .client import RAGAnythingClient


@dataclass
class ParseResult:
    """解析结果数据类"""
    content: str
    """解析后的文本内容"""

    metadata: Dict[str, Any] = field(default_factory=dict)
    """元数据（文件路径、页面数、解析时间等）"""

    images: List[Dict[str, Any]] = field(default_factory=list)
    """提取的图片信息列表"""

    tables: List[Dict[str, Any]] = field(default_factory=list)
    """提取的表格信息列表"""


class MultimodalParser:
    """多模态文档解析器

    支持使用 RAGAnything 服务解析 PDF、图片等多模态文档。
    """

    def __init__(
        self,
        raganything_url: str = "http://127.0.0.1:30000",
        enabled: bool = True,
        timeout: int = 300,
    ):
        """初始化多模态解析器

        Args:
            raganything_url: RAGAnything 服务 URL
            enabled: 是否启用多模态解析（如果 False，则回退到基础解析）
            timeout: 解析超时时间（秒）
        """
        self.raganything_url = raganything_url
        self.enabled = enabled
        self.timeout = timeout
        self._client: Optional[RAGAnythingClient] = None

    def _get_client(self) -> RAGAnythingClient:
        """获取或创建 RAGAnything 客户端"""
        if self._client is None:
            self._client = RAGAnythingClient(
                base_url=self.raganything_url,
                timeout=self.timeout,
            )
        return self._client

    async def close(self):
        """关闭解析器，释放资源"""
        if self._client:
            await self._client.close()
            self._client = None

    def _is_supported_format(self, file_path: str) -> bool:
        """检查文件格式是否支持多模态解析

        Args:
            file_path: 文件路径

        Returns:
            是否支持
        """
        supported_extensions = {
            ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff",
            ".docx", ".pptx", ".xlsx"
        }
        return Path(file_path).suffix.lower() in supported_extensions

    async def parse(
        self,
        file_path: str,
        parse_method: str = "auto",
    ) -> ParseResult:
        """解析文件

        Args:
            file_path: 文件路径
            parse_method: 解析方法 ("auto", "txt", "pdf", "ocr")

        Returns:
            ParseResult: 解析结果
        """
        if not self.enabled:
            # 多模态解析未启用，返回基础结果
            logger.debug(f"Multimodal parsing disabled, reading file: {file_path}")
            return await self._parse_text_only(file_path)

        if not self._is_supported_format(file_path):
            logger.debug(
                f"File format not supported for multimodal parsing, "
                f"reading as text: {file_path}"
            )
            return await self._parse_text_only(file_path)

        try:
            client = self._get_client()

            # 检查服务健康状态
            is_healthy = await client.health_check()
            if not is_healthy:
                logger.warning(
                    f"RAGAnything service is not available at {self.raganything_url}, "
                    f"falling back to text-only parsing"
                )
                return await self._parse_text_only(file_path)

            # 使用 RAGAnything 解析
            logger.info(f"Parsing file with RAGAnything: {file_path}")
            result = await client.parse_file(file_path, parse_method=parse_method)

            # 提取内容
            content = result.get("content", "")

            # 提取元数据
            metadata = {
                "file_path": file_path,
                "file_name": Path(file_path).name,
                "parse_method": parse_method,
                "parser": "raganything",
            }

            # 添加其他元数据
            if "page_count" in result:
                metadata["page_count"] = result["page_count"]
            if "parse_time" in result:
                metadata["parse_time"] = result["parse_time"]

            # 提取图片和表格信息
            images = result.get("images", [])
            tables = result.get("tables", [])

            return ParseResult(
                content=content,
                metadata=metadata,
                images=images,
                tables=tables,
            )

        except Exception as e:
            logger.warning(
                f"Failed to parse file {file_path} with RAGAnything: {e}. "
                f"Falling back to text-only parsing."
            )
            return await self._parse_text_only(file_path)

    async def _parse_text_only(self, file_path: str) -> ParseResult:
        """回退方案：仅读取文本内容

        Args:
            file_path: 文件路径

        Returns:
            ParseResult: 基础解析结果
        """
        try:
            # 尝试 UTF-8 编码读取
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            # 尝试其他编码
            try:
                with open(file_path, "r", encoding="gbk") as f:
                    content = f.read()
            except Exception:
                # 如果都失败，尝试 latin-1
                with open(file_path, "r", encoding="latin-1") as f:
                    content = f.read()

        # 计算文件哈希
        file_hash = self._compute_file_hash(file_path)

        metadata = {
            "file_path": file_path,
            "file_name": Path(file_path).name,
            "parser": "text_only",
            "file_hash": file_hash,
        }

        return ParseResult(
            content=content,
            metadata=metadata,
            images=[],
            tables=[],
        )

    def _compute_file_hash(self, file_path: str) -> str:
        """计算文件哈希值

        Args:
            file_path: 文件路径

        Returns:
            文件的 MD5 哈希值
        """
        md5_hash = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                md5_hash.update(chunk)
        return md5_hash.hexdigest()

    async def __aenter__(self):
        """异步上下文管理器入口"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close()
