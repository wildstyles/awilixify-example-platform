# A public hosted zone makes Route 53 the authoritative DNS provider for this
# domain. Namecheap remains the registrar; its nameservers will be changed to
# the AWS nameservers returned by the output below after the first apply.
resource "aws_route53_zone" "platform" {
  name    = var.domain_name
  comment = "Public DNS for ${var.domain_name}"
}

# ACM issues the browser-trusted certificate that the public ALB will present.
# Exact hostnames keep this learning certificate limited to the two public apps.
resource "aws_acm_certificate" "platform" {
  domain_name               = "api.${var.domain_name}"
  subject_alternative_names = ["devtools.${var.domain_name}"]
  validation_method         = "DNS"

  # If the hostnames change later, issue the replacement before removing the
  # certificate currently attached to a running load balancer.
  lifecycle {
    create_before_destroy = true
  }
}

# ACM returns one ownership-proof CNAME for each certificate hostname. This
# loop writes those records into the authoritative Route 53 hosted zone.
resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.platform.domain_validation_options :
    option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id = aws_route53_zone.platform.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

# ACM validates the certificate asynchronously after the CNAME records appear.
# This Terraform waiter completes only after ACM marks it as issued; otherwise
# the apply eventually fails instead of succeeding with a pending certificate.
resource "aws_acm_certificate_validation" "platform" {
  certificate_arn = aws_acm_certificate.platform.arn
  validation_record_fqdns = [
    for record in aws_route53_record.certificate_validation : record.fqdn
  ]
}
