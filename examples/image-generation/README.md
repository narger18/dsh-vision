# Image Generation Examples

Generate images from text prompts using OpenAI DALL·E, Stability AI, or custom providers.

## How It Works

When you ask the model to generate an image (using phrases like "生成图片", "generate an image of", "画一张图"), the plugin intercepts the request and sends it to the configured image generation provider instead of trying to answer textually.

## Supported Providers

| Provider | Models | API Key | Async |
|----------|--------|---------|-------|
| OpenAI DALL·E | `dall-e-3`, `dall-e-2` | `OPENAI_API_KEY` | No |
| Stability AI | `stable-diffusion-xl-1024-v1-0` | `STABILITY_API_KEY` | No |

## Trigger Keywords

The plugin detects image generation requests using these keywords (Chinese and English):

- 生成图片 / 生成图像 / 创建图片 / 创建图像
- generate image / create an image / make a picture
- 画一张图 / 绘制图片 / 绘图
- image generation / picture generation
- 生成一张 / 创建一幅 / 绘制一个

---

## Example 1: OpenAI DALL·E 3 (Recommended)

Best quality for most use cases. Supports 1024×1024, 1024×1792, and 1792×1024 sizes.

### settings.yaml

```yaml
llm-deepseek:
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  # Optional: generate multiple images per request
  # maxImagesToGenerate: 2
```

### Trigger examples

```
生成一张日落时分的山脉风景图，风格写实
```

```
Generate an image of a cozy coffee shop on a rainy day, photorealistic style
```

```
画一张赛博朋克城市的夜景，霓虹灯效果
```

### Credential setup

```bash
export OPENAI_API_KEY=sk-...
```

---

## Example 2: OpenAI DALL·E 2

Faster and cheaper than DALL·E 3, good for simple concepts.

### settings.yaml

```yaml
llm-deepseek:
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-2
```

---

## Example 3: Stability AI

Good alternative with different artistic style. Uses the SDXL model.

### settings.yaml

```yaml
llm-deepseek:
  imageGenerationEnabled: true
  imageGenerationProvider: stability
  imageGenerationModel: stable-diffusion-xl-1024-v1-0
```

### Credential setup

```bash
export STABILITY_API_KEY=sk_...
```

---

## Example 4: Multiple Images Per Request

Generate up to 10 images in a single request (default is 1).

### settings.yaml

```yaml
llm-deepseek:
  imageGenerationEnabled: true
  imageGenerationProvider: openai
  imageGenerationModel: dall-e-3
  maxImagesToGenerate: 4
```

### Trigger example

```
生成4张不同风格的猫咪图片，可爱卡通风格
```

---

## Prompt Engineering Tips

### Do: Be specific about style
```
生成一张水墨画风格的中国山水风景图，有桥梁和流水
```
```
Create an image of a futuristic city at sunset, anime art style
```

### Do: Specify composition
```
Generate a product photo of a sneaker on a white background, studio lighting
```

### Don't: Ask for text in images
Most generators struggle with Chinese characters. Describe the scene instead.

### Don't: Overcrowd the prompt
Keep it to one main subject with clear style guidance.

---

## Custom Prompt Transformations

You can guide the LLM to format prompts better for each provider:

```
请用英文描述这张图片，风格参考摄影写实，包含光照和构图细节：
生成一张古老的图书馆内部，阳光从窗户照进来，书架上摆满了书
```

The vision bridge will enhance the prompt before sending it to the generation API.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "尚未配置 API Key" | Save key in Harness Credentials |
| Image not generated | Check trigger keywords are present |
| Wrong provider used | Verify `imageGenerationProvider` setting |
| Slow generation | DALL·E 3 takes ~30s; use DALL·E 2 for speed |
