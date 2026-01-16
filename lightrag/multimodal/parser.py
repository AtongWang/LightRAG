"""多模态文档解析器

提供统一的接口来解析多模态文档（PDF、图片等），支持多种解析后端：
- RAGAnything 服务（旧接口，兼容）
- MinerU Docker API（推荐）
- MinerU 本地 CLI
- Docling（待实现）
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Callable
from pathlib import Path
import hashlib

from ..utils import logger
from .client import RAGAnythingClient


def _ensure_string(value: Any) -> str:
    """Ensure value is a string, flattening nested lists if needed."""
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        # Recursively flatten nested lists
        parts = []
        for item in value:
            parts.append(_ensure_string(item))
        return " ".join(parts)

    # Convert other types to string
    return str(value)


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

    # Extended fields for new parser integration
    content_blocks: List[Dict[str, Any]] = field(default_factory=list)
    """原始内容块列表（来自 MinerU 等解析器）"""

    equations: List[Dict[str, Any]] = field(default_factory=list)
    """提取的公式信息列表"""

    markdown: str = ""
    """完整的 Markdown 内容"""


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
            
        Raises:
            RuntimeError: 当服务不可用且文件是二进制格式时
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
                # 服务不可用，尝试文本回退（会对二进制文件抛出异常）
                logger.warning(
                    f"RAGAnything service is not available at {self.raganything_url}"
                )
                try:
                    return await self._parse_text_only(file_path)
                except ValueError as e:
                    raise RuntimeError(
                        f"Cannot parse '{Path(file_path).name}': "
                        f"RAGAnything service unavailable at {self.raganything_url} and "
                        f"file is a binary format that cannot be read as text. "
                        f"Please ensure RAGAnything or MinerU service is running."
                    ) from e

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

        except RuntimeError:
            # 已经是我们抛出的异常，直接传递
            raise
        except Exception as e:
            logger.warning(
                f"Failed to parse file {file_path} with RAGAnything: {e}"
            )
            # 尝试文本回退，但对二进制文件会失败
            try:
                return await self._parse_text_only(file_path)
            except ValueError:
                raise RuntimeError(
                    f"Failed to parse '{Path(file_path).name}': {e}. "
                    f"The file is a binary format that requires RAGAnything or MinerU. "
                    f"Please ensure the multimodal parsing service is properly configured."
                ) from e

    def _is_binary_file(self, file_path: str) -> bool:
        """检测文件是否为二进制文件（不应作为文本读取）
        
        Args:
            file_path: 文件路径
            
        Returns:
            是否为二进制文件
        """
        # 已知的二进制文件扩展名
        binary_extensions = {
            ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif",
            ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".zip", ".tar", ".gz", ".rar", ".7z",
            ".mp3", ".mp4", ".avi", ".mov", ".wav",
            ".exe", ".dll", ".so", ".bin",
        }
        ext = Path(file_path).suffix.lower()
        if ext in binary_extensions:
            return True
        
        # 检查文件头部是否包含二进制数据
        try:
            with open(file_path, "rb") as f:
                header = f.read(1024)
                # 检查是否有null字节或其他二进制特征
                if b'\x00' in header:
                    return True
                # 检查常见的二进制文件魔数
                if header.startswith(b'%PDF'):  # PDF
                    return True
                if header.startswith(b'\x89PNG'):  # PNG
                    return True
                if header.startswith(b'\xff\xd8\xff'):  # JPEG
                    return True
                if header.startswith(b'PK\x03\x04'):  # ZIP/DOCX/XLSX
                    return True
        except Exception:
            pass
        
        return False

    async def _parse_text_only(self, file_path: str) -> ParseResult:
        """回退方案：仅读取文本内容
        
        注意：此方法仅适用于纯文本文件（.txt, .md, .csv 等）。
        对于 PDF、图片等二进制文件，必须使用专门的解析器。

        Args:
            file_path: 文件路径

        Returns:
            ParseResult: 基础解析结果
            
        Raises:
            ValueError: 如果文件是二进制文件（PDF、图片等）
        """
        # 检查是否为二进制文件
        if self._is_binary_file(file_path):
            file_name = Path(file_path).name
            ext = Path(file_path).suffix.lower()
            raise ValueError(
                f"Cannot parse binary file '{file_name}' as text. "
                f"File type '{ext}' requires a specialized parser (e.g., MinerU API). "
                f"Please ensure the multimodal parsing service is available and running."
            )
        
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
                # 如果都失败，尝试 latin-1（仅用于真正的文本文件）
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


class EnhancedMultimodalParser:
    """增强的多模态文档解析器

    使用新的解析器架构，支持：
    - MinerU Docker API（推荐）
    - MinerU 本地 CLI
    - RAGAnything 服务（兼容）
    - 本地文本回退
    """

    def __init__(
        self,
        parser_type: str = "auto",
        mineru_api_url: str = "http://localhost:8000",
        mineru_timeout: int = 120,
        mineru_backend: str = "hybrid-auto-engine",
        raganything_url: str = "http://127.0.0.1:30000",
        enabled: bool = True,
        output_dir: str = "./parsed_docs",
        llm_func: Optional[Callable] = None,
        vision_func: Optional[Callable] = None,
        asset_storage: Optional[Any] = None,
    ):
        """初始化增强多模态解析器

        Args:
            parser_type: 解析器类型 ("auto", "mineru_api", "mineru_local", "raganything")
            mineru_api_url: MinerU API 服务地址
            mineru_timeout: 解析超时时间
            mineru_backend: MinerU 后端类型
            raganything_url: RAGAnything 服务地址（兼容模式）
            enabled: 是否启用多模态解析
            output_dir: 解析输出目录
            llm_func: LLM 函数（用于生成描述）
            vision_func: 视觉模型函数（用于图片理解）
            asset_storage: 资源存储
        """
        self.parser_type = parser_type
        self.mineru_api_url = mineru_api_url
        self.mineru_timeout = mineru_timeout
        self.mineru_backend = mineru_backend
        self.raganything_url = raganything_url
        self.enabled = enabled
        self.output_dir = output_dir
        self.llm_func = llm_func
        self.vision_func = vision_func
        self.asset_storage = asset_storage

        self._pipeline: Optional[Any] = None
        self._legacy_parser: Optional[MultimodalParser] = None

    async def _get_pipeline(self):
        """获取或创建文档处理管道"""
        if self._pipeline is not None:
            return self._pipeline

        try:
            from lightrag.kg.doc_pipeline import DocumentPipeline, PipelineConfig

            config = PipelineConfig(
                parser_type=self.parser_type,
                mineru_api_url=self.mineru_api_url,
                mineru_api_timeout=self.mineru_timeout,
                mineru_backend=self.mineru_backend,
                output_dir=self.output_dir,
                enable_multimodal=True,
            )

            self._pipeline = DocumentPipeline(
                llm_func=self.llm_func,
                vision_func=self.vision_func,
                asset_storage=self.asset_storage,
                config=config,
            )

            return self._pipeline

        except ImportError as e:
            logger.warning(f"New parser not available, using legacy: {e}")
            return None

    def _get_legacy_parser(self) -> MultimodalParser:
        """获取旧版 RAGAnything 解析器"""
        if self._legacy_parser is None:
            self._legacy_parser = MultimodalParser(
                raganything_url=self.raganything_url,
                enabled=self.enabled,
                timeout=self.mineru_timeout,
            )
        return self._legacy_parser

    async def check_availability(self) -> Dict[str, Any]:
        """检查解析器可用性

        Returns:
            包含各解析器状态的字典
        """
        status = {
            "mineru_api": False,
            "mineru_local": False,
            "raganything": False,
            "recommended": None,
        }

        # 检查 MinerU API
        try:
            from lightrag.parsers import MineruAPIParser
            from lightrag.parsers.mineru_api import MineruAPIConfig

            config = MineruAPIConfig(api_url=self.mineru_api_url)
            parser = MineruAPIParser(config)
            # check_availability is sync, not async
            status["mineru_api"] = parser.check_availability()
        except Exception as e:
            logger.debug(f"MinerU API not available: {e}")

        # 检查 MinerU 本地
        try:
            from lightrag.parsers import MineruLocalParser

            parser = MineruLocalParser()
            # check_availability is sync, not async
            status["mineru_local"] = parser.check_availability()
        except Exception as e:
            logger.debug(f"MinerU Local not available: {e}")

        # 检查 RAGAnything
        try:
            legacy = self._get_legacy_parser()
            client = legacy._get_client()
            status["raganything"] = await client.health_check()
        except Exception as e:
            logger.debug(f"RAGAnything not available: {e}")

        # 推荐解析器
        if status["mineru_api"]:
            status["recommended"] = "mineru_api"
        elif status["mineru_local"]:
            status["recommended"] = "mineru_local"
        elif status["raganything"]:
            status["recommended"] = "raganything"

        return status

    async def parse(
        self,
        file_path: str,
        parse_method: str = "auto",
        enable_multimodal: bool = True,
    ) -> ParseResult:
        """解析文件

        Args:
            file_path: 文件路径
            parse_method: 解析方法
            enable_multimodal: 是否启用多模态处理

        Returns:
            ParseResult: 解析结果
            
        Raises:
            RuntimeError: 当所有解析器都失败且文件是二进制格式时
        """
        if not self.enabled:
            return await self._parse_text_only(file_path)

        errors = []
        
        # 尝试使用新管道
        pipeline = await self._get_pipeline()
        if pipeline:
            try:
                available, msg = await pipeline.check_parser_availability()
                if available:
                    result = await pipeline.process_document(
                        file_path, enable_multimodal=enable_multimodal
                    )
                    return self._convert_pipeline_result(result)
                else:
                    errors.append(f"Pipeline not available: {msg}")
            except Exception as e:
                errors.append(f"Pipeline parsing failed: {e}")
                logger.warning(f"Pipeline parsing failed: {e}")

        # 尝试旧版解析器
        try:
            legacy = self._get_legacy_parser()
            return await legacy.parse(file_path, parse_method)
        except Exception as e:
            errors.append(f"Legacy parser failed: {e}")
            logger.warning(f"Legacy parser failed: {e}")
        
        # 所有解析器都失败，尝试文本回退（会对二进制文件抛出异常）
        try:
            return await self._parse_text_only(file_path)
        except ValueError as e:
            # 文件是二进制的，无法解析
            all_errors = "; ".join(errors) if errors else "Unknown"
            raise RuntimeError(
                f"Failed to parse document '{Path(file_path).name}'. "
                f"All multimodal parsers failed: {all_errors}. "
                f"Binary files (PDF, images) require MinerU or RAGAnything service. "
                f"Please check that the service is running and properly configured."
            ) from e

    def _convert_pipeline_result(self, result: Any) -> ParseResult:
        """将新管道结果转换为 ParseResult"""
        # 提取图片、表格、公式
        images = []
        tables = []
        equations = []
        content_blocks = []

        for item in result.multimodal_items:
            block_dict = {
                "description": item.description,
                "page_idx": item.page_idx,
                "asset_id": item.asset_id,
                "asset_path": item.asset_path,
            }

            if item.content_type == "image":
                images.append(block_dict)
            elif item.content_type == "table":
                block_dict["html"] = item.table_html
                block_dict["markdown"] = item.table_markdown
                tables.append(block_dict)
            elif item.content_type in ("equation", "interline_equation"):
                block_dict["latex"] = item.equation_latex
                equations.append(block_dict)

            content_blocks.append(item.to_chunk_dict())

        # 组装文本内容（包括多模态项目的描述）
        all_content_parts = list(result.text_chunks)

        # 添加多模态描述到内容中，以便实体提取能够看到
        for item in result.multimodal_items:
            if item.description:
                # Ensure description is a string (handle nested lists from MinerU API)
                desc_str = _ensure_string(item.description)
                all_content_parts.append(desc_str)

        text_content = "\n\n".join(all_content_parts)

        return ParseResult(
            content=text_content,
            metadata={
                "file_path": result.source_file,
                "file_name": result.file_name,
                "parser": "enhanced_pipeline",
                **result.get_stats(),
            },
            images=images,
            tables=tables,
            content_blocks=content_blocks,
            equations=equations,
            markdown=result.markdown,
        )

    async def _parse_text_only(self, file_path: str) -> ParseResult:
        """回退方案：仅读取文本内容"""
        legacy = self._get_legacy_parser()
        return await legacy._parse_text_only(file_path)

    async def close(self):
        """关闭解析器"""
        if self._legacy_parser:
            await self._legacy_parser.close()
            self._legacy_parser = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
