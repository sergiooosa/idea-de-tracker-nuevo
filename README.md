# AutoKPI

Dashboard V1 para control del equipo comercial, conectado a GoHighLevel (GHL). Centraliza videollamadas, llamadas telefónicas y chats, con resumen por métodos de adquisición.

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## Estructura

- **Executive Panel** – KPIs globales, ranking por asesor, selector de asesor, lista de leads, Lead 360 (timeline unificado), objeciones más comunes, volumen de llamadas.
- **Performance** – Módulos: Videollamadas (KPIs + tabla), Llamadas (por asesor + registro general), Chats (KPIs + tracking por emojis + tabla por asesor/lead).
- **Asesor Panel** – KPIs personales, metas tipo checklist, acciones pendientes, progreso del día.
- **Acquisition Summary** – Tabla por UTM/ad/medio (leads, contestaron, agendaron, revenue, tasas). Sin spend en V1.
- **Weekly Report Generator** – Botón fijo abajo: “Generar reporte semanal”. Reporte con resumen cuantitativo, actividad por asesores, patrones, análisis comercial, accionables. Copiar / Descargar PDF.
- **System Control** – Wizard: contexto empresa, evaluación videollamadas, reglas de etiquetas GHL, métricas personalizadas.
- **Chat Insights** – Copiloto (Executive y Asesor). En V1 respuestas simuladas por reglas; estructura lista para conectar a endpoint de IA.

## Conectar a GHL

En `src/api/ghl.ts` están los placeholders. Sustituir por llamadas reales a tu backend que a su vez hable con la API de GHL.

## Datos

V1 usa **mock data** en `src/data/mockData.ts`. Tipos en `src/types/index.ts`.
