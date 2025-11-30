# ArgoCD Installation & Configuration on AWS EKS - Comprehensive Research Report

**Date:** 2025-11-30
**Project:** NT114 DevSecOps
**Version:** 1.0
**Status:** ✅ Research Complete

---

## Executive Summary

ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes that automates application deployment and lifecycle management. This report covers production-grade installation on AWS EKS, security best practices, ALB integration, GitHub authentication, ECR secrets handling, and common pitfalls.

**Key Findings:**
- High Availability (HA) installation mandatory for production (requires 3+ nodes)
- ALB integration requires careful gRPC handling and TLS configuration
- ECR authentication needs token refresh mechanism (12-hour token expiry)
- ArgoCD renders Helm charts as templates, losing Helm hooks functionality
- Automated sync with prune/selfHeal requires careful consideration for production stability
- SSO integration (AWS Cognito/Okta) strongly recommended over default admin credentials

---

## 1. ArgoCD Installation on EKS

### 1.1 Installation Methods

#### Method A: Standard Manifest (Non-HA)

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD (standard - NOT for production)
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

**Use Case:** Development/testing environments only

#### Method B: High Availability Manifest (Recommended for Production)

```bash
# Install ArgoCD HA
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
```

**Requirements:**
- Minimum 3 nodes due to pod anti-affinity
- Creates multiple replicas for: API server, repo server, application controller
- Redis in HA mode with Sentinel
- Improved fault tolerance and scalability

#### Method C: Helm Chart (Most Flexible)

```bash
# Add ArgoCD Helm repository
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install with custom values
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --set server.replicas=2 \
  --set repoServer.replicas=2 \
  --set controller.replicas=1 \
  --set redis-ha.enabled=true \
  --set redis-ha.replicas=3
```

**Custom Values Example (`argocd-values.yaml`):**

```yaml
# Production-grade ArgoCD Helm values
global:
  image:
    repository: quay.io/argoproj/argocd
    tag: v2.9.3

server:
  replicas: 2
  service:
    type: ClusterIP  # For ALB integration

  # Resource limits
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi

  # Metrics for Prometheus
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

  # Disable default TLS when using ALB with TLS termination
  extraArgs:
    - --insecure  # Only when using ALB with TLS termination

repoServer:
  replicas: 2
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

  # Enable Git LFS support
  env:
    - name: GIT_LFS_SKIP_SMUDGE
      value: "1"

controller:
  replicas: 1  # StatefulSet, can be sharded for large deployments
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi

  # Tuning parameters
  env:
    - name: ARGOCD_RECONCILIATION_TIMEOUT
      value: "180s"
    - name: ARGOCD_REPO_SERVER_TIMEOUT_SECONDS
      value: "180"

# Redis HA for production
redis-ha:
  enabled: true
  replicas: 3
  haproxy:
    enabled: true
    replicas: 3

# Disable single Redis instance
redis:
  enabled: false

# CRDs installation
crds:
  install: true
  keep: true

configs:
  # Resource customizations
  resource.customizations: |
    argoproj.io/Application:
      health.lua: |
        hs = {}
        hs.status = "Progressing"
        hs.message = ""
        if obj.status ~= nil then
          if obj.status.health ~= nil then
            hs.status = obj.status.health.status
            if obj.status.health.message ~= nil then
              hs.message = obj.status.health.message
            end
          end
        end
        return hs

  # Repository credentials template
  repositories: {}

  # RBAC configuration
  rbac:
    policy.default: role:readonly
    policy.csv: |
      p, role:org-admin, applications, *, */*, allow
      p, role:org-admin, clusters, get, *, allow
      p, role:org-admin, repositories, get, *, allow
      p, role:org-admin, repositories, create, *, allow
      p, role:org-admin, repositories, update, *, allow
      p, role:org-admin, repositories, delete, *, allow

      g, platform-team, role:org-admin
```

### 1.2 Initial Access Configuration

```bash
# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port-forward for initial access (temporary)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access: https://localhost:8080
# Username: admin
# Password: [from above command]

# IMPORTANT: Delete initial secret after configuring SSO
kubectl -n argocd delete secret argocd-initial-admin-secret
```

### 1.3 ArgoCD CLI Installation

```bash
# Install ArgoCD CLI (Linux)
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64

# Login via CLI
argocd login localhost:8080 --username admin --password [password] --insecure

# Change admin password
argocd account update-password
```

---

## 2. ALB Integration for ArgoCD UI Exposure

### 2.1 Challenge: gRPC + HTTP/HTTPS Traffic

ArgoCD serves multiple protocols on same port (TCP 443):
- **HTTPS** for UI access
- **gRPC** for CLI and API communication

### 2.2 Solution A: SSL Passthrough (Recommended for Production)

**Prerequisites:**
```bash
# Ensure ALB Controller supports SSL passthrough
kubectl patch deployment -n kube-system aws-load-balancer-controller \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--enable-ssl-passthrough"}]'
```

**Ingress Configuration:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # ALB Controller annotations
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID

    # SSL passthrough for gRPC support
    alb.ingress.kubernetes.io/ssl-passthrough: "true"
    alb.ingress.kubernetes.io/backend-protocol: HTTPS

    # Health check
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTPS

    # Security
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS-1-2-2017-01
spec:
  rules:
  - host: argocd.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 443
```

### 2.3 Solution B: TLS Termination at ALB (Simpler, No CLI Support)

**ArgoCD Server Configuration:**

```yaml
# Disable TLS on ArgoCD server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-server
        command:
        - argocd-server
        - --insecure  # Disable internal TLS
        - --staticassets
        - /shared/app
```

**Ingress with TLS Termination:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/healthcheck-path: /
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS-1-2-2017-01
spec:
  rules:
  - host: argocd.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80
```

### 2.4 Solution C: Dual Service for gRPC and HTTP (Most Compatible)

**Create separate services:**

```yaml
# HTTP/HTTPS service for UI
apiVersion: v1
kind: Service
metadata:
  name: argocd-server-http
  namespace: argocd
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app.kubernetes.io/name: argocd-server

---
# gRPC service for CLI
apiVersion: v1
kind: Service
metadata:
  name: argocd-server-grpc
  namespace: argocd
spec:
  type: ClusterIP
  ports:
  - port: 443
    targetPort: 8080
    protocol: TCP
    name: grpc
  selector:
    app.kubernetes.io/name: argocd-server
```

**Ingress with path-based routing:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID
    alb.ingress.kubernetes.io/backend-protocol-version: HTTP2
    alb.ingress.kubernetes.io/conditions.argocd-grpc: |
      [{"field":"http-header","httpHeaderConfig":{"httpHeaderName":"Content-Type", "values":["application/grpc"]}}]
    alb.ingress.kubernetes.io/actions.argocd-grpc: |
      {"type":"forward","forwardConfig":{"targetGroups":[{"serviceName":"argocd-server-grpc","servicePort":"443"}]}}
