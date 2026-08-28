<p align="center">
  <img src="./assets/readme/hero.svg" alt="dsh-vision: Universal vision bridge and media generation for DeepSeek Harness" width="100%">
</p>

<p align="center">
  English | <a href="./README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/narger18/dsh-vision/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/narger18/dsh-vision/ci.yml?style=flat-square&label=CI"></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-4D6BFE?style=flat-square"></a>
  <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-rc.6 | rc.7-4D6BFE?style=flat-square">
  <img alt="Version" src="https://img.shields.io/badge/version-0.2.1-4D6BFE?style=flat-square">
</p>

`dsh-vision` is a universal plugin for DeepSeek Harness. It provides:

- **Universal Vision Bridge** — Works with any LLM provider (deepseek-official, cpa, custom gateways). When your main model can't see images, a separate vision model observes them.
- **Custom Vision Models** — Add your own vision providers (Anthropic Claude, Google Gemini, OpenAI GPT-4, or any OpenAI-compatible API).
- **Image Generation** — Create images from text prompts using OpenAI DALL·E, Stability AI, or custom providers.
- **Video Generation** — Generate videos using Runway, Pika, or custom APIs (async support).

## How it works

| Feature | Behavior |
| --- | --- |
| **Vision (Image Understanding)** | Any provider with text-only models gets automatic vision bridge |
| **Custom Providers** | Add your own vision models to the plugin config |
| **Image Generation** | Triggered by prompt like "generate an image of..." |
| **Video Generation** | Triggered by prompt like "create a video of..." |

The plugin detects your configured provider automatically — no hardcoded dependencies on DeepSeek's official API.

## Install

```bash
# For DeepSeek Harness plugin manager
npx @deepseek-ai/dsh plugin --profile web add github:narger18/dsh-vision
```

Or install directly:

```bash
pnpm add @narger18/dsh-vision
```

Restart Harness. The plugin adds three configuration cards to **Settings → Plugins**:

1. **Vision Recognition** — Image understanding providers
2. **Image Generation** — Picture creation (DALL·E, Stability AI)
3. **Video Generation** — Video creation (Runway, Pika)

## Configure Vision Recognition

Open **Settings → Plugins → Vision Recognition**. Select a provider:

- **Built-in**: ZenMux, Alibaba Cloud, TokenDance, OpenRouter
- **Preset**: Anthropic Claude, Google Gemini, OpenAI GPT-4
- **Custom**: Any OpenAI-compatible API endpoint

Enter the API key in the credential service. The plugin tries providers in this order:
1. Your selected provider
2. Other Harness models with image support
3. See-compatible private config
4. Local OCR (macOS Vision / Tesseract)

## Configure Image Generation

Open **Settings → Plugins → Image Generation**. Enable and select:

- **OpenAI DALL·E** (dall-e-3, dall-e-2)
- **Stability AI** (stable-diffusion-xl)
- **Custom** — any compatible endpoint

Save your `OPENAI_API_KEY` or `STABILITY_API_KEY` in the credential service.

Trigger generation with prompts like:
- "Generate an image of a sunset over mountains"
- "Create a picture showing..."

## Configure Video Generation

Open **Settings → Plugins → Video Generation**. Enable and select:

- **Runway** (gen-3)
- **Pika** (pika-1.0)
- **Custom** — any compatible endpoint

Save your API key. Video generation is asynchronous; the plugin polls for results.

Trigger with prompts like:
- "Create a video of waves crashing on a beach"
- "Generate a short clip of..."

## Advanced YAML Configuration

```yaml
llm-deepseek:
  # Vision bridge
  visionBackend: openrouter
  visionBackendModel: qwen/qwen3.7-plus
  visionProvider: anthropic
  visionModel: claude-sonnet-4-20250514
  
  # Custom vision providers
  customVisionProviders:
    - name: my-vision
      displayName: My Custom Vision
      baseURL: https://my-api.com/v1
      model: my-model
      credentialRefs: ["MY_VISION_API_KEY"]
  
  # Image generation
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  
  # Video generation
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
```

Do not put API keys in this file — use the UI or environment variables.

## see-skill compatibility

Reads `~/.config/see/config.env` as fallback:

```bash
export SEE_PROVIDER=openrouter
export OPENROUTER_API_KEY=your-key
```

## Security boundary

- Images sent only to user-configured services
- Generated content marked as untrusted context
- API keys never written to repository
- Local OCR runs entirely offline

## Development

```bash
pnpm install
pnpm check
```

## Changelog

### v0.2.0
- Added universal provider support (any LLM provider, not just deepseek-official)
- Added custom vision provider configuration
- Added image generation (OpenAI, Stability AI)
- Added video generation (Runway, Pika)
- Enhanced UI with separate configuration panels
- Improved error messages and fallback chains

### v0.1.2
- Initial release with DeepSeek official API support

---

The project is available under the MIT License. Based on [oil-oil/see-skill](https://github.com/oil-oil/see-skill).


