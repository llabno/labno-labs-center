# Agent Handoff Protocol — Labno Labs Clinical Brain

## Agent Roster

| Agent | Role | Model Tier | Input Source | Output Destination |
|-------|------|-----------|--------------|-------------------|
| **Kylie** | External AI phone receptionist | budget (Gemini Flash) | Inbound phone calls | `moso_clinical_leads`, `labno_consulting_leads` |
| **Concierge** | Internal dispatch & routing | budget (Haiku) | Kylie output, manual triggers, cron | `agent_runs`, `global_tasks` |
| **Mechanic** | IFS/relational intelligence analysis | mid (Sonnet) | `ifs_interaction_logs` | `ifs_analysis_results`, `ifs_entities` |
| **Sniper** | Blog content from clinical notes | budget (Haiku) | `moso_sync_log`, `oracle_sops` | `blog_posts` |
| **Overseer** | System coordinator (UNDER REVIEW) | mid (Sonnet) | All agent outputs | Alerts, status reports |
| **Billing Agent** | Session billing automation | budget (Haiku) | `moso_sync_log` (session data) | Billing records, invoices |

## Handoff Flow

```
Phone Call → Kylie → moso_clinical_leads / labno_consulting_leads
                  ↓
              Concierge (reads new leads, creates tasks)
                  ↓
        ┌─────────┼──────────┐
        ↓         ↓          ↓
   Mechanic    Sniper    Billing Agent
   (analysis)  (blog)    (invoicing)
        ↓         ↓          ↓
   ifs_analysis  blog_posts  billing_records
   ifs_entities
```

## Data Contracts

### Kylie → Concierge

**Trigger:** New row in `moso_clinical_leads` or `labno_consulting_leads`
**Method:** Supabase realtime subscription or cron poll (every 15 min)

```json
{
  "event": "new_lead",
  "source": "kylie",
  "lead_table": "moso_clinical_leads",
  "lead_id": "uuid",
  "lead_name": "string",
  "lead_type": "clinical | consulting",
  "intake_summary": "string (Kylie's call notes)",
  "urgency": "low | medium | high",
  "timestamp": "ISO 8601"
}
```

**Concierge action:** Create project in `internal_projects` if new client, add intake tasks to `global_tasks`, route to appropriate agent.

---

### Concierge → Mechanic

**Trigger:** New `ifs_interaction_logs` entry OR manual dispatch via `agent_runs`
**Method:** Insert into `agent_runs` with `agent_name: 'mechanic'`

```json
{
  "task_title": "Analyze interaction log: {entity_name}",
  "project_name": "Internal Mechanic App",
  "context": "log_id: uuid, entity_id: uuid",
  "agent_name": "mechanic",
  "priority": "normal | high"
}
```

**Mechanic output:** Writes to `ifs_analysis_results` (9 module JSONB columns), updates `ifs_entities` with hypothesis.

**Mechanic → Concierge response:**
```json
{
  "status": "completed",
  "result": "Analysis complete for {entity_name}. Primary patterns: {summary}. Polyvagal state: {state}.",
  "analysis_id": "uuid",
  "modules_completed": ["m9_polyvagal", "m16_ifs", ...],
  "tokens_used": 3500,
  "cost_usd": 0.08
}
```

---

### Concierge → Sniper

**Trigger:** New `moso_sync_log` entry with `output_type: 'soap_note'` OR manual dispatch
**Method:** Insert into `agent_runs` with `agent_name: 'sniper'`

```json
{
  "task_title": "Generate blog post from SOAP note: {title}",
  "project_name": "Clinical Blog + Sniper Agent",
  "context": "sync_log_id: uuid, soap_content: string (truncated to 2000 chars)",
  "agent_name": "sniper",
  "priority": "low"
}
```

**Sniper output:** Writes to `blog_posts` table (draft status).

**Sniper → Concierge response:**
```json
{
  "status": "completed",
  "result": "Blog post drafted: '{title}'. Status: draft. Word count: {n}.",
  "blog_post_id": "uuid",
  "tokens_used": 1200,
  "cost_usd": 0.02
}
```

---

### Concierge → Billing Agent

**Trigger:** `moso_sync_log` entry with `output_type: 'session_close'`
**Method:** Insert into `agent_runs` with `agent_name: 'billing'`

```json
{
  "task_title": "Process billing for session: {patient_name} {date}",
  "project_name": "MOSO Overseer Agent System",
  "context": "sync_log_id: uuid, session_type: string, duration_minutes: number",
  "agent_name": "billing",
  "priority": "high"
}
```

---

## Failure States and Fallback Behavior

| Failure | Detection | Fallback |
|---------|-----------|----------|
| Agent crashes mid-run | `agent_runs.status = 'failed'` after timeout | Concierge re-queues task (max 2 retries) |
| Budget exhausted | `agent_runs.status = 'budget_blocked'` | Task stays queued, alert sent to dashboard |
| Agent returns empty/garbage | Result validation check (length, format) | Flag for human review, move task to `triage` |
| Supabase write fails | Error logged in `agent_runs.error` | Retry once, then fail with error detail |
| Agent takes >55s (Vercel limit) | Timeout exception | Task marked failed, next cron cycle retries |
| Circular dispatch | Concierge tracks dispatch count per task | Hard limit: 3 dispatches per task_id per day |

## Retry Policy

- **Max retries:** 2 per task
- **Backoff:** None (cron-based, next 15-min cycle)
- **Escalation:** After 2 failures, task moves to `triage` column for human review
- **Budget blocks:** No retry — wait for next day or manual override

## Overseer Review Decision

The Overseer historically blocked project progress by being overprotective. Options:

1. **Reform:** Narrow Overseer to read-only monitoring — it reads all agent outputs and generates a daily health summary, but CANNOT block or modify tasks
2. **Replace with Concierge:** Merge Overseer's coordination functions into Concierge (recommended — simpler, one dispatcher instead of two)
3. **Sunset:** Remove Overseer entirely, rely on budget enforcer + observability dashboard for oversight

**Recommendation:** Option 2 — Concierge absorbs Overseer's useful functions (monitoring, summary generation) and the budget enforcer + observability dashboard handle the safety functions that Overseer was doing (poorly).