spec:
  rules:
  - host: argocd.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-grpc
            port:
              name: use-annotation
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server-http
            port:
              number: 80
```

### 2.5 DNS Configuration

**Route 53 Setup:**

```bash
# Get ALB DNS name
kubectl get ingress -n argocd argocd-server-ingress \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Create CNAME record in Route 53
# argocd.example.com -> [ALB DNS name]
```

**With External DNS (Automated):**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    external-dns.alpha.kubernetes.io/hostname: argocd.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
    # ... other ALB annotations
```

---

## 3. Authentication & Security Best Practices

### 3.1 SSO Integration (AWS Cognito)

**ArgoCD ConfigMap for Cognito:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com

  # SSO Configuration
  dex.config: |
    connectors:
    - type: oidc
      id: cognito
      name: AWS Cognito
      config:
        issuer: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
        clientID: $COGNITO_CLIENT_ID
        clientSecret: $COGNITO_CLIENT_SECRET
        requestedScopes:
          - openid
          - profile
          - email
        requestedIDTokenClaims:
          groups:
            essential: true
```

**Create Cognito Client Secret:**

```bash
kubectl create secret generic argocd-cognito-secret \
  -n argocd \
  --from-literal=clientSecret='your-cognito-client-secret'
```

### 3.2 SSO Integration (GitHub OAuth via Okta)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com

  dex.config: |
    connectors:
    - type: saml
      id: okta
      name: Okta
      config:
        ssoURL: https://yourorg.okta.com/app/yourapp/sso/saml
        entityIssuer: https://argocd.example.com/api/dex/callback
        caData: |
          [Base64 encoded certificate]
        usernameAttr: email
        emailAttr: email
        groupsAttr: groups
```

### 3.3 RBAC Configuration

**ArgoCD RBAC Policy (`argocd-rbac-cm`):**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly

  policy.csv: |
    # Platform Admin - Full Access
    p, role:platform-admin, applications, *, */*, allow
    p, role:platform-admin, clusters, *, *, allow
    p, role:platform-admin, repositories, *, *, allow
    p, role:platform-admin, projects, *, *, allow
    p, role:platform-admin, accounts, *, *, allow
    p, role:platform-admin, gpgkeys, *, *, allow
    p, role:platform-admin, certificates, *, *, allow

    # Developer - App Management Only
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, applications, override, */*, allow
    p, role:developer, repositories, get, */*, allow
    p, role:developer, projects, get, *, allow

    # DevOps - App + Cluster Management
    p, role:devops, applications, *, */*, allow
    p, role:devops, clusters, get, *, allow
    p, role:devops, repositories, *, */*, allow
    p, role:devops, projects, *, *, allow

    # Read-Only - Monitoring/Auditing
    p, role:readonly, applications, get, */*, allow
    p, role:readonly, projects, get, *, allow
    p, role:readonly, clusters, get, *, allow
    p, role:readonly, repositories, get, *, allow

    # Group Mappings (SSO)
    g, platform-team, role:platform-admin
    g, devops-team, role:devops
    g, dev-team, role:developer
    g, monitoring-team, role:readonly

  scopes: '[groups, email]'
```

### 3.4 Network Security

**Security Group for ALB:**

```hcl
# Terraform example
resource "aws_security_group" "argocd_alb" {
  name_prefix = "argocd-alb-"
  vpc_id      = var.vpc_id

  # Allow HTTPS from internet
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Consider restricting to VPN/Corporate IPs
    description = "HTTPS access to ArgoCD"
  }

  # HTTP redirect to HTTPS
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP redirect"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "argocd-alb-sg"
  }
}
```

**Restrict to Corporate IPs (Recommended):**

```yaml
annotations:
  alb.ingress.kubernetes.io/inbound-cidrs: "203.0.113.0/24,198.51.100.0/24"  # Corporate IPs
```

### 3.5 TLS Best Practices

**ACM Certificate Request:**

```bash
# Request wildcard certificate
aws acm request-certificate \
  --domain-name "*.example.com" \
  --subject-alternative-names "example.com" \
  --validation-method DNS \
  --region us-east-1
```

**cert-manager Integration (Alternative):**

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-tls
  namespace: argocd
spec:
  secretName: argocd-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - argocd.example.com
```

---

## 4. GitHub Private Repository Configuration

### 4.1 SSH Key Authentication (Recommended)

**Step 1: Generate SSH Key Pair**

```bash
# Generate ED25519 key (modern, secure)
ssh-keygen -t ed25519 -C "argocd@example.com" -f argocd-github-key -N ""

# Or RSA 4096 (wider compatibility)
ssh-keygen -t rsa -b 4096 -C "argocd@example.com" -f argocd-github-key -N ""
```

**Step 2: Add Public Key to GitHub**

```
1. Go to GitHub repository → Settings → Deploy keys
2. Click "Add deploy key"
3. Title: "ArgoCD EKS Cluster"
4. Key: [paste contents of argocd-github-key.pub]
5. ✓ Allow write access (if ArgoCD needs to write commit status)
6. Click "Add key"
```

**Step 3: Create Kubernetes Secret**

```bash
# Create secret with SSH private key
kubectl create secret generic argocd-github-ssh-key \
  -n argocd \
  --from-file=sshPrivateKey=argocd-github-key \
  --dry-run=client -o yaml | kubectl apply -f -

# Label for ArgoCD to recognize
kubectl label secret argocd-github-ssh-key \
  -n argocd \
  argocd.argoproj.io/secret-type=repository
```

**Step 4: Register Repository (Declarative)**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@github.com:yourorg/yourrepo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
    [... full private key content ...]
    -----END OPENSSH PRIVATE KEY-----
```

**Step 5: SSH Known Hosts (Security)**

```bash
# Get GitHub's SSH public key
ssh-keyscan github.com > /tmp/github_known_hosts

# Add to ArgoCD
kubectl create configmap argocd-ssh-known-hosts-cm \
  -n argocd \
  --from-file=ssh_known_hosts=/tmp/github_known_hosts
```

**Or via ArgoCD CLI:**

```bash
argocd cert add-ssh --batch github.com
```

### 4.2 Repository Credential Templates (Multiple Repos)

**For multiple repositories in same GitHub org:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-credentials
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:yourorg
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    [... private key ...]
    -----END OPENSSH PRIVATE KEY-----
```

**Now all repos matching `git@github.com:yourorg/*` will use these credentials automatically.**

### 4.3 GitHub Token Authentication (Alternative)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-token-credentials
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/yourorg/yourrepo
  password: ghp_YourGitHubPersonalAccessToken
  username: not-used  # Can be any string
