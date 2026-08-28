window.__ModuleLoader__.load({
	id: "@narger18/dsh-vision",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/provider-catalog.ts
		/** Provider defaults kept in sync with oil-oil/see-skill. */
		const VISION_PROVIDERS = {
			zenmux: {
				displayName: "ZenMux",
				baseURL: "https://zenmux.ai/api/v1",
				model: "qwen/qwen3.7-plus",
				credentialRefs: ["ZENMUX_API_KEY"]
			},
			bailian: {
				displayName: "百炼",
				baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
				model: "qwen3.7-plus",
				credentialRefs: ["DASHSCOPE_API_KEY", "BAILIAN_API_KEY"]
			},
			tokendance: {
				displayName: "TokenDance",
				baseURL: "https://tokendance.space/gateway/v1",
				model: "qwen3.7-plus",
				credentialRefs: ["TOKENDANCE_API_KEY"]
			},
			openrouter: {
				displayName: "OpenRouter",
				baseURL: "https://openrouter.ai/api/v1",
				model: "qwen/qwen3.7-plus",
				credentialRefs: ["OPENROUTER_API_KEY"]
			},
			anthropic: {
				displayName: "Anthropic (Claude)",
				baseURL: "https://api.anthropic.com/v1",
				model: "claude-sonnet-4-20250514",
				credentialRefs: ["ANTHROPIC_API_KEY"]
			},
			google: {
				displayName: "Google (Gemini)",
				baseURL: "https://generativelanguage.googleapis.com/v1beta",
				model: "gemini-2.0-flash-exp",
				credentialRefs: ["GOOGLE_API_KEY"]
			},
			openai: {
				displayName: "OpenAI (GPT-4 Vision)",
				baseURL: "https://api.openai.com/v1",
				model: "gpt-4o",
				credentialRefs: ["OPENAI_API_KEY"]
			}
		};
		function isVisionProviderName(value) {
			return typeof value === "string" && (value in VISION_PROVIDERS || value === "custom");
		}
		//#endregion
		//#region src/client/settings.ts
		const VISION_SETTINGS_NAMESPACE = "llm-deepseek";
		const IMAGE_GENERATION_SETTINGS_NAMESPACE = "dsh-vision-image-gen";
		const VIDEO_GENERATION_SETTINGS_NAMESPACE = "dsh-vision-video-gen";
		function nonEmptyString(value) {
			return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
		}
		function decodeVisionSettings(section) {
			if (typeof section !== "object" || section === null || Array.isArray(section)) return;
			const source = section;
			const provider = source["visionBackend"];
			const model = source["visionBackendModel"];
			const baseURL = source["visionBackendBaseURL"];
			const maxImages = source["maxImages"];
			if (provider !== void 0 && !isVisionProviderName(provider)) return void 0;
			if (model !== void 0 && typeof model !== "string") return void 0;
			if (baseURL !== void 0 && typeof baseURL !== "string") return void 0;
			if (maxImages !== void 0 && typeof maxImages !== "number") return void 0;
			return {
				...provider === void 0 ? {} : { visionBackend: provider },
				...model === void 0 ? {} : { visionBackendModel: model },
				...baseURL === void 0 ? {} : { visionBackendBaseURL: baseURL },
				...maxImages === void 0 ? {} : { maxImages }
			};
		}
		function draftOf(settings) {
			const provider = isVisionProviderName(settings?.visionBackend) ? settings.visionBackend : void 0;
			const spec = provider === void 0 || provider === "custom" ? void 0 : VISION_PROVIDERS[provider];
			return {
				provider,
				model: nonEmptyString(settings?.visionBackendModel) ?? spec?.model ?? "",
				baseURL: nonEmptyString(settings?.visionBackendBaseURL) ?? spec?.baseURL ?? "",
				credentialName: "",
				maxImages: settings?.maxImages ?? 8
			};
		}
		function draftForProvider(current, provider) {
			const spec = provider === void 0 || provider === "custom" ? void 0 : VISION_PROVIDERS[provider];
			return {
				...current,
				provider,
				model: spec?.model ?? "",
				baseURL: spec?.baseURL ?? "",
				credentialName: provider === "custom" ? current.credentialName : ""
			};
		}
		function sameDraft(left, right) {
			return left.provider === right.provider && left.model === right.model && left.baseURL === right.baseURL && left.credentialName === right.credentialName && left.maxImages === right.maxImages;
		}
		function validMaxImages(value) {
			return Number.isInteger(value) && value >= 1 && value <= 32;
		}
		function validProviderDraft(draft) {
			if (draft.provider === void 0) return true;
			if (draft.model.trim() === "" || draft.baseURL.trim() === "") return false;
			try {
				const url = new URL(draft.baseURL);
				return url.protocol === "https:" || url.protocol === "http:";
			} catch {
				return false;
			}
		}
		function settingsOps(before, after) {
			const ops = [];
			const providerChanged = before.provider !== after.provider;
			if (providerChanged) {
				if (after.provider === void 0) ops.push({
					op: "unset",
					path: ["visionBackend"]
				}, {
					op: "unset",
					path: ["visionBackendModel"]
				}, {
					op: "unset",
					path: ["visionBackendBaseURL"]
				});
				else {
					ops.push({
						op: "set",
						path: ["visionBackend"],
						value: after.provider
					});
					if (after.provider !== "custom") {
						const spec = VISION_PROVIDERS[after.provider];
						if (spec !== void 0) {
							ops.push({
								op: "set",
								path: ["visionBackendModel"],
								value: spec.model
							});
							ops.push({
								op: "set",
								path: ["visionBackendBaseURL"],
								value: spec.baseURL
							});
						}
					}
				}
			}
			if (after.provider !== void 0 && after.provider !== "custom") {
				if (providerChanged) return [...ops];
				if (before.model !== after.model) ops.push({
					op: "set",
					path: ["visionBackendModel"],
					value: after.model.trim()
				});
				if (before.baseURL !== after.baseURL) ops.push({
					op: "set",
					path: ["visionBackendBaseURL"],
					value: after.baseURL.trim()
				});
			}
			if (before.maxImages !== after.maxImages) ops.push({
				op: "set",
				path: ["maxImages"],
				value: after.maxImages
			});
			return ops;
		}
		const IMAGE_PROVIDERS = {
			openai: {
				displayName: "OpenAI",
				model: "gpt-4o",
				credentialRefs: ["OPENAI_API_KEY"],
				models: [
					"gpt-4o",
					"gpt-4o-mini",
					"dall-e-3",
					"dall-e-2"
				]
			},
			stability: {
				displayName: "Stability AI",
				model: "stable-diffusion-3.5-large",
				credentialRefs: ["STABILITY_API_KEY"],
				models: [
					"stable-diffusion-3.5-large",
					"stable-diffusion-3.5-medium",
					"stable-diffusion-3"
				]
			},
			custom: {
				displayName: "Custom",
				model: "",
				credentialRefs: [],
				models: []
			}
		};
		function decodeImageGenerationSettings(section) {
			if (typeof section !== "object" || section === null || Array.isArray(section)) return;
			const source = section;
			const rawProvider = source["provider"];
			const provider = typeof rawProvider === "string" && rawProvider in IMAGE_PROVIDERS ? rawProvider : void 0;
			const model = nonEmptyString(source["model"]);
			const apiKeyRef = nonEmptyString(source["apiKeyRef"]) ?? "";
			const credentialName = source["credentialName"] ?? "";
			const baseURL = source["baseURL"] ?? "";
			const maxImages = source["maxImages"];
			const enabled = source["enabled"] === true;
			if (model !== void 0 && typeof model !== "string") return void 0;
			if (typeof apiKeyRef !== "string") return void 0;
			if (maxImages !== void 0 && typeof maxImages !== "number") return void 0;
			return {
				provider: provider ?? void 0,
				model: model ?? "",
				apiKeyRef,
				credentialName,
				baseURL: baseURL.trim(),
				maxImages: maxImages ?? 8,
				enabled: enabled ?? false
			};
		}
		function draftOfImageGeneration(settings) {
			const provider = isImageProviderName(settings?.provider) ? settings.provider : void 0;
			const spec = provider === void 0 ? void 0 : IMAGE_PROVIDERS[provider];
			return {
				provider,
				model: nonEmptyString(settings?.model) ?? spec?.model ?? "",
				apiKeyRef: nonEmptyString(settings?.apiKeyRef) ?? "",
				credentialName: settings?.credentialName ?? "",
				baseURL: settings?.baseURL ?? "",
				maxImages: settings?.maxImages ?? 8,
				enabled: settings?.enabled ?? false
			};
		}
		function isImageProviderName(value) {
			return typeof value === "string" && value in IMAGE_PROVIDERS;
		}
		function imageDraftForProvider(current, provider) {
			const spec = provider === void 0 ? void 0 : IMAGE_PROVIDERS[provider];
			return {
				...current,
				provider,
				model: spec?.model ?? ""
			};
		}
		function sameImageDraft(left, right) {
			return left.provider === right.provider && left.model === right.model && left.apiKeyRef === right.apiKeyRef && left.credentialName === right.credentialName && left.baseURL === right.baseURL && left.maxImages === right.maxImages && left.enabled === right.enabled;
		}
		function validImageDraft(draft) {
			if (draft.provider === void 0) return true;
			if (draft.provider === "custom") {
				if (draft.model.trim() === "") return false;
				if (draft.baseURL.trim() === "") return false;
				return true;
			}
			return draft.model.trim() !== "";
		}
		function imageSettingsOps(before, after) {
			const ops = [];
			if (before.provider !== after.provider) {
				if (after.provider === void 0) ops.push({
					op: "set",
					path: ["provider"],
					value: void 0
				}, {
					op: "set",
					path: ["model"],
					value: ""
				}, {
					op: "set",
					path: ["apiKeyRef"],
					value: ""
				}, {
					op: "set",
					path: ["credentialName"],
					value: ""
				}, {
					op: "set",
					path: ["baseURL"],
					value: ""
				}, {
					op: "set",
					path: ["enabled"],
					value: false
				});
				else {
					const spec = IMAGE_PROVIDERS[after.provider];
					const opsList = [
						{
							op: "set",
							path: ["provider"],
							value: after.provider
						},
						{
							op: "set",
							path: ["model"],
							value: spec?.model ?? ""
						},
						{
							op: "set",
							path: ["apiKeyRef"],
							value: spec?.credentialRefs[0] ?? ""
						},
						{
							op: "set",
							path: ["baseURL"],
							value: ""
						}
					];
					if (after.provider !== "custom") opsList.push({
						op: "set",
						path: ["credentialName"],
						value: ""
					});
					ops.push(...opsList);
				}
			}
			if (after.provider !== void 0) {
				if (before.model !== after.model) ops.push({
					op: "set",
					path: ["model"],
					value: after.model.trim()
				});
				if (before.apiKeyRef !== after.apiKeyRef) ops.push({
					op: "set",
					path: ["apiKeyRef"],
					value: after.apiKeyRef.trim()
				});
				if (before.credentialName !== after.credentialName) ops.push({
					op: "set",
					path: ["credentialName"],
					value: after.credentialName.trim()
				});
				if (before.baseURL !== after.baseURL) ops.push({
					op: "set",
					path: ["baseURL"],
					value: after.baseURL.trim()
				});
			}
			if (before.maxImages !== after.maxImages) ops.push({
				op: "set",
				path: ["maxImages"],
				value: after.maxImages
			});
			if (before.enabled !== after.enabled) ops.push({
				op: "set",
				path: ["enabled"],
				value: after.enabled
			});
			return ops;
		}
		const VIDEO_PROVIDERS = {
			runway: {
				displayName: "Runway",
				model: "gen-3",
				credentialRefs: ["RUNWAY_API_KEY"],
				models: ["gen-3", "gen-2"],
				async: true
			},
			pika: {
				displayName: "Pika",
				model: "pika-1.0",
				credentialRefs: ["PIKA_API_KEY"],
				models: ["pika-1.0", "pika-1.0-lite"],
				async: true
			},
			custom: {
				displayName: "Custom",
				model: "",
				credentialRefs: [],
				models: [],
				async: false
			}
		};
		function decodeVideoGenerationSettings(section) {
			if (typeof section !== "object" || section === null || Array.isArray(section)) return;
			const source = section;
			const rawProvider = source["provider"];
			const provider = typeof rawProvider === "string" && rawProvider in VIDEO_PROVIDERS ? rawProvider : void 0;
			const model = nonEmptyString(source["model"]);
			const apiKeyRef = nonEmptyString(source["apiKeyRef"]) ?? "";
			const credentialName = source["credentialName"] ?? "";
			const baseURL = source["baseURL"] ?? "";
			const enabled = source["enabled"] === true;
			if (model !== void 0 && typeof model !== "string") return void 0;
			if (typeof apiKeyRef !== "string") return void 0;
			return {
				provider: provider ?? void 0,
				model: model ?? "",
				apiKeyRef,
				credentialName,
				baseURL: baseURL.trim(),
				enabled: enabled ?? false
			};
		}
		function draftOfVideoGeneration(settings) {
			const provider = isVideoProviderName(settings?.provider) ? settings.provider : void 0;
			const spec = provider === void 0 ? void 0 : VIDEO_PROVIDERS[provider];
			return {
				provider,
				model: nonEmptyString(settings?.model) ?? spec?.model ?? "",
				apiKeyRef: nonEmptyString(settings?.apiKeyRef) ?? "",
				credentialName: settings?.credentialName ?? "",
				baseURL: settings?.baseURL ?? "",
				enabled: settings?.enabled ?? false
			};
		}
		function isVideoProviderName(value) {
			return typeof value === "string" && value in VIDEO_PROVIDERS;
		}
		function videoDraftForProvider(current, provider) {
			const spec = provider === void 0 ? void 0 : VIDEO_PROVIDERS[provider];
			return {
				...current,
				provider,
				model: spec?.model ?? ""
			};
		}
		function sameVideoDraft(left, right) {
			return left.provider === right.provider && left.model === right.model && left.apiKeyRef === right.apiKeyRef && left.credentialName === right.credentialName && left.baseURL === right.baseURL && left.enabled === right.enabled;
		}
		function validVideoDraft(draft) {
			if (draft.provider === void 0) return true;
			if (draft.provider === "custom") {
				if (draft.model.trim() === "") return false;
				if (draft.baseURL.trim() === "") return false;
				return true;
			}
			return draft.model.trim() !== "";
		}
		function videoSettingsOps(before, after) {
			const ops = [];
			if (before.provider !== after.provider) {
				if (after.provider === void 0) ops.push({
					op: "set",
					path: ["provider"],
					value: void 0
				}, {
					op: "set",
					path: ["model"],
					value: ""
				}, {
					op: "set",
					path: ["apiKeyRef"],
					value: ""
				}, {
					op: "set",
					path: ["credentialName"],
					value: ""
				}, {
					op: "set",
					path: ["baseURL"],
					value: ""
				}, {
					op: "set",
					path: ["enabled"],
					value: false
				});
				else {
					const spec = VIDEO_PROVIDERS[after.provider];
					const vOps = [
						{
							op: "set",
							path: ["provider"],
							value: after.provider
						},
						{
							op: "set",
							path: ["model"],
							value: spec?.model ?? ""
						},
						{
							op: "set",
							path: ["apiKeyRef"],
							value: spec?.credentialRefs[0] ?? ""
						},
						{
							op: "set",
							path: ["baseURL"],
							value: ""
						}
					];
					if (after.provider !== "custom") vOps.push({
						op: "set",
						path: ["credentialName"],
						value: ""
					});
					ops.push(...vOps);
				}
			}
			if (after.provider !== void 0) {
				if (before.model !== after.model) ops.push({
					op: "set",
					path: ["model"],
					value: after.model.trim()
				});
				if (before.apiKeyRef !== after.apiKeyRef) ops.push({
					op: "set",
					path: ["apiKeyRef"],
					value: after.apiKeyRef.trim()
				});
				if (before.credentialName !== after.credentialName) ops.push({
					op: "set",
					path: ["credentialName"],
					value: after.credentialName.trim()
				});
				if (before.baseURL !== after.baseURL) ops.push({
					op: "set",
					path: ["baseURL"],
					value: after.baseURL.trim()
				});
			}
			if (before.enabled !== after.enabled) ops.push({
				op: "set",
				path: ["enabled"],
				value: after.enabled
			});
			return ops;
		}
		//#endregion
		//#region src/client/VisionSettingsCard.tsx
		function credentialFacts$2(provider, state, draft) {
			if (provider === void 0) return {
				configured: false,
				writable: false,
				primaryRef: void 0
			};
			const refs = provider === "custom" ? [] : VISION_PROVIDERS[provider]?.credentialRefs ?? [];
			const primaryRef = refs[0] ?? (provider === "custom" ? draft?.credentialName : void 0);
			if (primaryRef === void 0 || state.kind !== "ready") return {
				configured: false,
				writable: true,
				primaryRef
			};
			return {
				configured: refs.some((ref) => state.credentials[ref]?.configured === true),
				writable: state.credentials[primaryRef]?.writable !== false,
				primaryRef
			};
		}
		function VisionSettingsCard(props) {
			const { scope, api, t } = props;
			if (scope === void 0 || api === void 0 || t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded$2, {
				scope,
				api,
				t
			});
		}
		function Loaded$2({ scope, api, t }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			const initial = draftOf(snapshot.value);
			const [open, setOpen] = (0, react.useState)(false);
			const [baseline, setBaseline] = (0, react.useState)(initial);
			const [draft, setDraft] = (0, react.useState)(initial);
			const [revision, setRevision] = (0, react.useState)(snapshot.revision);
			const [credential, setCredential] = (0, react.useState)({ kind: "idle" });
			const [keyDraft, setKeyDraft] = (0, react.useState)("");
			const [saving, setSaving] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [saved, setSaved] = (0, react.useState)(false);
			const [externalChange, setExternalChange] = (0, react.useState)(false);
			const settingsDirty = !sameDraft(baseline, draft);
			const keyDirty = keyDraft.trim() !== "";
			const dirty = settingsDirty || keyDirty;
			const maxImagesValid = validMaxImages(draft.maxImages);
			const providerValid = validProviderDraft(draft);
			const writable = snapshot.status === "ready" && snapshot.writable;
			const facts = credentialFacts$2(draft.provider, credential, draft);
			const credentialPending = draft.provider !== void 0 && (credential.kind === "idle" || credential.kind === "loading");
			const keyRequired = draft.provider !== void 0 && !credentialPending && !facts.configured && !keyDirty;
			const disabled = !writable || saving;
			(0, react.useEffect)(() => {
				if (snapshot.status !== "ready" || snapshot.revision === revision) return;
				if (settingsDirty) {
					setExternalChange(true);
					return;
				}
				const next = draftOf(snapshot.value);
				setBaseline(next);
				setDraft(next);
				setRevision(snapshot.revision);
				setFailure(void 0);
				setExternalChange(false);
			}, [
				revision,
				settingsDirty,
				snapshot.revision,
				snapshot.status,
				snapshot.value
			]);
			(0, react.useEffect)(() => {
				const provider = draft.provider;
				if (!open || provider === void 0) {
					setCredential({ kind: "idle" });
					return;
				}
				let active = true;
				setCredential({ kind: "loading" });
				api.credentials.describe({ refs: draft.provider === "custom" ? [] : [...VISION_PROVIDERS[draft.provider].credentialRefs] }).then((response) => {
					if (!active) return;
					setCredential(response.result.ok ? {
						kind: "ready",
						credentials: response.result.value.credentials
					} : { kind: "error" });
				}, () => {
					if (active) setCredential({ kind: "error" });
				});
				return () => {
					active = false;
				};
			}, [
				api.credentials,
				draft.provider,
				open
			]);
			const clearMessages = () => {
				setSaved(false);
				setFailure(void 0);
			};
			const discard = () => {
				const next = draftOf(snapshot.status === "ready" ? snapshot.value : void 0);
				setBaseline(next);
				setDraft(next);
				setRevision(snapshot.revision);
				setKeyDraft("");
				setFailure(void 0);
				setSaved(false);
				setExternalChange(false);
			};
			const save = () => {
				if (!dirty || !maxImagesValid || !providerValid || keyRequired || credentialPending || saving || !writable || externalChange) return;
				setSaving(true);
				setFailure(void 0);
				setSaved(false);
				(async () => {
					if (keyDirty && facts.primaryRef !== void 0) {
						if (!(await api.credentials.set({
							ref: facts.primaryRef,
							value: keyDraft.trim()
						})).result.ok) {
							setFailure(t("keySaveFailed"));
							return;
						}
						setCredential({
							kind: "ready",
							credentials: { [facts.primaryRef]: {
								configured: true,
								writable: true,
								source: "file"
							} }
						});
						setKeyDraft("");
					}
					const ops = settingsOps(baseline, draft);
					if (ops.length > 0) {
						const response = await api.settings.mutate({
							ns: VISION_SETTINGS_NAMESPACE,
							ops: ops.map((op) => ({
								...op,
								path: [...op.path]
							})),
							...revision === void 0 ? {} : { expectedRevision: revision }
						});
						if (!response.result.ok) {
							if (response.result.error.code === "settings-conflict") {
								setExternalChange(true);
								setFailure(t("conflict"));
							} else setFailure(t("saveFailed"));
							return;
						}
						const next = draftOf(response.result.value.value);
						setBaseline(next);
						setDraft(next);
						setRevision(response.result.value.revision);
						setExternalChange(false);
					}
					setSaved(true);
				})().catch(() => {
					setFailure(t("saveFailed"));
				}).finally(() => {
					setSaving(false);
				});
			};
			if (snapshot.status === "unavailable") return null;
			const credentialLabel = credential.kind === "loading" ? t("keyLoading") : facts.configured ? t("keyConfigured") : t("keyMissing");
			const keyHint = credential.kind === "error" ? t("keyLoadFailed") : credentialPending ? t("keyLoading") : facts.configured && !facts.writable ? t("keyReadOnly") : keyRequired ? t("keyRequired") : t("keyPlaceholder");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dsh-vision-settings-card",
				"data-open": open ? "true" : "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-vision-settings-header",
					"aria-expanded": open,
					"aria-label": `${t(open ? "collapse" : "expand")}: ${t("title")}`,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-vision-settings-head-text",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-vision-settings-name",
								children: t("title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-vision-settings-description",
								children: t("description")
							})]
						}),
						dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-vision-settings-pending",
							children: t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: "dsh-vision-settings-chevron" })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-vision-settings-body",
					children: [
						snapshot.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-vision-settings-status",
							children: t("loading")
						}) : null,
						snapshot.status === "ready" && !snapshot.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-vision-settings-status",
							children: t("readOnly")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-vision-settings-body-main",
							children: snapshot.status === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-vision-settings-field",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											className: "dsh-vision-settings-label",
											htmlFor: "dsh-vision-provider",
											children: t("provider")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "dsh-vision-provider",
											className: "dsh-vision-settings-select",
											value: draft.provider ?? "",
											disabled,
											onChange: (event) => {
												const provider = isVisionProviderName(event.target.value) ? event.target.value : void 0;
												setDraft((current) => draftForProvider(current, provider));
												setKeyDraft("");
												clearMessages();
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "",
													children: t("automatic")
												}),
												Object.entries(VISION_PROVIDERS).map(([id, provider]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: id,
													children: provider.displayName
												}, id)),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "custom",
													children: t("customKey")
												}, "custom")
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "dsh-vision-settings-hint",
											children: t(draft.provider === void 0 ? "automaticHint" : "configuredHint")
										})
									]
								}),
								draft.provider !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-vision-settings-field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-vision-settings-field-head",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
													className: "dsh-vision-settings-label",
													htmlFor: "dsh-vision-api-key",
													children: t("apiKey")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsh-vision-settings-badge",
													"data-tone": facts.configured ? "success" : "muted",
													children: credentialLabel
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												id: "dsh-vision-api-key",
												className: "dsh-vision-settings-input",
												type: "password",
												autoComplete: "off",
												value: keyDraft,
												placeholder: t("keyPlaceholder"),
												disabled: disabled || !facts.writable,
												"aria-invalid": keyRequired,
												onChange: (event) => {
													setKeyDraft(event.target.value);
													clearMessages();
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: keyRequired ? "dsh-vision-settings-error" : "dsh-vision-settings-hint",
												children: keyHint
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-vision-settings-field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
												className: "dsh-vision-settings-label",
												htmlFor: "dsh-vision-model",
												children: t("model")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												id: "dsh-vision-model",
												className: "dsh-vision-settings-input",
												value: draft.model,
												disabled,
												"aria-invalid": !providerValid,
												onChange: (event) => {
													setDraft((current) => ({
														...current,
														model: event.target.value
													}));
													clearMessages();
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dsh-vision-settings-hint",
												children: t("modelHint")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-vision-settings-field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
												className: "dsh-vision-settings-label",
												htmlFor: "dsh-vision-base-url",
												children: t("baseURL")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												id: "dsh-vision-base-url",
												className: "dsh-vision-settings-input",
												type: "url",
												value: draft.baseURL,
												disabled,
												"aria-invalid": !providerValid,
												onChange: (event) => {
													setDraft((current) => ({
														...current,
														baseURL: event.target.value
													}));
													clearMessages();
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: providerValid ? "dsh-vision-settings-hint" : "dsh-vision-settings-error",
												children: t(providerValid ? "baseURLHint" : "invalidProvider")
											})
										]
									}),
									draft.provider === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-vision-settings-field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
												className: "dsh-vision-settings-label",
												htmlFor: "dsh-vision-credential-name",
												children: t("credentialName")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												id: "dsh-vision-credential-name",
												className: "dsh-vision-settings-input",
												value: draft.credentialName,
												placeholder: t("credentialNamePlaceholder"),
												disabled,
												onChange: (event) => {
													setDraft((current) => ({
														...current,
														credentialName: event.target.value
													}));
													clearMessages();
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dsh-vision-settings-hint",
												children: t("credentialNameHint")
											})
										]
									})
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-vision-settings-field",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											className: "dsh-vision-settings-label",
											htmlFor: "dsh-vision-max-images",
											children: t("maxImages")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											id: "dsh-vision-max-images",
											className: "dsh-vision-settings-number",
											type: "number",
											inputMode: "numeric",
											min: 1,
											max: 32,
											step: 1,
											value: String(draft.maxImages),
											disabled,
											"aria-invalid": !maxImagesValid,
											onChange: (event) => {
												setDraft((current) => ({
													...current,
													maxImages: Number(event.target.value)
												}));
												clearMessages();
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: maxImagesValid ? "dsh-vision-settings-hint" : "dsh-vision-settings-error",
											children: t(maxImagesValid ? "maxImagesHint" : "invalidMaxImages")
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-vision-settings-failover",
									children: t("failover")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-vision-settings-footer",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-vision-settings-footer-status",
									"data-tone": failure === void 0 ? "success" : "error",
									role: "status",
									children: externalChange ? t("conflict") : failure ?? (saved ? t("saved") : "")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-vision-settings-action dsh-vision-settings-discard",
									disabled: !dirty || saving,
									onClick: discard,
									children: t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-vision-settings-action dsh-vision-settings-save",
									disabled: !dirty || !maxImagesValid || !providerValid || keyRequired || credentialPending || saving || !writable || externalChange,
									onClick: save,
									children: t(saving ? "saving" : "save")
								})
							]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/ImageGenerationSettingsCard.tsx
		function credentialFacts$1(provider, state, draft) {
			if (provider === void 0) return {
				configured: false,
				writable: false,
				primaryRef: void 0
			};
			const refs = IMAGE_PROVIDERS[provider]?.credentialRefs ?? [];
			const primaryRef = refs[0] ?? (provider === "custom" ? draft?.credentialName : void 0);
			if (primaryRef === void 0 || state.kind !== "ready") return {
				configured: false,
				writable: true,
				primaryRef
			};
			return {
				configured: refs.some((ref) => state.credentials[ref]?.configured === true),
				writable: state.credentials[primaryRef]?.writable !== false,
				primaryRef
			};
		}
		function ImageGenerationSettingsCard(props) {
			const { scope, api, t } = props;
			if (scope === void 0 || api === void 0 || t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded$1, {
				scope,
				api,
				t
			});
		}
		function Loaded$1({ scope, api, t }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			const initial = draftOfImageGeneration(snapshot.value);
			const [open, setOpen] = (0, react.useState)(false);
			const [baseline, setBaseline] = (0, react.useState)(initial);
			const [draft, setDraft] = (0, react.useState)(initial);
			const [revision, setRevision] = (0, react.useState)(snapshot.revision);
			const [credential, setCredential] = (0, react.useState)({ kind: "idle" });
			const [keyDraft, setKeyDraft] = (0, react.useState)("");
			const [saving, setSaving] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [saved, setSaved] = (0, react.useState)(false);
			const [externalChange, setExternalChange] = (0, react.useState)(false);
			const settingsDirty = !sameImageDraft(baseline, draft);
			const keyDirty = keyDraft.trim() !== "";
			const dirty = settingsDirty || keyDirty;
			const maxImagesValid = Number.isInteger(draft.maxImages) && draft.maxImages >= 1 && draft.maxImages <= 8;
			const providerValid = validImageDraft(draft);
			const writable = snapshot.status === "ready" && snapshot.writable;
			const facts = credentialFacts$1(draft.provider, credential, draft);
			const credentialPending = draft.provider !== void 0 && (credential.kind === "idle" || credential.kind === "loading");
			const keyRequired = draft.provider !== void 0 && !credentialPending && !facts.configured && !keyDirty;
			const disabled = !writable || saving;
			(0, react.useEffect)(() => {
				if (snapshot.status !== "ready" || snapshot.revision === revision) return;
				if (settingsDirty) {
					setExternalChange(true);
					return;
				}
				const next = draftOfImageGeneration(snapshot.value);
				setBaseline(next);
				setDraft(next);
				setRevision(snapshot.revision);
				setFailure(void 0);
				setExternalChange(false);
			}, [
				revision,
				settingsDirty,
				snapshot.revision,
				snapshot.status,
				snapshot.value
			]);
			(0, react.useEffect)(() => {
				const provider = draft.provider;
				if (!open || provider === void 0) {
					setCredential({ kind: "idle" });
					return;
				}
				let active = true;
				setCredential({ kind: "loading" });
				const refs = [...IMAGE_PROVIDERS[provider]?.credentialRefs ?? []];
				if (refs.length === 0) {
					setCredential({
						kind: "ready",
						credentials: {}
					});
					return;
				}
				api.credentials.describe({ refs }).then((response) => {
					if (!active) return;
					setCredential(response.result.ok ? {
						kind: "ready",
						credentials: response.result.value.credentials
					} : { kind: "error" });
				}, () => {
					if (active) setCredential({ kind: "error" });
				});
				return () => {
					active = false;
				};
			}, [
				api.credentials,
				draft.provider,
				open
			]);
			const clearMessages = () => {
				setSaved(false);
				setFailure(void 0);
			};
			const discard = () => {
				const next = draftOfImageGeneration(snapshot.status === "ready" ? snapshot.value : void 0);
				setBaseline(next);
				setDraft(next);
				setRevision(snapshot.revision);
				setKeyDraft("");
				setFailure(void 0);
				setSaved(false);
				setExternalChange(false);
			};
			const save = () => {
				if (!dirty || !providerValid || keyRequired || credentialPending || saving || !writable || externalChange) return;
				setSaving(true);
				setFailure(void 0);
				setSaved(false);
				(async () => {
					if (keyDirty && facts.primaryRef !== void 0) {
						if (!(await api.credentials.set({
							ref: facts.primaryRef,
							value: keyDraft.trim()
						})).result.ok) {
							setFailure(t("imageSaveFailed"));
							return;
						}
						setCredential({
							kind: "ready",
							credentials: { [facts.primaryRef]: {
								configured: true,
								writable: true,
								source: "file"
							} }
						});
						setKeyDraft("");
					}
					const ops = imageSettingsOps(baseline, draft);
					if (ops.length > 0) {
						const response = await api.settings.mutate({
							ns: IMAGE_GENERATION_SETTINGS_NAMESPACE,
							ops: ops.map((op) => ({
								...op,
								path: [...op.path]
							})),
							...revision === void 0 ? {} : { expectedRevision: revision }
						});
						if (!response.result.ok) {
							if (response.result.error.code === "settings-conflict") {
								setExternalChange(true);
								setFailure(t("conflict"));
							} else setFailure(t("imageSaveFailed"));
							return;
						}
						const next = draftOfImageGeneration(response.result.value.value);
						setBaseline(next);
						setDraft(next);
						setRevision(response.result.value.revision);
						setExternalChange(false);
					}
					setSaved(true);
				})().catch(() => {
					setFailure(t("imageSaveFailed"));
				}).finally(() => {
					setSaving(false);
				});
			};
			if (snapshot.status === "unavailable") return null;
			const spec = draft.provider !== void 0 ? IMAGE_PROVIDERS[draft.provider] : void 0;
			const modelOptions = draft.provider === "custom" ? [] : spec?.models ?? [];
			const credentialLabel = credential.kind === "loading" ? t("keyLoading") : facts.configured ? t("keyConfigured") : t("keyMissing");
			const keyHint = credential.kind === "error" ? t("keyLoadFailed") : credentialPending ? t("keyLoading") : facts.configured && !facts.writable ? t("keyReadOnly") : keyRequired ? t("keyRequired") : t("keyPlaceholder");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dsh-vision-settings-card",
				"data-open": open ? "true" : "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-vision-settings-header",
					"aria-expanded": open,
					"aria-label": `${t("expand")}: ${t("imageGenerationTitle")}`,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-vision-settings-head-text",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-vision-settings-name",
								children: t("imageGenerationTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-vision-settings-description",
								children: t("imageGenerationDescription")
							})]
						}),
						dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-vision-settings-pending",
							children: t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: "dsh-vision-settings-chevron" })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-vision-settings-body",
					children: [
						snapshot.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-vision-settings-status",
							children: t("loading")
						}) : null,
						snapshot.status === "ready" && !snapshot.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-vision-settings-status",
							children: t("readOnly")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-vision-settings-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: "dsh-vision-settings-label",
								htmlFor: "dsh-image-provider",
								children: t("imageProvider")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								id: "dsh-image-provider",
								className: "dsh-vision-settings-select",
								value: draft.provider ?? "",
								disabled,
								onChange: (event) => {
									const provider = isImageProviderName(event.target.value) ? event.target.value : void 0;
									setDraft((current) => imageDraftForProvider(current, provider));
									setKeyDraft("");
									clearMessages();
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("automatic")
								}), Object.entries(IMAGE_PROVIDERS).map(([id, p]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: id,
									children: p.displayName
								}, id))]
							})]
						}),
						draft.provider === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "dsh-vision-settings-label",
										htmlFor: "dsh-image-model",
										children: t("imageModel")
									}),
									modelOptions.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										id: "dsh-image-model",
										className: "dsh-vision-settings-select",
										value: draft.model,
										disabled,
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												model: event.target.value
											}));
											clearMessages();
										},
										children: modelOptions.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: m,
											children: m
										}, m))
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: "dsh-image-model",
										className: "dsh-vision-settings-input",
										value: draft.model,
										disabled,
										"aria-invalid": !providerValid,
										placeholder: t("defaultModel"),
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												model: event.target.value
											}));
											clearMessages();
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: providerValid ? "dsh-vision-settings-hint" : "dsh-vision-settings-error",
										children: t(providerValid ? "modelHint" : "invalidProvider")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									className: "dsh-vision-settings-label",
									htmlFor: "dsh-image-api-key",
									children: t("apiKey")
								}), spec && spec.credentialRefs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-settings-badge",
									"data-tone": facts.configured ? "success" : "muted",
									children: credentialLabel
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-settings-badge",
									"data-tone": "muted",
									children: t("customKey")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "dsh-image-api-key",
									className: "dsh-vision-settings-input",
									type: "password",
									autoComplete: "off",
									value: keyDraft,
									placeholder: spec && spec.credentialRefs.length > 0 ? t("keyPlaceholder") : t("customKeyPlaceholder"),
									disabled: disabled || !facts.writable,
									"aria-invalid": keyRequired,
									onChange: (event) => {
										setKeyDraft(event.target.value);
										clearMessages();
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: keyRequired ? "dsh-vision-settings-error" : "dsh-vision-settings-hint",
									children: keyHint
								})]
							}),
							draft.provider === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "dsh-vision-settings-label",
										htmlFor: "dsh-image-credential-name",
										children: t("credentialName")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: "dsh-image-credential-name",
										className: "dsh-vision-settings-input",
										value: draft.credentialName,
										placeholder: t("credentialNamePlaceholder"),
										disabled,
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												credentialName: event.target.value
											}));
											clearMessages();
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dsh-vision-settings-hint",
										children: t("credentialNameHint")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "dsh-vision-settings-label",
										htmlFor: "dsh-image-base-url",
										children: t("imageBaseURL")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: "dsh-image-base-url",
										className: "dsh-vision-settings-input",
										value: draft.baseURL,
										placeholder: t("imageBaseURLPlaceholder"),
										disabled,
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												baseURL: event.target.value
											}));
											clearMessages();
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dsh-vision-settings-hint",
										children: t("imageBaseURLHint")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "dsh-image-max-images",
									className: "dsh-vision-settings-number",
									type: "number",
									inputMode: "numeric",
									min: 1,
									max: 8,
									step: 1,
									value: String(draft.maxImages),
									disabled,
									"aria-invalid": !maxImagesValid,
									onChange: (event) => {
										setDraft((current) => ({
											...current,
											maxImages: Number(event.target.value)
										}));
										clearMessages();
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: maxImagesValid ? "dsh-vision-settings-hint" : "dsh-vision-settings-error",
									children: t(maxImagesValid ? "imageMaxImagesHint" : "invalidImageMaxImages")
								})]
							})
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-vision-toggle-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-toggle-label",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-toggle-title",
									children: t("enableImageGeneration")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-toggle-subtitle",
									children: draft.enabled ? t("keyConfigured") : t("keyMissing")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "dsh-vision-toggle",
								checked: draft.enabled,
								disabled,
								onChange: (event) => {
									setDraft((current) => ({
										...current,
										enabled: event.target.checked
									}));
									clearMessages();
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-vision-settings-footer",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-vision-settings-footer-status",
									"data-tone": failure === void 0 ? "success" : "error",
									role: "status",
									children: externalChange ? t("conflict") : failure ?? (saved ? t("imageSaved") : "")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-vision-settings-action dsh-vision-settings-discard",
									disabled: !dirty || saving,
									onClick: discard,
									children: t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-vision-settings-action dsh-vision-settings-save",
									disabled: !dirty || !providerValid || keyRequired || credentialPending || saving || !writable || externalChange,
									onClick: save,
									children: t(saving ? "saving" : "save")
								})
							]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/VideoGenerationSettingsCard.tsx
		function credentialFacts(provider, state, draft) {
			if (provider === void 0) return {
				configured: false,
				writable: false,
				primaryRef: void 0
			};
			const refs = VIDEO_PROVIDERS[provider]?.credentialRefs ?? [];
			const primaryRef = refs[0] ?? (provider === "custom" ? draft?.credentialName : void 0);
			if (primaryRef === void 0 || state.kind !== "ready") return {
				configured: false,
				writable: true,
				primaryRef
			};
			return {
				configured: refs.some((ref) => state.credentials[ref]?.configured === true),
				writable: state.credentials[primaryRef]?.writable !== false,
				primaryRef
			};
		}
		function VideoGenerationSettingsCard(props) {
			const { scope, api, t } = props;
			if (scope === void 0 || api === void 0 || t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
				scope,
				api,
				t
			});
		}
		function Loaded({ scope, api, t }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			const initial = draftOfVideoGeneration(snapshot.value);
			const [open, setOpen] = (0, react.useState)(false);
			const [baseline, setBaseline] = (0, react.useState)(initial);
			const [draft, setDraft] = (0, react.useState)(initial);
			const [revision, setRevision] = (0, react.useState)(snapshot.revision);
			const [credential, setCredential] = (0, react.useState)({ kind: "idle" });
			const [keyDraft, setKeyDraft] = (0, react.useState)("");
			const [saving, setSaving] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [saved, setSaved] = (0, react.useState)(false);
			const [externalChange, setExternalChange] = (0, react.useState)(false);
			const settingsDirty = !sameVideoDraft(baseline, draft);
			const keyDirty = keyDraft.trim() !== "";
			const dirty = settingsDirty || keyDirty;
			const providerValid = validVideoDraft(draft);
			const writable = snapshot.status === "ready" && snapshot.writable;
			const facts = credentialFacts(draft.provider, credential, draft);
			const credentialPending = draft.provider !== void 0 && (credential.kind === "idle" || credential.kind === "loading");
			const keyRequired = draft.provider !== void 0 && !credentialPending && !facts.configured && !keyDirty;
			const disabled = !writable || saving;
			(0, react.useEffect)(() => {
				if (snapshot.status !== "ready" || snapshot.revision === revision) return;
				if (settingsDirty) {
					setExternalChange(true);
					return;
				}
				const next = draftOfVideoGeneration(snapshot.value);
				setBaseline(next);
				setDraft(next);
				setRevision(snapshot.revision);
				setFailure(void 0);
				setExternalChange(false);
			}, [
				revision,
				settingsDirty,
				snapshot.revision,
				snapshot.status,
				snapshot.value
			]);
			(0, react.useEffect)(() => {
				const provider = draft.provider;
				if (!open || provider === void 0) {
					setCredential({ kind: "idle" });
					return;
				}
				let active = true;
				setCredential({ kind: "loading" });
				const refs = [...VIDEO_PROVIDERS[provider]?.credentialRefs ?? []];
				if (refs.length === 0) {
					setCredential({
						kind: "ready",
						credentials: {}
					});
					return;
				}
				api.credentials.describe({ refs }).then((response) => {
					if (!active) return;
					setCredential(response.result.ok ? {
						kind: "ready",
						credentials: response.result.value.credentials
					} : { kind: "error" });
				}, () => {
					if (active) setCredential({ kind: "error" });
				});
				return () => {
					active = false;
				};
			}, [
				api.credentials,
				draft.provider,
				open
			]);
			const clearMessages = () => {
				setSaved(false);
				setFailure(void 0);
			};
			const discard = () => {
				const next = draftOfVideoGeneration(snapshot.status === "ready" ? snapshot.value : void 0);
				setBaseline(next);
				setDraft(next);
				setRevision(snapshot.revision);
				setKeyDraft("");
				setFailure(void 0);
				setSaved(false);
				setExternalChange(false);
			};
			const save = () => {
				if (!dirty || !providerValid || keyRequired || credentialPending || saving || !writable || externalChange) return;
				setSaving(true);
				setFailure(void 0);
				setSaved(false);
				(async () => {
					if (keyDirty && facts.primaryRef !== void 0) {
						if (!(await api.credentials.set({
							ref: facts.primaryRef,
							value: keyDraft.trim()
						})).result.ok) {
							setFailure(t("videoSaveFailed"));
							return;
						}
						setCredential({
							kind: "ready",
							credentials: { [facts.primaryRef]: {
								configured: true,
								writable: true,
								source: "file"
							} }
						});
						setKeyDraft("");
					}
					const ops = videoSettingsOps(baseline, draft);
					if (ops.length > 0) {
						const response = await api.settings.mutate({
							ns: VIDEO_GENERATION_SETTINGS_NAMESPACE,
							ops: ops.map((op) => ({
								...op,
								path: [...op.path]
							})),
							...revision === void 0 ? {} : { expectedRevision: revision }
						});
						if (!response.result.ok) {
							if (response.result.error.code === "settings-conflict") {
								setExternalChange(true);
								setFailure(t("conflict"));
							} else setFailure(t("videoSaveFailed"));
							return;
						}
						const next = draftOfVideoGeneration(response.result.value.value);
						setBaseline(next);
						setDraft(next);
						setRevision(response.result.value.revision);
						setExternalChange(false);
					}
					setSaved(true);
				})().catch(() => {
					setFailure(t("videoSaveFailed"));
				}).finally(() => {
					setSaving(false);
				});
			};
			if (snapshot.status === "unavailable") return null;
			const spec = draft.provider !== void 0 ? VIDEO_PROVIDERS[draft.provider] : void 0;
			const modelOptions = draft.provider === "custom" ? [] : spec?.models ?? [];
			const credentialLabel = credential.kind === "loading" ? t("keyLoading") : facts.configured ? t("keyConfigured") : t("keyMissing");
			const keyHint = credential.kind === "error" ? t("keyLoadFailed") : credentialPending ? t("keyLoading") : facts.configured && !facts.writable ? t("keyReadOnly") : keyRequired ? t("keyRequired") : t("keyPlaceholder");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dsh-vision-settings-card",
				"data-open": open ? "true" : "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-vision-settings-header",
					"aria-expanded": open,
					"aria-label": `${t("expand")}: ${t("videoGenerationTitle")}`,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-vision-settings-head-text",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-vision-settings-name",
								children: t("videoGenerationTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-vision-settings-description",
								children: t("videoGenerationDescription")
							})]
						}),
						dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-vision-settings-pending",
							children: t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: "dsh-vision-settings-chevron" })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-vision-settings-body",
					children: [
						snapshot.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-vision-settings-status",
							children: t("loading")
						}) : null,
						snapshot.status === "ready" && !snapshot.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-vision-settings-status",
							children: t("readOnly")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-vision-settings-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: "dsh-vision-settings-label",
								htmlFor: "dsh-video-provider",
								children: t("videoProvider")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								id: "dsh-video-provider",
								className: "dsh-vision-settings-select",
								value: draft.provider ?? "",
								disabled,
								onChange: (event) => {
									const provider = isVideoProviderName(event.target.value) ? event.target.value : void 0;
									setDraft((current) => videoDraftForProvider(current, provider));
									setKeyDraft("");
									clearMessages();
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("automatic")
								}), Object.entries(VIDEO_PROVIDERS).map(([id, p]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: id,
									children: p.displayName
								}, id))]
							})]
						}),
						draft.provider === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "dsh-vision-settings-label",
										htmlFor: "dsh-video-model",
										children: t("videoModel")
									}),
									modelOptions.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										id: "dsh-video-model",
										className: "dsh-vision-settings-select",
										value: draft.model,
										disabled,
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												model: event.target.value
											}));
											clearMessages();
										},
										children: modelOptions.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: m,
											children: m
										}, m))
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: "dsh-video-model",
										className: "dsh-vision-settings-input",
										value: draft.model,
										disabled,
										"aria-invalid": !providerValid,
										placeholder: t("defaultModel"),
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												model: event.target.value
											}));
											clearMessages();
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: providerValid ? "dsh-vision-settings-hint" : "dsh-vision-settings-error",
										children: t(providerValid ? "modelHint" : "invalidProvider")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									className: "dsh-vision-settings-label",
									htmlFor: "dsh-video-api-key",
									children: t("apiKey")
								}), spec && spec.credentialRefs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-settings-badge",
									"data-tone": facts.configured ? "success" : "muted",
									children: credentialLabel
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-settings-badge",
									"data-tone": "muted",
									children: t("customKey")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "dsh-video-api-key",
									className: "dsh-vision-settings-input",
									type: "password",
									autoComplete: "off",
									value: keyDraft,
									placeholder: spec && spec.credentialRefs.length > 0 ? t("keyPlaceholder") : t("customKeyPlaceholder"),
									disabled: disabled || !facts.writable,
									"aria-invalid": keyRequired,
									onChange: (event) => {
										setKeyDraft(event.target.value);
										clearMessages();
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: keyRequired ? "dsh-vision-settings-error" : "dsh-vision-settings-hint",
									children: keyHint
								})]
							}),
							draft.provider === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "dsh-vision-settings-label",
										htmlFor: "dsh-video-credential-name",
										children: t("credentialName")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: "dsh-video-credential-name",
										className: "dsh-vision-settings-input",
										value: draft.credentialName,
										placeholder: t("credentialNamePlaceholder"),
										disabled,
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												credentialName: event.target.value
											}));
											clearMessages();
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dsh-vision-settings-hint",
										children: t("credentialNameHint")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-settings-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "dsh-vision-settings-label",
										htmlFor: "dsh-video-base-url",
										children: t("imageBaseURL")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: "dsh-video-base-url",
										className: "dsh-vision-settings-input",
										value: draft.baseURL,
										placeholder: t("imageBaseURLPlaceholder"),
										disabled,
										onChange: (event) => {
											setDraft((current) => ({
												...current,
												baseURL: event.target.value
											}));
											clearMessages();
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dsh-vision-settings-hint",
										children: t("imageBaseURLHint")
									})
								]
							})
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-vision-toggle-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-vision-toggle-label",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-toggle-title",
									children: t("enableVideoGeneration")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-vision-toggle-subtitle",
									children: draft.enabled ? t("keyConfigured") : t("keyMissing")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "dsh-vision-toggle",
								checked: draft.enabled,
								disabled,
								onChange: (event) => {
									setDraft((current) => ({
										...current,
										enabled: event.target.checked
									}));
									clearMessages();
								}
							})]
						}),
						spec !== void 0 && spec.async ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-vision-async-note",
							children: t("videoAsyncNote")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-vision-settings-footer",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-vision-settings-footer-status",
									"data-tone": failure === void 0 ? "success" : "error",
									role: "status",
									children: externalChange ? t("conflict") : failure ?? (saved ? t("videoSaved") : "")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-vision-settings-action dsh-vision-settings-discard",
									disabled: !dirty || saving,
									onClick: discard,
									children: t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-vision-settings-action dsh-vision-settings-save",
									disabled: !dirty || !providerValid || keyRequired || credentialPending || saving || !writable || externalChange,
									onClick: save,
									children: t(saving ? "saving" : "save")
								})
							]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const zh = {
			title: "视觉识别",
			description: "让文本模型理解图片，同时保留原生视觉直通。",
			expand: "展开设置",
			collapse: "收起设置",
			unsaved: "未保存",
			loading: "正在读取设置…",
			readOnly: "本部署的设置为只读。",
			provider: "视觉平台",
			automatic: "自动选择",
			automaticHint: "当前模型支持图片时直接使用原生视觉；否则尝试 Harness 已配置模型、see 配置和本地 OCR。",
			configuredHint: "这里选择的平台是文本模型的主视觉路由；其他可用路由只在失败后尝试。",
			apiKey: "API Key",
			keyConfigured: "已配置",
			keyMissing: "未配置",
			keyLoading: "检查中",
			keyPlaceholder: "留空保留当前 Key",
			keyRequired: "请填写 API Key，或切换为自动选择。",
			keyReadOnly: "当前 Key 由只读环境变量提供。",
			keyLoadFailed: "暂时无法读取 API Key 状态，填写新 Key 后仍可保存。",
			customKey: "自定义 Key",
			customKeyPlaceholder: "输入自定义 API Key",
			credentialName: "凭据名称",
			credentialNamePlaceholder: "如 VISION_API_KEY",
			credentialNameHint: "保存 API Key 时使用的凭据引用名。",
			model: "模型 ID",
			modelHint: "默认值与 see-skill 保持一致，也可以填写该平台支持的其他视觉模型。",
			baseURL: "API 地址",
			baseURLHint: "使用平台默认的 OpenAI 兼容地址；代理或私有网关可以在这里覆盖。",
			invalidProvider: "模型 ID 和有效的 HTTP(S) API 地址不能为空。",
			maxImages: "单次图片上限",
			maxImagesHint: "一次消息最多联合分析多少张图片，可填写 1–32。",
			invalidMaxImages: "请输入 1–32 之间的整数。",
			failover: "原生视觉始终优先直通。文本模型使用上面配置的平台，失败后才尝试其他视觉路由与本地 OCR。",
			discard: "放弃修改",
			save: "保存",
			saving: "保存中…",
			saved: "视觉识别设置已保存。",
			saveFailed: "设置保存失败，已保留当前输入。",
			keySaveFailed: "API Key 保存失败，已保留当前输入。",
			conflict: "设置已在其他位置更新，请放弃修改后重新配置。",
			customProviders: "自定义模型",
			customProvidersDescription: "添加和管理自定义视觉识别平台。",
			addProvider: "添加自定义平台",
			providerName: "平台标识",
			providerNameHint: "唯一名称，用于程序化引用。",
			displayName: "显示名称",
			displayNameHint: "在设置面板中显示的名称。",
			defaultModel: "默认模型",
			defaultModelHint: "该平台使用的默认视觉模型。",
			credentialRefs: "API Key 环境变量",
			credentialRefsHint: "用逗号分隔的环境变量名，例如 ZENMUX_API_KEY。",
			deleteProvider: "删除",
			testConnectivity: "测试连接",
			testing: "测试中…",
			testOk: "连接成功",
			testFailed: "连接失败",
			noCustomProviders: "尚未添加自定义平台。",
			editProvider: "编辑",
			confirmDelete: "确认删除此平台？",
			imageGenerationTitle: "图像生成",
			imageGenerationDescription: "配置文本到图像的 AI 生成服务。",
			imageProvider: "图像生成平台",
			imageModel: "模型",
			imageMaxImages: "单次图片上限",
			imageMaxImagesHint: "一次请求生成的最大图片数量，可填写 1–8。",
			invalidImageMaxImages: "请输入 1–8 之间的整数。",
			enableImageGeneration: "启用图像生成",
			imageSaved: "图像生成设置已保存。",
			imageSaveFailed: "设置保存失败，已保留当前输入。",
			imageBaseURL: "API 地址",
			imageBaseURLHint: "自定义提供商的 API 端点地址。",
			imageBaseURLPlaceholder: "https://api.example.com/v1",
			videoGenerationTitle: "视频生成",
			videoGenerationDescription: "配置文本到视频的 AI 生成服务。",
			videoProvider: "视频生成平台",
			videoModel: "模型",
			enableVideoGeneration: "启用视频生成",
			videoAsyncNote: "视频生成是异步操作，提交后将轮询任务状态，最长等待 5 分钟。",
			videoSaved: "视频生成设置已保存。",
			videoSaveFailed: "设置保存失败，已保留当前输入。"
		};
		const en = {
			title: "Vision Recognition",
			description: "Give text models image understanding while preserving native vision passthrough.",
			expand: "Show settings",
			collapse: "Hide settings",
			unsaved: "Unsaved",
			loading: "Reading settings…",
			readOnly: "This deployment stores settings read-only.",
			provider: "Vision provider",
			automatic: "Automatic",
			automaticHint: "Native vision is used directly when the current model supports images; otherwise Harness models, see configuration, and local OCR are tried.",
			configuredHint: "The selected provider is the primary vision route for text models. Other available routes are failover only.",
			apiKey: "API key",
			keyConfigured: "Configured",
			keyMissing: "Missing",
			keyLoading: "Checking",
			keyPlaceholder: "Leave blank to keep the current key",
			keyRequired: "Enter an API key or switch to Automatic.",
			keyReadOnly: "The current key comes from a read-only environment variable.",
			keyLoadFailed: "The key status is temporarily unavailable. You can still enter and save a new key.",
			customKey: "Custom Key",
			customKeyPlaceholder: "Enter custom API key",
			credentialName: "Credential Name",
			credentialNamePlaceholder: "e.g. VISION_API_KEY",
			credentialNameHint: "The credential reference name used to save the API key.",
			model: "Model ID",
			modelHint: "The default matches see-skill. You can enter another vision model supported by this provider.",
			baseURL: "API endpoint",
			baseURLHint: "Uses the provider's default OpenAI-compatible endpoint. Override it for a proxy or private gateway.",
			invalidProvider: "Model ID and a valid HTTP(S) API endpoint are required.",
			maxImages: "Images per request",
			maxImagesHint: "Maximum number of images analyzed together in one message, from 1 to 32.",
			invalidMaxImages: "Enter an integer from 1 to 32.",
			failover: "Native vision always passes through directly. Text models use the provider above, then other vision routes and local OCR only after failure.",
			discard: "Discard",
			save: "Save",
			saving: "Saving…",
			saved: "Vision Recognition settings saved.",
			saveFailed: "Settings could not be saved. Your edits were preserved.",
			keySaveFailed: "The API key could not be saved. Your input was preserved.",
			conflict: "Settings changed elsewhere. Discard this draft and configure it again.",
			customProviders: "Custom Models",
			customProvidersDescription: "Add and manage custom vision recognition providers.",
			addProvider: "Add Provider",
			providerName: "Provider Name",
			providerNameHint: "Unique identifier used for programmatic reference.",
			displayName: "Display Name",
			displayNameHint: "Name shown in the settings panel.",
			defaultModel: "Default Model",
			defaultModelHint: "Default vision model for this provider.",
			credentialRefs: "API Key Environment Vars",
			credentialRefsHint: "Comma-separated env var names, e.g. ZENMUX_API_KEY.",
			deleteProvider: "Delete",
			testConnectivity: "Test",
			testing: "Testing…",
			testOk: "Connected",
			testFailed: "Failed",
			noCustomProviders: "No custom providers configured yet.",
			editProvider: "Edit",
			confirmDelete: "Confirm deleting this provider?",
			imageGenerationTitle: "Image Generation",
			imageGenerationDescription: "Configure text-to-image AI generation services.",
			imageProvider: "Image provider",
			imageModel: "Model",
			imageMaxImages: "Images per request",
			imageMaxImagesHint: "Maximum number of images generated per request, from 1 to 8.",
			invalidImageMaxImages: "Enter an integer from 1 to 8.",
			enableImageGeneration: "Enable image generation",
			imageSaved: "Image generation settings saved.",
			imageSaveFailed: "Settings could not be saved. Your edits were preserved.",
			imageBaseURL: "API endpoint",
			imageBaseURLHint: "The API endpoint URL for custom providers.",
			imageBaseURLPlaceholder: "https://api.example.com/v1",
			videoGenerationTitle: "Video Generation",
			videoGenerationDescription: "Configure text-to-video AI generation services.",
			videoProvider: "Video provider",
			videoModel: "Model",
			enableVideoGeneration: "Enable video generation",
			videoAsyncNote: "Video generation is async. After submission the task is polled until completion (max 5 min).",
			videoSaved: "Video generation settings saved.",
			videoSaveFailed: "Settings could not be saved. Your edits were preserved."
		};
		//#endregion
		//#region src/client/styles.ts
		const SETTINGS_STYLE_ID = "@narger18/dsh-vision/settings";
		const SETTINGS_CSS = String.raw`
.dsh-vision-settings-card {
  list-style: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3);
  transition: border-color .16s, background .16s;
}

.dsh-vision-settings-card:hover,
.dsh-vision-settings-card[data-open="true"] {
  border-color: var(--dsw-alias-label-dimmed);
}

.dsh-vision-settings-card[data-open="true"] {
  background: var(--dsw-alias-bg-layer-2);
}

.dsh-vision-settings-header {
  width: 100%;
  appearance: none;
  border: 0;
  border-radius: 12px;
  padding: 14px 16px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dsh-vision-settings-header:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}

.dsh-vision-settings-head-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dsh-vision-settings-name {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.dsh-vision-settings-description {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.dsh-vision-settings-pending,
.dsh-vision-settings-badge {
  flex: none;
  border-radius: 999px;
  padding: 1px 8px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
  white-space: nowrap;
}

.dsh-vision-settings-badge[data-tone="success"] {
  color: var(--dsw-alias-state-success-primary);
}

.dsh-vision-settings-badge[data-tone="muted"] {
  color: var(--dsw-alias-label-tertiary);
}

.dsh-vision-settings-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  transition: transform .16s;
}

.dsh-vision-settings-card[data-open="true"] .dsh-vision-settings-chevron {
  transform: rotate(180deg);
}

.dsh-vision-settings-body {
  margin: 0 16px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding-bottom: 8px;
}

.dsh-vision-settings-status {
  margin: 12px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
}

.dsh-vision-settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
}

.dsh-vision-settings-field + .dsh-vision-settings-field {
  border-top: 1px solid var(--dsw-alias-border-l2);
}

.dsh-vision-settings-field-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dsh-vision-settings-label {
  flex: 1;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

.dsh-vision-settings-select {
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 0 34px 0 12px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.dsh-vision-settings-select:focus-visible {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
}

.dsh-vision-settings-select:disabled {
  color: var(--dsw-alias-label-tertiary);
  cursor: default;
}

.dsh-vision-settings-input {
  box-sizing: border-box;
  width: 100%;
}

.dsh-vision-settings-number {
  width: 160px;
}

.dsh-vision-settings-hint,
.dsh-vision-settings-error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.dsh-vision-settings-hint {
  color: var(--dsw-alias-label-tertiary);
}

.dsh-vision-settings-error {
  color: var(--dsw-alias-label-error);
}

.dsh-vision-settings-failover {
  margin: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.dsh-vision-settings-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding: 12px 0 4px;
}

.dsh-vision-settings-footer-status {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.dsh-vision-settings-footer-status[data-tone="success"] {
  color: var(--dsw-alias-state-success-primary);
}

.dsh-vision-settings-footer-status[data-tone="error"] {
  color: var(--dsw-alias-label-error);
}

.dsh-vision-settings-action {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 5px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  cursor: pointer;
}

.dsh-vision-settings-discard {
  border-color: var(--dsw-alias-border-l2);
  background: none;
  color: var(--dsw-alias-label-secondary);
}

.dsh-vision-settings-discard:hover:not(:disabled) {
  border-color: var(--dsw-alias-label-dimmed);
  color: var(--dsw-alias-label-primary);
}

.dsh-vision-settings-save {
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
}

.dsh-vision-settings-action:disabled {
  opacity: .4;
  cursor: default;
}

.dsh-vision-settings-action:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}

@media (max-width: 560px) {
  .dsh-vision-settings-footer {
    flex-wrap: wrap;
  }

  .dsh-vision-settings-footer-status {
    flex-basis: 100%;
  }
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */

.dsh-vision-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  margin-top: 12px;
}

.dsh-vision-tab {
  appearance: none;
  border: 0;
  background: none;
  padding: 8px 16px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .12s, border-color .12s;
}

.dsh-vision-tab:hover {
  color: var(--dsw-alias-label-primary);
}

.dsh-vision-tab:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
  border-radius: 4px 4px 0 0;
}

.dsh-vision-tab[data-active="true"] {
  color: var(--dsw-alias-label-primary);
  border-bottom-color: var(--dsw-alias-brand-primary);
}

.dsh-vision-tab-panel {
  display: none;
}

.dsh-vision-tab-panel[data-visible="true"] {
  display: block;
}

/* ── Custom Provider Cards ─────────────────────────────────────────────────── */

.dsh-vision-provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.dsh-vision-provider-card {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--dsw-alias-bg-layer-3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dsh-vision-provider-card[data-valid="false"] {
  border-color: var(--dsw-alias-label-error);
}

.dsh-vision-provider-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dsh-vision-provider-row .dsh-vision-settings-field {
  padding: 0;
  border: none;
}

.dsh-vision-provider-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dsh-vision-provider-actions .dsh-vision-settings-action {
  font-size: 12px;
  padding: 4px 10px;
}

.dsh-vision-test-btn {
  border-color: var(--dsw-alias-border-l2);
  background: none;
  color: var(--dsw-alias-label-secondary);
}

.dsh-vision-test-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary);
}

.dsh-vision-delete-btn {
  border-color: var(--dsw-alias-border-l2);
  background: none;
  color: var(--dsw-alias-label-error);
}

.dsh-vision-delete-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-label-error);
  background: var(--dsw-alias-state-error-fill);
}

.dsh-vision-add-btn {
  width: 100%;
  border: 1px dashed var(--dsw-alias-border-l2);
  background: none;
  color: var(--dsw-alias-label-secondary);
  padding: 10px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color .12s, color .12s;
}

.dsh-vision-add-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary);
}

.dsh-vision-no-providers {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}

/* ── Toggle Switch ─────────────────────────────────────────────────────────── */

.dsh-vision-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
}

.dsh-vision-toggle-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-vision-toggle-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.dsh-vision-toggle-subtitle {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-vision-toggle {
  appearance: none;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2);
  position: relative;
  cursor: pointer;
  transition: background .16s;
  flex-shrink: 0;
}

.dsh-vision-toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-3);
  transition: transform .16s;
  box-shadow: 0 1px 3px rgba(0,0,0,.18);
}

.dsh-vision-toggle:checked {
  background: var(--dsw-alias-brand-primary);
}

.dsh-vision-toggle:checked::after {
  transform: translateX(18px);
}

.dsh-vision-toggle:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

/* ── Async Note ────────────────────────────────────────────────────────────── */

.dsh-vision-async-note {
  margin-top: 8px;
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 560px) {
  .dsh-vision-provider-row {
    grid-template-columns: 1fr;
  }
}
`;
		//#endregion
		//#region src/client/index.tsx
		const LOCALE_NAMESPACE = "settings.dshVision";
		const inject = [
			"slots",
			"locale",
			"connection",
			"settingsScope"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, {
				zh,
				en
			}), "dsh-vision: settings dictionaries");
			ctx.effect(() => {
				if (document.querySelector(`style[data-plugin-css="@narger18/dsh-vision/settings"]`) !== null) return () => void 0;
				const tag = document.createElement("style");
				tag.dataset.plugin = "@narger18/dsh-vision";
				tag.dataset.pluginCss = SETTINGS_STYLE_ID;
				tag.textContent = SETTINGS_CSS;
				document.head.append(tag);
				return () => {
					tag.remove();
				};
			}, "dsh-vision: settings styles");
			const api = ctx.get("connection").api;
			const visionScope = ctx.settingsScope.bind({
				namespace: VISION_SETTINGS_NAMESPACE,
				decode: decodeVisionSettings
			});
			const imageScope = ctx.settingsScope.bind({
				namespace: IMAGE_GENERATION_SETTINGS_NAMESPACE,
				decode: decodeImageGenerationSettings
			});
			const videoScope = ctx.settingsScope.bind({
				namespace: VIDEO_GENERATION_SETTINGS_NAMESPACE,
				decode: decodeVideoGenerationSettings
			});
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: VISION_SETTINGS_NAMESPACE,
				id: "dsh-vision",
				order: 30,
				locale: LOCALE_NAMESPACE,
				inject: () => ({
					scope: visionScope,
					api
				})
			}, VisionSettingsCard));
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: IMAGE_GENERATION_SETTINGS_NAMESPACE,
				id: "dsh-vision-image-gen",
				order: 31,
				locale: LOCALE_NAMESPACE,
				inject: () => ({
					scope: imageScope,
					api
				})
			}, ImageGenerationSettingsCard));
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: VIDEO_GENERATION_SETTINGS_NAMESPACE,
				id: "dsh-vision-video-gen",
				order: 32,
				locale: LOCALE_NAMESPACE,
				inject: () => ({
					scope: videoScope,
					api
				})
			}, VideoGenerationSettingsCard));
		}
		//#endregion
		exports.ImageGenerationSettingsCard = ImageGenerationSettingsCard;
		exports.VideoGenerationSettingsCard = VideoGenerationSettingsCard;
		exports.VisionSettingsCard = VisionSettingsCard;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map