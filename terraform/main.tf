terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

# ---------- lookups ----------
data "aws_vpc" "default" {
  default = true
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720108685"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ---------- access ----------
resource "aws_key_pair" "eventpass" {
  key_name   = "${var.project}-key"
  public_key = file(pathexpand(var.public_key_path))
}

resource "aws_security_group" "eventpass" {
  name        = "${var.project}-sg"
  description = "EventPass: SSH, app, Grafana, Prometheus"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  dynamic "ingress" {
    for_each = {
      "App (HTTP)"  = 80
      "App (nginx)" = 8080
      "Grafana"     = 3000
      "Prometheus"  = 9090
    }
    content {
      description = ingress.key
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = [var.allowed_cidr]
    }
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Created before the instance (no instance reference) so its IP can be baked into user_data
# as APP_BASE_URL without a dependency cycle.
resource "aws_eip" "eventpass" {
  domain = "vpc"
  tags   = { Name = "${var.project}-eip" }
}

# ---------- compute ----------
resource "aws_instance" "eventpass" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.eventpass.key_name
  vpc_security_group_ids = [aws_security_group.eventpass.id]

  root_block_device {
    volume_size = 20 # GiB, within the 30 GiB free tier
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_tokens = "required" # IMDSv2 only
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    docker_username        = var.docker_username
    image_tag              = var.image_tag
    qr_signing_secret      = var.qr_signing_secret
    app_base_url           = "http://${aws_eip.eventpass.public_ip}"
    grafana_admin_password = var.grafana_admin_password
    prometheus_yml         = file("${path.module}/../monitoring/prometheus.yml")
    datasource_yml         = file("${path.module}/../monitoring/grafana/provisioning/datasources/prometheus.yml")
    dashboards_yml         = file("${path.module}/../monitoring/grafana/provisioning/dashboards/dashboards.yml")
    dashboard_json         = file("${path.module}/../monitoring/grafana/dashboards/eventpass.json")
  })
  user_data_replace_on_change = true

  tags = { Name = "${var.project}-server" }
}

resource "aws_eip_association" "eventpass" {
  instance_id   = aws_instance.eventpass.id
  allocation_id = aws_eip.eventpass.id
}
