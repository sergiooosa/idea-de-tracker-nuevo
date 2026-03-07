# 🚀 AutoKPI — Panel de Clientes SaaS Multi-tenant (Marca Blanca)

> Dashboard de ventas B2B que centraliza videollamadas, llamadas telefónicas y chats. Cada cliente (tenant) accede a su panel personalizado desde un subdominio dedicado. **v2.0** añade embudos dinámicos, triggers por emoji y BYOK. **v3.0 Enterprise** añade roles/permisos dinámicos, filtro "Solo mis datos", bandeja de huérfanos, editor CRUD en tablas de rendimiento, constructor de layouts para métricas y UI profesional para reglas/emojis.

**URL de producción:** `autokpi.net` (landing + login) · `[subdominio].autokpi.net` (panel del tenant)

---

## 🆕 Novedades v3.0 — Enterprise

| Feature | Descripción | Impacto |
|---|---|---|
| 🔐 **Roles y Permisos Granulares** | CRUD de roles en Configuración. Cada rol define permisos por sección (`ver_dashboard`, `ver_rendimiento`, `ver_asesor`, `ver_bandeja`, `ver_system`, `ver_configuracion`, `ver_todo`, `editar_registros`, `configurar_sistema`, `gestionar_usuarios`, `gestionar_roles`). Al crear/editar usuarios se asigna un rol. | Configuración, Auth, Layout |
| 📋 **Nav Filtrado por Permisos** | El sidebar solo muestra las rutas para las que el usuario tiene permiso. Redirección a `/dashboard` si accede por URL sin permiso. | Layout, todas las páginas |
| 🔒 **Protección de APIs** | Cada API route verifica el permiso correspondiente (`withAuthAndPermission`). 403 si no tiene acceso. | Todas las APIs |
| 👁️ **Toggle "Solo data del asesor"** | Switch en sidebar para usuarios con `ver_todo`. Cuando activo: filtro por asesor seleccionado. Selector desplegable para elegir qué asesor ver (Yo u otros). Si no tiene `ver_todo`, siempre ve solo sus datos. | Dashboard, Performance, Asesor |
| 📥 **Bandeja de Huérfanos** | Vista `/bandeja`. Lista eventos de `eventos_huerfanos` (tabs: pendiente, resuelto, descartado). Input + "Corregir" llama al Cerebro `POST /webhooks/retry-orphan/:id`. Si la API falla se muestra error con botón "Reintentar". Extrae `share_url` y `transcript` del payload Fathom. | Bandeja, Cerebro |
| ✏️ **Editor Global (CRUD)** | En Llamadas, Videollamadas y Chats: columna "Acciones" con botón Editar. Sheet lateral para editar estado del embudo, closer asignado y nombre del lead. Mutación directa en BD. | Performance (3 tabs) |
| 📐 **Constructor de Layouts** | En Métricas Custom (Control del sistema): Select "Ubicación de la tarjeta" (Panel Ejecutivo / Rendimiento / Ambos). Dashboard y Performance renderizan métricas según `ubicacion`. | System, Dashboard, Performance |
| 🏷️ **Reglas de Etiquetas (UI)** | Selects agrupados: Condición IA (Mención de precio, Enojo, Interés…), Condición Fija (Duración > X, Intentos > Y). Campo "Mover etapa de funnel a" con etapas del embudo. | System paso 4 |
| 😀 **Triggers por Emoji (UI)** | Emoji Picker en grid; emojis ya usados en otra regla se bloquean. Estado destino = Select con etapas del embudo. | System paso 8 |
| 📊 **Métricas Personalizadas v2** | Sistema completo: métricas manuales (campos texto/número/fecha/boolean), automáticas (fórmulas con KPIs), fijas (valor constante). Búsqueda por nombre, aviso al borrar si alimenta otras, drag-and-drop para ordenar. Ver Documentación → Métricas. | System paso 5, Dashboard, Performance |

---

## Novedades v2.0 — Marca Blanca Absoluta

| Feature | Descripción | Impacto |
|---|---|---|
| 🎯 **Embudo Dinámico** | Cada tenant define sus propias etapas de embudo (`embudo_personalizado`). KPIs, gráficas y clasificaciones se adaptan automáticamente. | Dashboard, Performance, Acquisition |
| 💬 **Triggers de Chat por Emoji** | Los asesores cambian el estado del lead enviando un emoji en el chat (ej. 💰 → Cerrada). Sin IA, sin latencia. | Performance > Chats |
| 🏷️ **Tags Internos** | Campo `tags_internos` (JSONB) en las 4 tablas de eventos. Filtro global de etiquetas en el Dashboard. | Dashboard, filtros |
| 🔑 **Bring Your Own Key** | El tenant conecta su propia API Key de OpenAI para procesamiento sin límites. | Cerebro + Documentación |
| 📊 **API Externa de Ingresos** | Endpoint `POST /webhooks/external-data/:locationid` para inyectar datos financieros reales. | Dashboard financiero |
| 📖 **Documentación Interactiva** | Nueva página `/documentacion` dentro del panel del tenant con guías vivas de todas las features. | UX del tenant |
| 🤖 **InsightsChat v2** | El chatbot ahora entiende embudo, etiquetas y triggers. Nuevas intenciones + respuestas con datos dinámicos. | Chatbot |
| 🛠️ **Self-Service Config** | El CLIENTE configura todo desde `/system` (pasos 7-10): embudo, triggers, OpenAI key, fuente financiera. Sin depender del admin del SaaS. | Control del sistema |

---

## Tabla de Contenidos

