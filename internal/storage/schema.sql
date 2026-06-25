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
