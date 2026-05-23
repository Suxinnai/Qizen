/// <reference types="vite/client" />

interface Window {
  qizenWindow?: {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  qizenSecrets?: {
    set: (key: string, value: string) => Promise<boolean>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<boolean>;
  };
}
