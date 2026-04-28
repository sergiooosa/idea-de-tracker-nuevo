# Guía de Credenciales para APIs de Ads

Esta guía te explica cómo obtener y configurar las credenciales necesarias para Google Ads API y TikTok for Business API en AutoKPI.

---

## 1. Google Ads API

### 1.1 Requisitos previos

- Cuenta de Google (Gmail/Workspace)
- Acceso a una cuenta de Google Ads con rol de **administrador o usuario con permiso de API**
- Proyecto en Google Cloud Console

### 1.2 Pasos para obtener credenciales

#### Paso 1: Crear un proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Haz clic en **"Seleccionar un proyecto"** (esquina superior izquierda)
3. Haz clic en **"NUEVO PROYECTO"**
4. Asigna un nombre (ej: `AutoKPI-GoogleAds`)
5. Haz clic en **"CREAR"**

#### Paso 2: Habilitar la API de Google Ads

1. En el menú lateral, ve a **"APIs y servicios"** → **"Biblioteca"**
2. Busca `"Google Ads API"`
3. Haz clic en el resultado
4. Haz clic en el botón azul **"HABILITAR"**
5. Espera a que se complete (toma ~30 segundos)

#### Paso 3: Crear credenciales OAuth 2.0

1. En **"APIs y servicios"**, ve a **"Credenciales"**
2. Haz clic en el botón **"+ CREAR CREDENCIALES"**
3. Selecciona **"ID de cliente OAuth"**
4. Si te pide configurar la pantalla de consentimiento:
   - Selecciona **"Usuario externo"** → **"CREAR"**
   - Completa los campos básicos (nombre de la app: `AutoKPI`)
   - En **"Alcances"**, busca y agrega `https://www.googleapis.com/auth/adwords`
   - Completa **"Información de contacto"** (tu email)
   - Guarda y continúa
5. De vuelta en Credenciales, haz clic nuevamente en **"+ CREAR CREDENCIALES"** → **"ID de cliente OAuth"**
6. En **"Tipo de aplicación"**, selecciona **"Aplicación web"**
7. En **"URIs de redirección autorizados"**, agrega:
   ```
   https://[tu-dominio-autokpi]/api/integrations/google-ads/callback
   ```
   (ej: `https://sharkrealtor.autokpi.net/api/integrations/google-ads/callback`)
8. Haz clic en **"CREAR"**
9. Se abrirá un modal con **Client ID** y **Client Secret** → **Guárdalos de forma segura**

#### Paso 4: Obtener el Customer ID de Google Ads

