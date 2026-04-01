# Deployment Guide (AWS EC2 + EKS + Argo CD)

This project is now prepared for a GitOps deployment flow on AWS:
- Terraform provisions VPC, EKS (EC2-backed node group), ECR, optional bastion EC2, and Argo CD.
- CI builds and pushes backend/frontend images to ECR.
- Argo CD syncs Kubernetes manifests from this repository.

## 1. Prerequisites

Install these tools locally:
- Terraform >= 1.6
- AWS CLI v2
- kubectl
- Helm

AWS prerequisites:
- IAM permissions for VPC, EKS, ECR, EC2, IAM role pass, and CloudWatch.
- GitHub Actions role (`AWS_ROLE_TO_ASSUME`) configured for OIDC.

## 2. Configure Terraform

Go to Terraform directory:

```bash
cd infra/terraform
```

Create tfvars from example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Update these values in `terraform.tfvars`:
- `aws_region`
- `project_name`
- `repo_url`
- `enable_bastion` (optional)
- `public_key` (only if bastion enabled)

Initialize and apply:

```bash
terraform init
terraform plan
terraform apply
```

Get outputs:

```bash
terraform output
```

Important outputs:
- `cluster_name`
- `ecr_backend_repository_url`
- `ecr_frontend_repository_url`

## 3. Configure kubectl for EKS

```bash
aws eks update-kubeconfig --region <aws_region> --name <cluster_name>
kubectl get nodes
```

## 4. Install Ingress Controller (Nginx)

The app ingress manifests use `nginx` class. Install ingress-nginx:

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

## 5. Prepare Kubernetes Runtime Secrets

Create app namespace and secret from template:

```bash
kubectl apply -f k8s/base/namespace.yaml
cp k8s/base/backend-secret.example.yaml /tmp/backend-secret.yaml
```

Edit `/tmp/backend-secret.yaml` with real values, then apply:

```bash
kubectl apply -f /tmp/backend-secret.yaml
```

Also update hostnames and API URL in:
- `k8s/base/ingress.yaml`
- `k8s/base/frontend-configmap.yaml`

## 6. Set GitHub Repository Variables and Secrets

GitHub Actions uses `.github/workflows/ci.yml`.

Set these:
- Secret: `AWS_ROLE_TO_ASSUME`
- Variable: `AWS_REGION` (example: `ap-south-1`)
- Variable: `NEXT_PUBLIC_API_URL` (example: `https://api.example.com`)

## 7. Align Kustomize Image Registry URLs

Update image registry URLs in `k8s/overlays/prod/kustomization.yaml` with Terraform output values:
- `ecr_backend_repository_url`
- `ecr_frontend_repository_url`

## 8. Bootstrap Argo CD Application

Argo CD is installed by Terraform (if `argocd_enable = true`).

Apply app definition:

```bash
kubectl apply -f argocd/application-webrtc-assistance.yaml
```

Check sync state:

```bash
kubectl -n argocd get applications
```

(Optional) get initial Argo CD admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## 9. Deployment Flow

1. Push commit to `main`.
2. GitHub Actions builds backend/frontend images and pushes to ECR (`latest` + SHA tag).
3. Argo CD syncs manifests in `k8s/overlays/prod`.
4. Workloads run in `ai-interview` namespace.

## 10. Notes and Recommendations

- For production DB, use managed PostgreSQL (RDS/Aurora/Neon) instead of SQLite.
- For production Redis, use ElastiCache and set `REDIS_URL` accordingly.
- Add TLS via cert-manager + DNS records for `app.example.com` and `api.example.com`.
- Consider Argo CD Image Updater if you want automatic SHA-tag pinning in GitOps manifests.
