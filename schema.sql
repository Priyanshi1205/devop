-- ============================================================================
-- SEO AI OS - Database Schema Design (PostgreSQL 15+)
-- Optimized for Agency Scale (10,000+ Websites) and Multi-Tenant Isolation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Enabled for trigram fuzzy matching of keyword text

-- ----------------------------------------------------------------------------
-- 2. ENUMS & DOMAINS
-- ----------------------------------------------------------------------------
CREATE TYPE subscription_status_type AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE role_type AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'VIEWER');
CREATE TYPE audit_status_type AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE task_status_type AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
CREATE TYPE trigger_type AS ENUM ('CRAWLED', 'KEYWORD_DROPPED', 'CLICKS_DROPPED');
CREATE TYPE action_type AS ENUM ('EMAIL', 'SLACK', 'WEBHOOK');

-- ----------------------------------------------------------------------------
-- 3. CORE MULTI-TENANT & USER ADMINISTRATION
-- ----------------------------------------------------------------------------

-- Organizations (SaaS Tenant / Agency)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions (Stripe Integration)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    status subscription_status_type NOT NULL DEFAULT 'TRIAL',
    stripe_price_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscriptions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    amount_due INT NOT NULL, -- Stored in cents
    amount_paid INT NOT NULL, -- Stored in cents
    pdf_url VARCHAR(1024),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoices_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Roles Definition
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name role_type UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) UNIQUE NOT NULL, -- e.g. "website:create"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission Mapping (RBAC Matrix)
CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Active User Refresh Tokens (RTR Strategy)
CREATE TABLE user_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_fingerprint VARCHAR(512),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Teams (Workspaces inside Agency)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_teams_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Team Members mapping users to teams
CREATE TABLE team_members (
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 4. PROJECTS & CAMPAIGNS
-- ----------------------------------------------------------------------------

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Team-to-Project assignments
CREATE TABLE team_projects (
    team_id UUID NOT NULL,
    project_id UUID NOT NULL,
    PRIMARY KEY (team_id, project_id),
    CONSTRAINT fk_team_projects_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_projects_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- User Direct Project Assignments (Client Portal access overrides)
CREATE TABLE user_projects (
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    PRIMARY KEY (user_id, project_id),
    CONSTRAINT fk_user_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_projects_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Websites Tracked inside Projects
CREATE TABLE websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL, -- e.g. "acmestore.com"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_websites_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Competitor Domains mapped to Projects
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_competitors_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 5. KEYWORDS & CORE METRICS
-- ----------------------------------------------------------------------------

-- Keyword Clusters
CREATE TABLE keyword_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL, -- e.g. "Hiking Gear Promo"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tracked Keywords linked to Website
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    text VARCHAR(255) NOT NULL,
    volume INT DEFAULT 0,
    difficulty INT DEFAULT 0,
    cpc DECIMAL(10, 2) DEFAULT 0.00,
    cluster_id UUID REFERENCES keyword_clusters(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_keywords_website FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);

-- Competitor Keywords Rankings
CREATE TABLE competitor_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID NOT NULL,
    text VARCHAR(255) NOT NULL,
    rank INT NOT NULL,
    volume INT DEFAULT 0,
    difficulty INT DEFAULT 0,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_competitor_keywords_competitor FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 6. SEO AUDIT PIPELINES
-- ----------------------------------------------------------------------------

-- Crawler Audits
CREATE TABLE seo_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    status audit_status_type NOT NULL DEFAULT 'PENDING',
    score INT CHECK (score BETWEEN 0 AND 100),
    pages_crawled INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_seo_audits_website FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);

-- Crawled Pages and Technical Issues (High-volume document model representation)
CREATE TABLE seo_audit_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL,
    url VARCHAR(2048) NOT NULL,
    status_code INT NOT NULL,
    title VARCHAR(512),
    meta_description VARCHAR(1024),
    h1 VARCHAR(512),
    word_count INT DEFAULT 0,
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    issues JSONB NOT NULL, -- array of objects: [{ type: "broken_link", severity: "critical" }]
    CONSTRAINT fk_seo_audit_pages_audit FOREIGN KEY (audit_id) REFERENCES seo_audits(id) ON DELETE CASCADE
);

-- Backlinks discovered
CREATE TABLE backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    source_url VARCHAR(2048) NOT NULL,
    target_url VARCHAR(2048) NOT NULL,
    anchor_text VARCHAR(1024),
    domain_authority INT DEFAULT 0,
    is_nofollow BOOLEAN DEFAULT FALSE,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_backlinks_website FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 7. GENERATIVE ENGINE OPTIMIZATION (GEO) & LLM VISIBILITY
-- ----------------------------------------------------------------------------

-- AI Mention Tracker (Direct Brand Mentions in AI Engines)
CREATE TABLE ai_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID NOT NULL,
    engine VARCHAR(100) NOT NULL, -- "ChatGPT", "Gemini", "Perplexity"
    mentioned BOOLEAN DEFAULT FALSE,
    snippet TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_mentions_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- AI Citations Tracker (Source Links generated by AI engines)
CREATE TABLE ai_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID NOT NULL,
    engine VARCHAR(100) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    rank INT NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_citations_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- GEO Scores (Specific Generative metrics)
CREATE TABLE geo_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID NOT NULL,
    engine VARCHAR(100) NOT NULL,
    overall_score INT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    semantic_density INT NOT NULL CHECK (semantic_density BETWEEN 0 AND 100),
    citation_strength INT NOT NULL CHECK (citation_strength BETWEEN 0 AND 100),
    factual_precision INT NOT NULL CHECK (factual_precision BETWEEN 0 AND 100),
    information_gain INT NOT NULL CHECK (information_gain BETWEEN 0 AND 100),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_geo_scores_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- LLM Visibility metrics
CREATE TABLE llm_visibility_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID NOT NULL,
    engine VARCHAR(100) NOT NULL,
    visibility_percent DECIMAL(5, 2) NOT NULL CHECK (visibility_percent BETWEEN 0.00 AND 100.00),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_llm_visibility_scores_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- Content Assets drafted for LLM/SEO Optimization
CREATE TABLE content_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(2048),
    body TEXT NOT NULL, -- Markdown/HTML content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_content_assets_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 8. OPERATIONS, REPORTING & AUTOMATIONS
-- ----------------------------------------------------------------------------

-- Reports Configurations
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL, -- Layout instructions: { modules: ["gsc", "geo"] }
    pdf_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tasks (Operations tracking)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status_type NOT NULL DEFAULT 'TODO',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Automations (Trigger Actions)
CREATE TABLE automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    trigger_type trigger_type NOT NULL,
    action_type action_type NOT NULL,
    payload JSONB NOT NULL, -- Webhook credentials or emails: { slackChannel: "#alerts" }
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_automations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Security/Activity Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. "website.delete"
    resource_type VARCHAR(100) NOT NULL, -- e.g. "website"
    resource_id UUID,
    payload_before JSONB,
    payload_after JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 9. PARTITIONED HIGH-VOLUME ANALYTICS TABLES
-- ----------------------------------------------------------------------------

-- Google Search Console Partitioned Table (Time Partitioning)
CREATE TABLE google_search_console_data (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    query VARCHAR(2048) NOT NULL,
    page VARCHAR(2048) NOT NULL,
    clicks INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    ctr DOUBLE PRECISION NOT NULL,
    position DOUBLE PRECISION NOT NULL,
    date DATE NOT NULL,
    PRIMARY KEY (id, date),
    CONSTRAINT fk_gsc_data_website FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
) PARTITION BY RANGE (date);

-- GA4 Traffic Partitioned Table (Time Partitioning)
CREATE TABLE ga4_data (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    page_path VARCHAR(2048) NOT NULL,
    active_users INT NOT NULL DEFAULT 0,
    sessions INT NOT NULL DEFAULT 0,
    conversions INT NOT NULL DEFAULT 0,
    bounce_rate DOUBLE PRECISION NOT NULL,
    date DATE NOT NULL,
    PRIMARY KEY (id, date),
    CONSTRAINT fk_ga4_data_website FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
) PARTITION BY RANGE (date);

-- Sample partitions for June 2026
CREATE TABLE gsc_data_y2026m06 PARTITION OF google_search_console_data
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE ga4_data_y2026m06 PARTITION OF ga4_data
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- ----------------------------------------------------------------------------
-- 10. INDEXES FOR TUNED QUERY PERFORMANCE
-- ----------------------------------------------------------------------------
-- Composite indexes for time-series range lookups on partitioned tables
CREATE INDEX idx_gsc_web_date ON google_search_console_data (website_id, date DESC);
CREATE INDEX idx_ga4_web_date ON ga4_data (website_id, date DESC);

-- Cover indexing keyword lookups to avoid heap reads
CREATE INDEX idx_keywords_lookup ON keywords (website_id, cluster_id) INCLUDE (volume, difficulty, cpc);

-- Trigram index on text for wildcards/fast text matching
CREATE INDEX idx_keywords_trgm ON keywords USING gin (text gin_trgm_ops);

-- Competitor indexing for top-10 ranking gaps
CREATE INDEX idx_competitor_rankings ON competitor_keywords (competitor_id, rank) WHERE rank <= 10;

-- Audit page lookup indexes
CREATE INDEX idx_audit_pages_lookup ON seo_audit_pages (audit_id, status_code);

-- RLS filtering lookup index
CREATE INDEX idx_users_org ON users (organization_id);
CREATE INDEX idx_projects_org ON projects (organization_id);

-- ----------------------------------------------------------------------------
-- 11. TRIGGER AUTOMATIONS (UPDATED_AT UPDATING)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_modtime BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_subscriptions_modtime BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_teams_modtime BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_content_assets_modtime BEFORE UPDATE ON content_assets FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic query policies matching org_id variable (injected per-session from API middleware)
CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_users ON users
    FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_teams ON teams
    FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
