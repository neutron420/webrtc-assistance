variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name prefix used for tagging and naming"
  type        = string
  default     = "webrtc-assistance"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 4
}

variable "enable_bastion" {
  description = "Set true to create a small EC2 bastion host"
  type        = bool
  default     = false
}

variable "bastion_instance_type" {
  description = "EC2 type for bastion host"
  type        = string
  default     = "t3.micro"
}

variable "bastion_allowed_cidr" {
  description = "CIDR block allowed to SSH into bastion"
  type        = string
  default     = "0.0.0.0/0"
}

variable "public_key" {
  description = "Public key content for bastion SSH key pair"
  type        = string
  default     = ""
}

variable "repo_url" {
  description = "Git repository URL used by Argo CD Application"
  type        = string
  default     = "https://github.com/neutron420/webrtc-assistance.git"
}

variable "repo_target_revision" {
  description = "Git revision Argo CD should track"
  type        = string
  default     = "main"
}

variable "argocd_enable" {
  description = "Install Argo CD via Helm"
  type        = bool
  default     = true
}
