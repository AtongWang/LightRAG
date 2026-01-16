"""
MinerU Docker API Parser

Parses documents using MinerU service deployed via Docker.
This is the recommended approach for production environments.

Usage:
    1. Start MinerU API service:
       docker compose -f compose.yaml --profile api up -d
       
    2. Use this parser:
       parser = MineruAPIParser(api_url="http://localhost:8000")
       result = await parser.parse_document("document.pdf")
"""

import os
import time
import asyncio
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

import aiohttp

from lightrag.utils import logger
from .base import (
    BaseParser,
    ParseResult,
    ParserConfig,
)


@dataclass
class MineruAPIConfig(ParserConfig):
    """Configuration specific to MinerU API parser"""
    
    # API endpoint URL
    api_url: str = "http://localhost:8000"
    
    # Timeout for API requests (seconds)
    api_timeout: int = 600
    
    # Polling interval for async tasks (seconds)
    api_poll_interval: float = 2.0
    
    # Maximum retries for API calls
    max_retries: int = 3
    
    # Backend selection (hybrid-auto-engine, pipeline, vlm-*, etc.)
    backend: str = "hybrid-auto-engine"
    
    # Whether to return images as base64
    return_images_base64: bool = False


class MineruAPIParser(BaseParser):
    """
    Document parser using MinerU Docker API.
    
    MinerU provides a REST API when deployed via Docker:
    - POST /file_parse - Upload and parse documents (PDF/images)
    
    Key parameters:
    - files: Upload files (array)
    - parse_method: auto, txt, ocr
    - backend: hybrid-auto-engine, pipeline, vlm-*
    - lang_list: Language codes (ch, en, japan, etc.)
    - return_md: Return markdown content
    - return_content_list: Return structured content
    
    API documentation: http://<host>:8000/docs
    """
    
    def __init__(
        self,
        api_url: str = "http://localhost:8000",
        config: Optional[MineruAPIConfig] = None,
        **kwargs
    ):
        """
        Initialize MinerU API parser.
        
        Args:
            api_url: URL of the MinerU API service
            config: Parser configuration
            **kwargs: Additional configuration options
        """
        if config is None:
            config = MineruAPIConfig(api_url=api_url, **kwargs)
        else:
            # Use api_url from config if not explicitly passed
            if api_url == "http://localhost:8000" and hasattr(config, 'api_url'):
                api_url = config.api_url
            else:
                config.api_url = api_url
            
        super().__init__(config)
        self.api_url = api_url.rstrip("/")
        self._session: Optional[aiohttp.ClientSession] = None
        
    @property
    def name(self) -> str:
        return "MinerU API"
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.api_timeout)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session
    
    async def _close_session(self):
        """Close aiohttp session"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
    
    def check_availability(self) -> bool:
        """Check if MinerU API is available (sync version)
        
        Note: This uses a simple HTTP request to avoid asyncio issues
        when called from within an existing event loop.
        """
        import urllib.request
        import urllib.error
        
        try:
            # Use urllib for simple sync HTTP request (no asyncio)
            url = f"{self.api_url}/openapi.json"
            req = urllib.request.Request(url, method='GET')
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    import json
                    data = json.loads(response.read().decode('utf-8'))
                    paths = data.get("paths", {})
                    if "/file_parse" in paths:
                        logger.info(f"MinerU API is available at {self.api_url}")
                        return True
            return False
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            logger.debug(f"MinerU API not available: {e}")
            return False
        except Exception as e:
            logger.warning(f"MinerU API health check failed: {e}")
            return False
    
    async def _check_health(self) -> bool:
        """Async health check"""
        try:
            session = await self._get_session()
            # MinerU API doesn't have a /health endpoint, check /openapi.json instead
            async with session.get(f"{self.api_url}/openapi.json") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Verify that /file_parse endpoint exists
                    paths = data.get("paths", {})
                    if "/file_parse" in paths:
                        logger.info(f"MinerU API is available at {self.api_url}")
                        return True
                return False
        except Exception as e:
            logger.warning(f"MinerU API health check error: {e}")
            return False
    
    async def parse_document(
        self,
        file_path: str,
        output_dir: Optional[str] = None,
        method: str = "auto",
        **kwargs
    ) -> ParseResult:
        """
        Parse a document using MinerU API.
        
        Args:
            file_path: Path to the document file
            output_dir: Directory to save output (images, etc.)
            method: Parsing method (auto, txt, ocr)
            **kwargs: Additional options (backend, language, etc.)
            
        Returns:
            ParseResult with extracted content
        """
        start_time = time.time()
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Setup output directory
        if output_dir is None:
            output_dir = self.config.output_dir
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Parsing document via MinerU API: {file_path}")
        
        try:
            session = await self._get_session()
            
            # Upload and parse file
            content_list, raw_response = await self._upload_and_parse(
                session=session,
                file_path=file_path,
                method=method,
                output_dir=output_dir,
                **kwargs
            )
            
            # Normalize content to ContentBlock list
            blocks = self.normalize_content_list(
                content_list, 
                base_dir=str(output_dir)
            )
            
            # Create result
            result = ParseResult(
                content_list=blocks,
                source_file=str(file_path),
                parser_name=self.name,
                parse_time_seconds=time.time() - start_time,
                output_dir=str(output_dir),
                raw_output=raw_response,
            )
            
            # Get markdown if available
            if raw_response and "markdown" in raw_response:
                result.markdown = raw_response["markdown"]
            
            # Compute statistics
            result.compute_statistics()
            
            logger.info(
                f"Parsing complete: {result.text_blocks} text, "
                f"{result.image_blocks} images, {result.table_blocks} tables, "
                f"{result.equation_blocks} equations"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing document: {e}")
            raise
        finally:
            await self._close_session()
    
    async def _upload_and_parse(
        self,
        session: aiohttp.ClientSession,
        file_path: Path,
        method: str,
        output_dir: Path,
        **kwargs
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Upload file and get parsing result using MinerU API.
        
        MinerU API endpoint: POST /file_parse
        - files: array of files (required)
        - parse_method: auto, txt, ocr (default: auto)
        - backend: hybrid-auto-engine, pipeline, vlm-*, etc.
        - lang_list: array of language codes (default: ["ch"])
        - return_md: return markdown (default: true)
        - return_content_list: return content list (default: false)
        - return_images: return images (default: false)
        
        If the configured backend fails, will automatically retry with 'pipeline' backend.
        """
        backend = kwargs.get("backend", getattr(self.config, "backend", "hybrid-auto-engine"))
        language = kwargs.get("language") or self.config.language
        
        # Define backends to try (primary first, then fallback)
        backends_to_try = [backend]
        if backend != "pipeline":
            backends_to_try.append("pipeline")  # Fallback to simpler pipeline backend
        
        last_error = None
        
        for current_backend in backends_to_try:
            try:
                result = await self._do_upload_and_parse(
                    session=session,
                    file_path=file_path,
                    method=method,
                    output_dir=output_dir,
                    backend=current_backend,
                    language=language,
                )
                return result
            except RuntimeError as e:
                error_msg = str(e)
                # Check if this is a backend-specific error that might be fixed by fallback
                if "Engine core initialization failed" in error_msg or "Failed core proc" in error_msg:
                    logger.warning(f"Backend '{current_backend}' failed (vLLM engine error), trying next backend...")
                    last_error = e
                    continue
                elif "500" in error_msg and current_backend != "pipeline":
                    logger.warning(f"Backend '{current_backend}' returned error, trying fallback backend...")
                    last_error = e
                    continue
                else:
                    # Not a backend-specific error, re-raise
                    raise
        
        # All backends failed
        if last_error:
            raise last_error
        raise RuntimeError("All MinerU backends failed")
    
    async def _do_upload_and_parse(
        self,
        session: aiohttp.ClientSession,
        file_path: Path,
        method: str,
        output_dir: Path,
        backend: str,
        language: Optional[str],
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Internal method to perform the actual upload and parse.
        """
        # Prepare form data - MinerU uses "files" (array) not "file"
        form_data = aiohttp.FormData()
        with open(file_path, "rb") as f:
            file_content = f.read()
        form_data.add_field(
            "files",  # MinerU expects "files" array
            file_content,
            filename=file_path.name,
            content_type="application/pdf" if file_path.suffix.lower() == ".pdf" else "application/octet-stream"
        )
        
        # Add parsing parameters as form fields (not query params)
        form_data.add_field("parse_method", method)  # MinerU uses "parse_method" not "method"
        form_data.add_field("backend", backend)
        form_data.add_field("return_md", "true")
        form_data.add_field("return_content_list", "true")  # Request content list for structured parsing
        form_data.add_field("return_images", "true")  # Request images
        form_data.add_field("formula_enable", "true")
        form_data.add_field("table_enable", "true")
        form_data.add_field("output_dir", str(output_dir))
        
        # Handle language - MinerU expects lang_list array
        if language:
            # Map common language codes to MinerU format
            lang_map = {
                "zh": "ch", "cn": "ch", "chinese": "ch",
                "en": "en", "english": "en",
                "ja": "japan", "japanese": "japan", "jp": "japan",
                "ko": "korean", "korean": "korean",
            }
            lang_code = lang_map.get(language.lower(), language)
            form_data.add_field("lang_list", lang_code)
        else:
            form_data.add_field("lang_list", "ch")  # Default to Chinese
            
        if self.config.start_page is not None:
            form_data.add_field("start_page_id", str(self.config.start_page))
        if self.config.end_page is not None:
            form_data.add_field("end_page_id", str(self.config.end_page))
            
        # MinerU API endpoint is /file_parse (not /parse/file)
        try:
            parse_url = f"{self.api_url}/file_parse"
            logger.info(f"Uploading file to {parse_url}")
            
            async with session.post(parse_url, data=form_data) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    
                    # Check for errors in response
                    if "error" in result:
                        raise RuntimeError(f"MinerU parsing error: {result['error']}")
                    
                    # MinerU API v2.7+ response format:
                    # {"backend": "...", "version": "...", "results": {"<url_encoded_filename>": {"md_content": "...", "content_list": "..."}}}
                    # Note: content_list is a JSON string, not a list!
                    
                    file_result = None
                    
                    # First check for "results" dict (new format)
                    if "results" in result:
                        results_dict = result["results"]
                        # Try to find result by filename (may be URL-encoded)
                        file_stem = file_path.stem  # filename without extension
                        
                        for key, val in results_dict.items():
                            # Keys might be URL-encoded
                            from urllib.parse import unquote
                            decoded_key = unquote(key)
                            if isinstance(val, dict):
                                # Match by stem (without extension)
                                if file_stem in decoded_key or file_stem in key:
                                    file_result = val
                                    break
                        
                        # If no match found, take the first result
                        if file_result is None and results_dict:
                            file_result = next(iter(results_dict.values()))
                    
                    # Fallback to old format (direct dict with "markdown" or "content_list")
                    if file_result is None:
                        file_result = result
                    
                    # Extract markdown content - MinerU uses "md_content" (not "markdown")
                    markdown_content = file_result.get("md_content") or file_result.get("markdown", "")
                    
                    # Extract content_list - may be a JSON string that needs parsing
                    raw_content_list = file_result.get("content_list", [])
                    if isinstance(raw_content_list, str):
                        import json
                        try:
                            content_list = json.loads(raw_content_list)
                        except json.JSONDecodeError:
                            logger.warning("Failed to parse content_list as JSON")
                            content_list = []
                    else:
                        content_list = raw_content_list
                    
                    # Extract images dict (base64 encoded images)
                    images_dict = file_result.get("images", {})
                    
                    # If no content_list but has markdown, create text content
                    if not content_list and markdown_content:
                        content_list = [{"type": "text", "text": markdown_content}]
                    
                    # Create normalized result dict
                    normalized_result = {
                        "markdown": markdown_content,
                        "content_list": content_list,
                        "backend": result.get("backend"),
                        "version": result.get("version"),
                    }
                    
                    # Download/save images and update paths in content_list
                    await self._download_images(session, content_list, output_dir, images_dict)
                    
                    logger.info(f"MinerU parsing completed: {len(content_list)} content blocks, {len(markdown_content)} chars markdown")
                    
                    return content_list, normalized_result
                    
                else:
                    error_text = await resp.text()
                    raise RuntimeError(f"MinerU API error {resp.status}: {error_text}")
                    
        except aiohttp.ClientError as e:
            logger.error(f"MinerU API request failed: {e}")
            raise
    
    async def _poll_for_result(
        self,
        session: aiohttp.ClientSession,
        task_id: str,
        output_dir: Path,
        max_wait: Optional[int] = None
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Poll for async parsing result.
        
        Args:
            session: aiohttp session
            task_id: Task ID to poll
            output_dir: Directory to save output
            max_wait: Maximum wait time in seconds
        """
        max_wait = max_wait or self.config.api_timeout
        poll_interval = self.config.api_poll_interval
        start_time = time.time()
        
        result_url = f"{self.api_url}/parse/result/{task_id}"
        logger.info(f"Polling for result: {result_url}")
        
        while time.time() - start_time < max_wait:
            try:
                async with session.get(result_url) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        status = result.get("status", "")
                        
                        if status == "completed":
                            content_list = result.get("content_list", [])
                            await self._download_images(session, content_list, output_dir)
                            return content_list, result
                            
                        elif status == "failed":
                            error = result.get("error", "Unknown error")
                            raise RuntimeError(f"Parsing failed: {error}")
                            
                        elif status in ("pending", "processing"):
                            logger.debug(f"Task {task_id} status: {status}")
                            await asyncio.sleep(poll_interval)
                            continue
                            
                    elif resp.status == 404:
                        raise RuntimeError(f"Task not found: {task_id}")
                        
                    else:
                        error_text = await resp.text()
                        logger.warning(f"Poll error {resp.status}: {error_text}")
                        await asyncio.sleep(poll_interval)
                        
            except aiohttp.ClientError as e:
                logger.warning(f"Poll request error: {e}")
                await asyncio.sleep(poll_interval)
        
        raise TimeoutError(f"Parsing timed out after {max_wait}s")
    
    async def _download_images(
        self,
        session: aiohttp.ClientSession,
        content_list: List[Dict[str, Any]],
        output_dir: Path,
        images_dict: Optional[Dict[str, str]] = None
    ):
        """
        Download/save images from API response and update paths in content_list.
        
        Args:
            session: aiohttp session
            content_list: Content list with image references
            output_dir: Directory to save images
            images_dict: Optional dict mapping filename -> base64 data (from MinerU API)
        """
        images_dir = output_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        # First, save all images from images_dict (base64 encoded)
        # Map: original filename (without path) -> local absolute path
        saved_images: Dict[str, Path] = {}
        if images_dict:
            for img_name, img_data in images_dict.items():
                if isinstance(img_data, str) and img_data.startswith("data:image"):
                    local_path = self._save_base64_image(img_data, images_dir, img_name)
                    if local_path:
                        # Store mapping with just the filename (no path prefix)
                        saved_images[img_name] = local_path
                        logger.debug(f"Saved image: {img_name} -> {local_path}")
        
        # Now update paths in content_list
        for item in content_list:
            if not isinstance(item, dict):
                continue
                
            # Handle different image path fields
            for path_field in ["img_path", "table_img_path", "equation_img_path"]:
                img_ref = item.get(path_field)
                if not img_ref:
                    continue
                
                # Extract just the filename from the path (e.g., "images/xxx.jpg" -> "xxx.jpg")
                img_filename = os.path.basename(img_ref)
                
                # Check if this filename exists in our saved images
                if img_filename in saved_images:
                    item[path_field] = str(saved_images[img_filename])
                    continue
                
                # Check if it's already an absolute path that exists
                if os.path.isabs(img_ref) and os.path.exists(img_ref):
                    continue
                
                # Try to find image in images_dir by filename
                potential_path = images_dir / img_filename
                if potential_path.exists():
                    item[path_field] = str(potential_path.resolve())
                    continue
                
                # Check if it's a URL or base64
                if img_ref.startswith(("http://", "https://")):
                    # Download from URL
                    local_path = await self._download_image(session, img_ref, images_dir)
                    if local_path:
                        item[path_field] = str(local_path)
                        
                elif img_ref.startswith("data:image"):
                    # Base64 encoded - save to file
                    local_path = self._save_base64_image(img_ref, images_dir)
                    if local_path:
                        item[path_field] = str(local_path)
                else:
                    # Still a relative path that we couldn't resolve
                    # Convert to absolute path for consistency
                    abs_path = (output_dir / img_ref).resolve()
                    item[path_field] = str(abs_path)
    
    async def _download_image(
        self,
        session: aiohttp.ClientSession,
        url: str,
        output_dir: Path
    ) -> Optional[Path]:
        """Download image from URL"""
        try:
            async with session.get(url) as resp:
                if resp.status == 200:
                    content = await resp.read()
                    
                    # Generate filename from URL hash
                    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
                    ext = self._guess_image_extension(resp.content_type)
                    filename = f"img_{url_hash}{ext}"
                    
                    local_path = output_dir / filename
                    local_path.write_bytes(content)
                    
                    return local_path
        except Exception as e:
            logger.warning(f"Failed to download image {url}: {e}")
        return None
    
    def _save_base64_image(self, data_url: str, output_dir: Path, preferred_name: Optional[str] = None) -> Optional[Path]:
        """Save base64 encoded image to file
        
        Args:
            data_url: Base64 data URL (data:image/png;base64,xxxxx)
            output_dir: Directory to save image
            preferred_name: Optional preferred filename (used if provided)
        """
        try:
            import base64
            
            # Parse data URL: data:image/png;base64,xxxxx
            header, data = data_url.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0]
            
            content = base64.b64decode(data)
            
            # Use preferred name if provided, otherwise generate from hash
            if preferred_name:
                filename = preferred_name
            else:
                content_hash = hashlib.md5(content).hexdigest()[:12]
                ext = self._guess_image_extension(mime_type)
                filename = f"img_{content_hash}{ext}"
            
            local_path = output_dir / filename
            local_path.write_bytes(content)
            
            # Return absolute path to avoid path concatenation issues later
            return local_path.resolve()
        except Exception as e:
            logger.warning(f"Failed to save base64 image: {e}")
        return None
    
    @staticmethod
    def _guess_image_extension(content_type: str) -> str:
        """Guess file extension from content type"""
        type_map = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/bmp": ".bmp",
            "image/tiff": ".tiff",
        }
        return type_map.get(content_type, ".png")


class MineruAPIParserFactory:
    """Factory for creating MinerU API parser instances"""
    
    _default_instance: Optional[MineruAPIParser] = None
    
    @classmethod
    def get_parser(
        cls,
        api_url: str = "http://localhost:8000",
        **kwargs
    ) -> MineruAPIParser:
        """
        Get or create a MinerU API parser instance.
        
        Args:
            api_url: MinerU API URL
            **kwargs: Additional configuration
            
        Returns:
            MineruAPIParser instance
        """
        # Create new instance (could implement pooling later)
        return MineruAPIParser(api_url=api_url, **kwargs)
    
    @classmethod
    def get_default(cls) -> MineruAPIParser:
        """Get default parser instance"""
        if cls._default_instance is None:
            cls._default_instance = MineruAPIParser()
        return cls._default_instance
