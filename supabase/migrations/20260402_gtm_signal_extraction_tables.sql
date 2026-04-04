-- ============================================================
-- GTM Signal Extraction System — 5-Layer Go-To-Market Pipeline
-- Date: 2026-04-02
-- Author: Claude Code (autonomous)
-- ============================================================
-- 11 tables spanning 5 layers:
--   Layer 1 (Ingest):    gtm_mobile_reviews, gtm_b2b_reviews, gtm_job_postings
--   Layer 2 (Parse):     gtm_parsed_signals, gtm_hiring_signals
--   Layer 3 (Score):     gtm_intent_scores, gtm_company_profiles, gtm_competitive_intel
--   Layer 4 (Route):     gtm_pipeline_stages, gtm_outreach_messages
--   Layer 5 (Execute):   gtm_agent_actions
-- Plus 2 helper views:   gtm_high_intent_accounts, gtm_active_pipeline
-- ============================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- LAYER 1: Raw Data Ingestion
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. gtm_mobile_reviews ────────────────────────────────────
CREATE TABLE gtm_mobile_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_platform TEXT NOT NULL CHECK (source_platform IN ('apple_app_store', 'google_play')),
    app_name        TEXT NOT NULL,
    app_id          TEXT NOT NULL,
    app_version     TEXT,
    review_id_external TEXT UNIQUE NOT NULL,
    reviewer_name   TEXT,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text     TEXT,
    review_date     TIMESTAMPTZ,
    device_type     TEXT,
    geo_location    TEXT,
    helpful_count   INTEGER DEFAULT 0,
    developer_response TEXT,
    scraped_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_mobile_reviews_app_name ON gtm_mobile_reviews (app_name);
CREATE INDEX idx_gtm_mobile_reviews_source ON gtm_mobile_reviews (source_platform);
CREATE INDEX idx_gtm_mobile_reviews_rating ON gtm_mobile_reviews (rating);
CREATE INDEX idx_gtm_mobile_reviews_review_date ON gtm_mobile_reviews (review_date DESC);
CREATE INDEX idx_gtm_mobile_reviews_scraped_at ON gtm_mobile_reviews (scraped_at DESC);

