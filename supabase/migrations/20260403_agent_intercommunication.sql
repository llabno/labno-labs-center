-- Agent Inter-Communication: Parent-child tasks + structured run output
-- Enables: wishlist decomposition, context sharing, chained execution

-- 1. Add parent_task_id for sub-task relationships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'global_tasks' AND column_name = 'parent_task_id'
  ) THEN
    ALTER TABLE global_tasks ADD COLUMN parent_task_id uuid REFERENCES global_tasks(id) ON DELETE SET NULL;
    CREATE INDEX idx_global_tasks_parent ON global_tasks (parent_task_id) WHERE parent_task_id IS NOT NULL;
  END IF;
END $$;

-- 2. Add step_order for sequencing sub-tasks within a parent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'global_tasks' AND column_name = 'step_order'
  ) THEN
    ALTER TABLE global_tasks ADD COLUMN step_order integer DEFAULT 0;
  END IF;
END $$;

-- 3. Add structured_output to agent_runs for machine-parseable results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_runs' AND column_name = 'structured_output'
  ) THEN
    ALTER TABLE agent_runs ADD COLUMN structured_output jsonb DEFAULT NULL;
  END IF;
END $$;

-- 4. Add source field to global_tasks to track how tasks were created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'global_tasks' AND column_name = 'source'
  ) THEN
    ALTER TABLE global_tasks ADD COLUMN source text DEFAULT 'manual';
    -- source values: 'manual', 'wishlist', 'decomposition', 'agent'
  END IF;
END $$;

-- 5. Function: after a task completes, auto-unblock dependents and queue them
CREATE OR REPLACE FUNCTION on_task_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_child record;
  v_all_siblings_done boolean;
BEGIN
  -- Only fire when column_id changes to 'completed'
  IF NEW.column_id = 'completed' AND (OLD.column_id IS NULL OR OLD.column_id != 'completed') THEN

    -- Refresh blocked status for all tasks that depend on this one
    PERFORM refresh_blocked_status();

    -- Check if all sibling sub-tasks under the same parent are done
    IF NEW.parent_task_id IS NOT NULL THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM global_tasks
        WHERE parent_task_id = NEW.parent_task_id
        AND column_id != 'completed'
        AND id != NEW.id
      ) INTO v_all_siblings_done;

      -- If all siblings done, auto-complete the parent task
      IF v_all_siblings_done THEN
        UPDATE global_tasks
        SET column_id = 'review'
        WHERE id = NEW.parent_task_id
        AND column_id != 'completed';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS trg_task_completed ON global_tasks;
CREATE TRIGGER trg_task_completed
  AFTER UPDATE OF column_id ON global_tasks
  FOR EACH ROW
  EXECUTE FUNCTION on_task_completed();

COMMENT ON COLUMN global_tasks.parent_task_id IS 'Parent task for decomposed sub-tasks. NULL = top-level task.';
COMMENT ON COLUMN global_tasks.step_order IS 'Execution order within parent. 0-based.';
COMMENT ON COLUMN global_tasks.source IS 'How this task was created: manual, wishlist, decomposition, agent';
COMMENT ON COLUMN agent_runs.structured_output IS 'Machine-parseable JSON output from agent execution. Used for inter-agent context sharing.';
