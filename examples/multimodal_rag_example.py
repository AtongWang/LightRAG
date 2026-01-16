#!/usr/bin/env python3
"""
LightRAG Multimodal Document Processing Example

This example demonstrates the complete multimodal RAG workflow:
1. Document parsing using MinerU (Docker API or local CLI)
2. Multimodal content extraction (images, tables, equations)
3. Semantic description generation using LLM/Vision models
4. Knowledge graph insertion
5. Multimodal-aware querying

Prerequisites:
- Start MinerU Docker API: docker compose --profile api up -d
  OR install MinerU locally: pip install -U 'mineru[all]'
- Configure LLM provider (OpenAI, Ollama, etc.)

Usage:
    python examples/multimodal_rag_example.py --file path/to/document.pdf
"""

import os
import sys
import asyncio
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from lightrag import LightRAG
from lightrag.utils import logger


async def check_parser_availability():
    """Check which parsers are available"""
    print("\n=== Checking Parser Availability ===\n")
    
    from lightrag.multimodal import EnhancedMultimodalParser
    
    parser = EnhancedMultimodalParser(
        parser_type="auto",
        mineru_api_url=os.getenv("MINERU_API_URL", "http://localhost:8000"),
    )
    
    status = await parser.check_availability()
    await parser.close()
    
    print(f"MinerU API:    {'✓ Available' if status['mineru_api'] else '✗ Not available'}")
    print(f"MinerU Local:  {'✓ Available' if status['mineru_local'] else '✗ Not available'}")
    print(f"RAGAnything:   {'✓ Available' if status['raganything'] else '✗ Not available'}")
    print(f"\nRecommended parser: {status['recommended'] or 'None available'}")
    
    return status['recommended'] is not None


async def process_document_standalone(file_path: str):
    """Process a document using just the parser and processor (no LightRAG)"""
    print(f"\n=== Processing Document (Standalone): {file_path} ===\n")
    
    from lightrag.kg.doc_pipeline import DocumentPipeline, PipelineConfig
    
    config = PipelineConfig(
        parser_type="auto",
        mineru_api_url=os.getenv("MINERU_API_URL", "http://localhost:8000"),
        enable_multimodal=False,  # Set to True if you have a vision model configured
        output_dir="./parsed_docs",
    )
    
    pipeline = DocumentPipeline(config=config)
    
    # Check availability
    available, msg = await pipeline.check_parser_availability()
    print(f"Parser status: {msg}")
    
    if not available:
        print("No parser available. Please start MinerU Docker or install locally.")
        return None
    
    # Process document
    result = await pipeline.process_document(file_path, enable_multimodal=False)
    
    print(f"\n--- Processing Results ---")
    print(f"File: {result.file_name}")
    print(f"Total pages: {result.total_pages}")
    print(f"Text blocks: {result.text_count}")
    print(f"Images: {result.image_count}")
    print(f"Tables: {result.table_count}")
    print(f"Equations: {result.equation_count}")
    print(f"Text chunks created: {len(result.text_chunks)}")
    print(f"Combined chunks: {len(result.combined_chunks)}")
    
    if result.markdown:
        print(f"\n--- Markdown Preview (first 500 chars) ---")
        print(result.markdown[:500])
    
    return result


async def process_document_with_lightrag(
    file_path: str,
    working_dir: str = "./rag_storage",
):
    """Process a document and insert into LightRAG knowledge graph"""
    print(f"\n=== Processing Document with LightRAG: {file_path} ===\n")
    
    # Initialize LightRAG with multimodal support
    rag = LightRAG(
        working_dir=working_dir,
        # Enable multimodal processing
        multimodal_enabled=True,
        multimodal_parser_type="auto",
        mineru_api_url=os.getenv("MINERU_API_URL", "http://localhost:8000"),
        multimodal_output_dir="./parsed_docs",
        # Configure your LLM
        llm_model_func=get_llm_func(),
        embedding_func=get_embedding_func(),
    )
    
    try:
        # Insert multimodal document
        track_id = await rag.ainsert_multimodal(
            file_paths=file_path,
            enable_multimodal_processing=True,
        )
        
        print(f"Document inserted with track_id: {track_id}")
        
        # Test query
        print("\n--- Testing Query ---")
        query = "What are the main topics discussed in this document?"
        result = await rag.aquery(query)
        print(f"Query: {query}")
        print(f"Result: {result[:500]}...")
        
    finally:
        await rag.finalize_storages()


