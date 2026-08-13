# A VPC is the private network boundary containing the cluster and its nodes.
resource "aws_vpc" "eks" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.project}-eks" }
}

# An Internet Gateway gives resources with public IPs outbound internet access.
resource "aws_internet_gateway" "eks" {
  vpc_id = aws_vpc.eks.id

  tags = { Name = "${local.project}-eks" }
}

# EKS requires subnets in at least two availability zones. Public subnets avoid
# the fixed NAT Gateway cost for this temporary learning cluster.
resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.eks.id
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  cidr_block              = cidrsubnet(aws_vpc.eks.cidr_block, 8, count.index)
  map_public_ip_on_launch = true

  tags = {
    Name                     = "${local.project}-public-${count.index + 1}"
    "kubernetes.io/role/elb" = "1"
  }
}

# A route table defines where subnet traffic goes. This default route sends
# outbound traffic through the Internet Gateway.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.eks.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.eks.id
  }

  tags = { Name = "${local.project}-public" }
}

# Associations attach the shared public route table to each public subnet.
resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