ALTER TABLE gtm_mobile_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_mobile_reviews_select" ON gtm_mobile_reviews
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_mobile_reviews_insert" ON gtm_mobile_reviews
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_mobile_reviews_update" ON gtm_mobile_reviews
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_mobile_reviews_delete" ON gtm_mobile_reviews
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_mobile_reviews_service" ON gtm_mobile_reviews
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 2. gtm_b2b_reviews ──────────────────────────────────────
CREATE TABLE gtm_b2b_reviews (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_platform         TEXT NOT NULL CHECK (source_platform IN ('g2', 'capterra', 'trustradius')),
    software_name           TEXT NOT NULL,
    software_category       TEXT,
    review_id_external      TEXT UNIQUE NOT NULL,
    reviewer_name           TEXT,
    reviewer_job_title      TEXT,
    reviewer_company_name   TEXT,
    reviewer_company_size   TEXT,
    reviewer_industry       TEXT,
    overall_rating          NUMERIC,
    ease_of_use_rating      NUMERIC,
    support_quality_rating  NUMERIC,
    implementation_rating   NUMERIC,
    pros_text               TEXT,
    cons_text               TEXT,
    review_text             TEXT,
    review_date             TIMESTAMPTZ,
    alternatives_considered TEXT[],
    competitive_comparisons JSONB,
    scraped_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_b2b_reviews_software ON gtm_b2b_reviews (software_name);
CREATE INDEX idx_gtm_b2b_reviews_source ON gtm_b2b_reviews (source_platform);
CREATE INDEX idx_gtm_b2b_reviews_company ON gtm_b2b_reviews (reviewer_company_name);
CREATE INDEX idx_gtm_b2b_reviews_industry ON gtm_b2b_reviews (reviewer_industry);
CREATE INDEX idx_gtm_b2b_reviews_review_date ON gtm_b2b_reviews (review_date DESC);
CREATE INDEX idx_gtm_b2b_reviews_scraped_at ON gtm_b2b_reviews (scraped_at DESC);

ALTER TABLE gtm_b2b_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_b2b_reviews_select" ON gtm_b2b_reviews
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_b2b_reviews_insert" ON gtm_b2b_reviews
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_b2b_reviews_update" ON gtm_b2b_reviews
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_b2b_reviews_delete" ON gtm_b2b_reviews
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_b2b_reviews_service" ON gtm_b2b_reviews
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 3. gtm_job_postings ─────────────────────────────────────
CREATE TABLE gtm_job_postings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_platform     TEXT NOT NULL CHECK (source_platform IN ('linkedin', 'indeed')),
    company_name        TEXT NOT NULL,
    job_title           TEXT NOT NULL,
    job_description     TEXT,
    location            TEXT,
    seniority_level     TEXT,
    required_tech_stack TEXT[],
    preferred_tech_stack TEXT[],
    posting_date        TIMESTAMPTZ,
    posting_url         TEXT,
    is_active           BOOLEAN DEFAULT true,
    scraped_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_job_postings_company ON gtm_job_postings (company_name);
CREATE INDEX idx_gtm_job_postings_source ON gtm_job_postings (source_platform);
CREATE INDEX idx_gtm_job_postings_title ON gtm_job_postings (job_title);
CREATE INDEX idx_gtm_job_postings_active ON gtm_job_postings (is_active) WHERE is_active = true;
CREATE INDEX idx_gtm_job_postings_posting_date ON gtm_job_postings (posting_date DESC);
CREATE INDEX idx_gtm_job_postings_scraped_at ON gtm_job_postings (scraped_at DESC);
CREATE INDEX idx_gtm_job_postings_tech_stack ON gtm_job_postings USING GIN (required_tech_stack);

ALTER TABLE gtm_job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_job_postings_select" ON gtm_job_postings
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_job_postings_insert" ON gtm_job_postings
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_job_postings_update" ON gtm_job_postings
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_job_postings_delete" ON gtm_job_postings
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_job_postings_service" ON gtm_job_postings
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════
-- LAYER 2: Signal Parsing
-- ═══════════════════════════════════════════════════════════════

-- ─── 4. gtm_parsed_signals ───────────────────────────────────
CREATE TABLE gtm_parsed_signals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table        TEXT NOT NULL,
    source_id           UUID NOT NULL,
    company_name        TEXT,
    pain_point          TEXT NOT NULL,
    pain_point_category TEXT NOT NULL CHECK (pain_point_category IN (
        'api_limit_exhaustion', 'post_sale_chaos', 'bulk_data_failure',
        'support_delay', 'manual_data_entry', 'integration_failure',
        'reporting_gap', 'frontend_tech_debt', 'ux_debt',
        'infrastructure_debt', 'workflow_automation_need', 'ai_readiness'
    )),
    severity            TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    proposed_solution   TEXT,
    labno_service_match TEXT,
    confidence_score    NUMERIC NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    parsed_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_parsed_signals_company ON gtm_parsed_signals (company_name);
CREATE INDEX idx_gtm_parsed_signals_category ON gtm_parsed_signals (pain_point_category);
CREATE INDEX idx_gtm_parsed_signals_severity ON gtm_parsed_signals (severity);
CREATE INDEX idx_gtm_parsed_signals_source ON gtm_parsed_signals (source_table, source_id);
CREATE INDEX idx_gtm_parsed_signals_confidence ON gtm_parsed_signals (confidence_score DESC);
CREATE INDEX idx_gtm_parsed_signals_parsed_at ON gtm_parsed_signals (parsed_at DESC);
CREATE INDEX idx_gtm_parsed_signals_service ON gtm_parsed_signals (labno_service_match);

ALTER TABLE gtm_parsed_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_parsed_signals_select" ON gtm_parsed_signals
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_parsed_signals_insert" ON gtm_parsed_signals
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_parsed_signals_update" ON gtm_parsed_signals
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_parsed_signals_delete" ON gtm_parsed_signals
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_parsed_signals_service" ON gtm_parsed_signals
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 11. gtm_hiring_signals ──────────────────────────────────
-- (Placed here with Layer 2 since it's a parsed/processed signal)
CREATE TABLE gtm_hiring_signals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name            TEXT NOT NULL,
    signal_type             TEXT NOT NULL CHECK (signal_type IN (
        'hiring_spike', 'new_department', 'executive_turnover',
        'tech_stack_shift', 'legacy_migration'
    )),
    signal_details          JSONB,
    related_job_posting_ids UUID[],
    inferred_debt_type      TEXT CHECK (inferred_debt_type IN (
        'infrastructure', 'workflow', 'ai_readiness', 'cloud_migration'
    )),
    confidence              NUMERIC NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    detected_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_hiring_signals_company ON gtm_hiring_signals (company_name);
CREATE INDEX idx_gtm_hiring_signals_type ON gtm_hiring_signals (signal_type);
CREATE INDEX idx_gtm_hiring_signals_debt ON gtm_hiring_signals (inferred_debt_type);
CREATE INDEX idx_gtm_hiring_signals_confidence ON gtm_hiring_signals (confidence DESC);
CREATE INDEX idx_gtm_hiring_signals_detected_at ON gtm_hiring_signals (detected_at DESC);

ALTER TABLE gtm_hiring_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_hiring_signals_select" ON gtm_hiring_signals
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_hiring_signals_insert" ON gtm_hiring_signals
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_hiring_signals_update" ON gtm_hiring_signals
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_hiring_signals_delete" ON gtm_hiring_signals
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_hiring_signals_service" ON gtm_hiring_signals
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════
-- LAYER 3: Scoring & Enrichment
-- ═══════════════════════════════════════════════════════════════

-- ─── 5. gtm_intent_scores ────────────────────────────────────
CREATE TABLE gtm_intent_scores (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name     TEXT NOT NULL UNIQUE,
    recency_score    NUMERIC DEFAULT 0,
    frequency_score  NUMERIC DEFAULT 0,
    depth_score      NUMERIC DEFAULT 0,
    seniority_score  NUMERIC DEFAULT 0,
    composite_score  NUMERIC DEFAULT 0,
    score_tier       TEXT CHECK (score_tier IN ('immediate', 'nurture', 'watch', 'archive')),
    signal_count     INTEGER DEFAULT 0,
    top_signals      JSONB,
    last_signal_at   TIMESTAMPTZ,
    scored_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_intent_scores_company ON gtm_intent_scores (company_name);
CREATE INDEX idx_gtm_intent_scores_composite ON gtm_intent_scores (composite_score DESC);
CREATE INDEX idx_gtm_intent_scores_tier ON gtm_intent_scores (score_tier);
CREATE INDEX idx_gtm_intent_scores_scored_at ON gtm_intent_scores (scored_at DESC);
CREATE INDEX idx_gtm_intent_scores_last_signal ON gtm_intent_scores (last_signal_at DESC);

ALTER TABLE gtm_intent_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_intent_scores_select" ON gtm_intent_scores
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_intent_scores_insert" ON gtm_intent_scores
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_intent_scores_update" ON gtm_intent_scores
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_intent_scores_delete" ON gtm_intent_scores
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_intent_scores_service" ON gtm_intent_scores
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 6. gtm_company_profiles ─────────────────────────────────
CREATE TABLE gtm_company_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name            TEXT NOT NULL UNIQUE,
    domain                  TEXT,
    industry                TEXT,
    employee_count          INTEGER,
    revenue_estimate        TEXT,
    location                TEXT,
    tech_stack_known        TEXT[],
    enrichment_source       TEXT CHECK (enrichment_source IN ('apollo', 'clearbit', 'clay', 'manual')),
    enrichment_confidence   NUMERIC CHECK (enrichment_confidence BETWEEN 0 AND 1),
    icp_match_score         NUMERIC DEFAULT 0,
    dynamic_icp_tags        TEXT[],
    recent_executive_hires  JSONB,
    enriched_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_company_profiles_name ON gtm_company_profiles (company_name);
CREATE INDEX idx_gtm_company_profiles_domain ON gtm_company_profiles (domain);
CREATE INDEX idx_gtm_company_profiles_industry ON gtm_company_profiles (industry);
CREATE INDEX idx_gtm_company_profiles_icp ON gtm_company_profiles (icp_match_score DESC);
CREATE INDEX idx_gtm_company_profiles_enriched_at ON gtm_company_profiles (enriched_at DESC);
CREATE INDEX idx_gtm_company_profiles_tech_stack ON gtm_company_profiles USING GIN (tech_stack_known);
CREATE INDEX idx_gtm_company_profiles_icp_tags ON gtm_company_profiles USING GIN (dynamic_icp_tags);

ALTER TABLE gtm_company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_company_profiles_select" ON gtm_company_profiles
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_company_profiles_insert" ON gtm_company_profiles
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_company_profiles_update" ON gtm_company_profiles
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_company_profiles_delete" ON gtm_company_profiles
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_company_profiles_service" ON gtm_company_profiles
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 9. gtm_competitive_intel ────────────────────────────────
CREATE TABLE gtm_competitive_intel (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_name             TEXT NOT NULL,
    category                    TEXT,
    weakness_signals            JSONB,
    switching_signals_count     INTEGER DEFAULT 0,
    avg_competitor_rating       NUMERIC,
    negative_trend              BOOLEAN DEFAULT false,
    battlecard                  JSONB,
    displacement_opportunities  INTEGER DEFAULT 0,
    last_updated                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_competitive_intel_competitor ON gtm_competitive_intel (competitor_name);
CREATE INDEX idx_gtm_competitive_intel_category ON gtm_competitive_intel (category);
CREATE INDEX idx_gtm_competitive_intel_displacement ON gtm_competitive_intel (displacement_opportunities DESC);
CREATE INDEX idx_gtm_competitive_intel_updated ON gtm_competitive_intel (last_updated DESC);

ALTER TABLE gtm_competitive_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_competitive_intel_select" ON gtm_competitive_intel
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_competitive_intel_insert" ON gtm_competitive_intel
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_competitive_intel_update" ON gtm_competitive_intel
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_competitive_intel_delete" ON gtm_competitive_intel
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_competitive_intel_service" ON gtm_competitive_intel
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════
-- LAYER 4: Routing & Outreach
-- ═══════════════════════════════════════════════════════════════

-- ─── 10. gtm_pipeline_stages ─────────────────────────────────
CREATE TABLE gtm_pipeline_stages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id  UUID NOT NULL REFERENCES gtm_company_profiles(id) ON DELETE CASCADE,
    current_stage       TEXT NOT NULL DEFAULT 'signal_detected' CHECK (current_stage IN (
        'signal_detected', 'enriched', 'scored', 'routed',
        'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
    )),
    assigned_to         TEXT,
    assigned_squad      TEXT CHECK (assigned_squad IN (
        'medical_ai', 'ai_squads', 'revops', 'custom_dev'
    )),
    stage_entered_at    TIMESTAMPTZ DEFAULT now(),
    first_signal_at     TIMESTAMPTZ,
    first_contact_at    TIMESTAMPTZ,
    qualified_at        TIMESTAMPTZ,
    closed_at           TIMESTAMPTZ,
    deal_value          NUMERIC,
    loss_reason         TEXT,
    notes               TEXT
);

CREATE INDEX idx_gtm_pipeline_stages_company ON gtm_pipeline_stages (company_profile_id);
CREATE INDEX idx_gtm_pipeline_stages_stage ON gtm_pipeline_stages (current_stage);
CREATE INDEX idx_gtm_pipeline_stages_squad ON gtm_pipeline_stages (assigned_squad);
CREATE INDEX idx_gtm_pipeline_stages_entered ON gtm_pipeline_stages (stage_entered_at DESC);
CREATE INDEX idx_gtm_pipeline_stages_deal_value ON gtm_pipeline_stages (deal_value DESC NULLS LAST);
CREATE INDEX idx_gtm_pipeline_stages_active ON gtm_pipeline_stages (current_stage)
    WHERE current_stage NOT IN ('won', 'lost');

ALTER TABLE gtm_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_pipeline_stages_select" ON gtm_pipeline_stages
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_pipeline_stages_insert" ON gtm_pipeline_stages
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_pipeline_stages_update" ON gtm_pipeline_stages
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_pipeline_stages_delete" ON gtm_pipeline_stages
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_pipeline_stages_service" ON gtm_pipeline_stages
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 7. gtm_outreach_messages ────────────────────────────────
CREATE TABLE gtm_outreach_messages (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id    UUID REFERENCES gtm_company_profiles(id) ON DELETE SET NULL,
    intent_score_id       UUID REFERENCES gtm_intent_scores(id) ON DELETE SET NULL,
    channel               TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'phone')),
    template_type         TEXT,
    subject_line          TEXT,
    message_body          TEXT,
    personalization_data  JSONB,
    tone                  TEXT CHECK (tone IN ('technical', 'executive', 'casual')),
    status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'sent', 'opened', 'clicked', 'replied', 'bounced'
    )),
    sent_at               TIMESTAMPTZ,
    opened_at             TIMESTAMPTZ,
    clicked_at            TIMESTAMPTZ,
    replied_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_outreach_company ON gtm_outreach_messages (company_profile_id);
