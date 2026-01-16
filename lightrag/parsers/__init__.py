"""
LightRAG Document Parsers

This module provides document parsing capabilities for multimodal content extraction.
Supports multiple parsing backends including MinerU (local and API) and Docling.
"""

from typing import Optional
from .base import BaseParser, ParseResult, ContentBlock, ParserConfig
from .mineru_api import MineruAPIParser, MineruAPIConfig
from .mineru_local import MineruLocalParser


def get_default_parser(
    parser_type: str = "auto",
    mineru_api_url: str = "http://localhost:8000",
    **kwargs
) -> Optional[BaseParser]:
    """
    Get a default parser based on availability.
    
    Args:
        parser_type: Parser type - "auto", "mineru_api", "mineru_local"
        mineru_api_url: URL for MinerU API service
        **kwargs: Additional parser configuration
        
    Returns:
        BaseParser instance or None if no parser available
    """
    if parser_type == "mineru_api" or parser_type == "auto":
        try:
            config = MineruAPIConfig(api_url=mineru_api_url, **kwargs)
            parser = MineruAPIParser(config=config)
            # Check if API is available
            if parser.check_availability():
                return parser
        except Exception:
            pass
    
    if parser_type == "mineru_local" or parser_type == "auto":
        try:
            parser = MineruLocalParser()
            if parser.check_availability():
                return parser
        except Exception:
            pass
    
    return None


__all__ = [
    "BaseParser",
    "ParseResult", 
    "ContentBlock",
    "ParserConfig",
    "MineruAPIParser",
    "MineruAPIConfig",
    "MineruLocalParser",
    "get_default_parser",
]
