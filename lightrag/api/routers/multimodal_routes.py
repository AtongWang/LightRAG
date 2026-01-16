"""
Multimodal API Routes for LightRAG

This module provides API endpoints for managing and accessing multimodal assets
(images, tables, equations) stored in the knowledge graph.
"""

import traceback
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

from lightrag.utils import logger
from lightrag.kg.multimodal_storage import MultimodalAssetStorage
from ..utils_api import get_combined_auth_dependency

router = APIRouter(tags=["multimodal"])


# ========== Request/Response Models ==========

class AssetUploadResponse(BaseModel):
    """Response for asset upload"""
    status: str = Field(description="Upload status")
    asset_id: str = Field(description="Unique asset identifier")
    modal_type: str = Field(description="Detected modal type")
    file_size: int = Field(description="File size in bytes")
    asset_url: str = Field(description="URL to access the asset")
    thumbnail_url: Optional[str] = Field(default=None, description="URL to thumbnail")


class AssetMetadataResponse(BaseModel):
    """Response for asset metadata"""
    asset_id: str
    modal_type: str
    original_filename: Optional[str]
    mime_type: str
    file_size: int
    width: Optional[int]
    height: Optional[int]
    created_at: str
    asset_url: str
    thumbnail_url: Optional[str]
    metadata: Dict[str, Any]


class AssetListResponse(BaseModel):
    """Response for listing assets"""
    assets: List[AssetMetadataResponse]
    total: int
    limit: int
    offset: int


class StorageStatsResponse(BaseModel):
    """Response for storage statistics"""
    total_assets: int
    total_size_bytes: int
    total_size_mb: float
    assets_by_type: Dict[str, int]
    storage_path: str


class MultimodalChunkInfo(BaseModel):
    """Information about a multimodal chunk"""
    chunk_id: str
    content_type: str
    description: str
    asset_id: Optional[str]
    asset_url: Optional[str]
    thumbnail_url: Optional[str]
    table_html: Optional[str]
    equation_latex: Optional[str]
    source_file: Optional[str]
    page_index: Optional[int]


class QueryMultimodalResponse(BaseModel):
    """Response containing multimodal results from a query"""
    query: str
    multimodal_results: List[MultimodalChunkInfo]
    total_results: int


