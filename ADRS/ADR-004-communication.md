# ADR-004: Service Communication
- Decision: Sync via REST; async via event bus (RabbitMQ/NATS) for submissions flow.
- Events: submission.created, submission.finished (v1 minimal).
- Consequences: Idempotency for writes; retries & DLQ for consumers.