```

**GitHub Token Permissions Required:**
- `repo` - Full control of private repositories

### 4.4 Using External Secrets Operator (Production Best Practice)

**Store SSH key in AWS Secrets Manager:**

```bash
aws secretsmanager create-secret \
  --name argocd/github-ssh-key \
  --secret-string file://argocd-github-key \
  --region us-east-1
```

**ExternalSecret Resource:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: argocd-github-repo
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: private-repo
    creationPolicy: Owner
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      stringData:
        type: git
        url: git@github.com:yourorg/yourrepo.git
        sshPrivateKey: "{{ .sshkey | toString }}"
  data:
  - secretKey: sshkey
    remoteRef:
      key: argocd/github-ssh-key
```

---

## 5. ECR Image Pull Secrets Configuration

### 5.1 Challenge: ECR Token Expiration

ECR authorization tokens expire after **12 hours**, requiring automated refresh mechanism.

### 5.2 Solution A: CronJob Token Refresh (Recommended)

**IAM Role for EKS Service Account:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-cred-helper
  namespace: argocd
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/ECRCredentialHelperRole
```

**IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

**CronJob to Refresh ECR Token:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
  namespace: argocd
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-cred-helper
          containers:
          - name: ecr-token-helper
            image: amazon/aws-cli:latest
            command:
            - /bin/bash
            - -c
            - |
              #!/bin/bash
              set -e

              # Get ECR credentials
              DOCKER_REGISTRY_SERVER=https://ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
              DOCKER_USER=AWS
              DOCKER_PASSWORD=$(aws ecr get-login-password --region us-east-1)

              # Create/update docker-registry secret
              kubectl delete secret ecr-pull-secret -n argocd --ignore-not-found
              kubectl create secret docker-registry ecr-pull-secret \
                --docker-server=$DOCKER_REGISTRY_SERVER \
                --docker-username=$DOCKER_USER \
                --docker-password=$DOCKER_PASSWORD \
                -n argocd

              echo "ECR credentials updated successfully at $(date)"
          restartPolicy: OnFailure
```

**Apply to ArgoCD Application Manifests:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: default
spec:
  imagePullSecrets:
  - name: ecr-pull-secret
  containers:
  - name: app
    image: ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

### 5.3 Solution B: ECR Secret Operator

**Install ECR Secret Operator:**

```bash
kubectl apply -f https://raw.githubusercontent.com/totient-labs/ecr-secret-operator/main/deploy/operator.yaml
```

**ECRSecret Custom Resource:**

```yaml
apiVersion: ecr.ops.totient.bio/v1alpha1
kind: ECRSecret
metadata:
  name: ecr-pull-secret
  namespace: argocd
spec:
  region: us-east-1
  secretName: ecr-pull-secret
  refreshInterval: 6h
```

**Operator automatically refreshes tokens before expiration.**

### 5.4 Solution C: ArgoCD Image Updater with ECR

**ArgoCD Image Updater Configuration:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
    - name: ECR
      prefix: ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
      api_url: https://ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
      credentials: ext:/scripts/ecr-login.sh
      defaultns: library
```

**ECR Login Script:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-ecr-script
  namespace: argocd
data:
  ecr-login.sh: |
    #!/bin/bash
    aws ecr get-login-password --region us-east-1
```

### 5.5 IAM Roles for Service Accounts (IRSA) Configuration

**Trust Policy for OIDC Provider:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/OIDC_ID"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/OIDC_ID:sub": "system:serviceaccount:argocd:ecr-cred-helper",
          "oidc.eks.us-east-1.amazonaws.com/id/OIDC_ID:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

---

## 6. ArgoCD Application Manifest Structure

### 6.1 Basic Application for Helm Charts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-management-service
  namespace: argocd
  finalizers:
  - resources-finalizer.argocd.argoproj.io  # Enable cascading delete
spec:
  # Project (for RBAC and resource isolation)
  project: nt114-devsecops

  # Source: Git repository with Helm chart
  source:
    repoURL: git@github.com:yourorg/nt114-devsecops.git
    targetRevision: main  # Can be branch, tag, or commit SHA
    path: helm/user-management-service

    # Helm specific configuration
    helm:
      # Values file references
      valueFiles:
      - values-eks.yaml

      # Inline value overrides
      values: |
        image:
          repository: ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/user-management
          tag: v1.2.3

        replicaCount: 3

        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 250m
            memory: 256Mi

      # Parameters (alternative to values)
      parameters:
      - name: image.tag
        value: v1.2.3

      # Skip CRDs (if already installed)
      skipCrds: false

      # Release name (default: app name)
      releaseName: user-management

  # Destination: Target cluster and namespace
  destination:
    server: https://kubernetes.default.svc  # In-cluster
    namespace: dev

  # Sync policy
  syncPolicy:
    # Automated sync
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Revert manual changes
      allowEmpty: false  # Prevent empty sync

    # Sync options
    syncOptions:
    - CreateNamespace=true      # Auto-create namespace
    - PruneLast=true            # Delete resources after new ones are healthy
    - RespectIgnoreDifferences=true
    - ApplyOutOfSyncOnly=true   # Only sync out-of-sync resources

    # Retry strategy
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

  # Ignore differences (avoid sync on known drift)
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas  # Ignore if HPA manages replicas

  # Health checks (custom if needed)
  # Uses default K8s health checks by default
