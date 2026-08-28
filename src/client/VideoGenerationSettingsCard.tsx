import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type {
  CredentialView,
  IApiClient,
} from "@deepseek-ai/dsh-api-remotes/client"
import type { SettingsScope } from "@deepseek-ai/dsh-client-runtime/client"
import {
  IconChevronDownOutline14,
  Input,
} from "@deepseek-ai/dsh-client-ui-primitives"

import type { VisionLocaleKey } from "./locales.js"
import {
  VIDEO_GENERATION_SETTINGS_NAMESPACE,
  VIDEO_PROVIDERS,
  decodeVideoGenerationSettings,
  draftOfVideoGeneration,
  isVideoProviderName,
  sameVideoDraft,
  validVideoDraft,
  videoDraftForProvider,
  videoSettingsOps,
  type VideoGenerationSettings,
  type VideoProviderName,
} from "./settings.js"

export interface VideoGenerationSettingsCardInjected {
  readonly scope: SettingsScope<VideoGenerationSettings>
  readonly api: Pick<IApiClient, "settings" | "credentials">
}

export interface VideoGenerationSettingsCardProps
  extends Partial<VideoGenerationSettingsCardInjected> {
  readonly t?: (key: VisionLocaleKey) => string
}

type CredentialState =
  | { readonly kind: "idle" | "loading" }
  | {
      readonly kind: "ready"
      readonly credentials: Readonly<Record<string, CredentialView>>
    }
  | { readonly kind: "error" }

function credentialFacts(
  provider: VideoProviderName | undefined,
  state: CredentialState,
  draft?: import("./settings.js").VideoGenerationSettings
): {
  readonly configured: boolean
  readonly writable: boolean
  readonly primaryRef: string | undefined
} {
  if (provider === undefined) {
    return { configured: false, writable: false, primaryRef: undefined }
  }
  const spec = VIDEO_PROVIDERS[provider]
  const refs = spec?.credentialRefs ?? []
  // For custom providers, use credentialName as the credential reference
  const primaryRef = refs[0] ?? (provider === "custom" ? draft?.credentialName : undefined)
  if (primaryRef === undefined || state.kind !== "ready") {
    return { configured: false, writable: true, primaryRef }
  }
  return {
    configured: refs.some((ref) => state.credentials[ref]?.configured === true),
    writable: state.credentials[primaryRef]?.writable !== false,
    primaryRef,
  }
}

export function VideoGenerationSettingsCard(
  props: VideoGenerationSettingsCardProps
): ReactNode {
  const { scope, api, t } = props
  if (scope === undefined || api === undefined || t === undefined) return null
  return <Loaded scope={scope} api={api} t={t} />
}