- [Novedades v3.0 Enterprise](#-novedades-v30--enterprise)
- [Novedades v2.0](#novedades-v20--marca-blanca-absoluta)
- [Arquitectura General](#arquitectura-general)
- [Arquitectura v2.0 — Flujo de Datos](#-arquitectura-v20--flujo-de-datos)
- [Stack Tecnológico](#stack-tecnológico)
- [Primeros Pasos](#primeros-pasos)
- [Variables de Entorno](#variables-de-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Sistema Multi-tenant](#sistema-multi-tenant)
- [Autenticación](#autenticación)
- [Base de Datos — Tablas y Columnas](#base-de-datos--tablas-y-columnas)
- [Nuevas Columnas v2.0](#-nuevas-columnas-v20)
- [API Routes](#api-routes)
- [Capa de Queries](#capa-de-queries)
- [Páginas del Dashboard](#páginas-del-dashboard)
- [Componentes Reutilizables](#componentes-reutilizables)
- [Chatbot "Habla con tus datos"](#chatbot-habla-con-tus-datos)
- [Triggers de Chat por Emoji](#-triggers-de-chat-por-emoji)
- [Embudo Dinámico](#-embudo-dinámico)
- [Métricas Personalizadas v2](#-métricas-personalizadas-v2)
- [Descarga de PDF](#descarga-de-pdf)
- [Relación con el Cerebro (Backend)](#relación-con-el-cerebro-backend)
- [Despliegue con Docker](#despliegue-con-docker)
- [Decisiones Técnicas Importantes](#decisiones-técnicas-importantes)
- [Pendientes y Roadmap](#pendientes-y-roadmap)

---

## Arquitectura General

```
                          ┌──────────────────────────┐
                          │   autokpi.net (raíz)     │
                          │   Landing Page + Login    │
                          └─────────┬────────────────┘
                                    │ Login exitoso
                                    │ → redirect a subdominio
                                    ▼
                    ┌────────────────────────────────┐
                    │  testv1.autokpi.net/dashboard   │
                    │  Middleware detecta subdominio   │
                    │  Rewrite → /app/testv1/dashboard │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────▼───────────────────┐
                    │  API Routes (/api/data/*)       │
                    │  auth() → id_cuenta del JWT     │
                    │  Queries Drizzle → PostgreSQL    │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────▼───────────────────┐
                    │  PostgreSQL (compartida)        │
                    │  Tablas alimentadas por Cerebro │
                    └────────────────────────────────┘
```

**Flujo completo:**

1. Usuario entra a `autokpi.net/login`
2. Server Action valida credenciales (bcrypt) contra `usuarios_dashboard` JOIN `cuentas`
3. Auth.js crea JWT con `id_cuenta`, `subdominio`, `rol`, `permisos`
4. Cookie se setea en `.autokpi.net` (compartida entre subdominios)
5. Cliente redirige a `[subdominio].autokpi.net/dashboard`
6. Middleware decodifica JWT, verifica que el subdominio del token coincida con el host
7. Rewrite interno: `/dashboard` → `/app/[subdomain]/dashboard`
8. Las páginas (Client Components) hacen fetch a `/api/data/*`
9. Cada API route extrae `id_cuenta` del JWT y filtra toda la data por ese tenant

---

## 🏗️ Arquitectura v2.0 — Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL (compartida)                       │
│                                                                      │
│  cuentas                        Tablas de Eventos                    │
│  ├── embudo_personalizado []    ├── resumenes_diarios_agendas        │
│  ├── chat_triggers []           │   └── tags_internos []             │
│  ├── openai_api_key             ├── log_llamadas                     │
│  └── tipos_eventos_config []    │   └── tags_internos []             │
│                                 ├── registros_de_llamada             │
│                                 │   └── tags_internos []             │
│                                 └── chats_logs                       │
│                                     └── tags_internos []             │
└──────────────┬──────────────────────────────┬────────────────────────┘
               │                              │
    ┌──────────▼──────────┐       ┌───────────▼──────────────┐
    │  getChats()         │       │  getDashboard()           │
    │  1. Fetch triggers  │       │  1. Fetch embudo          │
    │  2. Fetch chats     │       │  2. Classify dynamically  │
    │  3. Apply triggers  │       │  3. Collect tags          │
    │  4. Override estado  │       │  4. Return distribution   │
    └──────────┬──────────┘       └───────────┬──────────────┘
               │                              │
    ┌──────────▼──────────┐       ┌───────────▼──────────────┐
    │  Performance/Chats  │       │  Dashboard                │
    │  Estado sobrescrito │       │  + Embudo dinámico        │
    │  por emoji triggers │       │  + Tag filter             │
    └─────────────────────┘       │  + Distribución embudo    │
                                  └──────────────────────────┘
```

### Nuevas tablas y endpoints v2.0

| Recurso | Tipo | Descripción |
|---|---|---|
| `cuentas.embudo_personalizado` | `jsonb` | Array de `{id, nombre, color, orden}` — etapas del embudo del tenant |
| `cuentas.chat_triggers` | `jsonb` | Array de `{trigger, accion, valor}` — emoji → cambio de estado |
| `cuentas.openai_api_key` | `text` | API Key propia del tenant para OpenAI |
| `cuentas.tipos_eventos_config` | `jsonb` | Configuración de tipos de eventos activos |
| `*.tags_internos` | `jsonb` | Tags internos por evento (en 4 tablas) |
| `/documentacion` | Página | Guía interactiva del superpoder del panel |

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| **Next.js** | 15.5 (App Router) | Framework fullstack |
| **React** | 19 | UI |
| **Auth.js** (NextAuth) | 5.0.0-beta.25 | Autenticación con Credentials + JWT |
| **@auth/core** | 0.37 | Decodificación JWT en Edge (middleware) |
| **Drizzle ORM** | 0.39 | Queries tipadas a PostgreSQL |
| **pg** (node-postgres) | 8.13 | Driver de PostgreSQL |
| **bcryptjs** | 2.4 | Validación de passwords |
| **Tailwind CSS** | 4.0 | Estilos |
| **Recharts** | 2.15 | Gráficas (barras, pie, etc.) |
| **Lucide React** | 0.474 | Iconos |
| **Sonner** | 1.7 | Toasts/notificaciones |
| **html2canvas** | 1.4 | Captura de HTML para PDF |
| **jsPDF** | 4.2 | Generación de PDF client-side |
| **date-fns** | 4.1 | Manejo de fechas |

---

## Primeros Pasos

```bash
# 1. Clonar
git clone https://github.com/sergiooosa/idea-de-tracker-nuevo.git
cd idea-de-tracker-nuevo

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# → Editar con credenciales reales (ver sección siguiente)

# 4. Desarrollo
npm run dev
# → http://localhost:3000 (landing)
# → testv1.localhost:3000/dashboard (panel tenant, requiere /etc/hosts o Chrome)

# 5. Build producción
npm run build
npm start
```

---

## Variables de Entorno

Archivo `.env.local` (nunca se sube al repo):

| Variable | Valor | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Conexión PostgreSQL. SSL automático en producción. |
| `AUTH_SECRET` | `openssl rand -base64 32` | Clave para firmar JWTs |
| `AUTH_URL` | `https://autokpi.net` | **Siempre** el dominio raíz. Nunca un subdominio ni URL de Cloud Run. |
| `AUTH_TRUST_HOST` | `true` | Necesario para proxies (Traefik, Coolify, etc.) |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `autokpi.net` | Dominio raíz para el middleware y cookies |
| `NEXT_PUBLIC_API_BASE_URL` | `https://autokpi.net` | URL base para webhooks e integraciones (Zapier, Make). Si no se define, usa `AUTH_URL`. |

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (Server Component)
│   ├── globals.css                   # Estilos globales + theme Tailwind 4
│   ├── page.tsx                      # Landing page (autokpi.net)
│   ├── login/
│   │   ├── page.tsx                  # Página de login
│   │   └── actions.ts               # Server Action: signIn + fetch subdominio
│   ├── integraciones/
│   │   └── page.tsx                  # Documentación API webhooks (pública)
│   ├── webhooks/
│   │   ├── external-data/
│   │   │   └── [locationId]/route.ts  # POST: inyectar KPIs financieros vía API Key
│   │   └── config/
│   │       └── [locationId]/route.ts  # GET: reglas_etiquetas, embudo, prompts (Cerebro, x-api-key)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts  # Handlers Auth.js (GET + POST)
│   │   │   ├── session-info/route.ts   # GET: session + permisos (v3.0)
│   │   │   └── logout/route.ts         # POST: cierra sesión
│   │   └── data/
│   │       ├── dashboard/route.ts      # KPIs globales, ranking, objeciones (+ closerEmail)
│   │       ├── videollamadas/route.ts  # GET/PUT Citas y videollamadas
│   │       ├── llamadas/route.ts       # GET/PUT Llamadas telefónicas
│   │       ├── chats/route.ts          # GET/PUT Conversaciones de chat
│   │       ├── weekly-report/route.ts  # Reporte semanal (reutiliza dashboard)
│   │       ├── asesor/route.ts         # Panel asesor + mini CRM (+ closerEmail)
│   │       ├── huerfanos/route.ts      # GET lista, PATCH corregir/descartar (v3.0)
│   │       ├── metas/route.ts          # GET + PUT metas por tenant
│   │       ├── system-config/route.ts  # GET + PUT prompts y reglas
│   │       ├── usuarios/route.ts       # CRUD usuarios del tenant
│   │       └── acquisition/route.ts    # Datos por origen/canal (+ closerEmail)
│   └── app/[subdomain]/               # Zona tenant (rewrite del middleware)
│       ├── layout.tsx                  # Sidebar + toggle "Solo mis datos" + logout + FAB chat
│       ├── dashboard/page.tsx          # Panel ejecutivo
│       ├── performance/
│       │   ├── layout.tsx              # Tabs: Videollamadas / Llamadas / Chats
│       │   ├── page.tsx                # Videollamadas
│       │   ├── llamadas/page.tsx       # Llamadas telefónicas
│       │   └── chats/page.tsx          # Chats
│       ├── asesor/page.tsx             # Panel asesor + mini CRM (Combobox por permisos)
│       ├── bandeja/page.tsx            # Bandeja de eventos huérfanos (v3.0)
│       ├── acquisition/page.tsx        # Resumen de adquisición por canal
│       ├── weekly-report/page.tsx      # Reporte semanal + PDF
│       ├── system/page.tsx             # Control del sistema (prompts, reglas, métricas, triggers)
│       ├── documentacion/page.tsx     # 📖 Documentación interactiva (v2.0)
│       ├── configuracion/page.tsx      # CRUD de usuarios
│       ├── equipo/page.tsx             # Placeholder (superadmin)
│       └── apariencia/page.tsx         # Placeholder (superadmin)
├── components/
│   ├── dashboard/                    # Componentes del panel
│   │   ├── InsightsChat.tsx          # Chatbot "Habla con tus datos" (Beta)
│   │   ├── KPICard.tsx               # Card de KPI reutilizable
│   │   ├── KpiTooltip.tsx            # Tooltip con significado y cálculo
│   │   ├── DateRangePicker.tsx       # Selector de rango de fechas
│   │   ├── DateRangeQuick.tsx        # Atajos rápidos (hoy, 7d, 30d)
│   │   ├── PageHeader.tsx            # Header de página con título y acciones
│   │   ├── TagFilter.tsx              # 🏷️ Filtro multi-select de tags (v2.0)
│   │   ├── Lead360Drawer.tsx         # Drawer de detalle de lead (placeholder)
│   │   ├── ReportButton.tsx          # FAB "Generar reporte semanal"
│   │   └── modals/                   # Modales de detalle
│   │       ├── ModalRegistrosVideollamadas.tsx
│   │       ├── ModalRegistrosLlamadas.tsx
│   │       ├── ModalConversacionChat.tsx
│   │       ├── ModalTranscripcionIA.tsx
│   │       ├── ModalTranscripcionIALlamadas.tsx
│   │       └── EditRecordSheet.tsx         # Sheet edición estado/closer/nombre (v3.0)
│   ├── landing/
│   │   └── DemoModal.tsx             # Modal tipo Calendly (4 pasos)
│   ├── login-form.tsx                # Formulario de login
│   └── ui/                           # Shadcn UI (accordion, badge, button, card, dialog, input, label, separator, tabs)
├── lib/
│   ├── permisos.ts                   # Permisos granulares, NAV_PERMISOS, helpers (v3.0)
│   ├── auth.config.ts                # Credentials Provider (Node.js runtime)
│   ├── auth.ts                       # Instancia NextAuth (cookies cross-subdomain)
│   ├── api-auth.ts                   # Helper withAuth() para API routes
│   ├── utils.ts                      # cn() para Tailwind
│   ├── db/
│   │   ├── index.ts                  # Pool PostgreSQL + Drizzle
│   │   └── schema.ts                 # Tablas + eventos_huerfanos, roles_config (v3.0)
│   └── queries/                      # Lógica de negocio por dominio
│       ├── dashboard.ts              # KPIs, ranking, objeciones, volumen (+ closer opcional)
│       ├── videollamadas.ts          # Agendas con mapeo de categorías (+ update)
│       ├── llamadas.ts               # Log de llamadas con mapeo de outcomes (+ update)
│       ├── chats.ts                  # Parsing JSONB + speed to lead (+ update)
│       ├── asesor.ts                 # Panel asesor + CRM leads (+ closer opcional)
│       ├── huerfanos.ts              # Bandeja: getHuerfanos, updateHuerfanoEstado (v3.0)
│       ├── metas.ts                  # GET/UPSERT metas_cuenta
│       ├── system-config.ts          # GET/UPDATE prompts y reglas
│       ├── usuarios.ts               # CRUD usuarios_dashboard
│       └── acquisition.ts           # Agregación por origen cruzando 3 tablas
├── contexts/
│   └── UserFilterContext.tsx         # Contexto "Solo mis datos" (v3.0)
├── middleware.ts                     # Multi-tenant: subdominio → rewrite
├── hooks/
│   ├── useApiData.ts                 # Fetch + inyecta closerEmail cuando filtro activo
│   └── useSession.ts                 # Session + permisos (v3.0)
├── types/
│   ├── index.ts                      # Interfaces compartidas (40+ tipos)
│   └── next-auth.d.ts                # Extensiones de tipos Auth.js
├── data/
│   └── mockData.ts                   # Datos mock (legacy, no se usa en páginas)
└── utils/
    └── outcomeLabels.ts              # Etiquetas de outcomes
```

---

## Sistema Multi-tenant

### Middleware (`src/middleware.ts`)

El middleware es el cerebro del routing multi-tenant. Corre en **Edge Runtime** y usa `@auth/core/jwt` para decodificar el JWT directamente (sin NextAuth wrapper).

**Lógica:**

| Condición | Acción |
|---|---|
| Dominio raíz + `/login` + ya autenticado | Redirect a `[subdominio].autokpi.net/dashboard` |
| Dominio raíz + cualquier otra ruta | `NextResponse.next()` (landing, login, integraciones, webhooks) |
| Subdominio + `/api/*` | `NextResponse.next()` (APIs no se reescriben) |
| Subdominio + sin sesión | Redirect a `autokpi.net/login` |
| Subdominio + sesión con subdominio distinto | `403 Forbidden` |
| Subdominio + `/` | Redirect a `/dashboard` |
| Subdominio + cualquier otra ruta | Rewrite a `/app/[subdomain]/[pathname]` |

**Por qué usamos `@auth/core/jwt` y no `NextAuth()`:**

Next.js 15 excluye silenciosamente el middleware del bundle si detecta imports incompatibles con Edge Runtime en la cadena de dependencias (`next-auth` → `pg` → Node.js crypto). Con `@auth/core/jwt` importamos solo la función `decode()` que usa Web Crypto API, nativa del Edge.

### Cookies Cross-subdomain

La cookie de sesión se setea con `domain: ".autokpi.net"` para que sea accesible desde cualquier subdominio. En desarrollo se omite el dominio para que `localhost` funcione.

| Entorno | Nombre cookie | Domain |
|---|---|---|
| Producción | `__Secure-next-auth.session-token` | `.autokpi.net` |
| Desarrollo | `next-auth.session-token` | *(sin domain)* |

---

## Autenticación

### Archivos de Auth

| Archivo | Runtime | Uso |
|---|---|---|
| `src/lib/auth.config.ts` | **Node.js** | Credentials Provider con `pg` + `bcryptjs`. Consulta DB para validar. |
| `src/lib/auth.ts` | **Node.js** | Instancia NextAuth con cookies cross-subdomain. Exporta `handlers`, `auth`, `signIn`, `signOut`. |
| `src/middleware.ts` | **Edge** | Decodifica JWT con `@auth/core/jwt`. No importa `auth.ts` ni `auth.config.ts`. |

### Datos en el JWT

Cuando un usuario se autentica, el JWT contiene:

```typescript
{
  id: string;           // id_evento del usuario
  id_cuenta: number;    // FK a cuentas.id_cuenta
  email: string;
  name: string | null;
  rol: string;         // Rol del usuario (resuelto desde roles_config del tenant)
  subdominio: string;   // e.g. "testv1"
  permisos: Record<string, boolean> | null;
  permisosArray: string[];  // Array de códigos de permiso (ej. "ver_todo", "editar_metas")
}
```

Los permisos se resuelven en `auth.config.ts` desde `cuentas.roles_config` según el `rol` del usuario en `usuarios_dashboard`.

### Flujo de Login

1. `login-form.tsx` (Client) envía email + password al Server Action `loginAction`
2. `loginAction` llama `signIn("credentials", { redirect: false })`
3. Auth.js ejecuta `authorize()` en `auth.config.ts`: query a `usuarios_dashboard` JOIN `cuentas`
4. Si OK, la action consulta el `subdominio` y lo retorna al cliente
5. El cliente hace `window.location.href = "https://[subdominio].autokpi.net/dashboard"`

### Helper para API Routes

Todas las API routes usan `withAuth()` de `src/lib/api-auth.ts`:

```typescript
export async function withAuth(
  req: Request,
  handler: (idCuenta: number, email: string) => Promise<Response>,
) {
  const session = await auth();
  if (!session?.user?.id_cuenta) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return handler(session.user.id_cuenta, session.user.email ?? "");
}
```

---

## Base de Datos — Tablas y Columnas

### Responsabilidad: quién escribe cada tabla

| Tabla | Escrita por | Leída por |
|---|---|---|
| `cuentas` | Setup manual + Dashboard (prompts/config) | Dashboard + Middleware |
| `usuarios_dashboard` | Dashboard (CRUD) | Auth + Dashboard |
| `resumenes_diarios_agendas` | **Cerebro** (webhooks GHL + Fathom) | Dashboard |
| `log_llamadas` | **Cerebro** (webhooks Twilio) | Dashboard |
| `registros_de_llamada` | **Cerebro** (webhooks Twilio) | Dashboard (Panel Asesor) |
| `chats_logs` | **Cerebro** (proceso de chats) | Dashboard |
| `eventos_huerfanos` | **Cerebro** (eventos sin lead) | Dashboard (Bandeja) — PATCH desde bandeja al corregir/descartar |
| `metas_cuenta` | Dashboard | Dashboard |

### `cuentas` — Tabla maestra de tenants

| Columna | Tipo | Descripción |
|---|---|---|
| `id_cuenta` | `serial PK` | ID del tenant |
| `nombre_cuenta` | `varchar` | Nombre descriptivo |
| `subdominio` | `text UNIQUE NOT NULL` | e.g. `"testv1"` |
| `configuracion_ui` | `jsonb` | Logo, colores, nombres de secciones, KPIs visibles |
| `estado_cuenta` | `text` | `"activo"`, `"inactiva"` |
| `zona_horaria_iana` | `text` | e.g. `"America/Bogota"` |
| `prompt_ventas` | `text` | Prompt de contexto de empresa para IA |
| `prompt_videollamadas` | `text` | Prompt para evaluar videollamadas |
| `prompt_llamadas` | `text` | Prompt para evaluar llamadas |
| `reglas_etiquetas` | `jsonb` | Array de `{id, condition, tag, source, funnelStage?}` — usadas por Cerebro (ver GET /webhooks/config) |
| `metricas_personalizadas` | `jsonb` | Array formato legacy (fallback). `ubicacion`: `panel_ejecutivo` \| `rendimiento` \| `ambos` |
| `metricas_config` | `jsonb` | Array de `MetricaConfig` — métricas manuales, automáticas o fijas (v3.0) |
| `metricas_manual_data` | `jsonb` | `Record<metricId, MetricaManualEntry[]>` — datos de métricas manuales (v3.0) |
| `roles_config` | `jsonb` | Array de `{rol, permisos: string[]}` — permisos dinámicos por tenant (v3.0) |

**Estructura de `configuracion_ui`:**

```json
{
  "logo_url": "",
  "color_primario": "#000000",
  "color_secundario": "#ffffff",
  "nombre_empresa_display": "Mi Empresa",
  "modulos_activos": {
    "chats": true,
    "citas_ghl": true,
    "llamadas_twilio": true,
    "videollamadas_fathom": true
  },
  "nombres_secciones": {
    "dashboard": "Panel ejecutivo",
    "performance": "Rendimiento",
    "asesor": "Panel asesor"
  },
  "columnas_visibles": { ... },
  "kpis_visibles": { ... }
}
```

### `usuarios_dashboard` — Usuarios del sistema

| Columna | Tipo | Descripción |
|---|---|---|
| `id_evento` | `serial PK` | Se usa como ID de usuario |
| `id_cuenta` | `integer FK` | Tenant al que pertenece |
| `nombre` | `text` | Nombre completo |
| `email` | `text UNIQUE NOT NULL` | Email (login) |
| `pass` | `text NOT NULL` | Hash bcrypt |
| `rol` | `text NOT NULL` | `"superadmin"` o `"usuario"` |
| `permisos` | `jsonb` | `{"system": true, "reportes": false, ...}` |
| `fathom` | `text` | API key de Fathom |
| `id_webhook_fathom` | `text` | ID webhook Fathom |

### `resumenes_diarios_agendas` — Citas y videollamadas (escrita por Cerebro)

| Columna | Tipo | Filtro de fecha |
|---|---|---|
| `id_registro_agenda` | `serial PK` | |
| `id_cuenta` | `integer NOT NULL` | |
| `fecha` | `date NOT NULL` | NO usar (es fecha de procesamiento) |
| `fecha_reunion` | `timestamptz` | **SI** — fecha real del evento |
| `nombre_de_lead` | `varchar NOT NULL` | |
| `email_lead` | `varchar` | |
| `origen` | `varchar` | Fuente/UTM del lead |
| `categoria` | `varchar` | `PDTE`, `CANCELADA`, `no_show`, `Cerrada`, `Ofertada`, `No_Ofertada` |
| `closer` | `varchar` | Nombre del asesor |
| `cash_collected` | `text` | Monto cobrado (parsear a number) |
| `facturacion` | `text` | Valor total del deal (parsear a number) |
| `resumen_ia` | `text` | Análisis forense en Markdown |
| `link_llamada` | `text` | URL de la grabación |
| `objeciones_ia` | `jsonb` | `[{objecion, categoria}]` |
| `reportmarketing` | `text` | Lead report 6 puntos |
| `tags` | `text` | Tags separados por coma |
| `idcliente` | `text` | ID del lead en sistema del cliente |
| `ghl_contact_id` | `text` | Contact ID en GoHighLevel |

### `log_llamadas` — Historial inmutable de llamadas (escrita por Cerebro)

| Columna | Tipo | Filtro de fecha |
|---|---|---|
| `id` | `bigserial PK` | |
| `id_cuenta` | `integer NOT NULL` | |
| `ts` | `timestamptz NOT NULL` | **SI** — timestamp del evento |
| `tipo_evento` | `text NOT NULL` | `pdte`, `no_contesto`, `buzon`, `efectiva_seguimiento`, `efectiva_interesado`, `efectiva_programado`, `efectiva_no_interesado` |
| `nombre_lead` | `text` | |
| `mail_lead` | `text` | |
| `phone` | `text` | |
| `closer_mail` | `text` | Email del asesor |
| `nombre_closer` | `text` | |
| `transcripcion` | `text` | Transcripción Whisper |
| `ia_descripcion` | `text` | Análisis IA |
| `speed_to_lead` | `text` | Minutos desde `pdte` (parsear a number) |
| `creativo_origen` | `text` | UTM/creativo |
| `estado_resultado` | `text` | Estado que quedó en registros_de_llamada |
| `call_sid` | `text` | SID de Twilio |
| `id_registro` | `integer` | FK a registros_de_llamada |

### `registros_de_llamada` — Estado actual del lead (escrita por Cerebro)

| Columna | Tipo | Nota |
|---|---|---|
| `id_registro` | `serial PK` | |
| `id_cuenta` | `varchar` | **OJO: es varchar, no integer** |
| `fecha_evento` | `timestamptz` | |
| `nombre_lead` | `varchar` | |
| `estado` | `varchar` | `pdte`, `seguimiento`, `interesado`, `no_interesado`, `programado` |
| `mail_lead` | `varchar` | |
| `phone_raw_format` | `varchar` | |
| `closer_mail` | `varchar` | |
| `nombre_closer` | `varchar` | |
| `speed_to_lead` | `text` | |
| `intentos_contacto` | `integer` | |
| `fecha_primera_llamada` | `timestamptz` | |
| `trancription` | `text` | (sic: typo en la BD real) |
| `iadescripcion` | `text` | |

### `chats_logs` — Conversaciones de chat (escrita por Cerebro)

| Columna | Tipo | Descripción |
|---|---|---|
| `id_evento` | `serial PK` | |
| `id_cuenta` | `integer` | |
| `fecha_y_hora_z` | `timestamptz` | Fecha del chat |
| `nombre_lead` | `text` | |
| `chat` | `jsonb` | Array de mensajes (ver formato abajo) |
| `estado` | `text` | |
| `notas_extra` | `text` | |
| `id_lead` | `text` | |
| `chatid` | `text` | |
| `origen` | `text` | Fuente del chat (fb, ig, web, etc.) |

**Formato del JSONB `chat`:**

```json
[
  {"name": "Juan", "role": "lead", "type": "WhatsApp", "status": "delivered", "message": "hola", "timestamp": "2026-01-28T03:16:26.561Z"},
  {"name": "Jessy Bot", "role": "agent", "type": "WhatsApp", "status": "sent", "message": "¡Hola! Soy Jessy...", "timestamp": "2026-01-28T03:16:48.933Z"}
]
```

La query de chats extrae del JSONB: nombre del agente (`role: "agent"` → `name`), conteo de mensajes por rol, y speed to lead (diferencia entre primer mensaje del lead y primer respuesta del agente).

### 🆕 Nuevas Columnas v2.0

#### Nuevas columnas en `cuentas`

| Columna | Tipo | Descripción |
|---|---|---|
| `openai_api_key` | `text` | API Key propia del tenant para OpenAI (BYOK) |
| `embudo_personalizado` | `jsonb` | Array de `[{id, nombre, color, orden}]` — etapas del embudo custom |
| `chat_triggers` | `jsonb` | Array de `[{trigger, accion, valor}]` — emoji → cambio de estado |
| `tipos_eventos_config` | `jsonb` | Array de `[{id, nombre, activo}]` — tipos de eventos activos |

**Formato de `embudo_personalizado`:**

```json
[
  {"id": "demo", "nombre": "Demo Agendada", "color": "#06b6d4", "orden": 1},
  {"id": "propuesta", "nombre": "Propuesta Enviada", "color": "#8b5cf6", "orden": 2},
  {"id": "cerrada", "nombre": "Cerrada", "color": "#22c55e", "orden": 3}
]
```

**Formato de `chat_triggers`:**

```json
[
  {"trigger": "💰", "accion": "cambiar_estado", "valor": "Cerrada"},
  {"trigger": "✅", "accion": "cambiar_estado", "valor": "Interesado"},
  {"trigger": "❌", "accion": "cambiar_estado", "valor": "No_Interesado"}
]
```

#### Nueva columna `tags_internos` (en 4 tablas de eventos)

| Tabla | Columna | Tipo |
|---|---|---|
| `resumenes_diarios_agendas` | `tags_internos` | `jsonb` (`string[]`) |
| `log_llamadas` | `tags_internos` | `jsonb` (`string[]`) |
| `registros_de_llamada` | `tags_internos` | `jsonb` (`string[]`) |
| `chats_logs` | `tags_internos` | `jsonb` (`string[]`) |

Estos tags son escritos por el Cerebro (backend) y leídos por el Dashboard para filtrado y agrupación.

### 🆕 Tabla `eventos_huerfanos` (v3.0)

Eventos que el Cerebro no pudo asociar a un lead (falta de correo, etc.). La bandeja (`/bandeja`) permite corregir el correo y reintentar vía Cerebro `POST /webhooks/retry-orphan/:id`. Si la API falla, la página muestra error con botón "Reintentar" (no pantalla en blanco).

| Columna | Tipo | Descripción |
|---|---|---|
| `id_huerfano` | `serial PK` | |
| `id_cuenta` | `integer NOT NULL` | Tenant |
| `origen` | `text NOT NULL` | Origen del evento (ej. `fathom`, `twilio`) |
| `motivo` | `text NOT NULL` | Motivo de huérfano (ej. "sin_email") |
| `payload_original` | `jsonb NOT NULL` | Datos crudos del evento (Fathom: puede incluir share_url, transcript) |
| `estado` | `text` | `pendiente`, `resuelto`, `descartado` (default `pendiente`) |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `metas_cuenta` — Metas persistentes por tenant

| Columna | Tipo | Descripción |
|---|---|---|
| `id_meta` | `serial PK` | |
| `id_cuenta` | `integer UNIQUE FK` | Una sola fila por tenant |
| `meta_llamadas_diarias` | `integer` | Default 50 |
| `leads_nuevos_dia_1` | `integer` | Default 3 |
| `leads_nuevos_dia_2` | `integer` | Default 4 |
| `leads_nuevos_dia_3` | `integer` | Default 5 |
| `meta_citas_semanales` | `integer` | |
| `meta_cierres_semanales` | `integer` | |
| `meta_revenue_mensual` | `numeric(12,2)` | |
| `meta_cash_collected_mensual` | `numeric(12,2)` | |
| `meta_tasa_cierre` | `numeric(5,4)` | e.g. 0.3500 = 35% |
| `meta_tasa_contestacion` | `numeric(5,4)` | |
| `meta_speed_to_lead_min` | `numeric(8,2)` | En minutos |
| `metas_por_asesor` | `jsonb` | `[{"email": "...", "meta_llamadas_diarias": 60}]` |

---

## API Routes

Todas las rutas bajo `/api/data/*` usan el helper `withAuth()` que extrae `id_cuenta` del JWT.

| Ruta | Método | Tabla(s) | Params | Página |
|---|---|---|---|---|
| `/api/auth/session-info` | GET | *(JWT)* | | Session + permisos para contexto "Solo mis datos" (v3.0) |
| `/api/data/dashboard` | GET | agendas + log_llamadas | `from`, `to`, `closerEmail?` | Panel ejecutivo |
| `/api/data/videollamadas` | GET | resumenes_diarios_agendas | `from`, `to`, `closerEmail?` | Performance > Videollamadas |
| `/api/data/videollamadas` | PUT | resumenes_diarios_agendas | body: id, nombre_lead?, closer?, categoria? | Editar registro (v3.0) |
| `/api/data/llamadas` | GET | log_llamadas + registros_de_llamada | `from`, `to`, `closerEmail?` | Performance > Llamadas (devuelve `registros` = logs, `leads` = registros por persona; el listado expandido muestra leads) |
| `/api/data/llamadas` | PUT | log_llamadas | body: id, nombre_lead?, closer_mail?, estado_resultado? | Editar registro (v3.0) |
| `/api/data/chats` | GET | chats_logs | `from`, `to`, `closerEmail?` | Performance > Chats |
| `/api/data/chats` | PUT | chats_logs | body: id, nombre_lead?, estado? | Editar registro (v3.0) |
| `/api/data/weekly-report` | GET | agendas + log_llamadas | `from`, `to` | Reporte semanal |
| `/api/data/asesor` | GET | log_llamadas + registros_de_llamada | `from`, `to`, `advisorEmail?`, `closerEmail?` | Panel asesor |
| `/api/data/huerfanos` | GET | eventos_huerfanos | `estado?` | Bandeja: lista huérfanos (v3.0) |
| `/api/data/huerfanos` | PATCH | eventos_huerfanos | body: id, accion (corregir\|descartar), correo? | Corregir/Descartar + retry Cerebro (v3.0) |
| `/api/data/acquisition` | GET | agendas + log_llamadas + chats_logs | `from`, `to` | Adquisición |
| `/api/data/metas` | GET | metas_cuenta | | System + Asesor |
| `/api/data/metas` | PUT | metas_cuenta | body JSON | System paso 6 |
| `/api/data/system-config` | GET | cuentas (prompts, reglas) | | System pasos 1-5 |
| `/api/data/system-config` | PUT | cuentas (prompts, reglas) | body JSON | System guardar |
| `/api/data/usuarios` | GET | usuarios_dashboard | | Configuración (requiere `gestionar_usuarios`) |
| `/api/data/usuarios` | POST | usuarios_dashboard | body JSON | Crear usuario |
| `/api/data/usuarios` | PUT | usuarios_dashboard | body JSON (`id`) | Editar usuario |
| `/api/data/usuarios` | DELETE | usuarios_dashboard | `?id=` | Eliminar usuario |
| `/api/data/roles` | GET | cuentas.roles_config | | Lista roles (requiere `gestionar_roles` o `gestionar_usuarios`) |
| `/api/data/roles` | PUT | cuentas.roles_config | body: `{ roles_config: RolConfig[] }` | Actualizar roles (requiere `gestionar_roles`) |
| `/api/data/asesores` | GET | log_llamadas + agendas | | Lista asesores para filtro (requiere `ver_todo`) |
| `/api/auth/logout` | POST | *(limpia cookie)* | | Cerrar sesión |
| `/webhooks/external-data/[subdominio]` | POST | kpis_externos | Header `x-api-key`, body `{ data: [{ fecha, metricas }] }` | Zapier, Make, CRMs externos |
| `/webhooks/config/[subdominio]` | GET | cuentas (solo lectura) | Header `x-api-key` | Cerebro: obtener reglas_etiquetas, embudo_personalizado, chat_triggers, prompts |

### Webhook de datos financieros externos

Permite inyectar facturación real (Stripe, PayPal, CRM) al dashboard. No requiere sesión: se autentica con `x-api-key`. Documentación pública en `autokpi.net/integraciones`.

### Webhook de configuración para el Cerebro (GET)

`GET /webhooks/config/:subdominio` devuelve la configuración activa del tenant para que el Cerebro aplique reglas de etiquetas correctamente. Autenticación: header `x-api-key` (misma API Key que external-data). Respuesta incluye: `reglas_etiquetas`, `embudo_personalizado`, `chat_triggers`, `prompts` (ventas, videollamadas, llamadas), `has_openai_key`. El Cerebro debe llamar este endpoint antes de procesar una llamada/videollamada, evaluar las condiciones de cada regla contra el resultado de la IA y escribir solo los tags configurados en `tags_internos` (no generar tags libres). Ver **Documentación** → pestaña **Etiquetas** para el flujo completo y condiciones disponibles.

---

## Capa de Queries

Cada archivo en `src/lib/queries/` encapsula la lógica de negocio para un dominio:

| Archivo | Función principal | Lógica clave |
|---|---|---|
| `dashboard.ts` | `getDashboard()` | Combina agendas + llamadas, calcula KPIs, ranking por asesor, objeciones, volumen diario |
| `videollamadas.ts` | `getVideollamadas()` | Mapea `categoria` a estados del UI (attended/qualified/canceled), parsea montos text→number |
| `llamadas.ts` | `getLlamadas()` | Lee `log_llamadas` (registros) y `registros_de_llamada` (leads); mapea tipo_evento a outcomes; agrupa por closer; devuelve ambos para Performance > Llamadas |
| `chats.ts` | `getChats()`, `updateChat()` | Parsea JSONB, extrae agente; update estado/nombre (v3.0) |
| `asesor.ts` | `getAsesorData()` | Filtra por `closer_mail` (opcional), builds mini CRM |
| `huerfanos.ts` | `getHuerfanos()`, `getHuerfanoById()`, `updateHuerfanoEstado()` | Bandeja: lista por estado, PATCH corregir/descartar (v3.0) |
| `acquisition.ts` | `getAcquisition()` | Cruza 3 tablas por origen, calcula tasas de conversión |
| `metas.ts` | `getMetas()` / `upsertMetas()` | GET con defaults si no existe, UPSERT con ON CONFLICT |
| `system-config.ts` | `getSystemConfig()` / `updateSystemConfig()` | Lee/escribe prompts y reglas en `cuentas` |
| `usuarios.ts` | `listUsuarios()` / `createUsuario()` / `updateUsuario()` / `deleteUsuario()` | CRUD con hash bcrypt |

### Regla de fechas

| Tabla | Campo para filtrar | NO usar |
|---|---|---|
| `resumenes_diarios_agendas` | `fecha_reunion` | `fecha` (es de procesamiento) |
| `log_llamadas` | `ts` | |
| `registros_de_llamada` | `fecha_evento` | |
| `chats_logs` | `fecha_y_hora_z` | |

---

## Páginas del Dashboard

Todas las páginas bajo `/app/[subdomain]/` son **Client Components** (`"use client"`) que usan el hook `useApiData<T>()`.

| Ruta visible | Archivo real | Fuente de datos |
|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | `/api/data/dashboard` |
| `/performance` | `performance/page.tsx` | `/api/data/videollamadas` |
| `/performance/llamadas` | `performance/llamadas/page.tsx` | `/api/data/llamadas` — listado por **leads** (registros_de_llamada); al expandir asesor se ven personas; clic en la fila abre las **llamadas** (log, sin pdte); si hay &gt;1 llamada no pendiente, selector; botón Editar solo en contestadas; speed to lead null → "1 min" |
| `/performance/chats` | `performance/chats/page.tsx` | `/api/data/chats` |
| `/asesor` | `asesor/page.tsx` | `/api/data/asesor` + `/api/data/metas` |
| `/acquisition` | `acquisition/page.tsx` | `/api/data/acquisition` |
| `/weekly-report` | `weekly-report/page.tsx` | `/api/data/weekly-report` |
| `/system` | `system/page.tsx` | `/api/data/system-config` + `/api/data/metas` (10 pasos: prompts, etiquetas, métricas, metas, embudo, triggers, BYOK, fuente financiera) |
| `/documentacion` | `documentacion/page.tsx` | `/api/data/system-config` — pestañas: Triggers de Chat, **Etiquetas** (flujo Cerebro + endpoint config), API de Ingresos, Embudo IA, Métricas, OpenAI Key |
| `/bandeja` | `bandeja/page.tsx` | `/api/data/huerfanos` (v3.0) |
| `/configuracion` | `configuracion/page.tsx` | `/api/data/usuarios` + `/api/data/roles` (CRUD roles + usuarios) |

---

## Componentes Reutilizables

| Componente | Descripción |
|---|---|
| `KPICard` | Card de KPI con color, valor, sublabel y tooltip |
| `KpiTooltip` | Popover que explica significado y cálculo de un KPI |
| `DateRangePicker` | Input doble de fecha (from/to) con botón reset |
| `DateRangeQuick` | Botones rápidos: Hoy, 7 días, 30 días, 90 días |
| `PageHeader` | Header con título, subtítulo, botón back y slot de acciones |
| `ReportButton` | FAB fijo que enlaza a `/weekly-report` |
| `Lead360Drawer` | Drawer lateral de detalle de lead (placeholder) |
| `EditRecordSheet` | Sheet lateral para editar estado, closer y nombre del lead (Llamadas/Videollamadas/Chats) (v3.0) |
| `InsightsChat` | Chatbot "Habla con tus datos" v2 — soporta embudo, tags, triggers |
| `TagFilter` | 🏷️ Multi-select de etiquetas internas para filtrado client-side |
| `UserFilterContext` | Contexto para toggle "Solo mis datos" y estado del filtro (v3.0) |

---

## Chatbot "Habla con tus datos"

El componente `InsightsChat.tsx` es un chatbot client-side que:

1. Al abrirse, hace fetch a `/api/data/dashboard` con rango de 7 días
2. Clasifica la intención del usuario con matching de keywords
3. Genera respuestas con datos reales del dashboard

**Intenciones soportadas (v2.0):** objeciones, speed to lead, ranking de asesores, leads sin seguimiento, revenue/facturación, tasa de cierre, tasa de contestación, volumen de llamadas, citas, resumen general, **embudo/etapas** 🆕, **etiquetas/tags** 🆕, **triggers de chat** 🆕.

Si no detecta intención, responde honestamente que no puede ayudar con eso y lista las opciones disponibles.

---

## 💬 Triggers de Chat por Emoji

Los **Chat Triggers** permiten que los asesores cambien el estado de un lead directamente desde el chat, sin necesidad de IA.

### ¿Cómo funciona?

1. El admin configura triggers en `cuentas.chat_triggers` (ej. `[{"trigger": "💰", "accion": "cambiar_estado", "valor": "Cerrada"}]`)
2. Cuando `getChats()` obtiene los registros de BD, recorre los mensajes donde `role === "agent"`
3. Si un mensaje del agente contiene un trigger configurado, se sobrescribe el campo `estado` del chat
4. El estado modificado se propaga a los KPIs y métricas del frontend

**Prioridad:** Se aplica el último trigger encontrado (recorriendo mensajes del agente de más reciente a más antiguo).

**Ahorro:** Elimina el costo de IA para clasificar chats que los asesores ya saben cómo categorizar.

---

## 🎯 Embudo Dinámico

El embudo ya no está hardcodeado. Cada tenant define sus propias etapas en `cuentas.embudo_personalizado`.

### Retrocompatibilidad

| Condición | Comportamiento |
|---|---|
| `embudo_personalizado` es `null` o `[]` | Usa el embudo estándar: `Cerrada`, `Ofertada`, `No_Ofertada`, `CANCELADA`, `PDTE` |
| `embudo_personalizado` tiene etapas | Usa las etapas del tenant para clasificar KPIs |

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `queries/dashboard.ts` | Lee `embudo_personalizado`, construye sets dinámicos, retorna `distribucionEmbudo` |
| `queries/videollamadas.ts` | `mapCategoria()` acepta embudo dinámico como parámetro |
| `queries/acquisition.ts` | Sets dinámicos para `attended` y `closed` |
| `dashboard/page.tsx` | Muestra distribución por etapa + filtro de tags |

---

## 📊 Métricas Personalizadas v2

Sistema de métricas configurable en Control del sistema → paso 5. Tres tipos:

| Tipo | Descripción |
|---|---|
| **Manual** | Campos personalizados (texto, número, fecha, boolean). Añades datos manualmente. Si hay campo fecha, filtra por rango del panel. Número → suma; boolean → conteo de true. |
| **Automática** | Fórmula con KPIs u otras métricas. Operaciones: directo, suma, promedio, división, multiplicación, resta, condición (si X op Y entonces Z sino W). Búsqueda por nombre al elegir fuentes. |
| **Fija** | Valor constante (ej. meta mensual = 100). |

- **Ubicación:** Panel Ejecutivo, Rendimiento (videollamadas) o Ambos.
- **Orden:** Drag-and-drop en la lista.
- **Editar:** Botón lápiz en cada tarjeta (Dashboard/Performance) → `/system?step=5&edit=metricId`.
- **Borrar:** Si la métrica alimenta a otras, aviso: "Esta métrica alimenta a X otras, si la eliminas esas fallarán".

Ver guía completa en **Documentación** → pestaña Métricas.

---

## Descarga de PDF

El reporte semanal (`weekly-report/page.tsx`) tiene un botón "Descargar PDF" que:

1. Captura el contenido del reporte con `html2canvas` (scale 2x)
2. Lo convierte a PDF con `jsPDF` (A4)
3. Agrega header "AutoKPI -- Reporte Semanal" + fecha
4. Descarga como `reporte-semanal-autokpi-YYYY-MM-DD.pdf`

---

## Relación con el Cerebro (Backend)

El **Cerebro** es un backend Node.js/Fastify independiente que procesa webhooks de GHL, Twilio y Fathom, y escribe en las mismas tablas de PostgreSQL que este dashboard lee.

```
GoHighLevel ──webhook──► Cerebro ──INSERT──► resumenes_diarios_agendas
Twilio       ──webhook──► Cerebro ──INSERT──► log_llamadas + registros_de_llamada
Fathom       ──webhook──► Cerebro ──UPSERT──► resumenes_diarios_agendas
Proceso chats           ► Cerebro ──INSERT──► chats_logs
Cerebro                 ► GET /webhooks/config/:subdominio (x-api-key) ► Panel: reglas_etiquetas, embudo, prompts
Dashboard (Bandeja)     ► PATCH evento      ► Cerebro POST /webhooks/retry-orphan/:id (al corregir huérfano)
```

**Este dashboard es de solo lectura** para las tablas del Cerebro. Solo escribe en:
- `cuentas` (configuración, prompts, reglas)
- `usuarios_dashboard` (CRUD de usuarios)
- `metas_cuenta` (metas del tenant)

---

## Despliegue con Docker

```bash
# Build
docker build -t autokpi-dashboard .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  -e AUTH_URL="https://autokpi.net" \
  -e AUTH_TRUST_HOST="true" \
  -e NEXT_PUBLIC_ROOT_DOMAIN="autokpi.net" \
  autokpi-dashboard
```

El Dockerfile es multi-stage (deps → builder → runner) con `output: "standalone"` para imagen mínima.

**Requisitos de infraestructura:**
- Wildcard DNS: `*.autokpi.net` → mismo servidor
- Proxy inverso (Traefik/Nginx) que pase el header `Host`
- PostgreSQL accesible con SSL en producción

---

## Decisiones Técnicas Importantes

### Middleware en `src/` (no en la raíz)

Next.js 15 busca `middleware.ts` en `path.join(appDir, '..')`. Como `appDir = src/app`, busca en `src/`. Si lo pones en la raíz del proyecto, el middleware-manifest queda vacío y nunca se ejecuta.

### `@auth/core/jwt` en vez de `NextAuth()` para middleware

Next.js 15 excluye silenciosamente el middleware del bundle cuando detecta imports incompatibles con Edge Runtime en la cadena de dependencias. `@auth/core/jwt` solo importa `decode()` que usa Web Crypto API nativa.

### `registros_de_llamada.id_cuenta` es `varchar`

A diferencia de las demás tablas donde `id_cuenta` es `integer`, en `registros_de_llamada` es `character varying`. Las queries comparan con `String(idCuenta)`.

### Todas las páginas del dashboard son Client Components

Usan `useState`, `useEffect`, event handlers, Recharts, etc. Los datos se obtienen via fetch a API routes, no con Server Components.

### Metas en BD (no localStorage)

Las metas se persisten en `metas_cuenta` con UPSERT por `id_cuenta`. El Panel Asesor y Control del Sistema leen/escriben via la API.

---

## Pendientes y Roadmap

### ✅ Completado en v3.0 Enterprise
- [x] CRUD de roles con permisos granulares (Configuración > Roles)
- [x] Asignar rol al crear/editar usuario (select dinámico desde `roles_config`)
- [x] Nav filtrado por permisos + redirección si acceso sin permiso
- [x] Protección de APIs con `withAuthAndPermission` / `withAuthAndAnyPermission`
- [x] Toggle "Solo data del asesor" + selector de asesor (solo para `ver_todo`)
- [x] Bandeja de huérfanos + filtro `closerEmail` en APIs (dashboard, llamadas, videollamadas, chats, asesor)
- [x] Editor global: `EditRecordSheet` + PUT en llamadas, videollamadas y chats
- [x] Constructor de layouts: campo `ubicacion` en métricas personalizadas (panel_ejecutivo / rendimiento / ambos)
- [x] Reglas de etiquetas: selects agrupados (Condición IA, Condición Fija, mover etapa funnel)
- [x] Triggers por emoji: emoji picker en grid, emojis usados bloqueados, estado = Select con etapas del embudo
- [x] Panel asesor: Combobox de asesores solo si `canViewAll`; si no, filtro fijo al email del usuario

### ✅ Completado en v2.0
- [x] Embudo dinámico por tenant (`embudo_personalizado`)
- [x] Chat Triggers por emoji (`chat_triggers`)
- [x] Tags internos en 4 tablas de eventos (`tags_internos`)
- [x] BYOK — Bring Your Own Key de OpenAI (`openai_api_key`)
- [x] Página de documentación interactiva (`/documentacion`)
- [x] Filtro global de etiquetas en Dashboard (`TagFilter`)
- [x] InsightsChat v2 con intents de embudo, tags y triggers
- [x] API `system-config` ampliada con triggers, embudo y status de BYOK
- [x] Self-service: el CLIENTE configura embudo, triggers, BYOK y fuente financiera desde `/system` (pasos 7-10)
- [x] PUT `/api/data/system-config` persiste `openai_api_key`, `embudo_personalizado`, `chat_triggers`, `fuente_datos_financieros`

### 🔜 Próximos pasos

### Lead 360 Drawer
Actualmente es un placeholder. Necesita una query UNION que consolide timeline del lead desde las 3 tablas (`resumenes_diarios_agendas`, `log_llamadas`, `chats_logs`) unificando por email.

### InsightsChat con IA real
El chatbot actual usa datos reales pero genera respuestas con templates. El siguiente paso es conectar a GPT-4o-mini con el contexto de KPIs + embudo dinámico para respuestas conversacionales.

### Personalización extrema
La estructura de `configuracion_ui` ya soporta `nombres_secciones`, `columnas_visibles` y `kpis_visibles`, pero el frontend aún no lee esos valores para personalizar la UI dinámicamente.

### UTMs granulares
La columna `origen` en las tablas es texto libre. Para un funnel de adquisición más preciso, el Cerebro debería guardar `utm_source`, `utm_medium`, `utm_campaign` como campos separados o JSONB.

### Origen en chats
La columna `origen` en `chats_logs` existe pero se llena solo si el Cerebro la escribe al insertar. Snippet sugerido para el Cerebro:

```javascript
const origenChat = contact?.source || contact?.tags?.find(t =>
  ['facebook', 'instagram', 'web', 'whatsapp', 'google'].includes(t.toLowerCase())
) || null;
```
