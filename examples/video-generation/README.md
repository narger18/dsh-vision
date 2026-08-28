# Video Generation Examples

Generate short videos from text prompts using Runway, Pika, or custom APIs.

## How It Works

Video generation is **asynchronous** — the provider returns a task ID, then the plugin polls for completion. This can take anywhere from 30 seconds to several minutes depending on the provider and model.

When you ask the model to generate a video (using phrases like "create a video of", "生成视频", "制作一段视频"), the plugin intercepts and sends it to the configured video generation provider.

## Supported Providers

| Provider | Models | API Key | Async |
|----------|--------|---------|-------|
| Runway | `gen-3` | `RUNWAY_API_KEY` | Yes |
| Pika | `pika-1.0` | `PIKA_API_KEY` | Yes |

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `videoGenerationEnabled` | `false` | Enable video generation |
| `videoGenerationProvider` | `runway` | Provider name |
| `videoGenerationModel` | `gen-3` | Model name |
| `videoGenerationBaseURL` | — | Override default endpoint |
| `videoGenerationMaxAttempts` | `60` | Max polling attempts |
| `videoGenerationPollIntervalMs` | `5000` | Seconds between polls (1000–60000) |

---

## Example 1: Runway Gen-3 (Recommended)

Industry-leading video generation with high quality.

### settings.yaml

```yaml
llm-deepseek:
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
```

### Trigger examples

```
create a video of waves crashing on a rocky beach at sunset, cinematic style
```

```
生成一段视频：一只猫在花园里追逐蝴蝶，写实风格
```

```
制作一段短视频，展示花瓣在风中飘落的过程
```

### Credential setup

```bash
export RUNWAY_API_KEY=...
```

---

## Example 2: Pika 1.0

Good alternative with different aesthetic. Often faster than Runway.

### settings.yaml

```yaml
llm-deepseek:
  videoGenerationEnabled: true
  videoGenerationProvider: pika
  videoGenerationModel: pika-1.0
```

### Credential setup

```bash
export PIKA_API_KEY=...
```

---

## Example 3: Custom Polling Settings

Adjust timeout and polling behavior for slow networks or long generations.

### settings.yaml

```yaml
llm-deepseek:
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
  # Poll every 10 seconds instead of 5
  videoGenerationPollIntervalMs: 10000
  # Allow up to 120 attempts (20 minutes total)
  videoGenerationMaxAttempts: 120
```

---

## Example 4: Custom API Endpoint

Point to a self-hosted or custom video generation service.

### settings.yaml

```yaml
llm-deepseek:
  videoGenerationEnabled: true
  videoGenerationProvider: runway
  videoGenerationModel: gen-3
  videoGenerationBaseURL: https://my-video-api.example.com/v1
```

### Credential setup

```bash
export RUNWAY_API_KEY=your-custom-api-key
```

---

## Prompt Engineering for Video

### Do: Describe motion explicitly
```
create a video of a car driving through a neon-lit city at night, smooth camera movement following the car
```

### Do: Specify duration and style
```
生成一段5秒的视频：樱花花瓣从树上飘落，慢动作效果
```

### Do: Include camera direction
```
Create a video with a drone shot flying over mountains at golden hour
```

### Don't: Ask for complex narratives
Video generators work best with single, clear actions.

### Don't: Expect perfect text rendering
Like images, video generation struggles with Chinese characters.

---

## Understanding the Async Flow

```
1. User: "create a video of..."
         ↓
2. Plugin detects trigger keyword
         ↓
3. POST /generations → { id: "task-abc123" }
         ↓
4. Plugin polls GET /tasks/task-abc123 every 5s
         ↓
5. Task reaches "completed" status
         ↓
6. Result URL returned to user
```

If polling exceeds `videoGenerationMaxAttempts`, the task fails with a timeout error.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "尚未配置 API Key" | Save key in Harness Credentials |
| Video not generating | Check trigger keywords are present |
| Timeout errors | Increase `videoGenerationMaxAttempts` |
| Slow polling | Increase `videoGenerationPollIntervalMs` |
| Wrong provider | Verify `videoGenerationProvider` setting |
