import { SlotCore } from "@deepseek-ai/dsh-client-ui-slots"
import { describe, expect, it, vi } from "vitest"

import {
  registerSettingsPluginCard,
  type CompatibleSettingsSlots,
} from "../src/client/settingsSlot.js"

function registerFor(kind: string): ReturnType<typeof vi.fn> {
  const register = vi.fn(() => vi.fn())
  const slots: CompatibleSettingsSlots = {
    specDynamic: () => ({ kind }),
    register,
  }

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
  it("passes the real rc.7 keyed slot validation", () => {
    const slots = new SlotCore()
    const component = () => null
    const releaseOwner = slots.register(
      {
        name: "root",
        children: {
          "settings.plugin.item": { kind: "keyed", scope: "root" },
        },
      } as never,
      component as never
    )

    const releaseCard = registerSettingsPluginCard(
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

    expect(slots.entries("settings.plugin.item")[0]?.options.key)
      .toBe("llm-deepseek")
    releaseCard()
    releaseOwner()
  })

  it("uses the settings namespace as the rc.7 keyed slot key", () => {
    const register = registerFor("keyed")

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "settings.plugin.item",
        key: "llm-deepseek",
      }),
      "card"
    )
    expect(register.mock.calls[0]?.[0]).not.toHaveProperty("id")
  })

  it("keeps the rc.6 list slot registration", () => {
    const register = registerFor("list")

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "settings.plugin.item",
        id: "dsh-vision",
        order: 30,
      }),
      "card"
    )
    expect(register.mock.calls[0]?.[0]).not.toHaveProperty("key")
  })

  it("fails clearly for an unknown slot contract", () => {
    const slots: CompatibleSettingsSlots = {
      specDynamic: () => ({ kind: "single" }),
      register: vi.fn(),
    }

    expect(() => registerSettingsPluginCard(slots, "card", {
      namespace: "llm-deepseek",
      legacyId: "dsh-vision",
      legacyOrder: 30,
      locale: "settings.dshVision",
      inject: () => ({}),
    })).toThrow("unsupported settings.plugin.item slot kind")
  })
})
