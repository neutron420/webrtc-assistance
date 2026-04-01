output "aws_region" {
  description = "Region where resources are created"
  value       = var.aws_region
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "ecr_backend_repository_url" {
  description = "ECR URL for backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR URL for frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "argocd_server_hint" {
  description = "Command to fetch Argo CD admin password"
  value       = var.argocd_enable ? "kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d" : "Argo CD disabled"
}

output "bastion_public_ip" {
  description = "Public IP of bastion host"
  value       = var.enable_bastion ? aws_instance.bastion[0].public_ip : null
}
