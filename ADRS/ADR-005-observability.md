# ADR-005: Observability & Error Shape
- Decision: JSON logs with request_id; /health for readiness; /metrics (Prom later).
- Error envelope: { error_code, message, details?, request_id }.