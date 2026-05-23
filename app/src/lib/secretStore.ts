import type { LlmProviderConfig } from "./storage";

const LLM_API_KEY = "llm-api-key";
const LOCAL_PREFIX = "qizen:secret:";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getElectronSecrets() {
  return typeof window !== "undefined" ? window.qizenSecrets : undefined;
}

export async function saveSecret(key: string, value: string) {
  const electronSecrets = getElectronSecrets();
  if (electronSecrets) {
    await electronSecrets.set(key, value);
    if (canUseLocalStorage()) window.localStorage.removeItem(`${LOCAL_PREFIX}${key}`);
    return;
  }
  if (canUseLocalStorage()) {
    window.localStorage.setItem(`${LOCAL_PREFIX}${key}`, value);
  }
}

export async function readSecret(key: string) {
  const electronSecrets = getElectronSecrets();
  if (electronSecrets) {
    const nativeValue = await electronSecrets.get(key);
    if (nativeValue?.trim()) return nativeValue;
    if (canUseLocalStorage()) {
      const localValue = window.localStorage.getItem(`${LOCAL_PREFIX}${key}`);
      if (localValue?.trim()) {
        await electronSecrets.set(key, localValue);
        window.localStorage.removeItem(`${LOCAL_PREFIX}${key}`);
        return localValue;
      }
    }
    return nativeValue;
  }
  if (canUseLocalStorage()) {
    return window.localStorage.getItem(`${LOCAL_PREFIX}${key}`);
  }
  return null;
}

export async function deleteSecret(key: string) {
  const electronSecrets = getElectronSecrets();
  if (electronSecrets) {
    await electronSecrets.delete(key);
  }
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(`${LOCAL_PREFIX}${key}`);
  }
}

export async function saveLlmApiKey(value: string) {
  if (value.trim()) {
    await saveSecret(LLM_API_KEY, value.trim());
    return;
  }
  await deleteSecret(LLM_API_KEY);
}

export async function readLlmApiKey() {
  return readSecret(LLM_API_KEY);
}

export async function hasLlmApiKey(config?: LlmProviderConfig) {
  if (config?.apiKey?.trim()) return true;
  const saved = await readLlmApiKey();
  return Boolean(saved?.trim());
}

export async function resolveLlmProviderConfig(config: LlmProviderConfig): Promise<LlmProviderConfig> {
  if (config.apiKey?.trim()) return config;
  const saved = await readLlmApiKey();
  return {
    ...config,
    apiKey: saved?.trim() ?? "",
  };
}
