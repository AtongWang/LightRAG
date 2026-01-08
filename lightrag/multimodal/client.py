"""RAGAnything 客户端

与 RAGAnything API 通信，实现多模态文档解析。
"""

from typing import Optional, Dict, Any
import aiohttp
import asyncio

from ..utils import logger


class RAGAnythingClient:
    """RAGAnything API 客户端"""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:30000",
        timeout: int = 300,
    ):
        """初始化 RAGAnything 客户端

        Args:
            base_url: RAGAnything 服务的基础 URL
            timeout: 请求超时时间（秒）
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """获取或创建 HTTP 会话"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def close(self):
        """关闭 HTTP 会话"""
        if self._session and not self._session.closed:
            await self._session.close()
            # 等待连接完全关闭
            await asyncio.sleep(0.25)

    async def parse_file(
        self,
        file_path: str,
        parse_method: str = "auto",
        **kwargs
    ) -> Dict[str, Any]:
        """解析文件

        Args:
            file_path: 文件路径
            parse_method: 解析方法，可选 "auto", "txt", "pdf", "ocr"
            **kwargs: 其他传递给 API 的参数

        Returns:
            解析结果字典，包含 "content", "metadata" 等字段
        """
        session = await self._get_session()
        url = f"{self.base_url}/parse"

        # 准备文件数据
        data = {
            "parse_method": parse_method,
            **kwargs
        }

        try:
            with open(file_path, "rb") as f:
                files = {
                    "file": f
                }

                async with session.post(url, data=data, files=files) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(
                            f"RAGAnything API error: {response.status} - {error_text}"
                        )

                    result = await response.json()
                    logger.info(f"Successfully parsed file: {file_path}")
                    return result

        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            raise
        except aiohttp.ClientError as e:
            logger.error(f"Failed to connect to RAGAnything service at {self.base_url}: {e}")
            raise Exception(
                f"Failed to connect to RAGAnything service. "
                f"Please ensure the service is running at {self.base_url}"
            )
        except Exception as e:
            logger.error(f"Error parsing file {file_path}: {e}")
            raise

    async def health_check(self) -> bool:
        """检查 RAGAnything 服务健康状态

        Returns:
            服务是否可用
        """
        try:
            session = await self._get_session()
            url = f"{self.base_url}/health"

            async with session.get(url) as response:
                is_healthy = response.status == 200
                if is_healthy:
                    logger.debug(f"RAGAnything service is healthy at {self.base_url}")
                else:
                    logger.warning(f"RAGAnything service returned status {response.status}")
                return is_healthy
        except Exception as e:
            logger.warning(f"RAGAnything health check failed: {e}")
            return False

    async def __aenter__(self):
        """异步上下文管理器入口"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close()
