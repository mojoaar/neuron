-- Project Neuron Database Schema

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    path VARCHAR NOT NULL UNIQUE,
    tech_stack VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR PRIMARY KEY,
    project_id VARCHAR NOT NULL, -- references projects(id)
    content VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    priority VARCHAR NOT NULL DEFAULT 'medium',
    git_branch VARCHAR,
    git_commit VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR PRIMARY KEY,
    project_id VARCHAR NOT NULL, -- references projects(id)
    name VARCHAR NOT NULL,
    description VARCHAR,
    trigger_pattern VARCHAR,
    execution_type VARCHAR NOT NULL, -- 'script', 'mcp', 'binary'
    execution_path VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
    tech_stack VARCHAR PRIMARY KEY,
    agents_md VARCHAR NOT NULL,
    plan_md VARCHAR NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_catalog (
    url VARCHAR PRIMARY KEY,
    label VARCHAR NOT NULL,
    tech_stack VARCHAR NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clusters (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cluster_projects (
    cluster_id VARCHAR NOT NULL,
    project_id VARCHAR NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cluster_id, project_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY,
    entity_type VARCHAR NOT NULL,
    entity_id VARCHAR NOT NULL,
    project_id VARCHAR,
    action VARCHAR NOT NULL,
    label VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