def create_multimodal_routes(rag, api_key: Optional[str] = None):
    """
    Create multimodal-related API routes
    
    Args:
        rag: LightRAG instance
        api_key: Optional API key for authentication
    """
    combined_auth = get_combined_auth_dependency(api_key)
    
    # Initialize multimodal storage
    multimodal_storage = MultimodalAssetStorage(working_dir=rag.working_dir)

    @router.post("/multimodal/assets/upload", dependencies=[Depends(combined_auth)])
    async def upload_asset(
        file: UploadFile = File(...),
        modal_type: Optional[str] = Query(
            default=None,
            description="Type of multimodal content (image, table, equation, generic)"
        ),
    ) -> AssetUploadResponse:
        """
        Upload a multimodal asset (image, table image, etc.)
        
        The asset will be stored and a unique ID will be assigned for later reference.
        Thumbnails are automatically generated for image files.
        """
        try:
            # Read file content
            content = await file.read()
            
            if not content:
                raise HTTPException(status_code=400, detail="Empty file uploaded")
            
            # Validate modal_type if provided
            valid_types = ["image", "table", "equation", "audio", "video", "generic"]
            if modal_type and modal_type not in valid_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid modal_type. Must be one of: {valid_types}"
                )
            
            # Store the asset
            asset = await multimodal_storage.store_asset(
                content=content,
                filename=file.filename or "unknown",
                modal_type=modal_type,
                metadata={"original_content_type": file.content_type},
            )
            
            return AssetUploadResponse(
                status="success",
                asset_id=asset.asset_id,
                modal_type=asset.modal_type,
                file_size=asset.file_size,
                asset_url=multimodal_storage.get_asset_url(asset.asset_id),
                thumbnail_url=multimodal_storage.get_thumbnail_url(asset.asset_id),
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading asset: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Failed to upload asset: {str(e)}")

    @router.get("/multimodal/assets/{asset_id}", dependencies=[Depends(combined_auth)])
    async def get_asset(asset_id: str):
        """
        Get an asset file by ID
        
        Returns the binary content of the asset with appropriate content type.
        """
        try:
            asset = await multimodal_storage.get_asset(asset_id)
            if not asset:
                raise HTTPException(status_code=404, detail=f"Asset not found: {asset_id}")
            
            content = await multimodal_storage.get_asset_content(asset_id)
            if not content:
                raise HTTPException(status_code=404, detail=f"Asset content not found: {asset_id}")
            
            return Response(
                content=content,
                media_type=asset.mime_type,
                headers={
                    "Content-Disposition": f'inline; filename="{asset.original_filename or asset_id}"',
                    "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
                },
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting asset {asset_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get asset: {str(e)}")

    @router.get("/multimodal/assets/{asset_id}/thumbnail", dependencies=[Depends(combined_auth)])
    async def get_asset_thumbnail(asset_id: str):
        """
        Get the thumbnail for an image asset
        
        Returns a smaller preview image for faster loading.
        """
        try:
            asset = await multimodal_storage.get_asset(asset_id)
            if not asset:
                raise HTTPException(status_code=404, detail=f"Asset not found: {asset_id}")
            
            if not asset.thumbnail_path:
                raise HTTPException(status_code=404, detail=f"No thumbnail available for asset: {asset_id}")
            
            content = await multimodal_storage.get_thumbnail_content(asset_id)
            if not content:
                raise HTTPException(status_code=404, detail=f"Thumbnail content not found: {asset_id}")
            
            return Response(
                content=content,
                media_type="image/jpeg",
                headers={
                    "Cache-Control": "public, max-age=31536000",
                },
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting thumbnail for {asset_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get thumbnail: {str(e)}")

    @router.get("/multimodal/assets/{asset_id}/base64", dependencies=[Depends(combined_auth)])
    async def get_asset_base64(asset_id: str) -> Dict[str, Any]:
        """
        Get an asset as base64 encoded data
        
        Useful for embedding images directly in responses or for frontend display.
        """
        try:
            asset = await multimodal_storage.get_asset(asset_id)
            if not asset:
                raise HTTPException(status_code=404, detail=f"Asset not found: {asset_id}")
            
            base64_data = await multimodal_storage.get_asset_base64(asset_id)
            if not base64_data:
                raise HTTPException(status_code=404, detail=f"Asset content not found: {asset_id}")
            
            return {
                "asset_id": asset_id,
                "mime_type": asset.mime_type,
                "data": base64_data,
                "data_url": f"data:{asset.mime_type};base64,{base64_data}",
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting base64 for {asset_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get base64 data: {str(e)}")

    @router.get("/multimodal/assets/{asset_id}/metadata", dependencies=[Depends(combined_auth)])
    async def get_asset_metadata(asset_id: str) -> AssetMetadataResponse:
        """
        Get metadata for an asset without downloading the file
        """
        try:
            asset = await multimodal_storage.get_asset(asset_id)
            if not asset:
                raise HTTPException(status_code=404, detail=f"Asset not found: {asset_id}")
            
            return AssetMetadataResponse(
                asset_id=asset.asset_id,
                modal_type=asset.modal_type,
                original_filename=asset.original_filename,
                mime_type=asset.mime_type,
                file_size=asset.file_size,
                width=asset.width,
                height=asset.height,
                created_at=asset.created_at,
                asset_url=multimodal_storage.get_asset_url(asset.asset_id),
                thumbnail_url=multimodal_storage.get_thumbnail_url(asset.asset_id),
                metadata=asset.metadata,
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting metadata for {asset_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get metadata: {str(e)}")

    @router.delete("/multimodal/assets/{asset_id}", dependencies=[Depends(combined_auth)])
    async def delete_asset(asset_id: str) -> Dict[str, str]:
        """
        Delete an asset by ID
        """
        try:
            success = await multimodal_storage.delete_asset(asset_id)
            if not success:
                raise HTTPException(status_code=404, detail=f"Asset not found: {asset_id}")
            
            return {"status": "success", "message": f"Asset {asset_id} deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting asset {asset_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete asset: {str(e)}")

    @router.get("/multimodal/assets", dependencies=[Depends(combined_auth)])
    async def list_assets(
        modal_type: Optional[str] = Query(
            default=None,
            description="Filter by modal type (image, table, equation, etc.)"
        ),
        limit: int = Query(default=50, ge=1, le=500, description="Maximum results"),
        offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    ) -> AssetListResponse:
        """
        List all stored assets with optional filtering
        """
        try:
            assets = await multimodal_storage.list_assets(
                modal_type=modal_type,
                limit=limit,
                offset=offset,
            )
            
            asset_responses = [
                AssetMetadataResponse(
                    asset_id=a.asset_id,
                    modal_type=a.modal_type,
                    original_filename=a.original_filename,
                    mime_type=a.mime_type,
                    file_size=a.file_size,
                    width=a.width,
                    height=a.height,
                    created_at=a.created_at,
                    asset_url=multimodal_storage.get_asset_url(a.asset_id),
                    thumbnail_url=multimodal_storage.get_thumbnail_url(a.asset_id),
                    metadata=a.metadata,
                )
                for a in assets
            ]
            
            # Get total count for this type
            all_assets = await multimodal_storage.list_assets(
                modal_type=modal_type,
                limit=10000,
                offset=0,
            )
            
            return AssetListResponse(
                assets=asset_responses,
                total=len(all_assets),
                limit=limit,
                offset=offset,
            )
            
        except Exception as e:
            logger.error(f"Error listing assets: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to list assets: {str(e)}")

    @router.get("/multimodal/stats", dependencies=[Depends(combined_auth)])
    async def get_storage_stats() -> StorageStatsResponse:
        """
        Get multimodal storage statistics
        """
        try:
            stats = await multimodal_storage.get_stats()
            return StorageStatsResponse(**stats)
            
        except Exception as e:
            logger.error(f"Error getting storage stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

    @router.get("/multimodal/chunks", dependencies=[Depends(combined_auth)])
    async def get_multimodal_chunks(
        limit: int = Query(default=50, ge=1, le=200, description="Maximum results"),
        offset: int = Query(default=0, ge=0, description="Offset for pagination"),
        content_type: Optional[str] = Query(
            default=None,
            description="Filter by content type (image, table, equation)"
        ),
    ) -> Dict[str, Any]:
        """
        Get all multimodal chunks from the knowledge base
        
        Returns chunks that have is_multimodal=True with their associated metadata.
        """
        try:
            # Access chunks storage
            chunks_storage = rag.text_chunks
            
            # Get all chunks (we'll filter in memory for multimodal ones)
            # This is a simplified implementation - in production you'd want indexed queries
            all_chunks = []
            
            # Try to get chunks with multimodal flag
            try:
                # Use the storage's get method if available
                if hasattr(chunks_storage, 'get_all'):
                    all_data = await chunks_storage.get_all()
                elif hasattr(chunks_storage, 'filter'):
                    all_data = await chunks_storage.filter({})
                else:
                    # Fallback: return empty if no suitable method
                    all_data = {}
            except Exception as e:
                logger.warning(f"Could not retrieve chunks: {e}")
                all_data = {}
            
            # Filter for multimodal chunks
            multimodal_chunks = []
            for chunk_id, chunk_data in all_data.items():
                if isinstance(chunk_data, dict) and chunk_data.get("is_multimodal", False):
                    original_type = chunk_data.get("original_type", "generic")
                    
                    # Apply content_type filter if specified
                    if content_type and original_type != content_type:
                        continue
                    
                    # Get associated asset if available
                    asset_path = chunk_data.get("img_path") or chunk_data.get("asset_path")
                    asset_url = None
                    thumbnail_url = None
                    
                    if asset_path:
                        # Check if we have a stored asset for this path
                        # The asset_id might be derived from the path
                        pass  # Asset URL would be constructed here if asset exists
                    
                    multimodal_chunks.append({
                        "chunk_id": chunk_id,
                        "content_type": original_type,
                        "description": chunk_data.get("content", "")[:500],  # Truncate for preview
                        "entity_name": chunk_data.get("modal_entity_name"),
                        "page_index": chunk_data.get("page_idx"),
                        "source_file": chunk_data.get("file_path"),
                        "asset_url": asset_url,
                        "thumbnail_url": thumbnail_url,
                        "table_data": chunk_data.get("table_body") if original_type == "table" else None,
                        "equation_latex": chunk_data.get("text") if original_type == "equation" else None,
                    })
            
            # Apply pagination
            total = len(multimodal_chunks)
            paginated = multimodal_chunks[offset:offset + limit]
            
            return {
                "chunks": paginated,
                "total": total,
                "limit": limit,
                "offset": offset,
            }
            
        except Exception as e:
            logger.error(f"Error getting multimodal chunks: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Failed to get multimodal chunks: {str(e)}")

    @router.get("/multimodal/entities", dependencies=[Depends(combined_auth)])
    async def get_multimodal_entities(
        limit: int = Query(default=50, ge=1, le=200, description="Maximum results"),
        offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    ) -> Dict[str, Any]:
        """
        Get entities that represent multimodal content in the knowledge graph
        
        These are typically entities like "Figure_1", "Table_2", etc. that were
        extracted from multimodal content processing.
        """
        try:
            # Access the graph storage
            graph_storage = rag.chunk_entity_relation_graph
            
            # Get all nodes and filter for multimodal-related entities
            all_nodes = await graph_storage.get_all_nodes()
            
            multimodal_entities = []
            for node in all_nodes:
                # Check if this node is a multimodal entity by its properties
                props = node if isinstance(node, dict) else {}
                entity_type = props.get("entity_type", "").lower()
                entity_name = props.get("entity_name", props.get("id", ""))
                
                # Identify multimodal entities by type or naming pattern
                is_multimodal = (
                    entity_type in ["image", "table", "figure", "equation", "chart", "diagram"]
                    or any(prefix in entity_name.lower() for prefix in 
                           ["figure_", "table_", "image_", "equation_", "chart_", "diagram_"])
                )
                
                if is_multimodal:
                    multimodal_entities.append({
                        "entity_id": props.get("entity_id") or entity_name,
                        "entity_name": entity_name,
                        "entity_type": entity_type,
                        "description": props.get("description", ""),
                        "source_id": props.get("source_id", ""),
                        "file_path": props.get("file_path", ""),
                    })
            
            # Apply pagination
            total = len(multimodal_entities)
            paginated = multimodal_entities[offset:offset + limit]
            
            return {
                "entities": paginated,
                "total": total,
                "limit": limit,
                "offset": offset,
            }
            
        except Exception as e:
            logger.error(f"Error getting multimodal entities: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Failed to get multimodal entities: {str(e)}")

    # ========== Enhanced Multimodal Document Processing ==========

    @router.get("/multimodal/parsers/status", dependencies=[Depends(combined_auth)])
    async def check_parser_status() -> Dict[str, Any]:
        """
        Check availability of multimodal document parsers.
        
        Returns status of MinerU API, MinerU Local, and RAGAnything parsers,
        along with the recommended parser to use.
        """
        try:
            from lightrag.multimodal import EnhancedMultimodalParser
            
            parser = EnhancedMultimodalParser(
                parser_type="auto",
                mineru_api_url=rag.mineru_api_url if hasattr(rag, "mineru_api_url") else "http://localhost:8000",
                raganything_url=rag.multimodal_raganything_url if hasattr(rag, "multimodal_raganything_url") else "http://127.0.0.1:30000",
            )
            
            status = await parser.check_availability()
            await parser.close()
            
            return {
                "status": "success",
                "parsers": status,
                "multimodal_enabled": rag.multimodal_enabled if hasattr(rag, "multimodal_enabled") else False,
            }
            
        except Exception as e:
            logger.error(f"Error checking parser status: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "parsers": {
                    "mineru_api": False,
                    "mineru_local": False,
                    "raganything": False,
                    "recommended": None,
                },
                "multimodal_enabled": False,
            }

    @router.post("/multimodal/documents/upload", dependencies=[Depends(combined_auth)])
    async def upload_multimodal_document(
        file: UploadFile = File(...),
        enable_multimodal_processing: bool = Query(
            default=True,
            description="Enable processing of images/tables/equations with LLM"
        ),
        parser_type: Optional[str] = Query(
            default="auto",
            description="Parser type: auto, mineru_api, mineru_local, raganything"
        ),
        project_id: Optional[str] = Query(
            default=None,
            description="Project ID to associate with the document for isolation"
        ),
    ) -> Dict[str, Any]:
        """
        Upload and parse a multimodal document (PDF, images, etc.)
        
        The document will be parsed using MinerU or RAGAnything to extract:
        - Text content
        - Images with auto-generated descriptions
        - Tables with structure and descriptions
        - Mathematical equations
        
        All content is inserted into the knowledge graph for RAG queries.
        """
        try:
            import tempfile
            import os
            from lightrag.utils import generate_track_id
            
            if not file.filename:
                raise HTTPException(status_code=400, detail="Filename is required")
            
            # Save uploaded file to temp location
            suffix = os.path.splitext(file.filename)[1] or ".pdf"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_path = tmp_file.name
            
            try:
                # Generate track_id
                track_id = generate_track_id("multimodal")
                
                # Build metadata with project_id and original filename
                metadata = {
                    "original_filename": file.filename,
                }
                if project_id:
                    metadata["project_id"] = project_id
                
                # Use the multimodal insert method
                result_track_id = await rag.ainsert_multimodal(
                    file_paths=tmp_path,
                    enable_multimodal_processing=enable_multimodal_processing,
                    track_id=track_id,
                    metadata=metadata,
                )
                
                return {
                    "status": "success",
                    "message": f"Document '{file.filename}' uploaded and processing started",
                    "track_id": result_track_id,
                    "filename": file.filename,
                    "file_size": len(content),
                    "multimodal_processing": enable_multimodal_processing,
                    "project_id": project_id,
                }

            finally:
                # Cleanup temp file
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading multimodal document: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload multimodal document: {str(e)}"
            )

    @router.post("/multimodal/documents/parse-preview", dependencies=[Depends(combined_auth)])
    async def preview_document_parse(
        file: UploadFile = File(...),
        parser_type: Optional[str] = Query(
            default="auto",
            description="Parser type: auto, mineru_api, mineru_local"
        ),
    ) -> Dict[str, Any]:
        """
        Parse a document and return preview without inserting into knowledge graph.
        
        Useful for checking parsing results before committing to insertion.
        Returns parsed content structure including text, images, tables, and equations.
        """
        try:
            import tempfile
            import os
            from lightrag.multimodal import EnhancedMultimodalParser
            
            if not file.filename:
                raise HTTPException(status_code=400, detail="Filename is required")
            
            # Save uploaded file to temp location
            suffix = os.path.splitext(file.filename)[1] or ".pdf"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_path = tmp_file.name
            
            try:
                # Create parser
                parser = EnhancedMultimodalParser(
                    parser_type=parser_type or "auto",
                    mineru_api_url=rag.mineru_api_url if hasattr(rag, "mineru_api_url") else "http://localhost:8000",
                    raganything_url=rag.multimodal_raganything_url if hasattr(rag, "multimodal_raganything_url") else "http://127.0.0.1:30000",
                    enabled=True,
                )
                
                # Parse document (without multimodal LLM processing for preview)
                result = await parser.parse(tmp_path, enable_multimodal=False)
                await parser.close()
                
                return {
                    "status": "success",
                    "filename": file.filename,
                    "content_preview": result.content[:2000] if result.content else "",
                    "content_length": len(result.content) if result.content else 0,
                    "metadata": result.metadata,
                    "images_count": len(result.images),
                    "tables_count": len(result.tables),
                    "equations_count": len(result.equations) if hasattr(result, "equations") else 0,
                    "images": result.images[:5],  # First 5 images
                    "tables": result.tables[:5],  # First 5 tables
                    "markdown_preview": result.markdown[:2000] if result.markdown else "",
                }
                
            finally:
                # Cleanup temp file
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error parsing document preview: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse document: {str(e)}"
            )

    return router
