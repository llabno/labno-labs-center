/**
 * Demo Mode Data — fake datasets for 3 service tiers
 * All names, emails, and data are obviously fake. No real client data.
 */

const SHARED_PROJECTS_BASE = [
  { id: 'demo-p1', name: 'Acme Consulting Website', status: 'In Progress', health_score: 82, phase: 'Build', created_at: '2026-03-01', tier: 'build' },
  { id: 'demo-p2', name: 'Northside Wellness Rebrand', status: 'Planning', health_score: 95, phase: 'Discovery', created_at: '2026-03-15', tier: 'build' },
  { id: 'demo-p3', name: 'Demo Corp Internal Tool', status: 'In Progress', health_score: 68, phase: 'Build', created_at: '2026-02-20', tier: 'build' },
];

const EXTRA_PROJECTS = [
  { id: 'demo-p4', name: 'Riverdale Fitness App', status: 'Review', health_score: 74, phase: 'QA', created_at: '2026-01-10', tier: 'build' },
  { id: 'demo-p5', name: 'Summit Analytics Dashboard', status: 'Complete', health_score: 100, phase: 'Delivered', created_at: '2025-12-01', tier: 'build' },
];

const TASKS_BASE = [
  { id: 'demo-t1', title: 'Design homepage wireframe', column_id: 'active', priority: 'high', assigned_to: 'Jane Demo', trigger_level: 2, project_id: 'demo-p1' },
  { id: 'demo-t2', title: 'Set up Supabase auth', column_id: 'active', priority: 'critical', assigned_to: 'Alex Sample', trigger_level: 3, project_id: 'demo-p1' },
  { id: 'demo-t3', title: 'Write brand guidelines doc', column_id: 'someday', priority: 'medium', assigned_to: 'Jane Demo', trigger_level: 1, project_id: 'demo-p2' },
  { id: 'demo-t4', title: 'Create color palette', column_id: 'active', priority: 'medium', assigned_to: 'Chris Fakerson', trigger_level: 1, project_id: 'demo-p2' },
  { id: 'demo-t5', title: 'API integration for CRM', column_id: 'critical', priority: 'critical', assigned_to: 'Alex Sample', trigger_level: 3, project_id: 'demo-p3' },
  { id: 'demo-t6', title: 'Mobile responsive pass', column_id: 'someday', priority: 'low', assigned_to: 'Jane Demo', trigger_level: 1, project_id: 'demo-p1' },
  { id: 'demo-t7', title: 'Client review meeting prep', column_id: 'active', priority: 'high', assigned_to: 'Chris Fakerson', trigger_level: 2, project_id: 'demo-p3' },
  { id: 'demo-t8', title: 'Deploy staging environment', column_id: 'eliminated', priority: 'low', assigned_to: 'Alex Sample', trigger_level: 0, project_id: 'demo-p1' },
  { id: 'demo-t9', title: 'SEO audit and recommendations', column_id: 'someday', priority: 'medium', assigned_to: 'Jane Demo', trigger_level: 1, project_id: 'demo-p2' },
  { id: 'demo-t10', title: 'Set up analytics tracking', column_id: 'active', priority: 'high', assigned_to: 'Alex Sample', trigger_level: 2, project_id: 'demo-p1' },
];

const EXTRA_TASKS = [
  { id: 'demo-t11', title: 'Build notification system', column_id: 'active', priority: 'high', assigned_to: 'Alex Sample', trigger_level: 2, project_id: 'demo-p4' },
  { id: 'demo-t12', title: 'User onboarding flow', column_id: 'critical', priority: 'critical', assigned_to: 'Jane Demo', trigger_level: 3, project_id: 'demo-p4' },
  { id: 'demo-t13', title: 'Payment gateway integration', column_id: 'active', priority: 'high', assigned_to: 'Chris Fakerson', trigger_level: 2, project_id: 'demo-p4' },
  { id: 'demo-t14', title: 'Dashboard chart components', column_id: 'someday', priority: 'medium', assigned_to: 'Alex Sample', trigger_level: 1, project_id: 'demo-p5' },
  { id: 'demo-t15', title: 'Export PDF reports', column_id: 'active', priority: 'medium', assigned_to: 'Jane Demo', trigger_level: 1, project_id: 'demo-p5' },
  { id: 'demo-t16', title: 'Dark mode implementation', column_id: 'someday', priority: 'low', assigned_to: 'Chris Fakerson', trigger_level: 0, project_id: 'demo-p4' },
  { id: 'demo-t17', title: 'Accessibility audit', column_id: 'active', priority: 'high', assigned_to: 'Jane Demo', trigger_level: 2, project_id: 'demo-p5' },
  { id: 'demo-t18', title: 'Performance optimization', column_id: 'critical', priority: 'critical', assigned_to: 'Alex Sample', trigger_level: 3, project_id: 'demo-p4' },
  { id: 'demo-t19', title: 'Email template builder', column_id: 'someday', priority: 'medium', assigned_to: 'Chris Fakerson', trigger_level: 1, project_id: 'demo-p5' },
  { id: 'demo-t20', title: 'Client feedback portal', column_id: 'active', priority: 'high', assigned_to: 'Alex Sample', trigger_level: 2, project_id: 'demo-p4' },
];

