# Vision Bridge Examples

The vision bridge gives any text-only LLM the ability to understand images by routing them through a dedicated vision model. This is the core feature of `dsh-vision`.

## How It Works

```
User sends image → Bridge analyzes with vision model → Description injected into main model context
```

The main model never sees the raw image — it receives a textual description instead. This works with any provider (DeepSeek, Claude, Gemini, custom gateways).

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `visionBackend` | — | Provider name (e.g., `openrouter`, `anthropic`, `zenmux`) |
| `visionBackendModel` | — | Override the provider's default model |
| `visionBackendBaseURL` | — | Override the provider's default API endpoint |
| `visionProvider` | — | Pin to a specific Harness provider route |
| `visionModel` | — | Must be set together with `visionProvider` |
| `visionTimeoutMs` | `600000` | Max milliseconds before giving up (10 min) |
| `maxImages` | `8` | Max images per request (1–32) |
| `cacheEntries` | `64` | Vision analysis cache size (1–1024) |

## Fallback Chain

When an image is uploaded, the plugin tries providers in this order:

1. **Pinned route** — if `visionProvider` + `visionModel` are set
2. **Other Harness models** — any configured provider with image support
3. **see-compatible config** — reads `~/.config/see/config.env` automatically
4. **Local OCR** — macOS Vision framework or Tesseract (no API key needed)

## Required API Keys

Store these in the Harness credential service (Settings → Credentials), **never in settings.yaml**:

| Environment Variable | Provider |
|---------------------|----------|
| `OPENAI_API_KEY` | OpenAI GPT-4 Vision |
| `ANTHROPIC_API_KEY` | Anthropic Claude |
| `GOOGLE_API_KEY` | Google Gemini |
| `OPENROUTER_API_KEY` | OpenRouter |
| `ZENMUX_API_KEY` | ZenMux |
| `DASHSCOPE_API_KEY` | Alibaba Cloud (百炼) |
| `TOKENDANCE_API_KEY` | TokenDance |

---

## Example 1: OpenRouter (Recommended for most users)

OpenRouter gives access to many vision models through a single API key.

### settings.yaml

```yaml
llm-deepseek:
  visionBackend: openrouter
  visionBackendModel: qwen/qwen3.7-plus
  # OR use a different model:
  # visionBackendModel: anthropic/claude-sonnet-4-20250514
  # visionBackendModel: google/gemini-2.0-flash-exp
```

### Credential setup

```bash
# Via environment variable
export OPENROUTER_API_KEY=sk-or-v1-...

# Or via Harness Settings → Credentials
# Key: OPENROUTER_API_KEY
# Value: sk-or-v1-...
```

---

## Example 2: OpenAI GPT-4o

Best quality for complex image analysis. Requires an OpenAI API key with vision access.

### settings.yaml

```yaml
llm-deepseek:
  visionBackend: openai
  visionBackendModel: gpt-4o
```

### Credential setup

```bash
export OPENAI_API_KEY=sk-...
```

---

## Example 3: Anthropic Claude

Excellent for detailed visual reasoning and document analysis.

### settings.yaml

```yaml
llm-deepseek:
  visionBackend: anthropic
  visionBackendModel: claude-sonnet-4-20250514
```

### Credential setup

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## Example 4: Google Gemini

Fast and cost-effective, good for general image understanding.

### settings.yaml

```yaml
llm-deepseek:
  visionBackend: google
  visionBackendModel: gemini-2.0-flash-exp
```

### Credential setup

```bash
export GOOGLE_API_KEY=AIza...
```

---

## Example 5: see-skill Compatible Config

If you already use [see-skill](https://github.com/oil-oil/see-skill), the plugin reads its config automatically.

### ~/.config/see/config.env

```bash
export SEE_PROVIDER=openrouter
export OPENROUTER_API_KEY=sk-or-v1-...
# Optional overrides:
# export SEE_BASE_URL=https://openrouter.ai/api/v1
# export SEE_MODEL=qwen/qwen3.7-plus
```

No `settings.yaml` changes needed — the plugin auto-detects this file.

---

## Example 6: Multi-Provider Fallback Order

Control which providers are tried and in what order:

### settings.yaml

```yaml
llm-deepseek:
  # List providers in priority order
  presetVisionProviders:
    - openai        # Try GPT-4o first
    - anthropic     # Then Claude
    - openrouter    # Then OpenRouter
    - google        # Then Gemini
```

---

## Example 7: Using a Custom Gateway

Point to any OpenAI-compatible API endpoint:

### settings.yaml

```yaml
llm-deepseek:
  visionBackend: openai
  visionBackendBaseURL: https://my-gateway.example.com/v1
  visionBackendModel: my-custom-vision-model
```

### Credential setup

```bash
export OPENAI_API_KEY=your-gateway-key
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "视觉识别插件未指定外部平台" | Set `visionBackend` to a provider name |
| "尚未配置 API Key" | Save the key in Harness Credentials |
| "没有可用的视觉后端" | Check fallback chain; try local OCR first |
| Images ignored silently | Ensure `maxImages` isn't set too low |
| Slow responses | Reduce `visionTimeoutMs` or use a faster model |
