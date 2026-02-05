"""
Document Processing Pipeline

Integrates document parsing and multimodal processing into a unified pipeline.
Produces content ready for LightRAG knowledge graph insertion.
"""

import os
import asyncio
import json
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Callable, Tuple

from lightrag.utils import logger, compute_mdhash_id
from lightrag.parsers.base import (
    BaseParser,
    ContentBlock,
    ContentType,
)
from lightrag.parsers import (
    get_default_parser,
)
from lightrag.kg.multimodal_processor import (
    MultimodalProcessor,
    ProcessedContent,
)


@dataclass
class ProcessedDocument:
    """Result of processing a document through the pipeline"""

    # Source information
    source_file: str
    file_name: str

    # Full markdown content
    markdown: str = ""

    # Processed text chunks (for text-only insertion)
    text_chunks: List[str] = field(default_factory=list)

    # Processed multimodal items
    multimodal_items: List[ProcessedContent] = field(default_factory=list)

    # Combined chunks for LightRAG insertion
    combined_chunks: List[Dict[str, Any]] = field(default_factory=list)

    # Statistics
    total_pages: int = 0
    text_count: int = 0
    image_count: int = 0
    table_count: int = 0
    equation_count: int = 0

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        return {
            "source_file": self.source_file,
            "file_name": self.file_name,
            "total_pages": self.total_pages,
            "text_chunks": len(self.text_chunks),
            "multimodal_items": len(self.multimodal_items),
            "combined_chunks": len(self.combined_chunks),
            "content_counts": {
                "text": self.text_count,
                "image": self.image_count,
                "table": self.table_count,
                "equation": self.equation_count,
            },
        }


@dataclass
class PipelineConfig:
    """Configuration for document processing pipeline"""

    # Parser configuration
    parser_type: str = "auto"  # auto, mineru_api, mineru_local, docling
    parse_method: str = "auto"  # auto, ocr, txt
    language: str = "ch"

    # MinerU API settings
    mineru_api_url: str = "http://localhost:8000"
    mineru_api_timeout: int = 120
    mineru_backend: str = "hybrid-auto-engine"

    # Processing options
    output_dir: str = "./parsed_docs"
    enable_multimodal: bool = True
    context_window: int = 3
    multimodal_max_concurrency: int = int(os.getenv("MULTIMODAL_MAX_CONCURRENCY", "4"))

    # Chunking options
    chunk_by: str = "page"  # page, paragraph, content_block
    include_markdown: bool = True

    # Vision model for image description (optional)
    use_vision_model: bool = True