```

### 6.2 Application with Sync Waves (Dependency Ordering)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: postgres-database
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Deploy first
spec:
  project: default
  source:
    repoURL: git@github.com:yourorg/nt114-devsecops.git
    targetRevision: main
    path: helm/postgres
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: false  # Don't auto-delete database
      selfHeal: true

---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-management-service
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Deploy after database
spec:
  project: default
  source:
    repoURL: git@github.com:yourorg/nt114-devsecops.git
    targetRevision: main
    path: helm/user-management-service
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 6.3 App of Apps Pattern (Recommended)

**Root Application (`apps/root-app.yaml`):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nt114-devsecops-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: git@github.com:yourorg/nt114-devsecops.git
    targetRevision: main
    path: argocd/applications  # Directory with child app manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**Child Applications (`argocd/applications/*.yaml`):**

```yaml
# argocd/applications/user-management.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-management-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: git@github.com:yourorg/nt114-devsecops.git
    targetRevision: main
    path: helm/user-management-service
    helm:
      valueFiles:
      - values-eks.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

---
# argocd/applications/exercises-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: exercises-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: git@github.com:yourorg/nt114-devsecops.git
    targetRevision: main
    path: helm/exercises-service
    helm:
      valueFiles:
      - values-eks.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 6.4 ApplicationSet for Multi-Environment Deployments

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: user-management-multienv
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: dev
        url: https://kubernetes.default.svc
        namespace: dev
        values: values-dev.yaml
      - cluster: staging
        url: https://staging-cluster-api-url
        namespace: staging
        values: values-staging.yaml
      - cluster: production
        url: https://prod-cluster-api-url
        namespace: production
        values: values-prod.yaml

  template:
    metadata:
      name: 'user-management-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: git@github.com:yourorg/nt114-devsecops.git
        targetRevision: main
        path: helm/user-management-service
        helm:
          valueFiles:
          - '{{values}}'
      destination:
        server: '{{url}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

---

## 7. Automated Sync Policies

### 7.1 Understanding Sync Options

| Option | Default | Behavior | Production Recommendation |
|--------|---------|----------|---------------------------|
| **automated** | `null` (manual) | Enables automatic sync when Git changes | ✅ Enable for non-critical apps |
| **prune** | `false` | Delete resources removed from Git | ⚠️ Use with caution |
| **selfHeal** | `false` | Revert manual cluster changes | ⚠️ Consider disabling for production |
| **allowEmpty** | `false` | Prevent sync if no resources found | ✅ Keep false (safety) |

### 7.2 Sync Policy Strategies

#### Strategy 1: Manual Sync (Staging/Production)

```yaml
syncPolicy: {}  # No automated sync
```

**Use Case:**
- Production environments requiring change approval
- Critical services needing manual verification
- During incidents when manual intervention needed

**Pros:**
- Maximum control and safety
- No surprise changes during incidents
- Clear audit trail of who deployed what

**Cons:**
- Requires manual intervention
- Slower deployment cycles
- Can drift from Git state

#### Strategy 2: Automated with Prune (Development)

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  syncOptions:
  - CreateNamespace=true
  - PruneLast=true
```

**Use Case:**
- Development environments
- Non-critical services
- Frequent iteration cycles

**Pros:**
- True GitOps - Git is source of truth
- Automatic cleanup of deleted resources
- Fast iteration

**Cons:**
- Can delete resources unexpectedly
- Fights manual fixes during debugging
- Risk of data loss if misconfigured

#### Strategy 3: Automated without Prune (Recommended for Production)

```yaml
syncPolicy:
  automated:
    prune: false     # Manual pruning required
    selfHeal: true   # Revert drift
  syncOptions:
  - CreateNamespace=true
  retry:
    limit: 5
    backoff:
      duration: 5s
      maxDuration: 3m
```

**Use Case:**
- Production services
- Balance between automation and safety
- Gradual GitOps adoption

**Pros:**
- Automated deployments
- Protection against accidental deletion
- Self-healing from drift

**Cons:**
- Manual cleanup of orphaned resources
- Can accumulate unused resources

#### Strategy 4: Selective Self-Heal (Best for Production)

```yaml
syncPolicy:
  automated:
    prune: false
    selfHeal: false  # Allow manual fixes
  syncOptions:
  - CreateNamespace=true
  - ApplyOutOfSyncOnly=true  # Only sync what's needed
  retry:
    limit: 3
    backoff:
      duration: 10s
      maxDuration: 5m

ignoreDifferences:
- group: apps
  kind: Deployment
  jsonPointers:
  - /spec/replicas  # Let HPA manage
- group: autoscaling
  kind: HorizontalPodAutoscaler
  jsonPointers:
  - /status
```

**Use Case:**
- Production environments
- Allow emergency manual fixes
- HPA-managed deployments

**Pros:**
- GitOps for normal operations
- Emergency manual fixes possible
- No fighting with automation during incidents

**Cons:**
- Drift can accumulate
- Requires periodic manual sync to Git

### 7.3 Sync Hooks

**PreSync Hook (Run before sync):**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-presync
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
      - name: migration
        image: migrate/migrate
        command: ["migrate", "-path", "/migrations", "-database", "$DB_URL", "up"]
      restartPolicy: Never
```

**PostSync Hook (Run after sync):**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test-postsync
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
      - name: test
        image: curlimages/curl
        command: ["curl", "-f", "http://user-management-service/health"]
      restartPolicy: Never
```

### 7.4 Protection Against Empty Sync

**Built-in Protection:**

```yaml
syncPolicy:
  automated:
    allowEmpty: false  # DEFAULT - prevents empty sync
```

**Additional Safety:**

```yaml
# Application-level protection
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: critical-app
  annotations:
    argocd.argoproj.io/compare-options: IgnoreExtraneous
spec:
  # ... rest of config
  syncPolicy:
    automated:
      prune: false  # CRITICAL: Never auto-delete
```

---

## 8. ArgoCD vs Direct Helm Deployment Trade-offs

### 8.1 Comparison Matrix

| Aspect | ArgoCD + Helm | Direct Helm | Winner |
|--------|---------------|-------------|---------|
| **GitOps Compliance** | ✅ Full compliance | ❌ No Git integration | ArgoCD |
| **Declarative State** | ✅ Declarative | ⚠️ Imperative commands | ArgoCD |
| **Audit Trail** | ✅ Git history | ⚠️ Helm history (cluster-stored) | ArgoCD |
| **Multi-Cluster** | ✅ Native support | ❌ Requires scripting | ArgoCD |
| **Helm Hooks** | ❌ Not supported | ✅ Full support | Helm |
| **Helm Lookups** | ❌ Limited support | ✅ Full support | Helm |
| **Helm Tests** | ❌ Not run | ✅ Supported | Helm |
| **Learning Curve** | ⚠️ Steeper | ✅ Simpler | Helm |
| **Complexity** | ⚠️ More components | ✅ Single tool | Helm |
| **CI/CD Integration** | ✅ Git-triggered | ⚠️ Pipeline-triggered | ArgoCD |
| **Rollback** | ✅ Git revert | ✅ `helm rollback` | Tie |
| **Drift Detection** | ✅ Continuous | ❌ Manual | ArgoCD |
| **Self-Healing** | ✅ Automatic | ❌ Manual | ArgoCD |
| **Secrets Management** | ⚠️ Requires plugins | ⚠️ Requires plugins | Tie |
| **Performance** | ⚠️ Extra layer | ✅ Direct | Helm |

### 8.2 Key Trade-offs Explained

#### Helm Hook Limitations

**Issue:**
```
ArgoCD renders Helm charts using: helm template . <options> | kubectl apply -f -
This means Helm hooks (pre-install, post-install, etc.) are NOT executed.
```

**Impact:**
- Database migrations via Helm hooks won't run
- Pre/post deployment scripts ignored
- Init containers defined as hooks won't execute

**Workaround:**
Use ArgoCD hooks instead:

```yaml
# Instead of Helm hook
# hooks:
#   pre-install: migration.yaml

# Use ArgoCD hook
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
```

#### Helm Lookup Function Not Working

**Issue:**
```
Helm lookup() function queries cluster state.
ArgoCD renders templates offline, so lookups return empty.
```

**Example Breaking Code:**
```yaml
# This won't work in ArgoCD
{{- $secret := lookup "v1" "Secret" .Release.Namespace "existing-secret" }}
password: {{ $secret.data.password }}
```

**Workaround:**
Use external secrets or explicit values.

#### No Helm Release History in Cluster

**Issue:**
```
ArgoCD doesn't create Helm release secrets.
`helm list` shows nothing.
`helm rollback` won't work.
```

**Impact:**
- Can't use native Helm rollback
- No Helm release metadata in cluster
- Breaking for charts relying on `.Release` properties

**Workaround:**
Use Git reverts for rollback (GitOps way).

### 8.3 When to Use Each

**Use ArgoCD:**
- ✅ Multi-cluster deployments
- ✅ Need drift detection and self-healing
- ✅ Want GitOps workflow
- ✅ Centralized deployment dashboard
- ✅ Team prefers declarative over imperative
- ✅ Regulatory compliance requires Git audit trail

**Use Direct Helm:**
- ✅ Charts heavily use Helm hooks
- ✅ Charts use lookup() function
- ✅ Simple single-cluster deployment
- ✅ Team familiar with Helm, not K8s
- ✅ Need Helm's rollback functionality
- ✅ Quick prototyping/testing

**Use Both (Hybrid):**
- ArgoCD for application deployments
- Direct Helm for infrastructure (databases, monitoring)
- ArgoCD manages Helm releases via `Application` CRDs

### 8.4 Migration Path

**Phase 1: Keep Helm, Add ArgoCD Visibility**

```bash
# Continue using Helm
helm upgrade --install myapp ./chart -f values.yaml

# Let ArgoCD monitor (read-only)
# Create Application with syncPolicy: {} (manual sync only)
```

**Phase 2: ArgoCD Sync, Keep Helm Compatibility**

```yaml
# Use ArgoCD to sync, but avoid hook-dependent charts
source:
  helm:
    skipCrds: false  # Let Helm manage CRDs
    valueFiles:
    - values.yaml
syncPolicy:
  automated: {}  # Let ArgoCD deploy
```

**Phase 3: Full GitOps**

```yaml
# Move hooks to ArgoCD annotations
# Replace lookups with explicit values
# Embrace Git as source of truth
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

---

## 9. Production Best Practices

### 9.1 High Availability Configuration

**Component Replicas:**

```yaml
# argocd-values.yaml
server:
  replicas: 2  # Minimum for HA

repoServer:
  replicas: 2  # Minimum for HA

controller:
  replicas: 1  # StatefulSet, increase for sharding large deployments

redis-ha:
  enabled: true
  replicas: 3  # Quorum: (n/2)+1 = 2

applicationSet:
  replicas: 2

notifications:
  enabled: true
```

**Resource Requests/Limits:**

```yaml
server:
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi

repoServer:
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

controller:
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi
```

**Pod Disruption Budgets:**

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: argocd-server-pdb
  namespace: argocd
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: argocd-repo-server-pdb
  namespace: argocd
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-repo-server
```

### 9.2 Performance Tuning

**Controller Parallelism:**

```yaml
controller:
  env:
  - name: ARGOCD_RECONCILIATION_TIMEOUT
    value: "180s"
  - name: ARGOCD_REPO_SERVER_TIMEOUT_SECONDS
    value: "180"

  extraArgs:
  - --status-processors=20  # Default: 20
  - --operation-processors=10  # Default: 10
  - --app-resync=180  # Seconds between full reconciliation
  - --self-heal-timeout-seconds=5
  - --repo-server-timeout-seconds=180
```

**Repository Caching:**

```yaml
repoServer:
  env:
  - name: ARGOCD_GIT_ATTEMPTS_COUNT
    value: "3"
  - name: ARGOCD_GIT_RETRY_MAX_DURATION
    value: "1m"

  volumeMounts:
  - name: repo-cache
    mountPath: /tmp/argo-repo-cache

  volumes:
  - name: repo-cache
    emptyDir: {}
```

**Redis Optimization:**

```yaml
redis-ha:
  enabled: true
  haproxy:
    replicas: 3
    resources:
      limits:
        cpu: 200m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
```

### 9.3 Monitoring & Observability

**Prometheus Metrics:**

```yaml
# argocd-values.yaml
controller:
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
      namespace: monitoring
      interval: 30s

server:
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
      namespace: monitoring

repoServer:
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
      namespace: monitoring
```

**Key Metrics to Monitor:**

```promql
# Application sync status
argocd_app_info{sync_status="OutOfSync"}

# Sync operation duration
histogram_quantile(0.95, rate(argocd_app_sync_total[5m]))

# Repository connection errors
rate(argocd_git_request_total{request_type="fetch", repo_type="git", status="error"}[5m])

# Controller queue depth
argocd_app_reconcile_count

# API server request rate
rate(argocd_api_server_request_total[5m])
```

**Grafana Dashboard:**

```bash
# Import official ArgoCD dashboard
# Dashboard ID: 14584
# https://grafana.com/grafana/dashboards/14584
```

**CloudWatch Integration:**

```yaml
# Fluent Bit configuration for ArgoCD logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: amazon-cloudwatch
data:
  application-log.conf: |
    [INPUT]
        Name              tail
        Tag               argocd.*
        Path              /var/log/containers/argocd-*_argocd_*.log
        Parser            docker
        DB                /var/log/flb_argocd.db
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On
        Refresh_Interval  10

    [OUTPUT]
        Name cloudwatch_logs
        Match   argocd.*
        region us-east-1
        log_group_name /aws/eks/nt114-devsecops/argocd
        log_stream_prefix argocd-
        auto_create_group true
```

**Alerting Rules:**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-alerts
  namespace: argocd
spec:
  groups:
  - name: argocd
    interval: 30s
    rules:
    - alert: ArgoCDAppOutOfSync
      expr: argocd_app_info{sync_status="OutOfSync"} > 0
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "ArgoCD Application {{ $labels.name }} is OutOfSync"
        description: "Application has been out of sync for more than 15 minutes"

    - alert: ArgoCDAppUnhealthy
      expr: argocd_app_info{health_status!="Healthy"} > 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "ArgoCD Application {{ $labels.name }} is unhealthy"
        description: "Health status: {{ $labels.health_status }}"

    - alert: ArgoCDSyncFailed
      expr: rate(argocd_app_sync_total{phase="Failed"}[5m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "ArgoCD sync failures detected"

    - alert: ArgoCDRepoConnectionError
      expr: rate(argocd_git_request_total{status="error"}[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Git repository connection errors"
```

### 9.4 Backup & Disaster Recovery

**Backup ArgoCD Configuration:**

```bash
#!/bin/bash
# backup-argocd.sh

BACKUP_DIR="/backup/argocd/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup ArgoCD applications
kubectl get applications -n argocd -o yaml > "$BACKUP_DIR/applications.yaml"

# Backup ArgoCD projects
kubectl get appprojects -n argocd -o yaml > "$BACKUP_DIR/projects.yaml"

# Backup secrets (repositories, credentials)
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type -o yaml > "$BACKUP_DIR/secrets.yaml"

# Backup configmaps
kubectl get configmaps -n argocd -o yaml > "$BACKUP_DIR/configmaps.yaml"

# Backup RBAC
kubectl get cm argocd-rbac-cm -n argocd -o yaml > "$BACKUP_DIR/rbac.yaml"

echo "Backup completed: $BACKUP_DIR"
```

**Automated Backup CronJob:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup
  namespace: argocd
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup-sa
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              kubectl get applications -n argocd -o yaml > /backup/applications.yaml
              kubectl get appprojects -n argocd -o yaml > /backup/projects.yaml
              aws s3 cp /backup/ s3://argocd-backups/$(date +%Y%m%d)/ --recursive
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            emptyDir: {}
          restartPolicy: OnFailure
```

**Disaster Recovery Procedure:**

```bash
# 1. Restore ArgoCD installation
helm install argocd argo/argo-cd -n argocd -f argocd-values.yaml

# 2. Wait for ArgoCD to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# 3. Restore secrets
kubectl apply -f backup/secrets.yaml

# 4. Restore projects
kubectl apply -f backup/projects.yaml

# 5. Restore applications
kubectl apply -f backup/applications.yaml

# 6. Verify
argocd app list
```

### 9.5 Security Hardening

**Network Policies:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-network-policy
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: kube-system  # ALB controller
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: argocd-repo-server
    ports:
    - protocol: TCP
      port: 8081
  - to:  # Allow DNS
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

**Pod Security Standards:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: argocd
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Secrets Encryption at Rest:**

```bash
# Enable EKS secrets encryption with KMS
aws eks update-cluster-config \
  --name eks-1 \
  --encryption-config '[{"resources":["secrets"],"provider":{"keyArn":"arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"}}]'
```

**Sealed Secrets Integration:**

```yaml
# Install Sealed Secrets controller
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Encrypt repository credentials
echo -n 'my-ssh-key' | kubectl create secret generic repo-creds \
  --dry-run=client \
  --from-file=sshPrivateKey=/dev/stdin \
  -o yaml | \
  kubeseal -o yaml > sealed-repo-creds.yaml

# Commit sealed secret to Git (safe)
git add sealed-repo-creds.yaml
```

### 9.6 Operational Best Practices

**Project Structure:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: nt114-devsecops
  namespace: argocd
spec:
  description: NT114 DevSecOps Project

  # Source repositories
  sourceRepos:
  - git@github.com:yourorg/nt114-devsecops.git

  # Destination clusters/namespaces
  destinations:
  - namespace: dev
    server: https://kubernetes.default.svc
  - namespace: staging
    server: https://staging-cluster
  - namespace: production
    server: https://prod-cluster

  # Cluster resource whitelist (what can be deployed)
  clusterResourceWhitelist:
  - group: ''
    kind: Namespace
  - group: rbac.authorization.k8s.io
    kind: ClusterRole
  - group: rbac.authorization.k8s.io
    kind: ClusterRoleBinding

  # Namespace resource blacklist (what cannot be deployed)
  namespaceResourceBlacklist:
  - group: ''
    kind: ResourceQuota
  - group: ''
    kind: LimitRange

  # Deny certain resource modifications
  orphanedResources:
    warn: true

  roles:
  - name: developer
    description: Developer role
    policies:
    - p, proj:nt114-devsecops:developer, applications, get, nt114-devsecops/*, allow
    - p, proj:nt114-devsecops:developer, applications, sync, nt114-devsecops/*, allow
    groups:
    - dev-team

  - name: admin
    description: Admin role
    policies:
    - p, proj:nt114-devsecops:admin, applications, *, nt114-devsecops/*, allow
    groups:
    - platform-team
```

**Git Repository Structure:**

```
nt114-devsecops/
├── argocd/
│   ├── applications/          # ArgoCD Application manifests
│   │   ├── user-management.yaml
│   │   ├── exercises-service.yaml
│   │   └── scores-service.yaml
│   ├── projects/              # ArgoCD Projects
│   │   └── nt114-project.yaml
│   └── root-app.yaml          # App of Apps
├── helm/
│   ├── user-management-service/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   ├── values-dev.yaml
│   │   ├── values-staging.yaml
│   │   ├── values-prod.yaml
│   │   └── templates/
│   ├── exercises-service/
│   └── scores-service/
└── environments/
    ├── dev/
    ├── staging/
    └── production/
```

**Health Check Configuration:**

```yaml
# Custom health check for ArgoCD
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.argoproj.io_Application: |
    hs = {}
    hs.status = "Progressing"
    hs.message = ""
    if obj.status ~= nil then
      if obj.status.health ~= nil then
        hs.status = obj.status.health.status
        if obj.status.health.message ~= nil then
          hs.message = obj.status.health.message
        end
      end
    end
    return hs

  # Custom health for your services
  resource.customizations.health.apps_Deployment: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.updatedReplicas == obj.spec.replicas then
        hs.status = "Healthy"
        hs.message = "All replicas ready"
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for replicas"
    return hs
```

---

## 10. Common Pitfalls & Troubleshooting

### 10.1 Common Production Issues

#### Issue 1: Application Stuck in "Progressing" State

**Symptoms:**
```
Application shows "Progressing" indefinitely
Sync completes but health never becomes "Healthy"
```

**Root Causes:**
- Missing readiness/liveness probes in pods
- Pod continuously crashing/restarting
- Resource limits causing OOMKilled
- Image pull errors

**Troubleshooting:**

```bash
# Check application details
argocd app get <app-name> --refresh

# Check pod status
kubectl get pods -n <namespace>

# Check pod events
kubectl describe pod <pod-name> -n <namespace>

# Check pod logs
kubectl logs <pod-name> -n <namespace> --previous

# Check ArgoCD application controller logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=100
```

**Solution:**
Add proper health checks:

```yaml
# Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Issue 2: Sync Fails with "ComparisonError"

**Symptoms:**
```
Application shows "OutOfSync" with ComparisonError
Error: failed to load live state: <resource> is forbidden
```

**Root Cause:**
ArgoCD service account lacks RBAC permissions.

**Solution:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-application-controller-custom
rules:
- apiGroups:
  - '*'
  resources:
  - '*'
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
  - patch

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-application-controller-custom
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-application-controller-custom
subjects:
- kind: ServiceAccount
  name: argocd-application-controller
  namespace: argocd
```

#### Issue 3: Git Repository Connection Failures

**Symptoms:**
```
Error: rpc error: code = Unknown desc = authentication required
Error: Failed to fetch repository
```

**Troubleshooting:**

```bash
# Test SSH connection from ArgoCD pod
kubectl exec -it -n argocd argocd-repo-server-xxx -- sh
ssh -T git@github.com

# Check SSH known hosts
kubectl get cm argocd-ssh-known-hosts-cm -n argocd -o yaml

# Verify repository secret
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=repository
```

**Solution:**

```bash
# Add GitHub to known hosts
argocd cert add-ssh --batch github.com

# Or manually
ssh-keyscan github.com | kubectl create configmap argocd-ssh-known-hosts-cm \
  --from-file=ssh_known_hosts=/dev/stdin \
  -n argocd \
  --dry-run=client -o yaml | kubectl apply -f -
```

#### Issue 4: ECR Image Pull Errors

**Symptoms:**
```
ImagePullBackOff
Error: pull access denied, repository does not exist or may require authentication
```

**Troubleshooting:**

```bash
# Check if ECR secret exists
kubectl get secret ecr-pull-secret -n argocd

# Verify secret is valid
kubectl get secret ecr-pull-secret -n argocd -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# Check pod's imagePullSecrets
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A5 imagePullSecrets
```

**Solution:**
Ensure CronJob is running and secret is attached:

```bash
# Manually refresh ECR token
kubectl create job --from=cronjob/ecr-token-refresh ecr-token-refresh-manual -n argocd

# Verify secret updated
kubectl get secret ecr-pull-secret -n argocd -o jsonpath='{.metadata.creationTimestamp}'
```

#### Issue 5: Self-Heal Fighting Manual Changes

**Symptoms:**
```
Made emergency manual change (e.g., increased replicas)
ArgoCD immediately reverts change
Unable to fix production issue quickly
```

**Solution:**
Temporarily disable self-heal:

```bash
# Disable auto-sync
argocd app set <app-name> --sync-policy none

# Make manual fix
kubectl scale deployment/<name> --replicas=10 -n <namespace>

# After incident, update Git and re-enable
git commit -m "Increase replicas based on incident"
argocd app set <app-name> --sync-policy automated --self-heal
```

**Better Solution:**
Use `ignoreDifferences` for HPA-managed fields:

```yaml
spec:
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas  # Ignore replica count (HPA manages this)
```

#### Issue 6: Large Manifests Causing OOM

**Symptoms:**
```
argocd-repo-server OOMKilled
Sync operations timing out
```

**Solution:**

```yaml
repoServer:
  resources:
    limits:
      memory: 2Gi  # Increase from default
    requests:
      memory: 1Gi

  env:
  - name: ARGOCD_EXEC_TIMEOUT
    value: "300s"  # Increase timeout
  - name: ARGOCD_GIT_ATTEMPTS_COUNT
    value: "3"
```

#### Issue 7: Multi-Cluster Access Denied

**Symptoms:**
```
cluster 'https://prod-cluster' has not been configured
```

**Solution:**

```bash
# Add cluster to ArgoCD
argocd cluster add arn:aws:eks:us-east-1:ACCOUNT_ID:cluster/prod-cluster \
  --name prod-cluster

# Or declaratively
kubectl create secret generic cluster-prod \
  -n argocd \
  --from-literal=name=prod-cluster \
  --from-literal=server=https://prod-cluster-api \
  --from-file=config=/path/to/kubeconfig
```

### 10.2 Performance Bottlenecks

**Issue: Slow Sync Operations**

**Diagnosis:**

```bash
# Check controller logs for slow operations
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller | grep "took longer"

# Check Prometheus metrics
argocd_app_reconcile_bucket{le="10"}  # Apps taking >10s to reconcile
```

**Solutions:**

```yaml
# 1. Increase parallelism
controller:
  extraArgs:
  - --status-processors=30      # Default: 20
  - --operation-processors=20   # Default: 10

# 2. Reduce reconciliation frequency
controller:
  extraArgs:
  - --app-resync=300  # Default: 180 seconds

# 3. Enable repository caching
repoServer:
  env:
  - name: ARGOCD_REPO_CACHE_EXPIRATION
    value: "24h"
```

### 10.3 Debugging Techniques

**Enable Debug Logging:**

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.log.level: debug
  controller.log.level: debug
  reposerver.log.level: debug
```

**Trace Sync Operation:**

```bash
# Get sync operation ID
argocd app sync <app-name> --dry-run

# Watch sync progress
argocd app watch <app-name>

# Get detailed sync result
argocd app get <app-name> --show-operation
```

**Check Resource Status:**

```bash
# Get all resources managed by app
argocd app resources <app-name>

# Get specific resource details
argocd app get <app-name> --resource Deployment:<namespace>:<name>

# Compare live vs desired state
argocd app diff <app-name>
```

---

## 11. Integration with NT114 DevSecOps Project

### 11.1 Recommended Architecture

```
GitHub Repository (git@github.com:yourorg/nt114-devsecops.git)
├── Source Code Changes
└── helm/*/values-eks.yaml Updates
          ↓
    [GitHub Actions CI]
          ↓
    Build Docker Images → Push to ECR
          ↓
    Update Image Tags in Git (values-eks.yaml)
          ↓
    [ArgoCD Auto-Sync Detects Change]
          ↓
    ArgoCD Syncs to EKS Cluster
          ↓
    Application Deployed
