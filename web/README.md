# Dona Más · Frontend de demostración

Interfaz estática independiente con un adaptador Cloudflare Worker para las APIs Express existentes. **No cambia ningún archivo del backend (`src/`, `tests/`, `package.json` o Docker).** No convierte Express en un Worker y no incorpora un servicio de base de datos.

## Ejecutar localmente

Desde la raíz del repositorio, abre una terminal para el backend:

```sh
npm install
npm start
```

En otra terminal, inicia el frontend:

```sh
cd web
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Abre la URL que imprima Wrangler (normalmente `http://localhost:8787`). La vista inicia con datos ficticios claramente identificados. Haz clic en «Conectar con mi API», crea una cuenta como donante u organización, o inicia sesión con una cuenta del backend. Tras autenticarte, todas las operaciones se hacen contra el API real a través de rutas del mismo origen `/api/*`. Las contraseñas no se almacenan en el navegador; el access token permanece en memoria hasta cerrar/recargar la página o expirar.

## Desplegar en Cloudflare Workers

El frontend y el proxy sí se publican en Cloudflare. El backend Express **debe permanecer encendido y disponible por HTTPS en un proveedor que soporte Node.js**. `BACKEND_ORIGIN` es la URL de ese servidor, sin ruta (ej. `https://api.ejemplo.com`), no la URL del propio Worker.

```sh
cd web
npm install
npx wrangler login
npx wrangler secret put BACKEND_ORIGIN
npm run deploy
```

Al pedir el secreto, introduce el origen HTTPS del backend. No expongas JWT_SECRET en Cloudflare: solo lo necesita Express. Wrangler leerá la configuración `web/wrangler.jsonc` y publicará `web/public/`. El Worker pasa `/api/*` y `/health` al servidor existente, lo que evita modificarlo para CORS. No hace falta configurar otra URL en el navegador.

## Funcionalidad y límites reales

- Demo local, sin operaciones contra el backend y con etiquetas explícitas.
- Registro e inicio de sesión (`donor` / `beneficiary`), lista/búsqueda por estado, detalle, publicación, reclamo y confirmación de entrega, según permisos del backend.
- Impacto global desde `/api/reports/impact` solo para administradores; reporte propio desde `/api/reports/donor/:id` para donantes. Beneficiarios ven conteos derivados de la lista.
- El backend almacena usuarios y donaciones **en memoria**; un reinicio borra la información. No existe endpoint de refresh, por eso se requiere volver a entrar al caducar el token de 15 minutos. No se ofrecen cuentas de prueba persistentes.
- Las métricas de portada de la demo son ilustrativas; en modo real solo se muestran datos obtenidos de la API (o cálculos claramente etiquetados a partir de las donaciones recibidas).
