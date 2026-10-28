"""Official mineru.net precision API: signed upload, polling and result ZIP."""

import asyncio
import io
import json
import os
import stat
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlsplit

import aiohttp

from .mineru_api import MineruAPIParser


class MineruCloudParser(MineruAPIParser):
    def __init__(self, api_url="https://mineru.net/api/v4", config=None):
        super().__init__(api_url=api_url, config=config)
        self._token = os.getenv("MINERU_API_TOKEN", "")

    @property
    def name(self):
        return "MinerU Cloud"

    def check_availability(self):
        return bool(self._token)

    async def _get_session(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.config.api_timeout),
                trust_env=True,
            )
        return self._session

    async def _api(self, session, method, path, **kwargs):
        async with session.request(
            method,
            self.api_url + path,
            headers={"Authorization": "Bearer " + self._token},
            **kwargs,
        ) as response:
            if response.status != 200:
                raise RuntimeError(f"MinerU Cloud API returned HTTP {response.status}")
            result = await response.json()
        if result.get("code") != 0:
            message = str(result.get("msg", "Request failed")).replace(
                self._token, "[redacted]"
            )
            raise RuntimeError(
                f"MinerU Cloud API error {result.get('code')}: {message}"
            )
        return result["data"]

    @staticmethod
    def _check_transfer_url(url):
        parsed = urlsplit(url)
        if parsed.scheme != "https" and not (
            parsed.scheme == "http"
            and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        ):
            raise ValueError("MinerU transfer URL must use HTTPS")
        if parsed.username or parsed.password:
            raise ValueError("MinerU transfer URL must not contain user credentials")

    async def _upload_and_parse(self, session, file_path, method, output_dir, **kwargs):
        if not self._token:
            raise ValueError(
                "Set MINERU_API_TOKEN for the official MinerU precision API"
            )
        return await asyncio.wait_for(
            self._parse_cloud(session, file_path, method, output_dir),
            timeout=self.config.api_timeout,
        )

    async def _parse_cloud(self, session, file_path, method, output_dir):
        file_info = {"name": file_path.name, "is_ocr": method == "ocr"}
        if self.config.start_page is not None or self.config.end_page is not None:
            start = (self.config.start_page or 0) + 1
            end = self.config.end_page + 1 if self.config.end_page is not None else "-1"
            file_info["page_ranges"] = f"{start}-{end}"
        task = await self._api(
            session,
            "POST",
            "/file-urls/batch",
            json={
                "files": [file_info],
                "model_version": os.getenv("MINERU_MODEL_VERSION", "vlm"),
                "language": self.config.language,
                "enable_formula": self.config.extract_equations,
                "enable_table": self.config.extract_tables,
            },
        )
        upload_url = task["file_urls"][0]
        self._check_transfer_url(upload_url)
        with file_path.open("rb") as stream:
            async with session.put(
                upload_url,
                data=stream,
                allow_redirects=False,
                skip_auto_headers={"Content-Type"},
            ) as response:
                if response.status not in (200, 201, 204):
                    raise RuntimeError(
                        f"MinerU file upload returned HTTP {response.status}"
                    )
        while True:
            batch = await self._api(
                session, "GET", "/extract-results/batch/" + task["batch_id"]
            )
            results = batch.get("extract_result", [])
            result = results[0] if results else {}
            if result.get("state") == "failed":
                raise RuntimeError(
                    "MinerU parsing failed: "
                    + str(result.get("err_msg", "Unknown error")).replace(
                        self._token, "[redacted]"
                    )
                )
            if result.get("state") == "done":
                break
            await asyncio.sleep(self.config.api_poll_interval)
        download_url = result["full_zip_url"]
        self._check_transfer_url(download_url)
        async with session.get(download_url, allow_redirects=False) as response:
            if response.status != 200:
                raise RuntimeError(
                    f"MinerU result download returned HTTP {response.status}"
                )
            payload = await response.read()
        directory = Path(tempfile.mkdtemp(prefix="mineru-", dir=output_dir))
        return self._read_archive(payload, directory)

    def _read_archive(self, payload, directory):
        directory = Path(directory).resolve()
        directory.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            if sum(item.file_size for item in archive.infolist()) > 512 * 1024 * 1024:
                raise ValueError("MinerU result archive exceeds 512 MiB")
            for item in archive.infolist():
                target = (directory / item.filename.replace("\\", "/")).resolve()
                if not target.is_relative_to(directory) or stat.S_ISLNK(
                    item.external_attr >> 16
                ):
                    raise ValueError("Unsafe path in MinerU result archive")
            archive.extractall(directory)
        content_files = sorted(directory.rglob("*_content_list.json"))
        markdown_files = sorted(directory.rglob("full.md"))
        markdown = (
            markdown_files[0].read_text(encoding="utf-8") if markdown_files else ""
        )
        if content_files:
            content_file = content_files[0]
            blocks = json.loads(content_file.read_text(encoding="utf-8"))
            for block in blocks:
                for field in ("img_path", "table_img_path", "equation_img_path"):
                    if block.get(field):
                        target = (content_file.parent / block[field]).resolve()
                        if not target.is_relative_to(directory):
                            raise ValueError("Unsafe image path in MinerU content list")
                        block[field] = str(target)
        elif markdown:
            blocks = [{"type": "text", "text": markdown}]
        else:
            raise ValueError(
                "MinerU result contains neither structured content nor Markdown"
            )
        return blocks, {"markdown": markdown, "content_list": blocks}
