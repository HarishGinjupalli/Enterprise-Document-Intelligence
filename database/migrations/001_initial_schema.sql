-- Enterprise Document Intelligence - Initial Schema
-- Phase 2: Production-oriented MySQL schema

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  department VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  filename VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  document_type VARCHAR(100) NULL,
  department VARCHAR(100) NULL,
  author VARCHAR(255) NULL,
  tags JSON NULL,
  status ENUM('UPLOADED', 'PROCESSING', 'INDEXED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
  error_message TEXT NULL,
  page_count INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_documents_owner (owner_id),
  INDEX idx_documents_status (status),
  INDEX idx_documents_department (department),
  INDEX idx_documents_type (document_type),
  INDEX idx_documents_created (created_at),
  FULLTEXT INDEX ft_documents_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOCUMENT PERMISSIONS (access control)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_permissions (
  id CHAR(36) PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  permission ENUM('READ', 'WRITE', 'ADMIN') NOT NULL DEFAULT 'READ',
  granted_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_doc_perm (document_id, user_id),
  INDEX idx_doc_perm_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOCUMENT VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id CHAR(36) PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  chunking_strategy VARCHAR(100) NOT NULL DEFAULT 'overlapping',
  chunk_size INT NULL,
  chunk_overlap INT NULL,
  total_chunks INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE KEY uk_doc_version (document_id, version_number),
  INDEX idx_doc_versions_active (document_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOCUMENT METADATA
-- ============================================================
CREATE TABLE IF NOT EXISTS document_metadata (
  id CHAR(36) PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE KEY uk_doc_meta (document_id, meta_key),
  INDEX idx_doc_meta_key (meta_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOCUMENT CHUNKS
-- ============================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id CHAR(36) PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  version_id CHAR(36) NOT NULL,
  chunk_index INT NOT NULL,
  page_number INT NULL,
  section VARCHAR(500) NULL,
  content TEXT NOT NULL,
  token_count INT NOT NULL DEFAULT 0,
  embedding_id VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES document_versions(id) ON DELETE CASCADE,
  INDEX idx_chunks_document (document_id),
  INDEX idx_chunks_version (version_id),
  INDEX idx_chunks_page (page_number),
  INDEX idx_chunks_index (document_id, chunk_index),
  FULLTEXT INDEX ft_chunks_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversations_user (user_id),
  INDEX idx_conversations_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  query_rewritten BOOLEAN NOT NULL DEFAULT FALSE,
  rewritten_query TEXT NULL,
  abstained BOOLEAN NOT NULL DEFAULT FALSE,
  grounded BOOLEAN NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id),
  INDEX idx_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS citations (
  id CHAR(36) PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  chunk_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  citation_index INT NOT NULL,
  page_number INT NULL,
  section VARCHAR(500) NULL,
  excerpt TEXT NULL,
  verified BOOLEAN NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_citations_message (message_id),
  INDEX idx_citations_chunk (chunk_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- QUERIES (retrieval audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS queries (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NULL,
  message_id CHAR(36) NULL,
  original_query TEXT NOT NULL,
  rewritten_query TEXT NULL,
  query_rewritten BOOLEAN NOT NULL DEFAULT FALSE,
  filters JSON NULL,
  retrieval_config JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  INDEX idx_queries_user (user_id),
  INDEX idx_queries_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RETRIEVAL RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS retrieval_results (
  id CHAR(36) PRIMARY KEY,
  query_id CHAR(36) NOT NULL,
  chunk_id CHAR(36) NOT NULL,
  source ENUM('bm25', 'vector', 'hybrid', 'reranked') NOT NULL,
  rank_position INT NOT NULL,
  score DECIMAL(10, 6) NOT NULL,
  rrf_score DECIMAL(10, 6) NULL,
  rerank_score DECIMAL(10, 6) NULL,
  selected_for_context BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE,
  INDEX idx_retrieval_query (query_id),
  INDEX idx_retrieval_chunk (chunk_id),
  INDEX idx_retrieval_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- EVALUATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluations (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  config JSON NOT NULL,
  status ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  results JSON NULL,
  created_by CHAR(36) NOT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_evaluations_status (status),
  INDEX idx_evaluations_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  rating ENUM('HELPFUL', 'NOT_HELPFUL') NOT NULL,
  feedback_text TEXT NULL,
  citation_feedback JSON NULL,
  hallucination_report BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_feedback_user_message (message_id, user_id),
  INDEX idx_feedback_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- USAGE METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_metrics (
  id CHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  query_id CHAR(36) NULL,
  endpoint VARCHAR(255) NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  embedding_tokens INT NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(12, 6) NOT NULL DEFAULT 0,
  bm25_latency_ms INT NULL,
  vector_latency_ms INT NULL,
  rerank_latency_ms INT NULL,
  llm_latency_ms INT NULL,
  total_latency_ms INT NOT NULL DEFAULT 0,
  abstained BOOLEAN NOT NULL DEFAULT FALSE,
  citation_valid BOOLEAN NULL,
  error_code VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE SET NULL,
  INDEX idx_metrics_user (user_id),
  INDEX idx_metrics_created (created_at),
  INDEX idx_metrics_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SYSTEM LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  level ENUM('DEBUG', 'INFO', 'WARN', 'ERROR') NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,
  context JSON NULL,
  request_id VARCHAR(36) NULL,
  user_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_level (level),
  INDEX idx_logs_created (created_at),
  INDEX idx_logs_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
