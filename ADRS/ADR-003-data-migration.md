# ADR-003: Data & Migration Strategy
- Decision: PostgreSQL. Day-1: shared DB for velocity. Target: database-per-service.
- Migrations: Per-service tool (Alembic later). Ownership: each service owns its tables only.
- Consequences: Plan for schema split and read-model replication later.