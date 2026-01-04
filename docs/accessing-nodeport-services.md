# Accessing NodePort Services in Dev Environment

## Quick Access Guide

### ArgoCD Dashboard
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Open: http://localhost:8080
# Username: admin
# Password: FD4Fd5lo0HmEkSiu
```

### Grafana Dashboard
```bash
kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80
# Open: http://localhost:3000
# Username: admin
# Password: E8c7xUlrKv2BW2PpcFvciguSMgY=
```

---

## Overview

To save costs (~$48/month), we use **NodePort** instead of LoadBalancer for admin-only services:
- ✅ **ArgoCD** (GitOps dashboard)
- ✅ **Grafana** (Monitoring dashboard)

The **Frontend** remains as LoadBalancer for public access.

## Access Methods

### Method 1: kubectl port-forward (Recommended for Dev)

**Easiest and most secure method** - Creates temporary tunnel from local machine to cluster.

#### ArgoCD
```bash
# Forward ArgoCD to localhost:8080
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access in browser
open http://localhost:8080

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

#### Grafana
```bash
# Forward Grafana to localhost:3000
kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80

# Access in browser
open http://localhost:3000

# Get admin password
kubectl get secret grafana-admin-credentials -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d
```

**Pro:**
- No firewall rules needed
- Encrypted tunnel
- Auto-closes when terminal closes

**Con:**
- Need to keep terminal open
- One user at a time

---

### Method 2: SSH Tunnel via Bastion (Team Access)

If multiple admins need access simultaneously:

#### Step 1: Update EKS kubeconfig on Bastion
```bash
# SSH to bastion
ssh -i ~/.ssh/nt114-bastion-key ec2-user@<BASTION_IP>

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name nt114-dev-cluster
```

#### Step 2: Create SSH Tunnel
```bash
# From your local machine - ArgoCD
ssh -i ~/.ssh/nt114-bastion-key -L 8080:localhost:8080 ec2-user@<BASTION_IP> \
  'kubectl port-forward svc/argocd-server -n argocd 8080:443'

# From your local machine - Grafana
ssh -i ~/.ssh/nt114-bastion-key -L 3000:localhost:3000 ec2-user@<BASTION_IP> \
  'kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80'
```

#### Step 3: Access
```bash
# ArgoCD
open http://localhost:8080

# Grafana
open http://localhost:3000
```

---

### Method 3: Direct NodePort Access (Quick Testing)

**Only use for quick testing** - requires opening security groups.

#### Step 1: Get NodePort
```bash
# ArgoCD NodePort
kubectl get svc argocd-server -n argocd

# Grafana NodePort
kubectl get svc monitoring-grafana -n monitoring

# Example output:
# NAME              TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
# argocd-server     NodePort   10.100.200.50   <none>        443:32567/TCP    1d
#                                                                  ^^^^^ NodePort
```

#### Step 2: Get Node IP
```bash
# Get any node IP
kubectl get nodes -o wide

# Example output:
# NAME                             STATUS   INTERNAL-IP
# ip-11-0-1-123.ec2.internal      Ready    11.0.1.123
```

#### Step 3: Update Security Group
```bash
# Get node security group
aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=11.0.1.123" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text

# Add inbound rule (replace <YOUR_IP> and <SECURITY_GROUP_ID>)
aws ec2 authorize-security-group-ingress \
  --group-id <SECURITY_GROUP_ID> \
  --protocol tcp \
  --port 30000-32767 \
  --cidr <YOUR_IP>/32
```

#### Step 4: Access
```bash
# ArgoCD
open http://11.0.1.123:32567

# Grafana
open http://11.0.1.123:32568
```

**Warning:** Opens cluster nodes to Internet - use ONLY for testing!

---

## Comparison Table

| Method | Security | Team Access | Persistent | Firewall Changes |
|--------|----------|-------------|------------|------------------|
| **kubectl port-forward** | ✅ Excellent | ❌ Single user | ❌ No | ✅ None needed |
| **SSH Tunnel** | ✅ Excellent | ✅ Multiple users | ❌ No | ✅ None needed |
| **Direct NodePort** | ⚠️ Poor | ✅ Multiple users | ✅ Yes | ❌ Required |

## Recommended: kubectl port-forward

For dev environment, **kubectl port-forward** is the best choice:
```bash
# Add these to your shell aliases (~/.bashrc or ~/.zshrc)
alias argocd-dev='kubectl port-forward svc/argocd-server -n argocd 8080:443'
alias grafana-dev='kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80'

# Then just run:
argocd-dev    # Access at http://localhost:8080
grafana-dev   # Access at http://localhost:3000
```

## Cost Savings

| Service | Before | After | Savings |
|---------|--------|-------|---------|
| ArgoCD | LoadBalancer ($16/mo) | NodePort ($0) | **$16/mo** |
| Grafana | LoadBalancer ($16/mo) | NodePort ($0) | **$16/mo** |
| API Gateway | LoadBalancer ($16/mo) | ClusterIP ($0) | **$16/mo** |
| **Total** | **$48/mo** | **$0** | **$48/mo** ✅ |

Frontend LoadBalancer remains ($16/mo) for public user access.

**Total Infrastructure Savings:**
- Nodes: 6→3 nodes = $120/mo saved
- LoadBalancers: 4→1 = $48/mo saved
- **Grand Total: $168/mo saved (~55% reduction)** 🎉
