"""
Multimodal Asset Storage for LightRAG

This module provides storage and retrieval functionality for multimodal assets
(images, tables, equations, etc.) that are associated with knowledge graph nodes.
"""

import os
import hashlib
import shutil
import base64
import mimetypes
import json
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Union, Literal
from pathlib import Path

from ..utils import logger
from ..types import MultimodalType, MultimodalAsset, MultimodalMetadata


# Default supported image formats
SUPPORTED_IMAGE_FORMATS = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
}

# Thumbnail settings
THUMBNAIL_MAX_SIZE = (256, 256)
THUMBNAIL_FORMAT = "JPEG"
THUMBNAIL_QUALITY = 85


def compute_asset_id(content: bytes, prefix: str = "asset-") -> str:
    """Compute a unique asset ID based on content hash"""
    hash_obj = hashlib.md5(content)
    return f"{prefix}{hash_obj.hexdigest()[:16]}"


@dataclass
class MultimodalAssetStorage:
    """
    Storage manager for multimodal assets (images, tables, etc.)
    
    This class handles:
    - Storing and retrieving image files
    - Generating thumbnails for preview
    - Managing asset metadata
    - Providing URLs for asset access
    """
    
    working_dir: str
    """Base working directory for LightRAG"""
    
    assets_subdir: str = "multimodal_assets"
    """Subdirectory name for storing assets"""
    
    metadata_file: str = "assets_metadata.json"
    """Filename for storing asset metadata"""
    
    generate_thumbnails: bool = True
    """Whether to generate thumbnails for images"""
    
    # Internal state
    _assets_dir: str = field(init=False, default="")
    _thumbnails_dir: str = field(init=False, default="")
    _metadata_cache: Dict[str, MultimodalAsset] = field(init=False, default_factory=dict)
    _initialized: bool = field(init=False, default=False)
    
    def __post_init__(self):
        """Initialize storage directories"""
        self._assets_dir = os.path.join(self.working_dir, self.assets_subdir)
        self._thumbnails_dir = os.path.join(self._assets_dir, "thumbnails")
        self._metadata_path = os.path.join(self._assets_dir, self.metadata_file)
    
    async def initialize(self) -> None:
        """Initialize storage directories and load metadata"""
        if self._initialized:
            return
            
        # Create directories
        os.makedirs(self._assets_dir, exist_ok=True)
        os.makedirs(self._thumbnails_dir, exist_ok=True)
        
        # Load existing metadata
        await self._load_metadata()
        
        self._initialized = True
        logger.info(f"MultimodalAssetStorage initialized at: {self._assets_dir}")
    
    async def _load_metadata(self) -> None:
        """Load asset metadata from disk"""
        if os.path.exists(self._metadata_path):
            try:
                with open(self._metadata_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for asset_id, asset_data in data.items():
                        self._metadata_cache[asset_id] = MultimodalAsset(**asset_data)
                logger.debug(f"Loaded {len(self._metadata_cache)} assets from metadata")
            except Exception as e:
                logger.warning(f"Failed to load asset metadata: {e}")
                self._metadata_cache = {}
    
    async def _save_metadata(self) -> None:
        """Persist asset metadata to disk"""
        try:
            data = {
                asset_id: asset.model_dump()
                for asset_id, asset in self._metadata_cache.items()
            }
            with open(self._metadata_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save asset metadata: {e}")
    
    def _determine_modal_type(self, mime_type: str, filename: str = "") -> MultimodalType:
        """Determine the modal type based on MIME type and filename"""
        if mime_type.startswith("image/"):
            return "image"
        elif mime_type in ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]:
            return "table"
        elif "latex" in filename.lower() or "equation" in filename.lower():
            return "equation"
        elif mime_type.startswith("audio/"):
            return "audio"
        elif mime_type.startswith("video/"):
            return "video"
        else:
            return "generic"
    
    async def store_asset(
        self,
        content: bytes,
        filename: str,
        modal_type: Optional[MultimodalType] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MultimodalAsset:
        """
        Store a multimodal asset file
        
        Args:
            content: Binary content of the asset
            filename: Original filename
            modal_type: Type of multimodal content (auto-detected if not provided)
            metadata: Additional metadata to store
            
        Returns:
            MultimodalAsset object with storage information
        """
        await self.initialize()
        
        # Compute asset ID
        asset_id = compute_asset_id(content)
        
        # Check if already exists
        if asset_id in self._metadata_cache:
            logger.debug(f"Asset {asset_id} already exists, returning cached")
            return self._metadata_cache[asset_id]
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = "application/octet-stream"
        
        # Determine modal type
        if modal_type is None:
            modal_type = self._determine_modal_type(mime_type, filename)
        
        # Create storage path with extension
        ext = os.path.splitext(filename)[1] or ".bin"
        storage_filename = f"{asset_id}{ext}"
        file_path = os.path.join(self._assets_dir, storage_filename)
        
        # Write file
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Get image dimensions if applicable
        width, height = None, None
        thumbnail_path = None
        
        if modal_type == "image" and self.generate_thumbnails:
            width, height, thumbnail_path = await self._process_image(
                file_path, asset_id, ext
            )
        
        # Create asset record
        asset = MultimodalAsset(
            asset_id=asset_id,
            modal_type=modal_type,
            file_path=storage_filename,
            original_filename=filename,
            mime_type=mime_type,
            file_size=len(content),
            width=width,
            height=height,
            thumbnail_path=thumbnail_path,
            created_at=time.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            metadata=metadata or {},
        )
        
        # Cache and persist
        self._metadata_cache[asset_id] = asset
        await self._save_metadata()
        
        logger.info(f"Stored asset: {asset_id} ({modal_type}, {len(content)} bytes)")
        return asset
    
    async def store_asset_from_path(
        self,
        source_path: str,
        modal_type: Optional[MultimodalType] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MultimodalAsset:
        """
        Store an asset from a file path
        
        Args:
            source_path: Path to the source file
            modal_type: Type of multimodal content
            metadata: Additional metadata
            
        Returns:
            MultimodalAsset object
        """
        with open(source_path, 'rb') as f:
            content = f.read()
        filename = os.path.basename(source_path)
        return await self.store_asset(content, filename, modal_type, metadata)
    
    async def _process_image(
        self, file_path: str, asset_id: str, ext: str
    ) -> tuple[Optional[int], Optional[int], Optional[str]]:
        """Process an image: get dimensions and generate thumbnail"""
        width, height, thumbnail_path = None, None, None
        
        try:
            # Try to use PIL for image processing
            from PIL import Image
            
            with Image.open(file_path) as img:
                width, height = img.size
                
                # Generate thumbnail
                if self.generate_thumbnails:
                    thumb = img.copy()
                    thumb.thumbnail(THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
                    
                    # Convert to RGB if necessary (for JPEG)
                    if thumb.mode in ('RGBA', 'P'):
                        thumb = thumb.convert('RGB')
                    
                    thumb_filename = f"{asset_id}_thumb.jpg"
                    thumb_path = os.path.join(self._thumbnails_dir, thumb_filename)
                    thumb.save(thumb_path, THUMBNAIL_FORMAT, quality=THUMBNAIL_QUALITY)
                    thumbnail_path = f"thumbnails/{thumb_filename}"
                    
        except ImportError:
            logger.warning("PIL not available, skipping image processing")
        except Exception as e:
            logger.warning(f"Failed to process image: {e}")
        
        return width, height, thumbnail_path
    
    async def get_asset(self, asset_id: str) -> Optional[MultimodalAsset]:
        """Get asset metadata by ID"""
        await self.initialize()
        return self._metadata_cache.get(asset_id)
    
    async def get_asset_content(self, asset_id: str) -> Optional[bytes]:
        """Get the binary content of an asset"""
        await self.initialize()
        
        asset = self._metadata_cache.get(asset_id)
        if not asset:
            return None
        
        file_path = os.path.join(self._assets_dir, asset.file_path)
        if not os.path.exists(file_path):
            logger.warning(f"Asset file not found: {file_path}")
            return None
        
        with open(file_path, 'rb') as f:
            return f.read()
    
    async def get_asset_base64(self, asset_id: str) -> Optional[str]:
        """Get asset content as base64 encoded string"""
        content = await self.get_asset_content(asset_id)
        if content:
            return base64.b64encode(content).decode('utf-8')
        return None
    
    async def get_thumbnail_content(self, asset_id: str) -> Optional[bytes]:
        """Get thumbnail content for an asset"""
        await self.initialize()
        
        asset = self._metadata_cache.get(asset_id)
        if not asset or not asset.thumbnail_path:
            return None
        
        thumb_path = os.path.join(self._assets_dir, asset.thumbnail_path)
        if not os.path.exists(thumb_path):
            return None
        
        with open(thumb_path, 'rb') as f:
            return f.read()
    
    async def get_thumbnail_base64(self, asset_id: str) -> Optional[str]:
        """Get thumbnail as base64 encoded string"""
        content = await self.get_thumbnail_content(asset_id)
        if content:
            return base64.b64encode(content).decode('utf-8')
        return None
    
    def get_asset_path(self, asset_id: str) -> Optional[str]:
        """Get the full file system path for an asset"""
        asset = self._metadata_cache.get(asset_id)
        if asset:
            return os.path.join(self._assets_dir, asset.file_path)
        return None
    
    def get_asset_url(self, asset_id: str, base_url: str = "/api/multimodal") -> Optional[str]:
        """
        Get a URL for accessing an asset through the API
        
        Args:
            asset_id: The asset ID
            base_url: Base URL for the multimodal API
            
        Returns:
            URL string or None if asset doesn't exist
        """
        if asset_id in self._metadata_cache:
            return f"{base_url}/assets/{asset_id}"
        return None
    
    def get_thumbnail_url(self, asset_id: str, base_url: str = "/api/multimodal") -> Optional[str]:
        """Get URL for accessing an asset's thumbnail"""
        asset = self._metadata_cache.get(asset_id)
        if asset and asset.thumbnail_path:
            return f"{base_url}/assets/{asset_id}/thumbnail"
        return None
    
    async def delete_asset(self, asset_id: str) -> bool:
        """Delete an asset and its thumbnail"""
        await self.initialize()
        
        asset = self._metadata_cache.get(asset_id)
        if not asset:
            return False
        
        # Delete main file
        file_path = os.path.join(self._assets_dir, asset.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete thumbnail
        if asset.thumbnail_path:
            thumb_path = os.path.join(self._assets_dir, asset.thumbnail_path)
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
        
        # Remove from cache
        del self._metadata_cache[asset_id]
        await self._save_metadata()
        
        logger.info(f"Deleted asset: {asset_id}")
        return True
    
    async def list_assets(
        self,
        modal_type: Optional[MultimodalType] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MultimodalAsset]:
        """
        List stored assets with optional filtering
        
        Args:
            modal_type: Filter by modal type
            limit: Maximum number of results
            offset: Offset for pagination
            
        Returns:
            List of MultimodalAsset objects
        """
        await self.initialize()
        
        assets = list(self._metadata_cache.values())
        
        # Filter by type
        if modal_type:
            assets = [a for a in assets if a.modal_type == modal_type]
        
        # Sort by creation time (newest first)
        assets.sort(key=lambda a: a.created_at, reverse=True)
        
        # Paginate
        return assets[offset:offset + limit]
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        await self.initialize()
        
        total_size = 0
        type_counts: Dict[str, int] = {}
        
        for asset in self._metadata_cache.values():
            total_size += asset.file_size
            type_counts[asset.modal_type] = type_counts.get(asset.modal_type, 0) + 1
        
        return {
            "total_assets": len(self._metadata_cache),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "assets_by_type": type_counts,
            "storage_path": self._assets_dir,
        }


def create_multimodal_metadata_from_chunk(chunk_data: Dict[str, Any]) -> MultimodalMetadata:
    """
    Create MultimodalMetadata from a chunk's data (e.g., from RAGAnything processing)
    
    Args:
        chunk_data: Chunk data dictionary containing multimodal fields
        
    Returns:
        MultimodalMetadata object
    """
    is_multimodal = chunk_data.get("is_multimodal", False)
    
    if not is_multimodal:
        return MultimodalMetadata(is_multimodal=False)
    
    # Map RAGAnything's original_type to our MultimodalType
    original_type = chunk_data.get("original_type", "generic")
    modal_type_map = {
        "image": "image",
        "table": "table",
        "equation": "equation",
        "audio": "audio",
        "video": "video",
    }
    modal_type = modal_type_map.get(original_type, "generic")
    
    return MultimodalMetadata(
        is_multimodal=True,
        modal_type=modal_type,
        asset_path=chunk_data.get("img_path") or chunk_data.get("asset_path"),
        page_index=chunk_data.get("page_idx"),
        source_document=chunk_data.get("file_path"),
        enhanced_description=chunk_data.get("modal_entity_name"),
        # Table-specific
        table_data=chunk_data.get("table_body"),
        # Equation-specific
        equation_latex=chunk_data.get("text") if original_type == "equation" else None,
        equation_text=chunk_data.get("text_format") if original_type == "equation" else None,
    )