const WISHLIST_BASE = [
  { id: 'demo-w1', raw_text: 'Add voice input to idea capture', status: 'New Idea', type: 'feature', priority: 'medium' },
  { id: 'demo-w2', raw_text: 'Integrate with Slack notifications', status: 'Exploring', type: 'integration', priority: 'high' },
  { id: 'demo-w3', raw_text: 'Client-facing progress dashboard', status: 'New Idea', type: 'feature', priority: 'high' },
  { id: 'demo-w4', raw_text: 'Automate weekly status emails', status: 'Planned', type: 'automation', priority: 'medium' },
  { id: 'demo-w5', raw_text: 'Add dark mode toggle', status: 'New Idea', type: 'feature', priority: 'low' },
];

const EXTRA_WISHLIST = [
  { id: 'demo-w6', raw_text: 'AI-powered meeting summaries', status: 'Exploring', type: 'feature', priority: 'high' },
  { id: 'demo-w7', raw_text: 'Multi-language support', status: 'New Idea', type: 'feature', priority: 'low' },
  { id: 'demo-w8', raw_text: 'Custom report builder', status: 'Planned', type: 'feature', priority: 'medium' },
  { id: 'demo-w9', raw_text: 'Zapier integration', status: 'New Idea', type: 'integration', priority: 'medium' },
  { id: 'demo-w10', raw_text: 'Mobile app companion', status: 'Exploring', type: 'feature', priority: 'high' },
];

const LEADS_BASE = [
  { id: 'demo-l1', company_name: 'Acme Consulting', contact_name: 'John Placeholder', status: 'Qualified', email: 'john@demo-acme.fake', source: 'referral', pipeline: 'consulting' },
  { id: 'demo-l2', company_name: 'Bright Ideas LLC', contact_name: 'Sarah Testdata', status: 'Discovery', email: 'sarah@demo-bright.fake', source: 'website', pipeline: 'consulting' },
  { id: 'demo-l3', company_name: 'CloudNine Solutions', contact_name: 'Mike Fictional', status: 'Proposal Sent', email: 'mike@demo-cloudnine.fake', source: 'linkedin', pipeline: 'consulting' },
  { id: 'demo-l4', company_name: 'DataFlow Partners', contact_name: 'Lisa Example', status: 'New Lead', email: 'lisa@demo-dataflow.fake', source: 'cold outreach', pipeline: 'consulting' },
];

const EXTRA_LEADS = [
  { id: 'demo-l5', company_name: 'EverGreen Agency', contact_name: 'Tom Sampleson', status: 'Qualified', email: 'tom@demo-evergreen.fake', source: 'referral', pipeline: 'consulting' },
  { id: 'demo-l6', company_name: 'FutureStack Inc', contact_name: 'Anna Mockdata', status: 'Discovery', email: 'anna@demo-futurestack.fake', source: 'website', pipeline: 'consulting' },
  { id: 'demo-l7', company_name: 'GridPoint Tech', contact_name: 'Dave Fakename', status: 'New Lead', email: 'dave@demo-gridpoint.fake', source: 'conference', pipeline: 'consulting' },
  { id: 'demo-l8', company_name: 'HorizonWorks', contact_name: 'Emily Notreal', status: 'Proposal Sent', email: 'emily@demo-horizonworks.fake', source: 'linkedin', pipeline: 'consulting' },
];

const CLINICAL_LEADS = [
  { id: 'demo-cl1', patient_name: 'Test Patient Alpha', status: 'Active', email: 'alpha@demo-patient.fake', source: 'referral', pipeline: 'clinical' },
  { id: 'demo-cl2', patient_name: 'Test Patient Beta', status: 'Evaluation', email: 'beta@demo-patient.fake', source: 'physician referral', pipeline: 'clinical' },
  { id: 'demo-cl3', patient_name: 'Test Patient Gamma', status: 'Discharged', email: 'gamma@demo-patient.fake', source: 'self-referral', pipeline: 'clinical' },
];

const PROPOSALS = [
  { id: 'demo-pr1', title: 'Acme Consulting — Website Redesign', tier: 'Build', pricing: '$4,500/mo', status: 'Sent', created_at: '2026-03-10' },
  { id: 'demo-pr2', title: 'Bright Ideas — Brand Strategy', tier: 'Project Track', pricing: '$1,200/mo', status: 'Draft', created_at: '2026-03-18' },
  { id: 'demo-pr3', title: 'CloudNine — Full Platform Build', tier: 'Build Plus', pricing: '$8,000/mo', status: 'Viewed', created_at: '2026-03-05' },
];

