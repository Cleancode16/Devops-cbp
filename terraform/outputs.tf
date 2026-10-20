output "public_ip" {
  description = "Elastic IP of the EventPass server"
  value       = aws_eip.eventpass.public_ip
}

output "app_url" {
  value = "http://${aws_eip.eventpass.public_ip}"
}

output "grafana_url" {
  value = "http://${aws_eip.eventpass.public_ip}:3000"
}

output "prometheus_url" {
  value = "http://${aws_eip.eventpass.public_ip}:9090"
}

output "ssh_command" {
  value = "ssh ubuntu@${aws_eip.eventpass.public_ip}"
}
