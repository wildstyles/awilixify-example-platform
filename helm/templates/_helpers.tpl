{{- define "awilixify-example-platform.labels" -}}
app.kubernetes.io/part-of: awilixify-example-platform
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end }}

{{- define "awilixify-example-platform.rabbitmqSecretName" -}}
{{- if .Values.rabbitmq.existingSecret -}}
{{ .Values.rabbitmq.existingSecret }}
{{- else -}}
{{ .Release.Name }}-rabbitmq
{{- end -}}
{{- end }}
