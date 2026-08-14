<p align="center">
  <img src="./assets/readme/hero.svg" alt="dsh-vision：DeepSeek Harness 的原生视觉直通与文本模型视觉桥接" width="100%">
</p>

<p align="center">
  <a href="https://github.com/oil-oil/dsh-vision/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/oil-oil/dsh-vision/ci.yml?style=flat-square&label=CI"></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-4D6BFE?style=flat-square"></a>
  <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-0.1.0--rc.6-4D6BFE?style=flat-square">
</p>

`dsh-vision` 是一个 DeepSeek Harness 插件。它让支持图片的模型继续使用原生视觉；当主模型只有文本能力时，自动调用外部视觉模型观察原图，再由原来的 DeepSeek 模型完成回答。

## 它怎么工作

| 当前主模型 | 图片处理方式 | 最终回答者 |
| --- | --- | --- |
| 支持图片 | 原图直接发送，不压缩、不预先 OCR | 当前模型 |
| `deepseek-official` 等文本模型 | 外部视觉模型读取原图，观察结果作为非可信附件上下文注入 | DeepSeek |
| 云端视觉不可用 | macOS Vision 或 Tesseract 本地降级 | DeepSeek |

插件不会替换右下角选择的主模型。多张聊天附件会进入同一次视觉请求，适合前后对比和组合证据；用户的问题会原样交给视觉模型，不套固定报告模板。

## 安装

```bash
dsh plugin --profile web add github:oil-oil/dsh-vision
```

重启 Harness 后即可正常粘贴或拖入图片。插件会替换官方 `deepseek-official` 适配器，但继续使用原有模型列表、DeepSeek 设置和凭据。

> DeepSeek Harness 仍处于 Developer Preview。当前版本固定兼容 `0.1.0-rc.6`。

## 配置外部视觉模型

打开 Harness 的「设置 → 模型」，添加任意支持图片输入的模型并保存 API Key。插件直接使用 Harness 的官方模型与凭据系统，因此支持内置平台、OpenAI 兼容网关、OpenAI Responses、Anthropic Messages 及自定义服务。

需要注意：自定义模型必须在模型能力中声明 `image` 输入，否则 Harness 会把它视为文本模型。

路由规则很简单：明确指定的视觉模型是主路由；未指定时，Harness 中第一个已启用的视觉路由是主路由。只有主路由失败，插件才尝试其他已启用路由。ZenMux、百炼、TokenDance、OpenRouter 只是可选平台，不是固定的降级等级。API Key 只存入 Harness 凭据服务，不进入聊天、插件配置或会话日志。

## 指定视觉模型

通常无需设置；只有配置了多个视觉模型并希望固定路由时，才在 `$DSH_HOME/settings.yaml` 中添加：

```yaml
dsh-vision:
  visionProvider: openai
  visionModel: gpt-4.1
  maxImages: 8
```

`visionProvider` 和 `visionModel` 必须同时填写。修改设置后无需重启。

## 兼容 see-skill 配置

如果 Harness 中没有可用视觉模型，插件还会读取现有的 `~/.config/see/config.env`，兼容 ZenMux、百炼、OpenRouter 和 TokenDance。环境变量优先于本地配置。

```bash
export SEE_PROVIDER=zenmux
export ZENMUX_API_KEY=你的Key
```

`SEE_PROVIDER` 指定主平台；其他已填写 Key 的平台仅作为失败后的备用。没有指定时，只配置了哪个平台就使用哪个平台。

没有云端 Key 或所有云端服务失败时，插件会尝试本地能力：

- macOS：系统 Vision OCR，无需额外安装。
- Linux / Windows：Tesseract；需要自行安装对应语言包。

本地降级以文字识别为主，不等同于多模态模型的完整语义理解。

## 安全边界

- 原图只发送给用户配置的视觉服务。
- 视觉结果会被标记为非可信观察数据，图片里的提示词不会获得系统权限。
- 视觉上下文只参与当前模型请求，不改写历史消息。
- API Key 通过 Harness 凭据服务或 see 的用户私有配置解析，不写入仓库。

## 开发

```bash
pnpm install
pnpm check
```

项目以 MIT 许可证开源。云端路由、多图联合与本地降级行为参考同为 MIT 的 [oil-oil/see-skill](https://github.com/oil-oil/see-skill)。DeepSeek 图标来自 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 官方仓库。
