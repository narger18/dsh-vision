# Mixed Mode Examples

Combine vision (image understanding) and generation (image/video creation) in a single workflow.

## Why Mixed Mode?

Mixed mode lets you build complete multimodal pipelines:

```
Upload image → Understand it (vision) → Generate new content (generation) → Analyze result (vision again)
```

This is powerful for workflows like:
- Describe a photo, then generate a variation
- Analyze a screenshot, then create a corrected version
- Generate a video, then describe what was created
- Iterate: generate → analyze → refine → regenerate

---

## Example 1: Image Analysis → Regeneration

Understand an image, then generate an improved version.

### settings.yaml

```yaml
llm-deepseek:
  # Vision: use OpenRouter for image analysis
  visionBackend: openrouter
  visionBackendModel: qwen/qwen3.7-plus
  
  # Image generation: use DALL·E 3 for creation
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
```

### Workflow

```
1. User uploads a low-quality photo
2. Vision bridge analyzes it: "This is a blurry photo of a cat on a window sill..."
3. Main model suggests improvements
4. User asks: "生成一张更清晰版本"
5. DALL·E 3 generates an enhanced image
6. Result displayed to user
```

---

## Example 2: Full Multimodal Pipeline

Vision → Generate → Analyze cycle.

### settings.yaml

```yaml
llm-deepseek:
  # Vision providers (fallback chain)
  presetVisionProviders:
    - openai
    - anthropic
    - openrouter
  
  # Image generation
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  maxImagesToGenerate: 2
  
  # Video generation
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
```

### Workflow

```
User: "Here's a sketch. Describe it, then generate a photo-realistic version,
       then create a short video from that image."

Step 1 — Vision:
  "This is a line drawing of a mountain lake at sunset,
   with pine trees in the foreground and reflections in the water."

Step 2 — Image Generation:
  [DALL·E generates photorealistic mountain lake scene]

Step 3 — Video Generation:
  [Runway creates 4-second video of the lake with subtle water movement]
```

---

## Example 3: Creative Assistant

A conversational workflow that mixes understanding and creation.

### settings.yaml

```yaml
llm-deepseek:
  # Fast vision for quick analysis
  visionBackend: google
  visionBackendModel: gemini-2.0-flash-exp
  
  # High-quality image generation
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  
  # Optional: video for special requests
  videoGenerationEnabled: false
```

### Example Conversation

```
User: [uploads photo of room]
      "What do you see in this room?"

Assistant: [vision analysis]
      "I see a living room with a sofa, bookshelf, and large window.
       The lighting is warm and natural."

User: "Generate an image of how it would look with modern minimalist decor"

Assistant: [DALL·E 3 generates modern minimalist version]

User: "That's great! Now create a video showing a walkthrough"

Assistant: [triggers video generation if enabled, or explains next steps]
```

---

## Example 4: Batch Image Generation with Analysis

Generate multiple images, then analyze and compare them.

### settings.yaml

```yaml
llm-deepseek:
  visionBackend: openrouter
  visionBackendModel: qwen/qwen3.7-plus
  
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  maxImagesToGenerate: 4
```

### Workflow

```
User: "Generate 4 different logo concepts for a coffee shop named 'Brew'"

[4 images generated]

User: "Compare these designs and tell me which works best and why"

[vision bridge analyzes all 4 images]
Assistant: "Design 3 has the strongest typography... Design 1's color
            palette is most appealing... I recommend combining elements..."
```

---

## Example 5: Content Creation Pipeline

Write → Generate visual → Generate video → Summarize.

### settings.yaml

```yaml
llm-deepseek:
  visionBackend: anthropic
  visionBackendModel: claude-sonnet-4-20250514
  
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
  videoGenerationMaxAttempts: 90
  videoGenerationPollIntervalMs: 8000
```

### Workflow

```
1. User: "Write a short story about a robot learning to paint"
         [Text generation happens normally]

2. User: "Generate an image of the robot painting"
         [DALL·E 3 creates illustration]

3. User: "Create a video showing the robot at work"
         [Runway generates video (async, ~2-5 min)]

4. User: [uploads the generated video frame]
         "Describe what's happening in this scene"
         [Vision analyzes the frame]
```

---

## Best Practices

### 1. Choose the right vision provider for speed vs quality

| Use Case | Recommended Provider | Reason |
|----------|---------------------|--------|
| Fast iteration | Google Gemini | Quick, cheap |
| Detailed analysis | Anthropic Claude | Best reasoning |
| Cost-effective | OpenRouter + Qwen | Good balance |
| Local/offline | Ollama/Llava | No API costs |

### 2. Limit concurrent generations

```yaml
llm-deepseek:
  # Don't generate too many images at once
  maxImagesToGenerate: 2
  # Cap video polling to avoid long hangs
  videoGenerationMaxAttempts: 60
```

### 3. Use presetVisionProviders for resilience

```yaml
llm-deepseek:
  presetVisionProviders:
    - openai        # Primary
    - anthropic     # Fallback 1
    - openrouter    # Fallback 2
    - local-ollama  # Offline fallback
```

### 4. Separate concerns in prompts

```
# Clear separation helps the plugin route correctly:
"请分析这张图片的内容"        # → Vision
"基于以上分析，生成一张改进版本"  # → Image Generation
"把生成的图片制作成短视频"       # → Video Generation
```

### 5. Handle async video gracefully

Video generation can take several minutes. Set reasonable timeouts:

```yaml
llm-deepseek:
  videoGenerationEnabled: true
  videoGenerationMaxAttempts: 90      # 90 × 5s = 7.5 min max
  videoGenerationPollIntervalMs: 5000 # Check every 5 seconds
```

### 6. Cache considerations

Vision analysis is cached by default (64 entries). In mixed mode:

- Same image + same question = cached result (fast)
- Different question on same image = new analysis
- Generated images are NOT cached (they're outputs, not inputs)

---

## Complete Reference Configuration

```yaml
llm-deepseek:
  # === Vision Bridge ===
  visionBackend: openrouter
  visionBackendModel: qwen/qwen3.7-plus
  presetVisionProviders:
    - openai
    - anthropic
    - openrouter
    - google
  visionTimeoutMs: 120000    # 2 minutes per analysis
  maxImages: 8               # Up to 8 images per analysis
  cacheEntries: 64           # Cache 64 analyses
  
  # === Image Generation ===
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  maxImagesToGenerate: 2     # Generate up to 2 images
  
  # === Video Generation ===
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
  videoGenerationMaxAttempts: 90
  videoGenerationPollIntervalMs: 8000
  
  # === Custom Providers (optional) ===
  customVisionProviders: []
  customImageGenerationProviders: []
```

---

## Troubleshooting Mixed Mode

| Problem | Solution |
|---------|----------|
| Vision works but images not generated | Check `imageGenerationEnabled: true` |
| Images generated but video fails | Verify `videoGenerationEnabled: true` and API key |
| Slow overall response | Use faster vision provider (Gemini) or reduce `maxImagesToGenerate` |
| Conflicting triggers | Be explicit: "analyze" vs "generate" in prompts |
| Cache stale | Vision cache auto-evicts oldest entries |
