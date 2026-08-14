<p align="center">
  <img src="./assets/readme/hero.svg" alt="dsh-vision: native vision passthrough and a vision bridge for DeepSeek Harness" width="100%">
</p>

<p align="center">
  English | <a href="./README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/oil-oil/dsh-vision/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/oil-oil/dsh-vision/ci.yml?style=flat-square&label=CI"></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-4D6BFE?style=flat-square"></a>
  <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-0.1.0--rc.6-4D6BFE?style=flat-square">
</p>

`dsh-vision` is a plugin for DeepSeek Harness. Vision-capable models keep receiving images natively. When the selected main model is text-only, the plugin asks a separate vision model to observe the original images, then lets the original DeepSeek model produce the final answer.

## How it works

| Main model | Image path | Final answer |
| --- | --- | --- |
| Supports images | Original images are sent directly, without preprocessing or OCR | Current model |
| `deepseek-official` or another text-only model | A configured vision model observes the original images; its output is injected as untrusted attachment context | DeepSeek |
| Cloud vision unavailable | Falls back to macOS Vision or Tesseract | DeepSeek |

The plugin does not replace the main model selected in Harness. Multiple image attachments are analyzed together, so comparisons and combined evidence work naturally. The user's task is forwarded unchanged instead of being wrapped in a fixed report template.

## Install

Use the plugin manager built into DeepSeek Harness:

```bash
npx @deepseek-ai/dsh plugin --profile web add github:oil-oil/dsh-vision
```

Restart Harness, then paste or drag images into the composer as usual. The plugin replaces the official `deepseek-official` adapter while preserving its model catalog, settings, and credentials.

> DeepSeek Harness is still in Developer Preview. This release targets `0.1.0-rc.6` exactly.

## Configure a vision model

Open **Settings → Models** in Harness, add any model that supports image input, and save its API key. The plugin reuses Harness's official model and credential systems, including built-in providers, OpenAI-compatible gateways, OpenAI Responses, Anthropic Messages, and custom services.

A custom model must declare `image` as an input modality, or Harness will treat it as text-only.

Routing is explicit: a pinned vision model is the primary route. Without a pin, the first enabled Harness vision route is primary. Other enabled routes are used only after the primary route fails. ZenMux, Alibaba Cloud Model Studio, TokenDance, and OpenRouter are optional providers, not a fixed fallback hierarchy. API keys stay in the Harness credential service and never enter chat messages, plugin settings, or session logs.

## Pin a vision model

Most setups do not need this. If several vision models are configured and one should always be primary, add this section to `$DSH_HOME/settings.yaml`:

```yaml
dsh-vision:
  visionProvider: openai
  visionModel: gpt-4.1
  maxImages: 8
```

`visionProvider` and `visionModel` must be set together. Changes apply without a restart.

## see-skill compatibility

If Harness has no usable vision model, the plugin also reads `~/.config/see/config.env`. It supports ZenMux, Alibaba Cloud Model Studio, OpenRouter, and TokenDance. Environment variables override the private config file.

```bash
export SEE_PROVIDER=zenmux
export ZENMUX_API_KEY=your-key
```

`SEE_PROVIDER` selects the primary provider. Other providers with configured keys are failover routes only. If no provider is selected and only one is configured, that provider is used.

When no cloud key is available, or every cloud route fails, the plugin tries local capabilities:

- macOS: built-in Vision OCR, with no extra dependency.
- Linux / Windows: Tesseract with the required language data installed.

Local fallback is primarily OCR and is not equivalent to full multimodal understanding.

## Security boundary

- Original images are sent only to vision services configured by the user.
- Vision output is marked as untrusted observation data; instructions inside an image receive no system authority.
- Generated vision context affects only the current model request and does not rewrite message history.
- API keys are resolved through Harness credentials or the user's private see config and are never written to this repository.

## Development

```bash
pnpm install
pnpm check
```

The project is available under the MIT License. Cloud routing, joint multi-image analysis, and local fallback behavior are based on the MIT-licensed [oil-oil/see-skill](https://github.com/oil-oil/see-skill). The DeepSeek icon comes from the official [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) repository.
