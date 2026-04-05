-- Unified Activity Log — Single Source of Truth
-- All activity across the system flows into this one table via triggers.
-- Work History reads ONLY from this table instead of joining 7+ tables.

-- Ensure activity_log table exists with proper structure
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type TEXT NOT NULL, -- 'Task', 'CRM', 'Clinical', 'Brief', 'Wishlist', 'Agent', 'Billing', 'System'
  title TEXT NOT NULL,
  description TEXT,
  action TEXT, -- 'created', 'completed', 'dispatched', 'failed', 'signed', etc.
  project TEXT,
  details JSONB, -- arbitrary metadata
  entity_type TEXT, -- 'global_task', 'soap_note', 'agent_run', etc.
  entity_id TEXT, -- ID of the source record for drill-down
  actor TEXT DEFAULT 'System', -- 'Lance', 'Romy', 'Agent', 'System', 'Cron'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for time-range queries (Work History default view)
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_source ON activity_log(source_type);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: global_tasks → activity_log
-- Fires on INSERT and on UPDATE when column_id changes (status change)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: log task creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (source_type, title, description, action, project, entity_type, entity_id, actor, details)
    VALUES (
      'Task',
      NEW.title,
      COALESCE(NEW.description, ''),
      'created',
      NULL,
      'global_task',
      NEW.id::TEXT,
      COALESCE(NEW.assigned_to, 'System'),
      jsonb_build_object('column_id', NEW.column_id, 'priority', NEW.priority, 'category', NEW.category, 'domain', NEW.domain)
    );
    RETURN NEW;
  END IF;

  -- On UPDATE: log status changes
  IF TG_OP = 'UPDATE' AND OLD.column_id IS DISTINCT FROM NEW.column_id THEN
    INSERT INTO activity_log (source_type, title, description, action, project, entity_type, entity_id, actor, details)
    VALUES (
      'Task',
      NEW.title,
      OLD.column_id || ' → ' || NEW.column_id,
      CASE NEW.column_id
        WHEN 'completed' THEN 'completed'
        WHEN 'done' THEN 'completed'
        WHEN 'blocked' THEN 'blocked'
        WHEN 'in_progress' THEN 'started'
        WHEN 'review' THEN 'in_review'
        ELSE 'status_changed'
      END,
      NULL,
      'global_task',
      NEW.id::TEXT,
      COALESCE(NEW.assigned_to, 'System'),
      jsonb_build_object('from', OLD.column_id, 'to', NEW.column_id, 'priority', NEW.priority)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_activity ON global_tasks;
CREATE TRIGGER trg_task_activity
  AFTER INSERT OR UPDATE ON global_tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: agent_runs → activity_log
-- Fires when agent run status changes to completed or failed
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_agent_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when agent run completes or fails
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'failed') THEN
    INSERT INTO activity_log (source_type, title, description, action, project, entity_type, entity_id, actor, details)
    VALUES (
      'Agent',
      'Agent: ' || NEW.task_title,
      CASE NEW.status
        WHEN 'completed' THEN LEFT(COALESCE(NEW.result, 'No output'), 300)
        WHEN 'failed' THEN 'Failed: ' || COALESCE(NEW.error, 'Unknown error')
        ELSE NEW.status
      END,
      CASE NEW.status WHEN 'completed' THEN 'agent_completed' ELSE 'agent_failed' END,
      NEW.project_name,
      'agent_run',
      NEW.id::TEXT,
      'Agent',
      jsonb_build_object('task_id', NEW.task_id, 'status', NEW.status)
    );
  END IF;

  -- Log when queued
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (source_type, title, description, action, project, entity_type, entity_id, actor, details)
    VALUES (
      'Agent',
      'Dispatched: ' || NEW.task_title,
      'Agent task queued for processing',
      'dispatched',
      NEW.project_name,
      'agent_run',
      NEW.id::TEXT,
      'System',
      jsonb_build_object('task_id', NEW.task_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_activity ON agent_runs;
CREATE TRIGGER trg_agent_activity
  AFTER INSERT OR UPDATE ON agent_runs
  FOR EACH ROW EXECUTE FUNCTION log_agent_activity();

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: soap_notes → activity_log
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_soap_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (source_type, title, description, action, entity_type, entity_id, actor, details)
  VALUES (
    'Clinical',
    'SOAP Note — ' || COALESCE(NEW.client_name, 'Unknown'),
    LEFT(COALESCE(NEW.assessment, NEW.subjective, ''), 200),
    'created',
    'soap_note',
    NEW.id::TEXT,
    'Lance',
    jsonb_build_object('cpt_codes', NEW.cpt_codes, 'billing_status', NEW.billing_status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_soap_activity ON soap_notes;
CREATE TRIGGER trg_soap_activity
  AFTER INSERT ON soap_notes
  FOR EACH ROW EXECUTE FUNCTION log_soap_activity();

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: session_briefs → activity_log
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_brief_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (source_type, title, description, action, entity_type, entity_id, actor, details)
  VALUES (
    'Brief',
    'Session Brief — ' || COALESCE(NEW.client_name, 'Unknown'),
    COALESCE('Win: ' || NEW.the_win, COALESCE(NEW.tier, '') || ' ' || COALESCE(NEW.track, '')),
    'created',
    'session_brief',
    NEW.id::TEXT,
    'Lance',
    jsonb_build_object('tier', NEW.tier, 'track', NEW.track)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brief_activity ON session_briefs;
CREATE TRIGGER trg_brief_activity
  AFTER INSERT ON session_briefs
  FOR EACH ROW EXECUTE FUNCTION log_brief_activity();

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: wishlist → activity_log
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_wishlist_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log new ideas
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (source_type, title, description, action, project, entity_type, entity_id, actor)
    VALUES (
      'Wishlist',
      LEFT(COALESCE(NEW.raw_text, 'Wishlist item'), 100),
      COALESCE(NEW.type, 'Idea') || ' — ' || COALESCE(NEW.status, 'New'),
      'created',
      NEW.project,
      'wishlist',
      NEW.id::TEXT,
      'Lance'
    );
  END IF;

  -- Log status changes (e.g., dispatched, done)
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (source_type, title, description, action, project, entity_type, entity_id, actor)
    VALUES (
      'Wishlist',
      LEFT(COALESCE(NEW.raw_text, 'Wishlist item'), 100),
      OLD.status || ' → ' || NEW.status,
      CASE NEW.status WHEN 'Done' THEN 'completed' WHEN 'Dispatched' THEN 'dispatched' ELSE 'status_changed' END,
      NEW.project,
      'wishlist',
      NEW.id::TEXT,
      'System'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wishlist_activity ON wishlist;
CREATE TRIGGER trg_wishlist_activity
  AFTER INSERT OR UPDATE ON wishlist
  FOR EACH ROW EXECUTE FUNCTION log_wishlist_activity();

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: communication_log → activity_log
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_comm_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (source_type, title, description, action, entity_type, entity_id, actor)
  VALUES (
    'CRM',
    COALESCE(NEW.subject, NEW.comm_type || ' — ' || COALESCE(NEW.lead_name, 'Unknown')),
    COALESCE(NEW.direction, 'outbound') || ' ' || COALESCE(NEW.comm_type, 'message') || CASE WHEN NEW.status IS NOT NULL THEN ' [' || NEW.status || ']' ELSE '' END,
    'created',
    'communication',
    NEW.id::TEXT,
    'Lance'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comm_activity ON communication_log;
CREATE TRIGGER trg_comm_activity
  AFTER INSERT ON communication_log
  FOR EACH ROW EXECUTE FUNCTION log_comm_activity();

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: client_documents → activity_log
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_document_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (source_type, title, description, action, entity_type, entity_id, actor)
    VALUES ('CRM', 'Document: ' || NEW.title, NEW.document_type || ' — draft', 'created', 'client_document', NEW.id::TEXT, 'Lance');
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (source_type, title, description, action, entity_type, entity_id, actor)
    VALUES ('CRM', 'Document: ' || NEW.title, OLD.status || ' → ' || NEW.status, NEW.status, 'client_document', NEW.id::TEXT, 'System');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_activity ON client_documents;
CREATE TRIGGER trg_document_activity
  AFTER INSERT OR UPDATE ON client_documents
  FOR EACH ROW EXECUTE FUNCTION log_document_activity();

-- ═══════════════════════════════════════════════════════════════════
-- Seed: backfill recent activity from existing data
-- This runs once to populate activity_log with historical data
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO activity_log (source_type, title, description, action, entity_type, entity_id, actor, created_at)
SELECT 'Task', title, COALESCE(description, ''),
  CASE column_id WHEN 'completed' THEN 'completed' WHEN 'done' THEN 'completed' ELSE 'created' END,
  'global_task', id::TEXT, COALESCE(assigned_to, 'System'), created_at
FROM global_tasks
WHERE created_at > now() - interval '7 days'
ON CONFLICT DO NOTHING;

INSERT INTO activity_log (source_type, title, description, action, entity_type, entity_id, actor, created_at)
SELECT 'Agent', 'Agent: ' || task_title, LEFT(COALESCE(result, status), 200),
  CASE status WHEN 'completed' THEN 'agent_completed' WHEN 'failed' THEN 'agent_failed' ELSE 'dispatched' END,
  'agent_run', id::TEXT, 'Agent', COALESCE(completed_at, created_at)
FROM agent_runs
WHERE created_at > now() - interval '7 days'
ON CONFLICT DO NOTHING;