```

### 11.2 Integration Steps

**Step 1: Organize Repository**

```bash
# Current structure
nt114-devsecops/
├── helm/
│   ├── user-management-service/
│   │   └── values-eks.yaml
│   ├── exercises-service/
│   │   └── values-eks.yaml
│   └── scores-service/
│       └── values-eks.yaml

# Add ArgoCD directory
mkdir -p argocd/applications
```

**Step 2: Create ArgoCD Applications**

```yaml
# argocd/applications/user-management.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-management-service
  namespace: argocd
spec:
  project: nt114-devsecops
  source:
    repoURL: git@github.com:yourorg/nt114-devsecops.git
    targetRevision: main
    path: helm/user-management-service
    helm:
      valueFiles:
      - values-eks.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

**Step 3: Modify GitHub Actions Workflow**

```yaml
# .github/workflows/deploy-to-eks.yml
name: Deploy to EKS with ArgoCD

on:
  push:
    branches: [main]
    paths:
    - 'backend/user-management/**'

jobs:
  build-and-update:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    # Build and push image to ECR
    - name: Build Docker Image
      run: |
        docker build -t $ECR_REPO:$IMAGE_TAG ./backend/user-management
        docker push $ECR_REPO:$IMAGE_TAG

    # Update values-eks.yaml with new image tag
    - name: Update Helm Values
      run: |
        yq eval '.image.tag = "${{ env.IMAGE_TAG }}"' \
          -i helm/user-management-service/values-eks.yaml

    # Commit and push to trigger ArgoCD
    - name: Commit Changes
      run: |
        git config user.name "github-actions"
        git config user.email "github-actions@github.com"
        git add helm/user-management-service/values-eks.yaml
        git commit -m "Update user-management image to $IMAGE_TAG"
        git push

    # ArgoCD will auto-sync and deploy
```

