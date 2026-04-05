-- Add agent_questions JSONB column to agent_runs for the Agent Confirmation Queue
-- This stores questions the agent has for the human, plus suggested responses
-- Format: { "questions": ["What format?", "Which client?"], "suggestions": ["PDF", "JSON", "Both"] }
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS agent_questions JSONB;
