export interface CompatibleSettingsSlots {
  specDynamic: (name: string) => { kind: string } | undefined
  register: (
    options: Record<string, unknown>,
    component: unknown
  ) => () => void
}

export function registerSettingsPluginCard(
  slots: CompatibleSettingsSlots,
  component: unknown,
  options: {
    namespace: string
    legacyId: string
    legacyOrder: number
    locale: string
    inject: () => object
  }
): () => void {
  const kind = slots.specDynamic("settings.plugin.item")?.kind
  const target = kind === "keyed"
    ? { name: "settings.plugin.item", key: options.namespace }
    : kind === "list"
      ? {
          name: "settings.plugin.item",
          id: options.legacyId,
          order: options.legacyOrder,
        }
      : undefined

  if (target === undefined) {
    throw new Error(
      `dsh-vision: unsupported settings.plugin.item slot kind "${kind ?? "missing"}"`
    )
  }

  return slots.register(
    {
      ...target,
      locale: options.locale,
      inject: options.inject,
    },
    component
  )
}
