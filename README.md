# DonaMas

Sistema web para gestionar donaciones de alimentos y recursos entre empresas y organizaciones sociales.

## Requisitos

- Node.js 18 o superior
- npm

## Instalacion

```bash
npm install
```

## Ejecutar el servidor

```bash
npm start
```

El servidor inicia en `http://localhost:3000`.

## Ejecutar pruebas

```bash
npm test
```

Esto ejecuta la suite completa de pruebas unitarias con Jest y genera el reporte de cobertura.

## Ejecutar con Docker

```bash
docker compose up --build
```

## Estructura del proyecto

```
donamas/
|-- .github/workflows/ci-cd.yml   Pipeline de integracion y despliegue continuo
|-- src/
|   |-- auth/                     Registro, login, JWT y roles
|   |-- donations/                Publicacion, consulta, reclamo y entrega de donaciones
|   |-- reports/                  Reportes de impacto y por donante
|   |-- app.js                    Punto de entrada de la aplicacion
|-- tests/                        Pruebas unitarias (Jest + Supertest)
|-- Dockerfile
|-- docker-compose.yml
|-- sonar-project.properties
```

## Endpoints principales

| Metodo | Ruta                          | Descripcion                          | Rol requerido        |
|--------|--------------------------------|---------------------------------------|------------------------|
| POST   | /api/auth/register             | Registrar usuario                     | Publico                |
| POST   | /api/auth/login                | Iniciar sesion                        | Publico                |
| GET    | /api/auth/me                   | Obtener usuario autenticado           | Autenticado             |
| POST   | /api/donations                 | Crear donacion                        | admin, donor            |
| GET    | /api/donations                 | Listar donaciones                     | Autenticado             |
| GET    | /api/donations/:id             | Obtener donacion por id               | Autenticado             |
| POST   | /api/donations/:id/claim       | Reclamar donacion disponible          | admin, beneficiary      |
| POST   | /api/donations/:id/deliver     | Marcar donacion como entregada        | admin, donor (propio)   |
| GET    | /api/reports/impact            | Reporte global de impacto             | admin                    |
| GET    | /api/reports/donor/:donorId    | Reporte de un donante especifico      | admin o el propio donor  |

## Seguridad implementada

- Contraseñas almacenadas con hash bcrypt (10 rounds).
- Autenticacion mediante JWT con expiracion de 15 minutos para el access token y 7 dias para el refresh token.
- Autorizacion basada en roles (admin, donor, beneficiary) mediante middleware.
- Sanitizacion de entradas de texto para mitigar XSS en los campos de donaciones.
- Cabeceras de seguridad HTTP: X-Frame-Options, X-Content-Type-Options y Content-Security-Policy.
