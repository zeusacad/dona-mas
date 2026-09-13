# Reportes del reto

- `unit-tests-report.txt`: salida de `npm test` (Jest) con el resumen de cobertura.
- `coverage-summary.json`: cobertura por archivo generada por Jest.
- `zap-report.html`: (agregar aquí después de correr el pipeline) reporte de OWASP ZAP descargado desde la pestaña "Actions > Artifacts" del repositorio en GitHub.
- `sonarcloud-summary.png` o `.pdf`: (agregar aquí) captura o exportación del panel de SonarCloud una vez enlazado el repositorio, mostrando deuda técnica y code smells.

Estos dos últimos se generan automáticamente al ejecutar el pipeline de GitHub Actions (`.github/workflows/ci-cd.yml`) una vez que el repositorio esté publicado en GitHub y el secreto `SONAR_TOKEN` esté configurado.
