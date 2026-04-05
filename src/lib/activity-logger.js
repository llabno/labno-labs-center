import { supabase } from './supabase';

/**
 * Log an action to the activity_feed table for work history tracking.
 * Call this whenever a significant action occurs in the system.
 */
export const logActivity = async (action, { entityType, entityId, entityName, actor = 'Lance', details = {} } = {}) => {
  try {
    await supabase.from('activity_feed').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      actor,
      details,
    });
  } catch (err) {
    console.error('Activity log failed:', err);
  }
};

// Common action helpers
export const logTaskCreated = (task, actor = 'Lance') =>
  logActivity('task_created', { entityType: 'task', entityId: task.id, entityName: task.title, actor });

export const logTaskCompleted = (task, actor = 'Lance') =>
  logActivity('task_completed', { entityType: 'task', entityId: task.id, entityName: task.title, actor });

export const logTaskScheduled = (task, date, actor = 'Lance') =>
  logActivity('task_scheduled', { entityType: 'task', entityId: task.id, entityName: task.title, actor, details: { date } });

export const logPipelineAdvanced = (project, stage, actor = 'System') =>
  logActivity('pipeline_advanced', { entityType: 'project', entityId: project.id, entityName: project.name, actor, details: { stage } });

export const logProposalGenerated = (client, tier, actor = 'Lance') =>
  logActivity('proposal_generated', { entityType: 'client', entityName: client?.name || 'Unknown', actor, details: { tier } });

export const logSchedulerRun = (mode, taskCount, actor = 'Lance') =>
  logActivity('scheduler_run', { entityType: 'scheduler', entityName: mode, actor, details: { task_count: taskCount } });

export const logAgentDispatched = (task, actor = 'Agent') =>
  logActivity('agent_dispatched', { entityType: 'task', entityId: task.id, entityName: task.title, actor });

export const logDocumentSent = (doc, actor = 'Lance') =>
  logActivity('document_sent', { entityType: 'document', entityId: doc.id, entityName: doc.title, actor });

export const logResearchStarted = (source, actor = 'System') =>
  logActivity('research_started', { entityType: 'research', entityName: source, actor });
