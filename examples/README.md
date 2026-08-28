# dsh-vision Examples

Practical usage examples for [@narger18/dsh-vision](https://github.com/narger18/dsh-vision) v0.2.1.

## Overview

This directory contains ready-to-use configuration examples for every feature of the plugin:

| Example | Description |
|---------|-------------|
| [vision-bridge/](./vision-bridge/) | Core vision bridge — give any LLM the ability to see images |
| [image-generation/](./image-generation/) | Generate images from text (OpenAI DALL·E, Agnes AI) |
| [video-generation/](./video-generation/) | Generate videos (Runway, Pika, Agnes AI) |
| [custom-providers/](./custom-providers/) | Configure custom vision, image, and video providers |
| [mixed-mode/](./mixed-mode/) | Combine vision and generation in complex workflows |

## Quick Start

1. Install the plugin:
   ```bash
   npx @deepseek-ai/dsh plugin --profile web add github:narger18/dsh-vision
   ```

2. Open **Settings → Plugins** and configure the cards you need.

3. Copy the relevant `settings.yaml` snippet from the example directory into your Harness config.

4. Save your API keys in **Settings → Credentials**.

## Free Models (Agnes AI)

Agnes AI offers free image and video generation:

| Model | Feature | Cost |
|-------|---------|------|
| `agnes-image-2.1-flash` | Text-to-image with ratio support | **Free** |
| `agnes-video-v2.0` | Text-to-video (async) | **Free** |

Configuration:
```yaml
dsh-vision-image-gen:
  provider: custom
  model: agnes-image-2.1-flash
  credentialName: "AGNES_AI_API_KEY"
  baseURL: https://apihub.agnes-ai.com/v1/images/generations
  enabled: true

dsh-vision-video-gen:
  provider: custom
  model: agnes-video-v2.0
  credentialName: "AGNES_AI_API_KEY"
  baseURL: https://apihub.agnes-ai.com/v1/videos
  enabled: true
```

## API Key Requirements

| Feature | Provider | Environment Variable |
|---------|----------|---------------------|
| Vision | OpenAI | `OPENAI_API_KEY` |
| Vision | Anthropic | `ANTHROPIC_API_KEY` |
| Vision | Google | `GOOGLE_API_KEY` |
| Vision | OpenRouter | `OPENROUTER_API_KEY` |
| Vision | ZenMux | `ZENMUX_API_KEY` |
| Vision | Alibaba (百炼) | `DASHSCOPE_API_KEY` |
| Vision | TokenDance | `TOKENDANCE_API_KEY` |
| Image | OpenAI DALL·E | `OPENAI_API_KEY` |
| Image | Stability AI | `STABILITY_API_KEY` |
| Image | Agnes AI | `AGNES_AI_API_KEY` |
| Video | Runway | `RUNWAY_API_KEY` |
| Video | Pika | `PIKA_API_KEY` |
| Video | Agnes AI | `AGNES_AI_API_KEY` |

> **Never** put API keys in `settings.yaml`. Use the Harness credential service or environment variables.

## Feature Matrix

| Feature | Enabled By Default | Configuration Namespace |
|---------|-------------------|------------------------|
| Vision Bridge | Yes (auto-detected) | `llm-deepseek` |
| Image Generation | No | `dsh-vision-image-gen` |
| Video Generation | No | `dsh-vision-video-gen` |
| Custom Vision (UI) | No | UI only |

## See Also

- [Main README](../README.md) — Full documentation
- [GitHub Repository](https://github.com/narger18/dsh-vision)
