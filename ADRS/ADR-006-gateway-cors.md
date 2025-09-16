# ADR-006: Gateway & CORS
- Decision: Local FE calls services directly; prod fronted by API Gateway (Nginx/Traefik/Kong).
- CORS allowed for FE origins in dev.