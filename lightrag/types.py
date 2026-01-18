from __future__ import annotations

from pydantic import BaseModel
from typing import Any, Optional, Literal


class GPTKeywordExtractionFormat(BaseModel):
    high_level_keywords: list[str]
    low_level_keywords: list[str]


# ========== Multimodal Content Types ==========

# Supported multimodal content types
MultimodalType = Literal["image", "table", "equation", "audio", "video", "generic"]


class MultimodalMetadata(BaseModel):
    """Metadata for multimodal content stored in knowledge graph nodes/chunks"""
    
    is_multimodal: bool = False
    """Whether this content contains multimodal data"""
    
    modal_type: Optional[MultimodalType] = None
    """Type of multimodal content: image, table, equation, etc."""
    
    asset_id: Optional[str] = None
    """Reference ID to the stored asset in MultimodalAssetStorage"""
    
    asset_path: Optional[str] = None
    """Original file path of the asset (for images, tables with images)"""
    
    thumbnail_path: Optional[str] = None
    """Path to thumbnail image for preview (for images/tables)"""
    
    mime_type: Optional[str] = None
    """MIME type of the asset (e.g., image/png, image/jpeg)"""
    
    # Content-specific metadata
    image_caption: Optional[str] = None
    """Caption for image content"""
    
    table_data: Optional[str] = None
    """Raw table data in markdown or CSV format"""
    
    table_html: Optional[str] = None
    """HTML representation of table for rendering"""
    
    equation_latex: Optional[str] = None
    """LaTeX representation of equation"""
    
    equation_text: Optional[str] = None
    """Plain text representation of equation"""
    
    # Processing metadata
    page_index: Optional[int] = None
    """Page index in source document where this content appears"""
    
    source_document: Optional[str] = None
    """Source document this content was extracted from"""
    
    enhanced_description: Optional[str] = None
    """AI-enhanced description of the multimodal content"""


class MultimodalChunk(BaseModel):
    """Represents a multimodal content chunk with full metadata"""
    
    chunk_id: str
    """Unique identifier for this chunk"""
    
    content: str
    """Text content/description of the multimodal item"""
    
    tokens: int
    """Token count for the content"""
    
    full_doc_id: str
    """Document ID this chunk belongs to"""
    
    chunk_order_index: int
    """Order index within the document"""
    
    file_path: str
    """Source file path"""
    
    multimodal: MultimodalMetadata
    """Multimodal-specific metadata"""


class MultimodalAsset(BaseModel):
    """Represents a stored multimodal asset file"""
    
    asset_id: str
    """Unique identifier for this asset"""
    
    modal_type: MultimodalType
    """Type of multimodal content"""
    
    file_path: str
    """Storage path relative to assets directory"""
    
    original_filename: Optional[str] = None
    """Original filename when uploaded"""
    
    mime_type: str
    """MIME type of the asset"""
    
    file_size: int
    """File size in bytes"""
    
    width: Optional[int] = None
    """Width for images (pixels)"""
    
    height: Optional[int] = None
    """Height for images (pixels)"""
    
    thumbnail_path: Optional[str] = None
    """Path to thumbnail if generated"""
    
    created_at: str
    """Creation timestamp"""
    
    metadata: dict[str, Any] = {}
    """Additional metadata"""


class MultimodalQueryResult(BaseModel):
    """Result containing multimodal content from a query"""
    
    content_type: MultimodalType
    """Type of the multimodal content"""
    
    content_id: str
    """ID of the content (chunk_id or entity_id)"""

    asset_id: Optional[str] = None
    """Asset ID for the multimodal content"""
    
    description: str
    """Text description of the content"""
    
    asset_url: Optional[str] = None
    """URL to access the asset (for images)"""
    
    thumbnail_url: Optional[str] = None
    """URL to thumbnail for preview"""
    
    # Type-specific content
    image_data: Optional[str] = None
    """Base64 encoded image data (for inline display)"""
    
    table_html: Optional[str] = None
    """HTML table for rendering"""
    
    table_markdown: Optional[str] = None
    """Markdown table representation"""
    
    equation_latex: Optional[str] = None
    """LaTeX equation string"""
    
    source_file: Optional[str] = None
    """Source document reference"""
    
    page_index: Optional[int] = None
    """Page number in source document"""
    
    relevance_score: Optional[float] = None
    """Relevance score from retrieval"""


# ========== Knowledge Graph Types ==========

class KnowledgeGraphNode(BaseModel):
    id: str
    labels: list[str]
    properties: dict[str, Any]  # anything else goes here


class KnowledgeGraphEdge(BaseModel):
    id: str
    type: Optional[str]
    source: str  # id of source node
    target: str  # id of target node
    properties: dict[str, Any]  # anything else goes here


class KnowledgeGraph(BaseModel):
    nodes: list[KnowledgeGraphNode] = []
    edges: list[KnowledgeGraphEdge] = []
    is_truncated: bool = False