function Loaded({
  scope,
  api,
  t,
}: VideoGenerationSettingsCardInjected & {
  readonly t: (key: VisionLocaleKey) => string
}): ReactNode {
  const snapshot = useSyncExternalStore(
    (listener) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot()
  )
  const initial = draftOfVideoGeneration(snapshot.value)
  const [open, setOpen] = useState(false)
  const [baseline, setBaseline] = useState<VideoGenerationSettings>(initial)
  const [draft, setDraft] = useState<VideoGenerationSettings>(initial)
  const [revision, setRevision] = useState<number | undefined>(snapshot.revision)
  const [credential, setCredential] = useState<CredentialState>({ kind: "idle" })
  const [keyDraft, setKeyDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [saved, setSaved] = useState(false)
  const [externalChange, setExternalChange] = useState(false)

  const settingsDirty = !sameVideoDraft(baseline, draft)
  const keyDirty = keyDraft.trim() !== ""
  const dirty = settingsDirty || keyDirty
  const providerValid = validVideoDraft(draft)
  const writable = snapshot.status === "ready" && snapshot.writable
  const facts = credentialFacts(draft.provider, credential, draft)
  const credentialPending =
    draft.provider !== undefined &&
    (credential.kind === "idle" || credential.kind === "loading")
  const keyRequired =
    draft.provider !== undefined && !credentialPending &&
    !facts.configured && !keyDirty
  const disabled = !writable || saving

  useEffect(() => {
    if (snapshot.status !== "ready" || snapshot.revision === revision) return
    if (settingsDirty) {
      setExternalChange(true)
      return
    }
    const next = draftOfVideoGeneration(snapshot.value)
    setBaseline(next)
    setDraft(next)
    setRevision(snapshot.revision)
    setFailure(undefined)
    setExternalChange(false)
  }, [revision, settingsDirty, snapshot.revision, snapshot.status, snapshot.value])

  useEffect(() => {
    const provider = draft.provider
    if (!open || provider === undefined) {
      setCredential({ kind: "idle" })
      return
    }
    let active = true
    setCredential({ kind: "loading" })
    const refs = [...(VIDEO_PROVIDERS[provider]?.credentialRefs ?? [])]
    if (refs.length === 0) {
      setCredential({ kind: "ready", credentials: {} })
      return
    }
    void api.credentials.describe({ refs }).then(
      (response) => {
        if (!active) return
        setCredential(
          response.result.ok
            ? { kind: "ready", credentials: response.result.value.credentials }
            : { kind: "error" }
        )
      },
      () => {
        if (active) setCredential({ kind: "error" })
      }
    )
    return () => { active = false }
  }, [api.credentials, draft.provider, open])

  const clearMessages = (): void => {
    setSaved(false)
    setFailure(undefined)
  }

  const discard = (): void => {
    const next = draftOfVideoGeneration(
      snapshot.status === "ready" ? snapshot.value : undefined
    )
    setBaseline(next)
    setDraft(next)
    setRevision(snapshot.revision)
    setKeyDraft("")
    setFailure(undefined)
    setSaved(false)
    setExternalChange(false)
  }

  const save = (): void => {
    if (
      !dirty || !providerValid || keyRequired ||
      credentialPending || saving ||
      !writable || externalChange
    ) return
    setSaving(true)
    setFailure(undefined)
    setSaved(false)
    void (async () => {
      if (keyDirty && facts.primaryRef !== undefined) {
        const stored = await api.credentials.set({
          ref: facts.primaryRef,
          value: keyDraft.trim(),
        })
        if (!stored.result.ok) {
          setFailure(t("videoSaveFailed"))
          return
        }
        setCredential({
          kind: "ready",
          credentials: {
            [facts.primaryRef]: {
              configured: true,
              writable: true,
              source: "file",
            },
          },
        })
        setKeyDraft("")
      }

      const ops = videoSettingsOps(baseline, draft)
      if (ops.length > 0) {
        const response = await api.settings.mutate({
          ns: VIDEO_GENERATION_SETTINGS_NAMESPACE,
          ops: ops.map((op) => ({ ...op, path: [...op.path] })),
          ...(revision === undefined ? {} : { expectedRevision: revision }),
        })
        if (!response.result.ok) {
          if (response.result.error.code === "settings-conflict") {
            setExternalChange(true)
            setFailure(t("conflict"))
          } else {
            setFailure(t("videoSaveFailed"))
          }
          return
        }
        const next = draftOfVideoGeneration(
          response.result.value.value as VideoGenerationSettings
        )
        setBaseline(next)
        setDraft(next)
        setRevision(response.result.value.revision)
        setExternalChange(false)
      }
      setSaved(true)
    })().catch(() => {
      setFailure(t("videoSaveFailed"))
    }).finally(() => {
      setSaving(false)
    })
  }

  if (snapshot.status === "unavailable") return null

  const spec = draft.provider !== undefined ? VIDEO_PROVIDERS[draft.provider] : undefined
  const modelOptions =
    draft.provider === "custom"
      ? []
      : (spec?.models ?? [])

  const credentialLabel = credential.kind === "loading"
    ? t("keyLoading")
    : facts.configured
      ? t("keyConfigured")
      : t("keyMissing")
  const keyHint = credential.kind === "error"
    ? t("keyLoadFailed")
    : credentialPending
      ? t("keyLoading")
    : facts.configured && !facts.writable
      ? t("keyReadOnly")
      : keyRequired
        ? t("keyRequired")
        : t("keyPlaceholder")

  return (
    <li className="dsh-vision-settings-card" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="dsh-vision-settings-header"
        aria-expanded={open}
        aria-label={`${t("expand")}: ${t("videoGenerationTitle")}`}
        onClick={() => { setOpen((current) => !current) }}
      >
        <span className="dsh-vision-settings-head-text">
          <span className="dsh-vision-settings-name">{t("videoGenerationTitle")}</span>
          <span className="dsh-vision-settings-description">{t("videoGenerationDescription")}</span>
        </span>
        {dirty ? <span className="dsh-vision-settings-pending">{t("unsaved")}</span> : null}
        <IconChevronDownOutline14 className="dsh-vision-settings-chevron" />
      </button>
      {open
        ? (
          <div className="dsh-vision-settings-body">
            {snapshot.status === "loading"
              ? <p className="dsh-vision-settings-status">{t("loading")}</p>
              : null}
            {snapshot.status === "ready" && !snapshot.writable
              ? <p className="dsh-vision-settings-status">{t("readOnly")}</p>
              : null}

            <div className="dsh-vision-settings-field">
              <label className="dsh-vision-settings-label" htmlFor="dsh-video-provider">
                {t("videoProvider")}
              </label>
              <select
                id="dsh-video-provider"
                className="dsh-vision-settings-select"
                value={draft.provider ?? ""}
                disabled={disabled}
                onChange={(event) => {
                  const provider = isVideoProviderName(event.target.value)
                    ? event.target.value
                    : undefined
                  setDraft((current) => videoDraftForProvider(current, provider))
                  setKeyDraft("")
                  clearMessages()
                }}
              >
                <option value="">{t("automatic")}</option>
                {Object.entries(VIDEO_PROVIDERS).map(([id, p]) => (
                  <option key={id} value={id}>{p.displayName}</option>
                ))}
              </select>
            </div>

            {draft.provider === undefined
              ? null
              : (
                <>
                  <div className="dsh-vision-settings-field">
                    <label className="dsh-vision-settings-label" htmlFor="dsh-video-model">
                      {t("videoModel")}
                    </label>
                    {modelOptions.length > 0 ? (
                      <select
                        id="dsh-video-model"
                        className="dsh-vision-settings-select"
                        value={draft.model}
                        disabled={disabled}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, model: event.target.value }))
                          clearMessages()
                        }}
                      >
                        {modelOptions.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="dsh-video-model"
                        className="dsh-vision-settings-input"
                        value={draft.model}
                        disabled={disabled}
                        aria-invalid={!providerValid}
                        placeholder={t("defaultModel")}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, model: event.target.value }))
                          clearMessages()
                        }}
                      />
                    )}
                    <p className={providerValid ? "dsh-vision-settings-hint" : "dsh-vision-settings-error"}>
                      {t(providerValid ? "modelHint" : "invalidProvider")}
                    </p>
                  </div>

                  <div className="dsh-vision-settings-field">
                    <label className="dsh-vision-settings-label" htmlFor="dsh-video-api-key">
                      {t("apiKey")}
                    </label>
                    {spec && spec.credentialRefs.length > 0 ? (
                      <span
                        className="dsh-vision-settings-badge"
                        data-tone={facts.configured ? "success" : "muted"}
                      >
                        {credentialLabel}
                      </span>
                    ) : (
                      <span className="dsh-vision-settings-badge" data-tone="muted">
                        {t("customKey")}
                      </span>
                    )}
                  </div>
                  <div className="dsh-vision-settings-field">
                    <Input
                      id="dsh-video-api-key"
                      className="dsh-vision-settings-input"
                      type="password"
                      autoComplete="off"
                      value={keyDraft}
                      placeholder={
                        spec && spec.credentialRefs.length > 0
                          ? t("keyPlaceholder")
                          : t("customKeyPlaceholder")
                      }
                      disabled={disabled || !facts.writable}
                      aria-invalid={keyRequired}
                      onChange={(event) => {
                        setKeyDraft(event.target.value)
                        clearMessages()
                      }}
                    />
                    <p className={keyRequired ? "dsh-vision-settings-error" : "dsh-vision-settings-hint"}>
                      {keyHint}
                    </p>
                  </div>

                  {draft.provider === "custom" && (
                    <div className="dsh-vision-settings-field">
                      <label className="dsh-vision-settings-label" htmlFor="dsh-video-credential-name">
                        {t("credentialName")}
                      </label>
                      <Input
                        id="dsh-video-credential-name"
                        className="dsh-vision-settings-input"
                        value={draft.credentialName}
                        placeholder={t("credentialNamePlaceholder")}
                        disabled={disabled}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, credentialName: event.target.value }))
                          clearMessages()
                        }}
                      />
                      <p className="dsh-vision-settings-hint">
                        {t("credentialNameHint")}
                      </p>
                    </div>
                  )}

                  <div className="dsh-vision-settings-field">
                    <label className="dsh-vision-settings-label" htmlFor="dsh-video-base-url">
                      {t("imageBaseURL")}
                    </label>
                    <Input
                      id="dsh-video-base-url"
                      className="dsh-vision-settings-input"
                      value={draft.baseURL}
                      placeholder={t("imageBaseURLPlaceholder")}
                      disabled={disabled}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, baseURL: event.target.value }))
                        clearMessages()
                      }}
                    />
                    <p className="dsh-vision-settings-hint">
                      {t("imageBaseURLHint")}
                    </p>
                  </div>
                </>
              )}

            <div className="dsh-vision-toggle-row">
              <div className="dsh-vision-toggle-label">
                <span className="dsh-vision-toggle-title">{t("enableVideoGeneration")}</span>
                <span className="dsh-vision-toggle-subtitle">
                  {draft.enabled ? t("keyConfigured") : t("keyMissing")}
                </span>
              </div>
              <input
                type="checkbox"
                className="dsh-vision-toggle"
                checked={draft.enabled}
                disabled={disabled}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, enabled: event.target.checked }))
                  clearMessages()
                }}
              />
            </div>

            {spec !== undefined && spec.async
              ? <p className="dsh-vision-async-note">{t("videoAsyncNote")}</p>
              : null}

            <div className="dsh-vision-settings-footer">
              <p
                className="dsh-vision-settings-footer-status"
                data-tone={failure === undefined ? "success" : "error"}
                role="status"
              >
                {externalChange ? t("conflict") : failure ?? (saved ? t("videoSaved") : "")}
              </p>
              <button
                type="button"
                className="dsh-vision-settings-action dsh-vision-settings-discard"
                disabled={!dirty || saving}
                onClick={discard}
              >
                {t("discard")}
              </button>
              <button
                type="button"
                className="dsh-vision-settings-action dsh-vision-settings-save"
                disabled={
                  !dirty || !providerValid || keyRequired ||
                  credentialPending || saving || !writable || externalChange
                }
                onClick={save}
              >
                {t(saving ? "saving" : "save")}
              </button>
            </div>
          </div>
        )
        : null}
    </li>
  )
}

