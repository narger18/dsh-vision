# Changelog

## [0.2.1] - 2026-08-28

### 🐛 Bug 修复
- **视觉识别卡片修复**：选择 "Custom Key" 后始终显示 API Key / 模型 / BaseURL 输入框，不再隐藏
- **凭据保存修复**：自定义提供商模式下正确保存 API Key（使用 Credential Name 字段）
- **BaseURL 双斜杠修复**：自动规范化 `//` 为 `/`，防止请求失败
- **settingsOps 重复操作修复**：切换提供商时不再产生重复的 model/baseURL 操作

### ✨ 图像生成增强
- **宽高比自动检测**：从提示词中自动提取比例（如 "16:9"、"4:3"）并传递给 API
- **Agnes Image 2.1 Flash 支持**：完整支持 `size` 档位（1K/2K/3K/4K）和 `ratio` 参数
- **img2img 预留**：`extra_body` 参数支持（为未来图生图功能预留）

### 🎬 视频生成优化
- **双 API 协议支持**：V2.0（`mode=ti2vid`）和 2.5/Flash（`mode=text`）分别处理
- **Polling URL 修复**：正确区分 V2.0 和 2.5 Flash 的轮询端点
- **帧数计算优化**：遵循 8n+1 规则精确计算帧数

### 🧹 代码清理
- **移除自定义模型 Tab**：视觉识别卡片简化，自定义提供商通过下拉框 "Custom Key" 选项配置
- **减少 bundle 体积**：client.js 从 106 KB 降至 90 KB（-15%）

### 📝 文档更新
- 更新安装和配置说明
- 添加 Agnes AI 专用配置示例

---

## [0.2.0] - 2026-08-27

### 🎉 新增功能

#### 通用提供商支持
- 移除对 `deepseek-official` 的硬编码依赖
- 自动检测并使用当前默认模型的提供商
- 支持任意 LLM 提供商（cpa、anthropic、google 等）
- 保留向后兼容：显式设置 `visionProvider` 仍生效

#### 可扩展自定义视觉模型
- 新增 `provider-registry.ts` 提供商注册表
- 扩展预设提供商：Anthropic Claude、Google Gemini、OpenAI GPT-4
- 支持用户自定义提供商（任意 OpenAI 兼容 API）
- UI 配置面板支持添加/编辑/删除自定义提供商

#### 图片生成功能
- 新增 `image-generation.ts` 核心逻辑
- 支持 OpenAI DALL·E 3/2
- 支持 Stability AI
- 支持自定义图片生成端点
- 智能提示词检测（中英文）
- 新增 UI 配置面板

#### 视频生成功能
- 新增 `video-generation.ts` 核心逻辑
- 支持 Runway (gen-3)
- 支持 Pika (pika-1.0)
- 异步任务轮询机制
- 新增 UI 配置面板

#### 性能缓存
- 新增 `cache-manager.ts` 统一缓存管理器
- 图片生成缓存（可配置 TTL）
- 视频生成缓存（支持状态跟踪）
- 缓存默认关闭，可手动启用

### 📝 文档更新
- 新增完整中文 README (README.zh.md)
- 创建 examples/ 目录包含 5 个示例项目
- 更新 GitHub Actions CI 配置
- 添加详细的配置说明和故障排除指南

### 🔧 配置变更
新增配置字段（均在 `llm-deepseek` 命名空间）:
```yaml
llm-deepseek:
  # 自定义视觉提供商
  customVisionProviders: []
  
  # 预设视觉提供商
  presetVisionProviders: []
  
  # 图片生成配置
  imageGenerationEnabled: false
  imageGenerationProvider: "openai"
  imageGenerationModel: "dall-e-3"
  imageCacheEnabled: false
  imageCacheTTL: 86400000
  
  # 视频生成配置
  videoGenerationEnabled: false
  videoGenerationProvider: "runway"
  videoGenerationModel: "gen-3"
  videoCacheEnabled: false
  videoCacheTTL: 3600000
  
  # 缓存配置
  cacheRoot: null
  cacheMaxEntries: 64
```

### 🧪 测试
- 测试文件从 6 个增加到 8 个
- 测试用例从 20 个增加到 28 个
- 新增图片生成测试
- 新增视频生成测试
- 所有测试通过 ✓

### 📦 包信息
- 包名: `@narger18/dsh-vision`
- 版本: `0.2.0`
- 仓库: https://github.com/narger18/dsh-vision

---

## [0.1.2] - 2026-08-26

### 首次发布
- 基础视觉桥接功能
- 支持 DeepSeek 官方 API
- 内置提供商：ZenMux、百炼、TokenDance、OpenRouter
- see-skill 兼容性
- 本地 OCR 降级（macOS Vision、Tesseract）
