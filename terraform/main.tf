# main.tf

provider "aws" {
  region = "us-west-2" # Choose the region where your resources will be provisioned
}

resource "aws_instance" "chatbot_instance" {
  ami = "ami-08f78cb3cc8a4578e" # Amazon Linux 2023 AMI
  instance_type = "t3.micro"     # Free tier eligible instance type

  # Specify your key pair name here (created earlier)
  key_name = "chatbot-keypair" 

  # Security group setup to allow HTTP, HTTPS, and SSH
  security_groups = [aws_security_group.chatbot_sg.name]

  # Storage configuration
  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }

  # Tagging your instance
  tags = {
    Name = "chatbot-server"
  }
}

resource "aws_security_group" "chatbot_sg" {
  name        = "chatbot_sg"
  description = "Allow inbound HTTP, HTTPS, and SSH access"
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Open for SSH from any IP (change for security)
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Open for HTTP from any IP
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Open for HTTPS from any IP
  }

  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Open for your app port
  }
}

output "instance_public_ip" {
  value = aws_instance.chatbot_instance.public_ip
}
