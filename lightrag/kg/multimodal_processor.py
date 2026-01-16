"""
Multimodal Content Processor

Processes multimodal content (images, tables, equations) extracted from documents.
Generates semantic descriptions using LLM/Vision models for knowledge graph insertion.
"""

import os
import base64
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Callable

from lightrag.utils import logger
from lightrag.parsers.base import ContentBlock, ContentType


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
class ProcessedContent:
    """Result of processing a multimodal content item"""
    
    # Original content block
    source_block: ContentBlock
    
    # Generated description/caption
    description: str = ""
    
    # Semantic entities extracted from description
    entities: List[str] = field(default_factory=list)
    
    # Content for chunk insertion
    chunk_content: str = ""
    
    # Asset information (for images)
    asset_id: Optional[str] = None
    asset_path: Optional[str] = None
    
    # Structured data (for tables)
    table_html: Optional[str] = None
    table_markdown: Optional[str] = None
    
    # LaTeX (for equations)
    equation_latex: Optional[str] = None
    
    # Metadata
    content_type: str = "generic"
    page_idx: int = 0
    source_file: Optional[str] = None
    
    def to_chunk_dict(self) -> Dict[str, Any]:
        """Convert to chunk dictionary for LightRAG insertion"""
        return {
            "content": self.chunk_content,
            "is_multimodal": True,
            "modal_type": self.content_type,
            "description": self.description,
            "asset_id": self.asset_id,
            "asset_path": self.asset_path,
            "table_html": self.table_html,
            "table_markdown": self.table_markdown,
            "equation_latex": self.equation_latex,
            "page_idx": self.page_idx,
            "source_file": self.source_file,
            "entities": self.entities,
        }


