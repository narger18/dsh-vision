import { SlotCore } from "@deepseek-ai/dsh-client-ui-slots"
import { describe, expect, it, vi } from "vitest"

import {
  registerSettingsPluginCard,
  type CompatibleSettingsSlots,
} from "../src/client/settingsSlot.js"

function registerWithPublicFacade(): ReturnType<typeof vi.fn> {
  const register = vi.fn(() => vi.fn())
  const slots: CompatibleSettingsSlots = { register }

  registerSettingsPluginCard(slots, "card", {
    namespace: "llm-deepseek",
    legacyId: "dsh-vision",
    legacyOrder: 30,
    locale: "settings.dshVision",
    inject: () => ({ ready: true }),
  })
  return register
}

describe("settings.plugin.item compatibility", () => {
  function registerWithSlotCore(kind: "keyed" | "list"): SlotCore {
    const slots = new SlotCore()
    const component = () => null
    slots.register(
      {
        name: "root",
        children: {
          "settings.plugin.item": { kind, scope: "root" },
        },
      } as never,
      component as never
    )

    registerSettingsPluginCard(
      slots as unknown as CompatibleSettingsSlots,
      component,
      {
        namespace: "llm-deepseek",
        legacyId: "dsh-vision",
        legacyOrder: 30,
        locale: "settings.dshVision",
        inject: () => ({}),
      }
    )
    return slots
  }

  it("passes the rc.7 keyed slot validation", () => {
    const slots = registerWithSlotCore("keyed")

    expect(slots.entries("settings.plugin.item")[0]?.options.key)
      .toBe("llm-deepseek")
  })

  it("passes the rc.6 list slot validation", () => {
    const slots = registerWithSlotCore("list")

    expect(slots.entries("settings.plugin.item")[0]?.options.id)
      .toBe("dsh-vision")
  })

  it("uses only the public register facade", () => {
    const register = registerWithPublicFacade()

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "settings.plugin.item",
        key: "llm-deepseek",
        id: "dsh-vision",
        order: 30,
      }),
      "card"
    )
  })
})
