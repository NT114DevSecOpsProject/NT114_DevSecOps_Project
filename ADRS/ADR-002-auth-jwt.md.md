# ADR-002: Authentication w/ JWT
- Decision: JWT; HS256 for local/dev, RS256 + JWKS for prod.
- Issuer: auth-service; Audience: e-learning.
- Required claims: sub, role, exp, iss, aud.
- Consequences: Other services only verify; never mint tokens.