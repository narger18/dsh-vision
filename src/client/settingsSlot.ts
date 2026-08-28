import type { SlotCore } from "@deepseek-ai/dsh-client-ui-slots"

export interface CompatibleSettingsSlots {
  register: SlotCore["register"]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerSettingsPluginCard(
  slots: CompatibleSettingsSlots,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: Record<string, any>
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return slots.register(
    {
      name: "settings.plugin.item",
      key: options.namespace,
      id: options.legacyId,
      order: options.legacyOrder,
      locale: options.locale,
      inject: options.inject,
    } as any,
    component
  )
}
