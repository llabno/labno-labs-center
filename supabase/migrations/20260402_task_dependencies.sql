-- =============================================================================
-- Migration: Task Dependency Tracking
-- Date: 2026-04-02
-- Purpose: Add dependency columns, blocking-check function, and auto-refresh
--          trigger so that is_blocked is always consistent with depends_on.
-- =============================================================================

-- 1. New columns on global_tasks
ALTER TABLE global_tasks
  ADD COLUMN IF NOT EXISTS depends_on     JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

COMMENT ON COLUMN global_tasks.depends_on IS
  'JSONB array of task title strings this task depends on. Empty = no deps.';
COMMENT ON COLUMN global_tasks.blocked_reason IS
  'Human-readable explanation of why the task is currently blocked.';

-- 2. Function: check if a single task is blocked
--    Returns TRUE when at least one dependency title is NOT in completed status.
CREATE OR REPLACE FUNCTION check_task_blocked(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_depends_on jsonb;
  v_dep        text;
  v_all_done   boolean := true;
BEGIN
  SELECT depends_on INTO v_depends_on
    FROM global_tasks
   WHERE id = p_task_id;

  -- No dependencies = not blocked
  IF v_depends_on IS NULL OR jsonb_array_length(v_depends_on) = 0 THEN
    RETURN false;
  END IF;

  -- Check each dependency title
  FOR v_dep IN SELECT jsonb_array_elements_text(v_depends_on)
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM global_tasks
       WHERE title = v_dep
         AND column_id = 'completed'
    ) THEN
      RETURN true;  -- at least one dep is incomplete
    END IF;
  END LOOP;

  RETURN false;  -- all deps completed
END;
$$;

-- 3. Function: refresh is_blocked + blocked_reason for every task that has deps
CREATE OR REPLACE FUNCTION refresh_blocked_status()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
  v_incomplete text[];
  v_dep        text;
BEGIN
  FOR r IN
    SELECT id, depends_on
      FROM global_tasks
     WHERE jsonb_array_length(depends_on) > 0
  LOOP
    v_incomplete := '{}';

    FOR v_dep IN SELECT jsonb_array_elements_text(r.depends_on)
    LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM global_tasks
         WHERE title = v_dep
           AND column_id = 'completed'
      ) THEN
        v_incomplete := v_incomplete || v_dep;
      END IF;
    END LOOP;

    IF array_length(v_incomplete, 1) IS NOT NULL AND array_length(v_incomplete, 1) > 0 THEN
      UPDATE global_tasks
         SET is_blocked     = true,
             blocked_reason = 'Waiting on: ' || array_to_string(v_incomplete, ', ')
       WHERE id = r.id;
    ELSE
      UPDATE global_tasks
         SET is_blocked     = false,
             blocked_reason = NULL
       WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- 4. Trigger function: fires when a task's column_id changes
CREATE OR REPLACE FUNCTION trg_refresh_blocked_on_column_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when column_id actually changed
  IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
    PERFORM refresh_blocked_status();
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Attach trigger (drop first to make migration re-runnable)
DROP TRIGGER IF EXISTS trg_task_column_change ON global_tasks;

CREATE TRIGGER trg_task_column_change
  AFTER UPDATE ON global_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trg_refresh_blocked_on_column_change();

-- 6. Run once to set initial blocked states
SELECT refresh_blocked_status();
