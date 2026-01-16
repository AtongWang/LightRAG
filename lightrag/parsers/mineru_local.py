"""
MinerU Local CLI Parser

Parses documents using locally installed MinerU command-line tool.
Requires MinerU to be installed: pip install -U "mineru[all]"
"""

import os
import time
import json
import asyncio
import subprocess
import platform
from pathlib import Path
from typing import Optional, Dict, Any, List

from lightrag.utils import logger
from .base import (
    BaseParser,
    ParseResult,
    ParserConfig,
)


class MineruLocalParser(BaseParser):
    """
    Document parser using locally installed MinerU CLI.
    
    This parser calls the `mineru` command-line tool directly.
    Suitable for development or environments without Docker.
    
    Installation:
        pip install -U "mineru[all]"
        # or
        uv pip install -U "mineru[all]"
    """
    
    def __init__(self, config: Optional[ParserConfig] = None):
        """
        Initialize MinerU local parser.
        
        Args:
            config: Parser configuration
        """
        super().__init__(config)
        self._version: Optional[str] = None
        
    @property
    def name(self) -> str:
        return "MinerU Local"
    
    def check_availability(self) -> bool:
        """Check if MinerU CLI is installed and available"""
        try:
            result = subprocess.run(
                ["mineru", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                self._version = result.stdout.strip()
                logger.info(f"MinerU version: {self._version}")
                return True
            return False
        except (subprocess.SubprocessError, FileNotFoundError):
            logger.warning(
                "MinerU CLI not found. Install with: pip install -U 'mineru[all]'"
            )
            return False
    
    async def parse_document(
        self,
        file_path: str,
        output_dir: Optional[str] = None,
        method: str = "auto",
        **kwargs
    ) -> ParseResult:
        """
        Parse a document using MinerU CLI.
        
        Args:
            file_path: Path to the document file
            output_dir: Directory to save output
            method: Parsing method (auto, txt, ocr)
            **kwargs: Additional options
            
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
        
        logger.info(f"Parsing document with MinerU CLI: {file_path}")
        
        try:
            # Run mineru command
            content_list = await self._run_mineru(
                file_path=file_path,
                output_dir=output_dir,
                method=method,
                **kwargs
            )
            
            # Read output files
            file_stem = file_path.stem
            actual_output_dir = self._find_output_dir(output_dir, file_stem, method)
            
            # Load content list from JSON
            content_list = await self._load_content_list(actual_output_dir, file_stem)
            
            # Load markdown
            markdown = await self._load_markdown(actual_output_dir, file_stem)
            
            # Normalize content to ContentBlock list
            blocks = self.normalize_content_list(
                content_list,
                base_dir=str(actual_output_dir)
            )
            
            # Create result
            result = ParseResult(
                content_list=blocks,
                markdown=markdown,
                source_file=str(file_path),
                parser_name=self.name,
                parse_time_seconds=time.time() - start_time,
                output_dir=str(actual_output_dir),
            )
            
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
    
    async def _run_mineru(
        self,
        file_path: Path,
        output_dir: Path,
        method: str,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Run mineru command.
        
        Args:
            file_path: Input file path
            output_dir: Output directory
            method: Parsing method
            **kwargs: Additional options
        """
        # Build command
        cmd = [
            "mineru",
            "-p", str(file_path),
            "-o", str(output_dir),
            "-m", method,
        ]
        
        # Add optional parameters
        backend = kwargs.get("backend") or self.config.mineru_backend
        if backend:
            cmd.extend(["-b", backend])
            
        language = kwargs.get("language") or self.config.language
        if language:
            cmd.extend(["-l", language])
            
        device = kwargs.get("device") or self.config.mineru_device
        if device:
            cmd.extend(["-d", device])
            
        if self.config.start_page is not None:
            cmd.extend(["-s", str(self.config.start_page)])
            
        if self.config.end_page is not None:
            cmd.extend(["-e", str(self.config.end_page)])
            
        if not self.config.extract_equations:
            cmd.extend(["-f", "false"])
            
        if not self.config.extract_tables:
            cmd.extend(["-t", "false"])
        
        logger.info(f"Running command: {' '.join(cmd)}")
        
        # Run command in thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            self._execute_mineru_command,
            cmd
        )
        
        return []  # Content will be loaded from files
    
    def _execute_mineru_command(self, cmd: List[str]):
        """Execute mineru command synchronously"""
        try:
            # Prepare subprocess kwargs
            subprocess_kwargs = {
                "stdout": subprocess.PIPE,
                "stderr": subprocess.PIPE,
                "text": True,
                "encoding": "utf-8",
                "errors": "ignore",
            }
            
            # Hide console window on Windows
            if platform.system() == "Windows":
                subprocess_kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            
            process = subprocess.Popen(cmd, **subprocess_kwargs)
            
            # Stream output
            while True:
                output = process.stdout.readline()
                if output:
                    logger.info(f"[MinerU] {output.strip()}")
                    
                error = process.stderr.readline()
                if error:
                    if "error" in error.lower():
                        logger.error(f"[MinerU] {error.strip()}")
                    elif "warning" in error.lower():
                        logger.warning(f"[MinerU] {error.strip()}")
                    else:
                        logger.info(f"[MinerU] {error.strip()}")
                
                if output == "" and error == "" and process.poll() is not None:
                    break
            
            return_code = process.wait()
            
            if return_code != 0:
                raise subprocess.CalledProcessError(return_code, cmd)
                
            logger.info("[MinerU] Command completed successfully")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"MinerU command failed with return code {e.returncode}")
            raise
        except FileNotFoundError:
            raise RuntimeError(
                "mineru command not found. Please install MinerU: "
                "pip install -U 'mineru[all]'"
            )
    
    def _find_output_dir(
        self,
        base_output_dir: Path,
        file_stem: str,
        method: str
    ) -> Path:
        """
        Find the actual output directory created by MinerU.
        
        MinerU creates subdirectories like: output_dir/file_stem/auto/
        """
        # Check for file_stem subdirectory
        file_subdir = base_output_dir / file_stem
        if file_subdir.is_dir():
            # Scan for actual output subdirectory
            for subdir in file_subdir.iterdir():
                if not subdir.is_dir():
                    continue
                # Check if this subdirectory contains output files
                content_file = subdir / f"{file_stem}_content_list.json"
                if content_file.exists():
                    logger.info(f"Found output in: {subdir}")
                    return subdir
            
            # Fallback to method-based path
            method_subdir = file_subdir / method
            if method_subdir.exists():
                return method_subdir
        
        # Check base directory
        content_file = base_output_dir / f"{file_stem}_content_list.json"
        if content_file.exists():
            return base_output_dir
        
        return base_output_dir
    
    async def _load_content_list(
        self,
        output_dir: Path,
        file_stem: str
    ) -> List[Dict[str, Any]]:
        """Load content list JSON from output directory"""
        json_file = output_dir / f"{file_stem}_content_list.json"
        
        if not json_file.exists():
            logger.warning(f"Content list file not found: {json_file}")
            return []
        
        try:
            loop = asyncio.get_event_loop()
            content = await loop.run_in_executor(
                None,
                json_file.read_text,
                "utf-8"
            )
            content_list = json.loads(content)
            
            # Fix relative paths to absolute
            for item in content_list:
                if isinstance(item, dict):
                    for field in ["img_path", "table_img_path", "equation_img_path"]:
                        if field in item and item[field]:
                            path = item[field]
                            if not os.path.isabs(path):
                                abs_path = output_dir / path
                                item[field] = str(abs_path.resolve())
            
            logger.info(f"Loaded {len(content_list)} content blocks from {json_file}")
            return content_list
            
        except Exception as e:
            logger.error(f"Error loading content list: {e}")
            return []
    
    async def _load_markdown(
        self,
        output_dir: Path,
        file_stem: str
    ) -> Optional[str]:
        """Load markdown from output directory"""
        md_file = output_dir / f"{file_stem}.md"
        
        if not md_file.exists():
            return None
        
        try:
            loop = asyncio.get_event_loop()
            content = await loop.run_in_executor(
                None,
                md_file.read_text,
                "utf-8"
            )
            return content
        except Exception as e:
            logger.warning(f"Error loading markdown: {e}")
            return None


def get_default_parser() -> BaseParser:
    """
    Get the default document parser.

    Tries MinerU API first, falls back to local CLI.
    """
    # Try API parser first
    try:
        from lightrag.parsers.mineru_api import MineruAPIParser
        api_parser = MineruAPIParser()
        if api_parser.check_availability():
            logger.info("Using MinerU API parser")
            return api_parser
    except Exception:
        pass

    # Try local parser
    local_parser = MineruLocalParser()
    if local_parser.check_availability():
        logger.info("Using MinerU local parser")
        return local_parser

    raise RuntimeError(
        "No document parser available. Please either:\n"
        "1. Start MinerU API service: docker compose --profile api up -d\n"
        "2. Install MinerU locally: pip install -U 'mineru[all]'"
    )
