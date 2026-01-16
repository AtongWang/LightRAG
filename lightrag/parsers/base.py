"""
Base classes for document parsers

Defines the abstract interface for all document parsers and common data structures.
"""

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
from pathlib import Path


class ContentType(str, Enum):
    """Types of content that can be extracted from documents"""
    TEXT = "text"
    IMAGE = "image"
    TABLE = "table"
    EQUATION = "equation"
    TITLE = "title"
    INTERLINE_EQUATION = "interline_equation"
    UNKNOWN = "unknown"


@dataclass
class ContentBlock:
    """
    Represents a single content block extracted from a document.
    
    This is the unified format for all parsers to return content.
    """
    # Required fields
    type: ContentType
    
    # Text content (for text, title, equation types)
    text: Optional[str] = None
    
    # Image-related fields
    img_path: Optional[str] = None  # Absolute path to image file
    img_caption: Optional[str] = None
    
    # Table-related fields  
    table_body: Optional[str] = None  # Raw table content
    table_html: Optional[str] = None  # HTML representation
    table_caption: Optional[str] = None
    
    # Equation-related fields
    equation_latex: Optional[str] = None
    equation_img_path: Optional[str] = None
    
    # Metadata
    page_idx: int = 0
    block_idx: int = 0
    bbox: Optional[List[float]] = None  # [x1, y1, x2, y2]
    
    # Additional metadata from parser
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format compatible with RAGAnything"""
        result = {
            "type": self.type.value if isinstance(self.type, ContentType) else self.type,
            "page_idx": self.page_idx,
            "block_idx": self.block_idx,
        }
        
        if self.text:
            result["text"] = self.text
        if self.img_path:
            result["img_path"] = self.img_path
        if self.img_caption:
            result["img_caption"] = self.img_caption
        if self.table_body:
            result["table_body"] = self.table_body
        if self.table_html:
            result["table_html"] = self.table_html
        if self.table_caption:
            result["table_caption"] = self.table_caption
        if self.equation_latex:
            result["equation_latex"] = self.equation_latex
        if self.equation_img_path:
            result["equation_img_path"] = self.equation_img_path
        if self.bbox:
            result["bbox"] = self.bbox
            
        return result


@dataclass
class ParseResult:
    """
    Result of parsing a document.
    
    Contains the list of content blocks and metadata about the parsing.
    """
    # Content blocks in reading order
    content_list: List[ContentBlock] = field(default_factory=list)
    
    # Markdown representation (if available)
    markdown: Optional[str] = None
    
    # Source file information
    source_file: Optional[str] = None
    source_file_hash: Optional[str] = None
    
    # Parsing metadata
    parser_name: str = ""
    parse_time_seconds: float = 0.0
    total_pages: int = 0
    
    # Statistics
    text_blocks: int = 0
    image_blocks: int = 0
    table_blocks: int = 0
    equation_blocks: int = 0
    
    # Output directory (where images/assets are stored)
    output_dir: Optional[str] = None
    
    # Raw parser output for debugging
    raw_output: Optional[Dict[str, Any]] = None
    
    def to_content_list(self) -> List[Dict[str, Any]]:
        """Convert to list of dicts (RAGAnything compatible format)"""
        return [block.to_dict() for block in self.content_list]
    
    def get_text_content(self) -> List[ContentBlock]:
        """Get only text content blocks"""
        return [b for b in self.content_list if b.type == ContentType.TEXT]
    
    def get_multimodal_content(self) -> List[ContentBlock]:
        """Get only multimodal content blocks (image, table, equation)"""
        return [b for b in self.content_list 
                if b.type in (ContentType.IMAGE, ContentType.TABLE, ContentType.EQUATION)]
    
    def compute_statistics(self):
        """Compute statistics from content list"""
        self.text_blocks = sum(1 for b in self.content_list if b.type == ContentType.TEXT)
        self.image_blocks = sum(1 for b in self.content_list if b.type == ContentType.IMAGE)
        self.table_blocks = sum(1 for b in self.content_list if b.type == ContentType.TABLE)
        self.equation_blocks = sum(1 for b in self.content_list 
                                   if b.type in (ContentType.EQUATION, ContentType.INTERLINE_EQUATION))
    
    def get_page_count(self) -> int:
        """Get total number of pages in the document"""
        return self.total_pages
    
    @property
    def metadata(self) -> Dict[str, Any]:
        """Get metadata dict for compatibility"""
        return {
            "parser_name": self.parser_name,
            "parse_time": self.parse_time_seconds,
            "total_pages": self.total_pages,
            "source_file": self.source_file,
            "source_file_hash": self.source_file_hash,
            "text_blocks": self.text_blocks,
            "image_blocks": self.image_blocks,
            "table_blocks": self.table_blocks,
            "equation_blocks": self.equation_blocks,
        }


@dataclass
class ParserConfig:
    """Configuration for document parsers"""
    
    # Output directory for parsed content
    output_dir: str = "./parser_output"
    
    # Parsing method: auto, txt, ocr
    parse_method: str = "auto"
    
    # Language hint for OCR
    language: Optional[str] = None
    
    # Enable/disable specific content extraction
    extract_images: bool = True
    extract_tables: bool = True
    extract_equations: bool = True
    
    # Page range (None means all pages)
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    
    # MinerU specific options
    mineru_backend: Optional[str] = None  # pipeline, vlm-*, hybrid-*
    mineru_device: Optional[str] = None  # cuda, cpu, mps
    
    # API specific options
    api_url: Optional[str] = None
    api_timeout: int = 300  # seconds
    api_poll_interval: float = 2.0  # seconds
    
    # Cache options
    use_cache: bool = True
    cache_dir: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "output_dir": self.output_dir,
            "parse_method": self.parse_method,
            "language": self.language,
            "extract_images": self.extract_images,
            "extract_tables": self.extract_tables,
            "extract_equations": self.extract_equations,
            "start_page": self.start_page,
            "end_page": self.end_page,
            "mineru_backend": self.mineru_backend,
            "mineru_device": self.mineru_device,
            "api_url": self.api_url,
            "api_timeout": self.api_timeout,
        }


class BaseParser(ABC):
    """
    Abstract base class for document parsers.
    
    All parsers must implement the parse_document method.
    """
    
    def __init__(self, config: Optional[ParserConfig] = None):
        """
        Initialize the parser.
        
        Args:
            config: Parser configuration
        """
        self.config = config or ParserConfig()
        self._ensure_output_dir()
    
    def _ensure_output_dir(self):
        """Ensure output directory exists"""
        if self.config.output_dir:
            os.makedirs(self.config.output_dir, exist_ok=True)
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of the parser"""
        pass
    
    @abstractmethod
    def check_availability(self) -> bool:
        """
        Check if the parser is available (dependencies installed, services running, etc.)
        
        Returns:
            bool: True if the parser can be used
        """
        pass
    
    @abstractmethod
    async def parse_document(
        self,
        file_path: str,
        **kwargs
    ) -> ParseResult:
        """
        Parse a document and extract content.
        
        Args:
            file_path: Path to the document file
            **kwargs: Additional parser-specific options
            
        Returns:
            ParseResult containing the extracted content
        """
        pass
    
    def parse_document_sync(self, file_path: str, **kwargs) -> ParseResult:
        """
        Synchronous wrapper for parse_document.
        
        Args:
            file_path: Path to the document file
            **kwargs: Additional parser-specific options
            
        Returns:
            ParseResult containing the extracted content
        """
        import asyncio
        return asyncio.run(self.parse_document(file_path, **kwargs))
    
    @staticmethod
    def normalize_content_list(
        raw_content: List[Dict[str, Any]],
        base_dir: Optional[str] = None
    ) -> List[ContentBlock]:
        """
        Normalize raw parser output to ContentBlock list.
        
        Args:
            raw_content: Raw content list from parser
            base_dir: Base directory for resolving relative paths
            
        Returns:
            List of ContentBlock objects
        """
        blocks = []
        
        for idx, item in enumerate(raw_content):
            if not isinstance(item, dict):
                continue
                
            content_type = item.get("type", "unknown")
            
            # Map type string to ContentType enum
            type_map = {
                "text": ContentType.TEXT,
                "image": ContentType.IMAGE,
                "table": ContentType.TABLE,
                "equation": ContentType.EQUATION,
                "interline_equation": ContentType.INTERLINE_EQUATION,
                "title": ContentType.TITLE,
            }
            block_type = type_map.get(content_type, ContentType.UNKNOWN)
            
            # Create ContentBlock
            block = ContentBlock(
                type=block_type,
                text=item.get("text"),
                page_idx=item.get("page_idx", 0),
                block_idx=idx,
                raw_data=item,
            )
            
            # Handle image paths
            if "img_path" in item and item["img_path"]:
                img_path = item["img_path"]
                if base_dir and not os.path.isabs(img_path):
                    img_path = os.path.join(base_dir, img_path)
                block.img_path = str(Path(img_path).resolve()) if os.path.exists(img_path) else img_path
                block.img_caption = item.get("img_caption")
            
            # Handle table data
            if "table_body" in item:
                block.table_body = item.get("table_body")
                block.table_html = item.get("table_html")
                block.table_caption = item.get("table_caption")
            
            # Handle equation data
            if content_type in ("equation", "interline_equation"):
                block.equation_latex = item.get("text") or item.get("latex")
                if "equation_img_path" in item:
                    eq_path = item["equation_img_path"]
                    if base_dir and not os.path.isabs(eq_path):
                        eq_path = os.path.join(base_dir, eq_path)
                    block.equation_img_path = str(Path(eq_path).resolve()) if os.path.exists(eq_path) else eq_path
            
            # Handle bbox
            if "bbox" in item:
                block.bbox = item["bbox"]
            
            blocks.append(block)
        
        return blocks
    
    @staticmethod
    def get_supported_extensions() -> List[str]:
        """
        Get list of supported file extensions.
        
        Returns:
            List of file extensions (e.g., ['.pdf', '.docx'])
        """
        return [
            ".pdf",
            ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif", ".webp",
            ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
            ".html", ".htm",
            ".txt", ".md",
        ]
