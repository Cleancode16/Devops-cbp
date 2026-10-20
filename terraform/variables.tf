variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "eventpass"
}

variable "instance_type" {
  description = "EC2 instance type (t2.micro is free-tier eligible; some newer accounts/regions use t3.micro instead)"
  type        = string
  default     = "t2.micro"
}

variable "public_key_path" {
  description = "Path to the SSH public key uploaded as the EC2 key pair"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (your IP, e.g. 203.0.113.10/32). Use 0.0.0.0/0 only if GitHub Actions must deploy over SSH."
  type        = string
}

variable "allowed_cidr" {
  description = "CIDR allowed to reach the app, Grafana and Prometheus"
  type        = string
  default     = "0.0.0.0/0"
}

variable "docker_username" {
  description = "Docker Hub user/org that hosts eventpass-server and eventpass-client images"
  type        = string
}

variable "image_tag" {
  description = "Image tag to run (latest or sha-<short>)"
  type        = string
  default     = "latest"
}

variable "qr_signing_secret" {
  description = "HMAC secret used to sign QR pass tokens"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.qr_signing_secret) >= 32
    error_message = "qr_signing_secret must be at least 32 characters."
  }
}

variable "grafana_admin_password" {
  description = "Grafana admin password on the public instance"
  type        = string
  sensitive   = true
}
