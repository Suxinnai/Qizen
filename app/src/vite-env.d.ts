/// <reference types="vite/client" />

interface QizenDatabaseStatus {
  schemaVersion: number;
  importedAt: string | null;
  counts: {
    goals: number;
    libraryItems: number;
    notes: number;
    practiceSets: number;
    knowledgeNodes: number;
    studyEvents: number;
    studyConversations: number;
    studyMessages: number;
  };
}

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
  qizenDatabase?: {
    status: () => Promise<QizenDatabaseStatus>;
    importBundle: (bundle: unknown) => Promise<QizenDatabaseStatus>;
  };
}