def get_llm_func():
    """Get LLM function based on environment configuration"""
    # Check for OpenAI
    if os.getenv("OPENAI_API_KEY"):
        from lightrag.llm.openai import openai_complete
        return openai_complete
    
    # Check for Ollama
    if os.getenv("OLLAMA_HOST") or True:  # Default to Ollama
        from lightrag.llm.ollama import ollama_model_complete
        return ollama_model_complete
    
    # Fallback - mock function for testing
    async def mock_llm(prompt, **kwargs):
        return f"Mock response for: {prompt[:100]}..."
    return mock_llm


def get_embedding_func():
    """Get embedding function based on environment configuration"""
    from lightrag.utils import EmbeddingFunc
    
    # Check for OpenAI
    if os.getenv("OPENAI_API_KEY"):
        from lightrag.llm.openai import openai_embed
        return EmbeddingFunc(
            embedding_dim=1536,
            max_token_size=8191,
            func=openai_embed,
        )
    
    # Check for Ollama
    from lightrag.llm.ollama import ollama_embed
    return EmbeddingFunc(
        embedding_dim=768,  # nomic-embed-text default
        max_token_size=8192,
        func=ollama_embed,
    )


async def demo_api_usage():
    """Demonstrate using the REST API for multimodal documents"""
    print("\n=== API Usage Example ===\n")
    
    api_examples = """
# Check parser status
curl http://localhost:8020/multimodal/parsers/status

# Upload and process a multimodal document
curl -X POST "http://localhost:8020/multimodal/documents/upload" \\
    -H "Content-Type: multipart/form-data" \\
    -F "file=@document.pdf" \\
    -F "enable_multimodal_processing=true"

# Preview document parsing without insertion
curl -X POST "http://localhost:8020/multimodal/documents/parse-preview" \\
    -H "Content-Type: multipart/form-data" \\
    -F "file=@document.pdf"

# Get multimodal chunks from knowledge graph
curl "http://localhost:8020/multimodal/chunks?limit=10"

# Get multimodal entities
curl "http://localhost:8020/multimodal/entities?limit=10"
"""
    print(api_examples)


async def main():
    parser = argparse.ArgumentParser(
        description="LightRAG Multimodal Document Processing Example"
    )
    parser.add_argument(
        "--file", "-f",
        type=str,
        help="Path to document file (PDF, DOCX, etc.)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only check parser availability",
    )
    parser.add_argument(
        "--standalone",
        action="store_true",
        help="Process document without LightRAG (just parsing)",
    )
    parser.add_argument(
        "--api",
        action="store_true",
        help="Show API usage examples",
    )
    parser.add_argument(
        "--working-dir",
        type=str,
        default="./rag_storage",
        help="LightRAG working directory",
    )
    
    args = parser.parse_args()
    
    # Show API examples
    if args.api:
        await demo_api_usage()
        return
    
    # Check parser availability
    if args.check or not args.file:
        available = await check_parser_availability()
        if not available:
            print("\n⚠️  No parser available!")
            print("\nTo use MinerU Docker API:")
            print("  cd /path/to/mineru")
            print("  docker compose --profile api up -d")
            print("\nOr install MinerU locally:")
            print("  pip install -U 'mineru[all]'")
        
        if not args.file:
            print("\n\nTo process a document, run:")
            print(f"  python {sys.argv[0]} --file path/to/document.pdf")
        return
    
    # Check file exists
    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}")
        return
    
    # Process document
    if args.standalone:
        await process_document_standalone(args.file)
    else:
        await process_document_with_lightrag(args.file, args.working_dir)


if __name__ == "__main__":
    asyncio.run(main())