CREATE INDEX idx_gtm_outreach_intent ON gtm_outreach_messages (intent_score_id);
CREATE INDEX idx_gtm_outreach_channel ON gtm_outreach_messages (channel);
CREATE INDEX idx_gtm_outreach_status ON gtm_outreach_messages (status);
CREATE INDEX idx_gtm_outreach_created ON gtm_outreach_messages (created_at DESC);
CREATE INDEX idx_gtm_outreach_sent ON gtm_outreach_messages (sent_at DESC) WHERE sent_at IS NOT NULL;

ALTER TABLE gtm_outreach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_outreach_messages_select" ON gtm_outreach_messages
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_outreach_messages_insert" ON gtm_outreach_messages
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_outreach_messages_update" ON gtm_outreach_messages
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_outreach_messages_delete" ON gtm_outreach_messages
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_outreach_messages_service" ON gtm_outreach_messages
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════
-- LAYER 5: Autonomous Execution
-- ═══════════════════════════════════════════════════════════════

-- ─── 8. gtm_agent_actions ────────────────────────────────────
CREATE TABLE gtm_agent_actions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type       TEXT NOT NULL CHECK (action_type IN (
        'cadence_adjust', 'battlecard_generate', 'pitch_deck_populate',
        'message_pivot', 'meeting_book', 'follow_up', 'alert'
    )),
    target_company    TEXT,
    target_contact    TEXT,
    action_details    JSONB,
    trigger_signal    TEXT,
    outcome           TEXT,
    requires_approval BOOLEAN DEFAULT false,
    approved_by       TEXT,
    executed_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gtm_agent_actions_type ON gtm_agent_actions (action_type);