1. Inicia sesión en [Google Ads](https://ads.google.com/)
2. Haz clic en la **rueda de configuración** (esquina inferior izquierda)
3. Selecciona **"Configuración de cuenta"**
4. En **"Información de la cuenta"**, encontrarás el **"ID de cliente"** (formato: `XXX-XXX-XXXX`)
5. Cópialo

### 1.3 Configuración en AutoKPI

1. Ve a `/configuracion` → **"Integraciones"** → **"Google Ads"**
2. Rellena los campos:
   - **Client ID:** Pega el `Client ID` de Google Cloud
   - **Client Secret:** Pega el `Client Secret`
   - **Customer ID:** Pega el ID de cliente de Google Ads (formato `XXX-XXX-XXXX`)
3. Haz clic en **"Autorizar"** o **"Conectar"**
4. Serás redirigido a Google para autorizar el acceso
5. Haz clic en **"Permitir"** cuando se te pida
6. AutoKPI habrá guardado los tokens automáticamente

---

## 2. TikTok for Business API

### 2.1 Requisitos previos

- Cuenta de TikTok (con rol de administrador)
- Una o varias cuentas de anuncios de TikTok activas
- Acceso a [TikTok Business Central](https://business.tiktok.com/)

### 2.2 Pasos para obtener credenciales

#### Paso 1: Crear una app en TikTok Developer Center

1. Ve a [TikTok Developer Center](https://developer.tiktok.com/)
2. Inicia sesión con tu cuenta de TikTok
3. Haz clic en **"Get Started"** o ve a **"Applications"**
4. Haz clic en **"Create an app"**
5. Selecciona **"Business"** como tipo de aplicación
6. Asigna un nombre (ej: `AutoKPI`)
7. En **"Purpose"**, selecciona **"Marketing/Advertising"**
8. Haz clic en **"Create app"**

#### Paso 2: Configurar permisos y obtener credenciales

1. En la página de tu app, ve a **"Settings"** → **"App credentials"**
2. Copiarás dos valores:
   - **Client ID**
   - **Client Secret** (mantén este seguro)
3. En **"Redirect URI"**, agrega:
   ```
   https://[tu-dominio-autokpi]/api/integrations/tiktok/callback
   ```
   (ej: `https://credivit.autokpi.net/api/integrations/tiktok/callback`)
4. Haz clic en **"Save"**

#### Paso 3: Solicitar acceso a la API de Ads

1. En la página de tu app, ve a **"Permissions"** o **"Scopes"**
2. Solicita los siguientes scopes:
   - `ad_account_basic_info` (información básica de cuenta)
   - `ad_account_management` (gestión de cuentas)
   - `advertiser_read` (lectura de anunciantes)
   - `campaign_manage` (gestión de campañas)
   - `campaign_read` (lectura de campañas)
3. Haz clic en **"Request Access"**
4. TikTok revisará la solicitud (toma 1-3 días hábiles)

#### Paso 4: Obtener el Advertiser ID de TikTok

1. Ve a [TikTok Business Central](https://business.tiktok.com/)
2. En el menú lateral, selecciona tu cuenta de anuncios
3. Ve a **"Settings"** → **"Account Info"**
4. Copia el **"Advertiser ID"** (número largo)

### 2.3 Configuración en AutoKPI

1. Ve a `/configuracion` → **"Integraciones"** → **"TikTok"**
2. Rellena los campos:
   - **Client ID:** Pega el `Client ID` de TikTok Developer
   - **Client Secret:** Pega el `Client Secret`
   - **Advertiser ID:** Pega el ID del anunciante de TikTok
3. Haz clic en **"Autorizar"** o **"Conectar"**
4. Serás redirigido a TikTok para autorizar el acceso
5. Haz clic en **"Allow"** cuando se te pida
6. AutoKPI habrá guardado los tokens automáticamente

---

## 3. Pruebas de conexión

### Validar Google Ads

1. Ve a `/ads` (panel de Ads & Inversión)
2. Si ves datos de gastos, clics e impresiones de Google Ads, ¡está funcionando!
3. Si ves errores, verifica:
   - El **Customer ID** esté en formato correcto (`XXX-XXX-XXXX`)
   - La cuenta de Google Ads tenga datos (al menos una campaña activa o histórica)

### Validar TikTok

1. Ve a `/ads` (panel de Ads & Inversión)
2. Si ves datos de TikTok Ads (gasto, impresiones, clics), ¡está funcionando!
3. Si ves errores, verifica:
   - El **Advertiser ID** sea correcto
   - La solicitud de scopes en TikTok haya sido aprobada (verifica estado en Developer Center)

---

## 4. Renovación de credenciales

### Google Ads (OAuth 2.0)

- Los tokens se renuevan automáticamente
- Si AutoKPI pierde acceso, haz clic en **"Reconectar"** y repite el flujo de autorización

### TikTok for Business API

- Los tokens se renuevan automáticamente
- Si la reconexión falla, verifica que tu cuenta de TikTok siga siendo administrador de la cuenta de anuncios

---

## 5. Solución de problemas

### "Credenciales inválidas" en Google Ads

- ✅ Verifica que el **Customer ID** sea correcto (ve a ads.google.com → Configuración → Información de la cuenta)
- ✅ Asegúrate de que la API esté habilitada en Google Cloud Console
- ✅ Reconecta usando el botón **"Autorizar"** en AutoKPI

### "No hay datos de TikTok"

- ✅ Verifica que el Advertiser ID sea correcto
- ✅ Comprueba que tu cuenta tenga campañas activas o históricas en TikTok
- ✅ Revisa que los scopes solicitados hayan sido aprobados por TikTok (revisar en Developer Center)

### "Acceso denegado" después de cambiar de cuenta

- ✅ Desconecta la integración en AutoKPI
- ✅ Espera 10 minutos
- ✅ Reconecta usando el botón **"Autorizar"**

---

## 6. Seguridad

⚠️ **Importante:**

- Nunca compartas tus **Client Secret** o **Access Tokens**
- Los tokens se almacenan encriptados en la base de datos de AutoKPI
- Si sospechas que un token fue comprometido, regenera las credenciales en Google Cloud o TikTok Developer Center inmediatamente
- AutoKPI nunca almacena contraseñas, solo tokens OAuth

---

## 7. Soporte

Si encuentras problemas:

1. Verifica que tengas roles de **administrador** en ambas plataformas (Google Ads y TikTok)
2. Intenta reconectar desde cero
3. Contacta al equipo de AutoKPI con los detalles del error (sin exponer credenciales)