**Step 4: Configure Notifications**

```yaml
# argocd-notifications-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token

  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} deployed successfully!
      Revision: {{.app.status.sync.revision}}
      Author: {{.app.status.sync.revision.author}}

  trigger.on-deployed: |
    - description: Application is synced and healthy
      send:
      - app-deployed
      when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'

  subscriptions: |
    - recipients:
      - slack:devops-channel
      triggers:
      - on-deployed
```

### 11.3 Access URLs After Setup

```
ArgoCD UI:    https://argocd.example.com
User Mgmt:    https://api.example.com/user-management
Exercises:    https://api.example.com/exercises
Scores:       https://api.example.com/scores
Frontend:     https://example.com
```

---

## 12. Conclusion & Recommendations

### 12.1 Summary

ArgoCD provides robust GitOps capabilities for EKS deployments with:
- ✅ Declarative application management
- ✅ Multi-cluster support
- ✅ Automated drift detection and self-healing
- ✅ Centralized visibility and control

**Key Considerations:**
- ⚠️ Helm hook limitations require workarounds
- ⚠️ ECR token refresh needs automation
- ⚠️ Performance tuning required for large deployments
- ⚠️ SSO integration critical for production security

### 12.2 Recommended Implementation for NT114 Project

**Phase 1: Setup (Week 1)**
1. Install ArgoCD HA on EKS cluster
2. Configure ALB with TLS termination
3. Set up AWS Cognito SSO
4. Create GitHub repository SSH credentials

