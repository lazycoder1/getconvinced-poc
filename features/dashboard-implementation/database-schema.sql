-- Database Schema for Multi-Website Dashboard
-- PostgreSQL with UUID support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Websites table
CREATE TABLE websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Screenshots table
CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_bucket VARCHAR(100) NOT NULL,
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  description TEXT,
  annotation TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System prompts table
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  s3_key VARCHAR(500) NOT NULL,
  s3_bucket VARCHAR(100) NOT NULL,
  file_size_bytes INTEGER,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent sessions table (for analytics)
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  session_url VARCHAR(500) NOT NULL,
  user_agent TEXT,
  ip_address INET,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_screenshots_website_id ON screenshots(website_id);
CREATE INDEX idx_screenshots_sort_order ON screenshots(website_id, sort_order);
CREATE INDEX idx_system_prompts_website_id ON system_prompts(website_id);
CREATE INDEX idx_system_prompts_active ON system_prompts(website_id, is_active);
CREATE INDEX idx_agent_sessions_website_id ON agent_sessions(website_id);
CREATE INDEX idx_agent_sessions_started_at ON agent_sessions(started_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screenshots_updated_at BEFORE UPDATE ON screenshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_prompts_updated_at BEFORE UPDATE ON system_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial data for HubSpot
INSERT INTO websites (name, slug, description) VALUES
('HubSpot', 'hubspot', 'HubSpot CRM system for sales and marketing automation');

-- Example constraints
ALTER TABLE websites ADD CONSTRAINT websites_slug_format CHECK (slug ~ '^[a-z0-9-]+$');
ALTER TABLE screenshots ADD CONSTRAINT screenshots_positive_dimensions CHECK (width > 0 AND height > 0);
ALTER TABLE system_prompts ADD CONSTRAINT system_prompts_unique_active_per_website
    EXCLUDE (website_id WITH =) WHERE (is_active = true);