CREATE INDEX idx_gtm_agent_actions_company ON gtm_agent_actions (target_company);
CREATE INDEX idx_gtm_agent_actions_executed ON gtm_agent_actions (executed_at DESC);
CREATE INDEX idx_gtm_agent_actions_pending ON gtm_agent_actions (requires_approval)
    WHERE requires_approval = true AND approved_by IS NULL;

ALTER TABLE gtm_agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gtm_agent_actions_select" ON gtm_agent_actions
    FOR SELECT USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );
CREATE POLICY "gtm_agent_actions_insert" ON gtm_agent_actions
    FOR INSERT WITH CHECK (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_agent_actions_update" ON gtm_agent_actions
    FOR UPDATE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_agent_actions_delete" ON gtm_agent_actions
    FOR DELETE USING (auth.email() LIKE '%@labnolabs.com');
CREATE POLICY "gtm_agent_actions_service" ON gtm_agent_actions
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════
-- HELPER VIEWS
-- ═══════════════════════════════════════════════════════════════

-- High-intent accounts: company_profiles joined with intent_scores >= 70
CREATE OR REPLACE VIEW gtm_high_intent_accounts AS
SELECT
    cp.id AS company_profile_id,
    cp.company_name,
    cp.domain,
    cp.industry,
    cp.employee_count,
    cp.revenue_estimate,
    cp.location,
    cp.tech_stack_known,
    cp.icp_match_score,
    cp.dynamic_icp_tags,
    is.id AS intent_score_id,
    is.composite_score,
    is.score_tier,
    is.signal_count,
    is.top_signals,
    is.last_signal_at,
    is.recency_score,
    is.frequency_score,
    is.depth_score,
    is.seniority_score
FROM gtm_company_profiles cp
JOIN gtm_intent_scores is ON cp.company_name = is.company_name
WHERE is.composite_score >= 70;

-- Active pipeline: pipeline_stages joined with company_profiles, excluding closed deals
CREATE OR REPLACE VIEW gtm_active_pipeline AS
SELECT
    ps.id AS pipeline_id,
    cp.id AS company_profile_id,
    cp.company_name,
    cp.domain,
    cp.industry,
    cp.employee_count,
    ps.current_stage,
    ps.assigned_to,
    ps.assigned_squad,
    ps.stage_entered_at,
    ps.first_signal_at,
    ps.first_contact_at,
    ps.qualified_at,
    ps.deal_value,
    ps.notes
FROM gtm_pipeline_stages ps
JOIN gtm_company_profiles cp ON ps.company_profile_id = cp.id
WHERE ps.current_stage NOT IN ('won', 'lost');

COMMIT;
