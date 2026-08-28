import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client"
import type { ConnectionHandle } from "@deepseek-ai/dsh-api-remotes/client"
import type {} from "@deepseek-ai/dsh-client-locale/client"
import type {} from "@deepseek-ai/dsh-client-ui-settings/client"
import type {} from "@deepseek-ai/dsh-client-ui-settings-plugins/client"

import { VisionSettingsCard } from "./VisionSettingsCard.js"
import { ImageGenerationSettingsCard } from "./ImageGenerationSettingsCard.js"
import { VideoGenerationSettingsCard } from "./VideoGenerationSettingsCard.js"
import { en, zh, type VisionLocaleKey } from "./locales.js"
import {
  VISION_SETTINGS_NAMESPACE,
  decodeVisionSettings,
  IMAGE_GENERATION_SETTINGS_NAMESPACE,
  VIDEO_GENERATION_SETTINGS_NAMESPACE,
  decodeImageGenerationSettings,
  decodeVideoGenerationSettings,
  type VisionSettings,
  type ImageGenerationSettings,
  type VideoGenerationSettings,
} from "./settings.js"
import { SETTINGS_CSS, SETTINGS_STYLE_ID } from "./styles.js"

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface LocaleNamespaceMap {
    readonly "settings.dshVision": VisionLocaleKey
  }
}

const LOCALE_NAMESPACE = "settings.dshVision"

export const inject = ["slots", "locale", "connection", "settingsScope"]

export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }),
    "dsh-vision: settings dictionaries"
  )
  ctx.effect(() => {
    const existing = document.querySelector<HTMLStyleElement>(
      `style[data-plugin-css="${SETTINGS_STYLE_ID}"]`
    )
    if (existing !== null) return () => undefined
    const tag = document.createElement("style")
    tag.dataset.plugin = "@narger18/dsh-vision"
    tag.dataset.pluginCss = SETTINGS_STYLE_ID
    tag.textContent = SETTINGS_CSS
    document.head.append(tag)
    return () => { tag.remove() }
  }, "dsh-vision: settings styles")

  const connection = ctx.get("connection") as ConnectionHandle
  const api = connection.api

  // Vision Recognition settings scope
  const visionScope = ctx.settingsScope.bind<VisionSettings>({
    namespace: VISION_SETTINGS_NAMESPACE,
    decode: decodeVisionSettings,
  })

  // Image generation settings scope
  const imageScope = ctx.settingsScope.bind<ImageGenerationSettings>({
    namespace: IMAGE_GENERATION_SETTINGS_NAMESPACE,
    decode: decodeImageGenerationSettings,
  })

  // Video generation settings scope
  const videoScope = ctx.settingsScope.bind<VideoGenerationSettings>({
    namespace: VIDEO_GENERATION_SETTINGS_NAMESPACE,
    decode: decodeVideoGenerationSettings,
  })

  // Register Vision Recognition card
  ctx.slots.inject("settings.plugin.item", () =>
    ctx.slots.register(
      {
        name: "settings.plugin.item" as any,
        key: VISION_SETTINGS_NAMESPACE,
        id: "dsh-vision",
        order: 30,
        locale: LOCALE_NAMESPACE,
        inject: () => ({ scope: visionScope, api }),
      } as any,
      VisionSettingsCard
    )
  )

  // Register Image Generation card
  ctx.slots.inject("settings.plugin.item", () =>
    ctx.slots.register(
      {
        name: "settings.plugin.item" as any,
        key: IMAGE_GENERATION_SETTINGS_NAMESPACE,
        id: "dsh-vision-image-gen",
        order: 31,
        locale: LOCALE_NAMESPACE,
        inject: () => ({ scope: imageScope, api }),
      } as any,
      ImageGenerationSettingsCard
    )
  )

  // Register Video Generation card
  ctx.slots.inject("settings.plugin.item", () =>
    ctx.slots.register(
      {
        name: "settings.plugin.item" as any,
        key: VIDEO_GENERATION_SETTINGS_NAMESPACE,
        id: "dsh-vision-video-gen",
        order: 32,
        locale: LOCALE_NAMESPACE,
        inject: () => ({ scope: videoScope, api }),
      } as any,
      VideoGenerationSettingsCard
    )
  )
}

export { VisionSettingsCard } from "./VisionSettingsCard.js"
export { ImageGenerationSettingsCard } from "./ImageGenerationSettingsCard.js"
export { VideoGenerationSettingsCard } from "./VideoGenerationSettingsCard.js"
