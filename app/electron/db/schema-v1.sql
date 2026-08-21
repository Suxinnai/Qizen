PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('schema_version', '1');

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0, 1))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  progress REAL NOT NULL,
  subject TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done INTEGER NOT NULL CHECK (done IN (0, 1)),
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS goal_tasks (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meta TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  done INTEGER NOT NULL CHECK (done IN (0, 1)),
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_key_points_json TEXT NOT NULL,
  confusing_points_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS library_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  type TEXT NOT NULL,
  course TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  size_label TEXT NOT NULL,
  status TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  added_at TEXT NOT NULL,
  parser_status TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  preview TEXT NOT NULL,
  summary TEXT NOT NULL,
  highlights_json TEXT NOT NULL,
  linked_node_ids_json TEXT NOT NULL,
  page_count INTEGER
);

CREATE TABLE IF NOT EXISTS practice_sets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  resource_id TEXT REFERENCES library_items(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_questions (
  id TEXT PRIMARY KEY,
  practice_set_id TEXT NOT NULL REFERENCES practice_sets(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  type TEXT NOT NULL,
  answer_hint TEXT NOT NULL,
  evidence_json TEXT,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  state TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  summary TEXT NOT NULL,
  related_json TEXT NOT NULL,
  study_hint TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_edges (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  target TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_minutes_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  question TEXT NOT NULL,
  resource_id TEXT REFERENCES library_items(id) ON DELETE SET NULL,
  node_id TEXT REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES goal_tasks(id) ON DELETE SET NULL,
  hit_resource_titles_json TEXT NOT NULL,
  generated_practice INTEGER NOT NULL CHECK (generated_practice IN (0, 1)),
  practice_score REAL,
  practice_question_count INTEGER,
  weak_question_prompts_json TEXT,
  progress_action TEXT,
  llm_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_conversation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_id TEXT,
  sidebar_mode TEXT NOT NULL DEFAULT 'menu',
  legacy_schema_version INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS study_conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_free_conversation INTEGER NOT NULL CHECK (is_free_conversation IN (0, 1)),
  context_json TEXT,
  selected_task_id TEXT NOT NULL,
  teaching_style TEXT NOT NULL,
  note_draft TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_messages (
  id TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES study_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_milestones_goal ON milestones(goal_id, position);
CREATE INDEX IF NOT EXISTS idx_goal_tasks_milestone ON goal_tasks(milestone_id, position);
CREATE INDEX IF NOT EXISTS idx_practice_sets_resource ON practice_sets(resource_id);
CREATE INDEX IF NOT EXISTS idx_practice_questions_set ON practice_questions(practice_set_id, position);
CREATE INDEX IF NOT EXISTS idx_study_events_recorded_at ON study_events(recorded_at);
CREATE INDEX IF NOT EXISTS idx_study_events_type ON study_events(type);
CREATE INDEX IF NOT EXISTS idx_study_conversations_updated_at ON study_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_messages_conversation ON study_messages(conversation_id, position);