class DocumentPipeline:
    """
    Document processing pipeline that combines parsing and multimodal processing.
    """

    def __init__(
        self,
        llm_func: Optional[Callable] = None,
        vision_func: Optional[Callable] = None,
        asset_storage: Optional[Any] = None,
        config: Optional[PipelineConfig] = None,
    ):
        """
        Initialize document pipeline.

        Args:
            llm_func: LLM function for text generation
            vision_func: Vision model function for image understanding
            asset_storage: Storage for multimodal assets
            config: Pipeline configuration
        """
        self.llm_func = llm_func
        self.vision_func = vision_func if vision_func else llm_func
        self.asset_storage = asset_storage
        self.config = config or PipelineConfig()

        # Initialize parser
        self._parser: Optional[BaseParser] = None

        # Initialize multimodal processor
        self._multimodal_processor = MultimodalProcessor(
            llm_func=llm_func,
            vision_func=vision_func,
            asset_storage=asset_storage,
            language=self.config.language,
        )

    async def _get_parser(self) -> BaseParser:
        """Get or create parser based on config"""
        if self._parser is not None:
            return self._parser

        parser_type = self.config.parser_type

        if parser_type == "mineru_api":
            from lightrag.parsers.mineru_api import MineruAPIParser, MineruAPIConfig

            api_config = MineruAPIConfig(
                api_url=self.config.mineru_api_url,
                timeout=self.config.mineru_api_timeout,
                backend=self.config.mineru_backend,
                output_dir=self.config.output_dir,
                parse_method=self.config.parse_method,
                language=self.config.language,
            )
            self._parser = MineruAPIParser(api_config)

        elif parser_type == "mineru_local":
            from lightrag.parsers.mineru_local import MineruLocalParser
            from lightrag.parsers.base import ParserConfig

            local_config = ParserConfig(
                output_dir=self.config.output_dir,
                parse_method=self.config.parse_method,
                language=self.config.language,
            )
            self._parser = MineruLocalParser(local_config)

        elif parser_type == "docling":
            # TODO: Implement Docling parser
            logger.warning("Docling parser not yet implemented, falling back to auto")
            self._parser = get_default_parser(
                mineru_api_url=self.config.mineru_api_url,
                output_dir=self.config.output_dir,
            )

        else:  # auto
            self._parser = get_default_parser(
                mineru_api_url=self.config.mineru_api_url,
                output_dir=self.config.output_dir,
            )

        return self._parser

    async def check_parser_availability(self) -> Tuple[bool, str]:
        """
        Check if configured parser is available.

        Returns:
            Tuple of (is_available, message)
        """
        try:
            parser = await self._get_parser()
            # check_availability may be sync or async, handle both
            check_result = parser.check_availability()
            if asyncio.iscoroutine(check_result):
                available = await check_result
            else:
                available = check_result
            if available:
                return True, f"Parser {type(parser).__name__} is available"
            else:
                return False, f"Parser {type(parser).__name__} is not available"
        except Exception as e:
            return False, f"Error checking parser: {e}"

    async def process_document(
        self,
        file_path: str,
        enable_multimodal: Optional[bool] = None,
    ) -> ProcessedDocument:
        """
        Process a document through the full pipeline.

        Args:
            file_path: Path to document file
            enable_multimodal: Override config multimodal setting

        Returns:
            ProcessedDocument with all processed content
        """
        file_path = os.path.abspath(file_path)

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")

        file_name = os.path.basename(file_path)
        enable_mm = (
            enable_multimodal
            if enable_multimodal is not None
            else self.config.enable_multimodal
        )

        logger.info(f"Processing document: {file_name} (multimodal={enable_mm})")

        # Step 1: Parse document
        parser = await self._get_parser()
        parse_result = await parser.parse_document(file_path)

        if not parse_result:
            raise RuntimeError(f"Failed to parse document: {file_path}")

        logger.info(
            f"Parsed document with {len(parse_result.content_list)} content blocks"
        )

        # Step 2: Initialize result
        result = ProcessedDocument(
            source_file=file_path,
            file_name=file_name,
            markdown=parse_result.markdown,
            total_pages=parse_result.get_page_count(),
            metadata={
                "parser": type(parser).__name__,
                "parse_time": parse_result.metadata.get("parse_time"),
            },
        )

        # Step 3: Process content blocks
        content_blocks = parse_result.content_list

        # Separate text and multimodal content
        text_blocks: List[ContentBlock] = []
        multimodal_blocks: List[Tuple[int, ContentBlock]] = []

        for i, block in enumerate(content_blocks):
            content_type = (
                block.type.value
                if isinstance(block.type, ContentType)
                else str(block.type)
            )

            if content_type in ("text", "title"):
                text_blocks.append(block)
                result.text_count += 1
            elif content_type == "image":
                multimodal_blocks.append((i, block))
                result.image_count += 1
            elif content_type == "table":
                multimodal_blocks.append((i, block))
                result.table_count += 1
            elif content_type in ("equation", "interline_equation"):
                multimodal_blocks.append((i, block))
                result.equation_count += 1

        # Step 4: Create text chunks
        result.text_chunks = self._create_text_chunks(text_blocks)

        # Step 5: Process multimodal content (if enabled)
        if enable_mm and multimodal_blocks:
            # Build context map for all blocks
            context_map = self._multimodal_processor.build_context_map(
                content_blocks, window=self.config.context_window
            )

            # Process multimodal blocks concurrently (bounded)
            semaphore = asyncio.Semaphore(
                max(self.config.multimodal_max_concurrency, 1)
            )

            async def _process_block(idx: int, block: ContentBlock):
                async with semaphore:
                    try:
                        processed = await self._multimodal_processor.process_block(
                            block,
                            context=context_map.get(idx, ""),
                            source_file=file_path,
                        )
                        return idx, processed, None
                    except Exception as e:
                        return idx, None, e

            tasks = [
                asyncio.create_task(_process_block(idx, block))
                for idx, block in multimodal_blocks
            ]
            results = await asyncio.gather(*tasks)

            for idx, processed, err in sorted(results, key=lambda item: item[0]):
                if err:
                    logger.error(f"Error processing multimodal block {idx}: {err}")
                    continue
                if processed:
                    result.multimodal_items.append(processed)

        # Step 6: Create combined chunks for insertion
        result.combined_chunks = self._create_combined_chunks(result)

        logger.info(f"Document processed: {result.get_stats()}")

        return result

    def _create_text_chunks(
        self,
        text_blocks: List[ContentBlock],
    ) -> List[str]:
        """Create text chunks from text blocks"""
        chunks = []

        def _flatten_text_parts(value: Any) -> List[str]:
            """Recursively flatten text value to a list of strings."""
            if isinstance(value, str):
                return [value]
            if isinstance(value, list):
                result = []
                for item in value:
                    result.extend(_flatten_text_parts(item))
                return result
            # Convert other types to string
            return [str(value)]

        def _coerce_text(value: Any, block_idx: int) -> Optional[str]:
            if value is None:
                return None
            if isinstance(value, str):
                return value
            # Log unexpected types for debugging
            preview = repr(value)
            if len(preview) > 200:
                preview = preview[:200] + "..."
            logger.warning(
                f"Non-string text block at index {block_idx}: {type(value).__name__} -> {preview}"
            )
            if isinstance(value, list):
                # Flatten nested lists and join with spaces
                flattened = _flatten_text_parts(value)
                return " ".join(flattened)
            if isinstance(value, dict):
                return json.dumps(value, ensure_ascii=False)
            return str(value)

        if self.config.chunk_by == "page":
            # Group by page
            page_texts: Dict[int, List[str]] = {}
            for block in text_blocks:
                page_idx = block.page_idx
                if page_idx not in page_texts:
                    page_texts[page_idx] = []
                coerced = _coerce_text(block.text, block.block_idx)
                if coerced:
                    page_texts[page_idx].append(coerced)

            # Create page chunks
            for page_idx in sorted(page_texts.keys()):
                text = "\n".join(page_texts[page_idx])
                if text.strip():
                    chunks.append(text)

        elif self.config.chunk_by == "paragraph":
            # Group contiguous text blocks
            current_chunk = []
            for block in text_blocks:
                coerced = _coerce_text(block.text, block.block_idx)
                if coerced:
                    current_chunk.append(coerced)
                    # Check for paragraph break (empty text or title)
                    content_type = (
                        block.type.value
                        if isinstance(block.type, ContentType)
                        else str(block.type)
                    )
                    if content_type == "title" and current_chunk:
                        chunks.append("\n".join(current_chunk))
                        current_chunk = []
            if current_chunk:
                chunks.append("\n".join(current_chunk))

        else:  # content_block
            # Each block as a chunk
            for block in text_blocks:
                coerced = _coerce_text(block.text, block.block_idx)
                if coerced and coerced.strip():
                    chunks.append(coerced)

        return chunks

    def _create_combined_chunks(
        self,
        result: ProcessedDocument,
    ) -> List[Dict[str, Any]]:
        """Create combined chunks for LightRAG insertion"""
        chunks = []

        # Add text chunks
        for i, text in enumerate(result.text_chunks):
            chunk_id = compute_mdhash_id(
                f"{result.file_name}:text:{i}", prefix="chunk-"
            )
            chunks.append(
                {
                    "id": chunk_id,
                    "content": text,
                    "is_multimodal": False,
                    "modal_type": "text",
                    "source_file": result.file_name,
                    "chunk_index": i,
                }
            )

        # Add multimodal chunks
        for i, mm_item in enumerate(result.multimodal_items):
            chunk_id = compute_mdhash_id(
                f"{result.file_name}:{mm_item.content_type}:{i}", prefix="chunk-"
            )
            chunk_dict = mm_item.to_chunk_dict()
            chunk_dict["id"] = chunk_id
            chunk_dict["source_file"] = result.file_name
            chunk_dict["chunk_index"] = len(result.text_chunks) + i
            chunks.append(chunk_dict)

        return chunks

    async def process_documents(
        self,
        file_paths: List[str],
        enable_multimodal: Optional[bool] = None,
    ) -> List[ProcessedDocument]:
        """
        Process multiple documents.

        Args:
            file_paths: List of document paths
            enable_multimodal: Override config multimodal setting

        Returns:
            List of ProcessedDocument objects
        """
        results = []

        for file_path in file_paths:
            try:
                result = await self.process_document(file_path, enable_multimodal)
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing {file_path}: {e}")

        return results


# Convenience function
async def process_document(
    file_path: str,
    llm_func: Optional[Callable] = None,
    vision_func: Optional[Callable] = None,
    asset_storage: Optional[Any] = None,
    enable_multimodal: bool = True,
    parser_type: str = "auto",
    mineru_api_url: str = "http://localhost:8000",
) -> ProcessedDocument:
    """
    Process a single document through the pipeline.

    Args:
        file_path: Path to document
        llm_func: LLM function
        vision_func: Vision model function
        asset_storage: Asset storage
        enable_multimodal: Enable multimodal processing
        parser_type: Parser type (auto, mineru_api, mineru_local)
        mineru_api_url: MinerU API URL

    Returns:
        ProcessedDocument
    """
    config = PipelineConfig(
        parser_type=parser_type,
        mineru_api_url=mineru_api_url,
        enable_multimodal=enable_multimodal,
    )

    pipeline = DocumentPipeline(
        llm_func=llm_func,
        vision_func=vision_func,
        asset_storage=asset_storage,
        config=config,
    )

    return await pipeline.process_document(file_path)