const SOAPS = [
  { id: 'demo-s1', patient_name: 'Test Patient Alpha', date: '2026-03-28', subjective: 'Reports improved ROM in left shoulder. Pain 3/10, down from 6/10.', objective: 'AROM flexion 155 deg, abduction 140 deg. MMT 4/5 deltoid.', assessment: 'Progressing well. Advance to phase 3 exercises.', plan: 'Continue HEP, add resistance band rows. Follow up 1 week.', billing_code: '97110' },
  { id: 'demo-s2', patient_name: 'Test Patient Beta', date: '2026-03-27', subjective: 'New patient. C/O low back pain x 3 weeks. Worse with prolonged sitting.', objective: 'Flexion limited to 60%. SLR positive at 40 deg bilateral. Core activation poor.', assessment: 'Lumbar disc irritation with deconditioning. Good rehab potential.', plan: 'Begin core stabilization program. Education on posture. 2x/week for 4 weeks.', billing_code: '97161' },
  { id: 'demo-s3', patient_name: 'Test Patient Alpha', date: '2026-03-21', subjective: 'Feeling stronger. Able to reach overhead for daily tasks. Pain 4/10.', objective: 'AROM flexion 145 deg, abduction 130 deg. MMT 3+/5 deltoid.', assessment: 'Steady gains. Continue current program.', plan: 'Progress HEP intensity. Add scapular stabilization.', billing_code: '97110' },
  { id: 'demo-s4', patient_name: 'Test Patient Gamma', date: '2026-03-20', subjective: 'Final visit. Reports full return to activities. No pain.', objective: 'Full AROM all planes. MMT 5/5 bilateral. Functional testing WNL.', assessment: 'Goals met. Ready for discharge.', plan: 'Discharge with HEP. PRN follow-up.', billing_code: '97110' },
  { id: 'demo-s5', patient_name: 'Test Patient Beta', date: '2026-03-25', subjective: 'Moderate improvement. Sitting tolerance up to 45 min from 20 min.', objective: 'Flexion improved to 75%. Core endurance plank 25 sec. SLR improved.', assessment: 'Responding to treatment. Continue plan.', plan: 'Progress core program. Add walking program.', billing_code: '97110' },
];

const BRIEFS = [
  { id: 'demo-b1', patient_name: 'Test Patient Alpha', date: '2026-03-28', summary: 'Session 6. Progressing to phase 3. Pain decreasing. Focus on strengthening today.', goals_reviewed: true, homework_assigned: true },
  { id: 'demo-b2', patient_name: 'Test Patient Beta', date: '2026-03-27', summary: 'Initial evaluation. Establish baseline, educate on condition, set expectations.', goals_reviewed: true, homework_assigned: true },
  { id: 'demo-b3', patient_name: 'Test Patient Gamma', date: '2026-03-20', summary: 'Discharge session. Review HEP, discuss maintenance, celebrate progress.', goals_reviewed: true, homework_assigned: false },
];


// Tier definitions
export const DEMO_TIERS = {
  'project-track': {
    name: 'Project Track',
    description: 'Basic project management — track projects, tasks, and ideas.',
    color: '#1565c0',
    features: ['Project tracking', 'Task management', 'Wishlist / idea capture', 'Basic reporting'],
    data: {
      projects: SHARED_PROJECTS_BASE.slice(0, 3),
      tasks: TASKS_BASE,
      wishlist: WISHLIST_BASE,
      leads: [],
      proposals: [],
      soaps: [],
      briefs: [],
    },
  },

  'build': {
    name: 'Build',
    description: 'Full build service — projects, CRM, proposals, and client management.',
    color: '#9c27b0',
    features: ['Everything in Project Track', 'Dual CRM with pipeline', 'Proposal generator', 'Client documents', '8 demo leads'],
    data: {
      projects: [...SHARED_PROJECTS_BASE, ...EXTRA_PROJECTS],
      tasks: [...TASKS_BASE, ...EXTRA_TASKS],
      wishlist: [...WISHLIST_BASE, ...EXTRA_WISHLIST],
      leads: [...LEADS_BASE, ...EXTRA_LEADS],
      proposals: PROPOSALS,
      soaps: [],
      briefs: [],
    },
  },

  'build-plus': {
    name: 'Build Plus',
    description: 'Everything in Build + clinical workflows — SOAP notes, session briefs, clinical CRM.',
    color: '#ad1457',
    features: ['Everything in Build', 'SOAP note documentation', 'Session briefs', 'Clinical CRM pipeline', 'Billing integration'],
    data: {
      projects: [...SHARED_PROJECTS_BASE, ...EXTRA_PROJECTS],
      tasks: [...TASKS_BASE, ...EXTRA_TASKS],
      wishlist: [...WISHLIST_BASE, ...EXTRA_WISHLIST],
      leads: [...LEADS_BASE, ...EXTRA_LEADS, ...CLINICAL_LEADS],
      proposals: PROPOSALS,
      soaps: SOAPS,
      briefs: BRIEFS,
    },
  },
};

export default DEMO_TIERS;
