-- Labno Labs Center (Mission Control) Schema
-- Executed autonomously over night shift.

-- 1. Enable pgvector for the Oracle
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Internal Operations & Projects (Mission Control)
CREATE TABLE internal_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Planning', -- Active, Planning, Blocked
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    due_date DATE,
    complexity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Global Workflow & Subtasks (Kanban Board)
CREATE TABLE global_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES internal_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    column_id TEXT DEFAULT 'backlog', -- backlog, review, completed
    complexity INTEGER DEFAULT 1,
    assigned_to TEXT, -- 'agent', 'lance', 'avery', 'romy'
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. The Oracle (Second Brain Knowledge Base)
CREATE TABLE oracle_sops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    embedding vector(1536), -- Vector data for semantic search
    visibility TEXT DEFAULT 'Private Brain (Internal Only)', -- Public/Private
    status TEXT DEFAULT 'Synced',
    token_count INTEGER,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Dual CRM Schema (Strictly Separated for HIPAA)
CREATE TABLE moso_clinical_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_name TEXT NOT NULL,
    email TEXT,
    condition_notes TEXT,
    status TEXT DEFAULT 'New Intake',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE labno_consulting_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    email TEXT,
    app_interest TEXT,
    lifetime_value NUMERIC DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Strict Row Level Security (RLS) Policies
ALTER TABLE moso_clinical_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE labno_consulting_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_sops ENABLE ROW LEVEL SECURITY;

-- Only Lance can view Clinical Data
CREATE POLICY "clinical_lance_only" ON moso_clinical_leads
    FOR ALL
    USING (auth.email() = 'lance@labnolabs.com');

-- All employees can view Consulting / App leads
CREATE POLICY "consulting_employee_access" ON labno_consulting_leads
    FOR ALL
    USING (auth.email() LIKE '%@labnolabs.com');

-- All employees can view Projects globally
CREATE POLICY "global_project_access" ON internal_projects
    FOR ALL
    USING (auth.email() LIKE '%@labnolabs.com');
