# A public hosted zone makes Route 53 the authoritative DNS provider for this
# domain. Namecheap remains the registrar; its nameservers will be changed to
# the AWS nameservers returned by the output below after the first apply.
resource "aws_route53_zone" "platform" {
  name    = var.domain_name
  comment = "Public DNS for ${var.domain_name}"
}
