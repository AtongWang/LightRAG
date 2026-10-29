# 本体生成空响应：输出额度被推理耗尽

用户实际请求日志显示：输入 6676 tokens，finish_reason=length，completion_tokens 约 4000，reasoning_chars 超过 10000，但最终正文为空。三次重试均被同样的额度截断，随后返回 502。

本体生成接口原来强制传入 max_tokens=4000。已移除该限制，改为遵循统一模型配置。修复时使用 9000 额度通过真实生成验证；随后按用户要求将本地 OPENAI_LLM_MAX_COMPLETION_TOKENS 调为 16000，生产参数解析器验证可正确读取。必须重启后端才会加载新代码与配置。

不将 reasoning_content 当作本体 JSON，也不覆盖已保存本体。9000 只是当前预算，复杂资料仍可能截断；此时依据新增日志确认实际预算与结束原因，再调整模型输出预算或使用服务支持的非推理模式。

相关回归 12 项通过，包含确保生成接口不再传入固定 token 限制。真实模型验证使用隔离合成资料，结果保存在忽略目录 .cache/ontology-generation-live.json。
