# Custom Providers Examples

Add your own vision, image generation, and video generation providers beyond the built-in options.

## Custom Vision Providers

Add any OpenAI-compatible API endpoint as a vision provider.

### settings.yaml

```yaml
llm-deepseek:
  customVisionProviders:
    - name: my-vision
      displayName: My Custom Vision
      baseURL: https://my-vision-api.example.com/v1
      model: my-vision-model-v2
      credentialRefs:
        - MY_VISION_API_KEY
    - name: local-ollama
      displayName: Local Ollama
      baseURL: http://localhost:11434/v1
      model: llava:latest
      credentialRefs: []  # No API key needed for local
```

### Credential setup

```bash
# For remote custom provider
export MY_VISION_API_KEY=your-api-key

# For local provider (no key needed)
# Just ensure Ollama is running: ollama run llava
```

### Trigger usage

```yaml
llm-deepseek:
  visionBackend: my-vision
  # Or use preset to include it in fallback chain:
  presetVisionProviders:
    - openai
    - my-vision
    - local-ollama
```

---

## Custom Image Generation Providers

Add a custom image generation endpoint.

### settings.yaml

```yaml
llm-deepseek:
  customImageGenerationProviders:
    - name: my-image-gen
      displayName: My Image Generator
      baseURL: https://my-image-api.example.com/v1
      models:
        - my-dalle-3
        - my-stable-diffusion-xl
      credentialRefs:
        - MY_IMAGE_API_KEY
```

### Usage

```yaml
llm-deepseek:
  imageGenerationEnabled: true
  imageGenerationProvider: my-image-gen
  imageGenerationModel: my-dalle-3
```

---

## Custom Video Generation Providers

The plugin doesn't have built-in custom video provider config, but you can point to a compatible endpoint using the base URL override.

### settings.yaml

```yaml
llm-deepseek:
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
  videoGenerationBaseURL: https://my-video-api.example.com/v1
```

The provider's credential ref (`RUNWAY_API_KEY`) is still used — set your custom key there or export it as an environment variable.

---

## OpenAI-Compatible API Examples

Most custom providers follow the OpenAI chat completions or images generations format.

### Example: Self-hosted Stable Diffusion (img2img/text2img)

```yaml
llm-deepseek:
  customVisionProviders:
    - name: stable-diffusion-vision
      displayName: Stable Diffusion Vision
      baseURL: https://your-sd-instance.example.com/v1
      model: sd-vision-model
      credentialRefs:
        - SD_API_KEY
```

### Example: Local Ollama with Llava

```yaml
llm-deepseek:
  customVisionProviders:
    - name: ollama
      displayName: Ollama (Local)
      baseURL: http://localhost:11434/v1
      model: llava:latest
      credentialRefs: []
```

```bash
# Start Ollama if not running
ollama serve
ollama pull llava:latest
```

### Example: Together AI (many models)

```yaml
llm-deepseek:
  customVisionProviders:
    - name: together
      displayName: Together AI
      baseURL: https://api.together.xyz/v1
      model: mistralai/Mistral-7B-Instruct-V0.1
      credentialRefs:
        - TOGETHER_API_KEY
  presetVisionProviders:
    - together
    - openrouter
```

---

## Provider Registry Internals

Custom providers are merged with built-in providers at runtime:

```typescript
import { loadCustomProviders, mergeProvidersWithCustom } from "@narger18/dsh-vision"

const custom = loadCustomProviders([
  {
    name: "my-provider",
    displayName: "My Provider",
    baseURL: "https://api.example.com/v1",
    model: "my-model",
    credentialRefs: ["MY_API_KEY"],
  }
])

// Merges with built-ins for lookup
const allProviders = mergeProvidersWithCustom(custom, ["openai", "my-provider"])
```

---

## Security Notes

- Custom providers' base URLs are sent as-is — verify they use HTTPS
- API keys for custom providers follow the same credential service rules
- Local providers (localhost) bypass network security but expose your machine
- Never commit API keys to version control

---

## Complete Example: Full Custom Setup

```yaml
llm-deepseek:
  # Main model (text-only)
  model: deepseek-chat
  
  # Vision bridge: try custom first, then OpenRouter
  customVisionProviders:
    - name: local-llava
      displayName: Local Llava
      baseURL: http://localhost:11434/v1
      model: llava:latest
      credentialRefs: []
  presetVisionProviders:
    - local-llava
    - openrouter
  
  # Image generation with custom provider
  customImageGenerationProviders:
    - name: my-art-generator
      displayName: My Art Generator
      baseURL: https://art-api.example.com/v1
      models:
        - art-medium
        - art-high
      credentialRefs:
        - MY_ART_API_KEY
  imageGenerationEnabled: true
  imageGenerationProvider: my-art-generator
  imageGenerationModel: art-medium
  
  # Video generation with custom endpoint
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
  videoGenerationBaseURL: https://video-api.example.com/v1
```