**Phase 2: Migration (Week 2)**
5. Convert existing Helm deployments to ArgoCD Applications
6. Implement ECR token refresh CronJob
7. Configure monitoring and alerting
8. Test automated sync with dev environment

**Phase 3: Production (Week 3)**
9. Deploy to staging with manual sync policy
10. Implement backup procedures
11. Configure RBAC for team access
12. Production rollout with gradual sync automation

### 12.3 Critical Success Factors

1. **Start with Manual Sync** - Don't enable automated sync until confident
2. **Use App of Apps Pattern** - Better organization and dependency management
3. **Implement Monitoring Early** - Catch issues before they impact users
4. **Test DR Procedures** - Ensure backups work before you need them
5. **Document Everything** - ArgoCD configuration, troubleshooting steps, runbooks

### 12.4 Unresolved Questions

1. **Specific corporate IP ranges** for ALB ingress restriction?
2. **SSO provider preference** - AWS Cognito, Okta, or GitHub OAuth?
3. **Multi-environment strategy** - Separate clusters or namespace-based?
4. **Backup retention policy** - How long to keep ArgoCD configuration backups?
5. **Notification channels** - Slack, email, PagerDuty preferences?
6. **Cost constraints** - Impact of HA Redis on AWS costs?

---

## Sources

### Official Documentation
- [ArgoCD Installation Guide](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)
- [EKS Workshop - ArgoCD](https://www.eksworkshop.com/docs/automation/gitops/argocd/access_argocd)
- [ArgoCD Helm Integration](https://argo-cd.readthedocs.io/en/latest/user-guide/helm/)
- [ArgoCD Private Repositories](https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/)
- [ArgoCD Automated Sync Policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [ArgoCD Security Best Practices](https://argo-cd.readthedocs.io/en/stable/operator-manual/security/)
- [ArgoCD RBAC Configuration](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- [ArgoCD High Availability](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- [ArgoCD Application Specification](https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/)
- [ArgoCD Ingress Configuration](https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/)
- [ArgoCD TLS Configuration](https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/)

### ALB Integration
- [ArgoCD with AWS ALB - Medium](https://medium.com/@tanmoysantra67/setting-up-argocd-with-https-on-kubernetes-using-aws-alb-d29e58b80d72)
- [GitOps with ArgoCD on EKS - AWS Plain English](https://aws.plainenglish.io/gitops-with-argo-cd-on-amazon-eks-github-integration-alb-ingress-and-app-of-apps-2fe3f3bcd01f)
- [ArgoCD Behind ALB - Medium](https://blogs.opsflow.in/deploying-argocd-behind-an-alb-ingress-on-amazon-eks-a-step-by-step-guide-e73597bb8eb9)

### Helm & GitOps
- [3 Patterns for Deploying Helm Charts with ArgoCD - Red Hat](https://developers.redhat.com/articles/2023/05/25/3-patterns-deploying-helm-charts-argocd)
- [ArgoCD Helm Chart Tutorial - Codefresh](https://codefresh.io/learn/argo-cd/argo-cd-helm-chart/)
- [ArgoCD vs Helm Deployment - DEV Community](https://dev.to/pavanbelagatti/argo-cd-and-helm-deploy-applications-the-gitops-way-22ae)

### ECR Authentication
- [ArgoCD Image Updater Authentication](https://argocd-image-updater.readthedocs.io/en/stable/basics/authentication/)
- [Automating ECR with ArgoCD - Medium](https://medium.com/@oguzhanhiziroglu/automating-private-aws-ecr-image-management-with-argo-cd-gitops-78b1d6f7d75c)
- [ArgoCD with ECR - Medium](https://medium.com/@bmelek.alan/secure-and-automate-argo-cd-image-updater-from-aws-private-ecr-3e65a9573b69)

### Security & SSO
- [ArgoCD SSO with AWS Cognito - Medium](https://medium.com/@devopsrockers/argocd-sso-config-with-aws-cognito-c51cade75cef)
- [ArgoCD with GitHub OAuth via Okta - Medium](https://medium.com/@sumanth.culli/integrating-argocd-on-aws-eks-with-github-enterprise-oauth-via-okta-a-step-by-step-guide-9586cd4f4219)
- [Secure ArgoCD Multi-Cluster with IRSA - DEV](https://dev.to/dedicatted/secure-argocd-multi-cluster-deployment-in-aws-eks-with-irsa-36mj)

### Production & Troubleshooting
- [ArgoCD Production Best Practices - Medium](https://medium.com/@techlatest.net/argo-cd-best-practices-tips-for-seamless-application-deployment-and-monitoring-d6760d4de0ce)
- [Running ArgoCD in Production - Medium](https://medium.com/@salwan.mohamed/understanding-argo-cd-running-argo-cd-in-production-2-6-e8d582692295)
- [ArgoCD Troubleshooting Guide](https://argo-cd.readthedocs.io/en/stable/operator-manual/troubleshooting/)
- [ArgoCD Common Challenges - Devtron](https://devtron.ai/blog/common-challenges-and-limitations-of-argocd/)
- [ArgoCD FAQ](https://argo-cd.readthedocs.io/en/latest/faq/)

---

**Report End**
**Generated:** 2025-11-30
**Author:** Claude Code Research Agent
**Project:** NT114 DevSecOps