class BaseModalProcessor(ABC):
    """Base class for multimodal content processors"""
    
    def __init__(
        self,
        llm_func: Optional[Callable] = None,
        vision_func: Optional[Callable] = None,
        asset_storage: Optional[Any] = None,
    ):
        """
        Initialize processor.
        
        Args:
            llm_func: LLM function for text generation
            vision_func: Vision model function for image understanding
            asset_storage: Storage for multimodal assets
        """
        self.llm_func = llm_func
        self.vision_func = vision_func
        self.asset_storage = asset_storage
    
    @property
    @abstractmethod
    def content_type(self) -> str:
        """Return the content type this processor handles"""
        pass
    
    @abstractmethod
    async def process(
        self,
        block: ContentBlock,
        context: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> ProcessedContent:
        """
        Process a content block.
        
        Args:
            block: Content block to process
            context: Surrounding text context
            source_file: Source document path
            
        Returns:
            ProcessedContent with generated description
        """
        pass


class ImageProcessor(BaseModalProcessor):
    """Processor for image content"""
    
    # Prompt template for image description
    IMAGE_PROMPT = """Analyze this image from a document and provide a detailed description.
Include:
1. What the image shows (diagram, chart, photo, etc.)
2. Key elements and their relationships
3. Any text or labels visible
4. The main purpose or message of the image

Context from surrounding document text:
{context}

Provide a clear, informative description that captures the key information in this image."""

    @property
    def content_type(self) -> str:
        return "image"
    
    async def process(
        self,
        block: ContentBlock,
        context: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> ProcessedContent:
        """Process an image block"""
        result = ProcessedContent(
            source_block=block,
            content_type=self.content_type,
            page_idx=block.page_idx,
            source_file=source_file,
        )
        
        img_path = block.img_path
        if not img_path or not os.path.exists(img_path):
            logger.warning(f"Image file not found: {img_path}")
            result.description = _ensure_string(block.img_caption or "Image (file not found)")
            result.chunk_content = f"[Image: {result.description}]"
            return result
        
        # Store asset if storage is available
        if self.asset_storage:
            try:
                with open(img_path, "rb") as f:
                    content = f.read()
                asset = await self.asset_storage.store_asset(
                    content=content,
                    filename=os.path.basename(img_path),
                    modal_type="image",
                    metadata={"source_file": source_file, "page_idx": block.page_idx}
                )
                result.asset_id = asset.asset_id
                result.asset_path = img_path
            except Exception as e:
                logger.warning(f"Failed to store image asset: {e}")
                result.asset_path = img_path
        else:
            result.asset_path = img_path
        
        # Generate description using vision model
        if self.vision_func:
            try:
                description = await self._generate_description(
                    img_path, context or ""
                )
                result.description = _ensure_string(description)
            except Exception as e:
                logger.warning(f"Failed to generate image description: {e}")
                result.description = _ensure_string(block.img_caption or "Image from document")
        else:
            result.description = _ensure_string(block.img_caption or "Image from document")
        
        # Create chunk content
        result.chunk_content = self._create_chunk_content(result)
        
        return result
    
    async def _generate_description(
        self,
        img_path: str,
        context: str
    ) -> str:
        """Generate description using vision model"""
        # Read and encode image
        with open(img_path, "rb") as f:
            img_data = base64.b64encode(f.read()).decode("utf-8")
        
        # Determine mime type
        ext = os.path.splitext(img_path)[1].lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/png")
        
        # Build prompt
        prompt = self.IMAGE_PROMPT.format(context=context[:500] if context else "No context available")
        
        # Call vision model
        # The vision_func should accept image data and prompt
        try:
            if asyncio.iscoroutinefunction(self.vision_func):
                response = await self.vision_func(
                    prompt,
                    image_data=f"data:{mime_type};base64,{img_data}"
                )
            else:
                response = self.vision_func(
                    prompt,
                    image_data=f"data:{mime_type};base64,{img_data}"
                )
            return response if isinstance(response, str) else str(response)
        except Exception as e:
            logger.error(f"Vision model error: {e}")
            return "Image from document"
    
    def _create_chunk_content(self, result: ProcessedContent) -> str:
        """Create content string for chunk"""
        parts = [f"[Figure: {result.description}]"]
        if result.source_block.img_caption:
            parts.append(f"Caption: {result.source_block.img_caption}")
        return "\n".join(parts)


class TableProcessor(BaseModalProcessor):
    """Processor for table content"""
    
    TABLE_PROMPT = """Analyze this table and provide a detailed description.
Include:
1. What the table shows (data comparison, statistics, etc.)
2. Column headers and their meanings
3. Key data points or trends
4. The main insights from the table

Table content (HTML):
{table_html}

Context from surrounding document text:
{context}

Provide a clear description that captures the key information in this table."""

    @property
    def content_type(self) -> str:
        return "table"
    
    async def process(
        self,
        block: ContentBlock,
        context: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> ProcessedContent:
        """Process a table block"""
        result = ProcessedContent(
            source_block=block,
            content_type=self.content_type,
            page_idx=block.page_idx,
            source_file=source_file,
        )
        
        # Get table data
        table_html = block.table_html or block.raw_data.get("table_html", "")
        table_body = block.table_body or block.raw_data.get("table_body", "")
        
        result.table_html = table_html
        result.table_markdown = self._html_to_markdown(table_html) if table_html else table_body
        
        # Generate description
        if self.llm_func and table_html:
            try:
                description = await self._generate_description(
                    table_html, context or ""
                )
                result.description = _ensure_string(description)
            except Exception as e:
                logger.warning(f"Failed to generate table description: {e}")
                result.description = _ensure_string(block.table_caption or "Table from document")
        else:
            result.description = _ensure_string(block.table_caption or "Table from document")
        
        # Create chunk content
        result.chunk_content = self._create_chunk_content(result)
        
        return result
    
    async def _generate_description(
        self,
        table_html: str,
        context: str
    ) -> str:
        """Generate description using LLM"""
        prompt = self.TABLE_PROMPT.format(
            table_html=table_html[:2000],  # Limit size
            context=context[:500] if context else "No context available"
        )
        
        try:
            if asyncio.iscoroutinefunction(self.llm_func):
                response = await self.llm_func(prompt)
            else:
                response = self.llm_func(prompt)
            return response if isinstance(response, str) else str(response)
        except Exception as e:
            logger.error(f"LLM error: {e}")
            return "Table from document"
    
    def _html_to_markdown(self, html: str) -> str:
        """Convert HTML table to markdown (simple conversion)"""
        try:
            # Simple conversion - could use a library for better results
            import re
            
            # Remove tags except td, th, tr
            text = re.sub(r'</?table[^>]*>', '', html)
            text = re.sub(r'</?thead[^>]*>', '', text)
            text = re.sub(r'</?tbody[^>]*>', '', text)
            
            # Convert rows
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', text, re.DOTALL)
            md_rows = []
            
            for i, row in enumerate(rows):
                cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', row, re.DOTALL)
                cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                md_rows.append("| " + " | ".join(cells) + " |")
                
                # Add header separator after first row
                if i == 0:
                    md_rows.append("|" + "|".join(["---"] * len(cells)) + "|")
            
            return "\n".join(md_rows)
        except Exception:
            return html
    
    def _create_chunk_content(self, result: ProcessedContent) -> str:
        """Create content string for chunk"""
        parts = [f"[Table: {result.description}]"]
        if result.source_block.table_caption:
            parts.append(f"Caption: {result.source_block.table_caption}")
        if result.table_markdown:
            parts.append(f"\n{result.table_markdown}")
        return "\n".join(parts)


class EquationProcessor(BaseModalProcessor):
    """Processor for equation/formula content"""
    
    EQUATION_PROMPT = """Explain this mathematical equation/formula.
Include:
1. What the equation represents
2. The meaning of each variable/symbol
3. When/where this equation is used
4. Any important properties or implications

Equation (LaTeX):
{latex}

Context from surrounding document text:
{context}

Provide a clear explanation that helps understand this equation."""

    @property
    def content_type(self) -> str:
        return "equation"
    
    async def process(
        self,
        block: ContentBlock,
        context: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> ProcessedContent:
        """Process an equation block"""
        result = ProcessedContent(
            source_block=block,
            content_type=self.content_type,
            page_idx=block.page_idx,
            source_file=source_file,
        )
        
        # Get equation data
        latex = block.equation_latex or block.text or ""
        result.equation_latex = latex
        
        # Store equation image if available
        if block.equation_img_path and self.asset_storage:
            try:
                if os.path.exists(block.equation_img_path):
                    with open(block.equation_img_path, "rb") as f:
                        content = f.read()
                    asset = await self.asset_storage.store_asset(
                        content=content,
                        filename=os.path.basename(block.equation_img_path),
                        modal_type="equation",
                        metadata={"latex": latex, "source_file": source_file}
                    )
                    result.asset_id = asset.asset_id
                    result.asset_path = block.equation_img_path
            except Exception as e:
                logger.warning(f"Failed to store equation asset: {e}")
        
        # Generate description
        if self.llm_func and latex:
            try:
                description = await self._generate_description(
                    latex, context or ""
                )
                result.description = _ensure_string(description)
            except Exception as e:
                logger.warning(f"Failed to generate equation description: {e}")
                result.description = f"Mathematical equation: {latex[:100]}"
        else:
            result.description = f"Mathematical equation: {latex[:100]}"
        
        # Create chunk content
        result.chunk_content = self._create_chunk_content(result)
        
        return result
    
    async def _generate_description(
        self,
        latex: str,
        context: str
    ) -> str:
        """Generate description using LLM"""
        prompt = self.EQUATION_PROMPT.format(
            latex=latex,
            context=context[:500] if context else "No context available"
        )
        
        try:
            if asyncio.iscoroutinefunction(self.llm_func):
                response = await self.llm_func(prompt)
            else:
                response = self.llm_func(prompt)
            return response if isinstance(response, str) else str(response)
        except Exception as e:
            logger.error(f"LLM error: {e}")
            return f"Mathematical equation: {latex[:100]}"
    
    def _create_chunk_content(self, result: ProcessedContent) -> str:
        """Create content string for chunk"""
        parts = [f"[Equation: {result.description}]"]
        if result.equation_latex:
            parts.append(f"LaTeX: ${result.equation_latex}$")
        return "\n".join(parts)


class MultimodalProcessor:
    """
    Main multimodal processor that coordinates different content type processors.
    """
    
    def __init__(
        self,
        llm_func: Optional[Callable] = None,
        vision_func: Optional[Callable] = None,
        asset_storage: Optional[Any] = None,
    ):
        """
        Initialize multimodal processor.
        
        Args:
            llm_func: LLM function for text generation
            vision_func: Vision model function for image understanding
            asset_storage: Storage for multimodal assets
        """
        self.llm_func = llm_func
        self.vision_func = vision_func or llm_func  # Use LLM as fallback
        self.asset_storage = asset_storage
        
        # Initialize content type processors
        self.processors: Dict[str, BaseModalProcessor] = {
            "image": ImageProcessor(llm_func, vision_func, asset_storage),
            "table": TableProcessor(llm_func, vision_func, asset_storage),
            "equation": EquationProcessor(llm_func, vision_func, asset_storage),
            "interline_equation": EquationProcessor(llm_func, vision_func, asset_storage),
        }
    
    def get_processor(self, content_type: str) -> Optional[BaseModalProcessor]:
        """Get processor for content type"""
        return self.processors.get(content_type)
    
    async def process_block(
        self,
        block: ContentBlock,
        context: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> Optional[ProcessedContent]:
        """
        Process a single content block.
        
        Args:
            block: Content block to process
            context: Surrounding text context
            source_file: Source document path
            
        Returns:
            ProcessedContent or None if no processor available
        """
        content_type = block.type.value if isinstance(block.type, ContentType) else str(block.type)
        processor = self.get_processor(content_type)
        
        if processor is None:
            logger.debug(f"No processor for content type: {content_type}")
            return None
        
        return await processor.process(block, context, source_file)
    
    async def process_blocks(
        self,
        blocks: List[ContentBlock],
        context_map: Optional[Dict[int, str]] = None,
        source_file: Optional[str] = None,
    ) -> List[ProcessedContent]:
        """
        Process multiple content blocks.
        
        Args:
            blocks: List of content blocks to process
            context_map: Map of block index to context text
            source_file: Source document path
            
        Returns:
            List of ProcessedContent objects
        """
        results = []
        context_map = context_map or {}
        
        for i, block in enumerate(blocks):
            content_type = block.type.value if isinstance(block.type, ContentType) else str(block.type)
            
            # Skip text blocks
            if content_type in ("text", "title"):
                continue
            
            context = context_map.get(i, "")
            
            try:
                result = await self.process_block(block, context, source_file)
                if result:
                    results.append(result)
            except Exception as e:
                logger.error(f"Error processing block {i}: {e}")
        
        return results
    
    @staticmethod
    def extract_context_from_blocks(
        blocks: List[ContentBlock],
        target_idx: int,
        window: int = 3
    ) -> str:
        """
        Extract surrounding text context for a block.
        
        Args:
            blocks: All content blocks
            target_idx: Index of target block
            window: Number of blocks before/after to include
            
        Returns:
            Context string
        """
        context_parts = []
        
        start_idx = max(0, target_idx - window)
        end_idx = min(len(blocks), target_idx + window + 1)
        
        for i in range(start_idx, end_idx):
            if i == target_idx:
                continue
            block = blocks[i]
            if block.type in (ContentType.TEXT, ContentType.TITLE) and block.text:
                context_parts.append(block.text)
        
        return " ".join(context_parts)
    
    def build_context_map(
        self,
        blocks: List[ContentBlock],
        window: int = 3
    ) -> Dict[int, str]:
        """
        Build context map for all multimodal blocks.
        
        Args:
            blocks: All content blocks
            window: Context window size
            
        Returns:
            Map of block index to context string
        """
        context_map = {}
        
        for i, block in enumerate(blocks):
            content_type = block.type.value if isinstance(block.type, ContentType) else str(block.type)
            if content_type not in ("text", "title"):
                context_map[i] = self.extract_context_from_blocks(blocks, i, window)
        
        return context_map
