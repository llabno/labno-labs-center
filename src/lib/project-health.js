import { supabase } from './supabase';

/**
 * Calculate project health score (0-100) based on multiple factors.
 * Runs client-side against already-fetched data.
 */
export const calculateHealthScore = (project, tasks = [], touchpoints = []) => {
  let score = 75; // Start at "healthy"
  const factors = [];

  // 1. Task completion rate (-20 to +10)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.column_id === 'completed').length;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  if (completionRate >= 0.8) { score += 10; factors.push('High completion rate'); }
  else if (completionRate >= 0.5) { score += 0; }
  else if (completionRate >= 0.2) { score -= 10; factors.push('Low completion rate'); }
  else if (totalTasks > 5) { score -= 20; factors.push('Very low completion rate'); }

  // 2. Blocked tasks (-15)
  const blockedCount = tasks.filter(t => t.is_blocked || t.column_id === 'blocked').length;
  if (blockedCount > 3) { score -= 15; factors.push(`${blockedCount} blocked tasks`); }
  else if (blockedCount > 0) { score -= 5; factors.push(`${blockedCount} blocked`); }

  // 3. Stalled detection (-20)
  const lastActivity = project.last_activity_at || project.updated_at || project.created_at;
  if (lastActivity) {
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
    if (daysSince > 14) { score -= 20; factors.push(`Stalled ${daysSince} days`); }
    else if (daysSince > 7) { score -= 10; factors.push(`${daysSince} days since activity`); }
    else if (daysSince > 5) { score -= 5; factors.push(`${daysSince} days quiet`); }
  }

  // 4. Due date proximity (-10 to +5)
  if (project.due_date) {
    const daysUntilDue = Math.ceil((new Date(project.due_date) - Date.now()) / 86400000);
    if (daysUntilDue < 0) { score -= 10; factors.push('Overdue'); }
    else if (daysUntilDue <= 3 && completionRate < 0.7) { score -= 10; factors.push('Due soon, behind'); }
    else if (daysUntilDue <= 7 && completionRate >= 0.7) { score += 5; factors.push('On track for deadline'); }
  }

  // 5. Scope creep (-10)
  if (project.proposed_task_count && totalTasks > project.proposed_task_count * 1.25) {
    score -= 10;
    factors.push(`Scope creep: ${totalTasks} tasks vs ${project.proposed_task_count} proposed`);
  }

  // 6. Client communication load (for client projects) (-5)
  if (project.project_type === 'client' && project.client_id) {
    const clientTouchpoints = touchpoints.filter(t => t.client_id === project.client_id);
    const weeklyAvg = clientTouchpoints.length / Math.max(1, Math.ceil((Date.now() - new Date(project.created_at).getTime()) / (7 * 86400000)));
    if (weeklyAvg > 5) { score -= 5; factors.push('High communication load'); }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Attention' : score >= 40 ? 'At Risk' : 'Critical',
    color: score >= 80 ? '#2d8a4e' : score >= 60 ? '#c49a40' : score >= 40 ? '#e65100' : '#d14040',
    factors,
  };
};

/**
 * Check for scope creep on a project.
 * Returns true if current task count exceeds proposal estimate by >25%.
 */
export const checkScopeCreep = (project, currentTaskCount) => {
  if (!project.proposed_task_count) return { creeping: false };
  const threshold = project.proposed_task_count * 1.25;
  const overBy = currentTaskCount - project.proposed_task_count;
  const percentage = Math.round((overBy / project.proposed_task_count) * 100);
  return {
    creeping: currentTaskCount > threshold,
    overBy: Math.max(0, overBy),
    percentage: Math.max(0, percentage),
    proposed: project.proposed_task_count,
    current: currentTaskCount,
  };
};

/**
 * Calculate Client Lifetime Value (CLV) projection for 12 months.
 * Based on: current revenue, billing multiplier, satisfaction, effort rating.
 */
export const calculateCLV = (client, projects = [], touchpoints = []) => {
  const baseRate = Number(localStorage.getItem('llc_base_hourly_rate') || '250');
  const multiplier = client.billing_multiplier || 1.0;
  const effectiveRate = baseRate * multiplier;

  // Monthly hours estimate based on active projects
  const activeProjects = projects.filter(p => p.client_id === client.id && p.status === 'Active');
  const estimatedMonthlyHours = activeProjects.length * 20; // ~20 hrs/mo per active project

  const monthlyRevenue = estimatedMonthlyHours * effectiveRate;
  const projectedCLV = monthlyRevenue * 12;

  // Churn risk based on satisfaction
  const satisfaction = client.satisfaction_score || 70;
  const churnRisk = satisfaction < 40 ? 0.4 : satisfaction < 60 ? 0.2 : satisfaction < 80 ? 0.05 : 0.02;
  const adjustedCLV = projectedCLV * (1 - churnRisk);

  return {
    monthlyRevenue: Math.round(monthlyRevenue),
    projectedCLV: Math.round(projectedCLV),
    adjustedCLV: Math.round(adjustedCLV),
    churnRisk: Math.round(churnRisk * 100),
    effectiveRate: Math.round(effectiveRate),
    activeProjects: activeProjects.length,
  };
};

/**
 * Calculate wishlist item impact score (0-100).
 */
export const calculateImpactScore = (item, projects = [], surveys = []) => {
  let score = 30; // baseline

  // Revenue potential
  if (['Business Dev', 'Website'].includes(item.type)) score += 25;
  else if (['Agent / AI', 'Automation'].includes(item.type)) score += 20;
  else if (['Clinical'].includes(item.type)) score += 15;
  else if (['Content', 'Research'].includes(item.type)) score += 10;

  // Priority boost
  if (item.priority?.includes('P0')) score += 20;
  else if (item.priority?.includes('P1')) score += 15;
  else if (item.priority?.includes('P2')) score += 5;

  // Related projects
  const relatedCount = projects.filter(p =>
    p.name.toLowerCase().includes((item.project || '').toLowerCase().split(' ')[0]) ||
    (item.raw_text || '').toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
  ).length;
  score += Math.min(15, relatedCount * 5);

  // Addresses known pain points from surveys
  const painPoints = surveys
    .filter(s => s.satisfaction_score && s.satisfaction_score < 50)
    .flatMap(s => Object.values(s.responses || {}))
    .filter(v => typeof v === 'string')
    .join(' ').toLowerCase();
  if (painPoints && (item.raw_text || '').toLowerCase().split(' ').some(w => w.length > 4 && painPoints.includes(w))) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
};
