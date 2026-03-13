# Preguntas para el agente de backend — Speed to lead en 0

## Contexto

En el panel (Performance > Llamadas) el KPI **"Tiempo al lead (prom.)"** y los valores de **Speed to lead** por lead/asesor pueden mostrarse en 0 o "—". Se validó en BD que los datos existen pero **siempre con valor `"0"`** en los campos `speed_to_lead`.

## Queries de validación (id_cuenta = 33)

### 1. ¿Hay registros con speed_to_lead en log_llamadas?

```sql
SELECT COUNT(*) AS con_speed_log
FROM log_llamadas
WHERE id_cuenta = 33
  AND speed_to_lead IS NOT NULL
  AND TRIM(speed_to_lead) <> '';
```

**Resultado observado:** Sí hay filas. Muestra de datos:

```
id   | id_cuenta | speed_to_lead | tipo_evento        | ts
34   | 33        | "0"           | no_contesto        | 2026-03-13 17:41:11
33   | 33        | "0"           | no_contesto        | 2026-03-13 17:39:18
...
23   | 33        | "0"           | efectiva_programado| 2026-03-13 16:39:04
```

### 2. ¿Hay registros con speed_to_lead en registros_de_llamada (no PDTE)?

```sql
SELECT id_registro, id_cuenta, closer_mail, estado, speed_to_lead, fecha_evento
FROM registros_de_llamada
WHERE id_cuenta = '33'
  AND speed_to_lead IS NOT NULL
  AND TRIM(speed_to_lead) <> ''
  AND (estado IS NULL OR UPPER(TRIM(estado)) <> 'PDTE')
ORDER BY fecha_evento DESC
LIMIT 20;
```

**Resultado observado:** Sí hay filas; todas con `speed_to_lead = "0"` y estados como `seguimiento`, `programado`, etc.

### 3. ¿Hay valores no numéricos o inválidos?

```sql
SELECT id, speed_to_lead
FROM log_llamadas
WHERE id_cuenta = 33
  AND speed_to_lead IS NOT NULL
  AND TRIM(speed_to_lead) <> ''
  AND speed_to_lead !~ '^[0-9]+\.?[0-9]*$';
```

**Resultado observado:** Vacío (todos los valores son numéricos).

### 4. Promedio que devuelve la BD

```sql
SELECT AVG(CAST(NULLIF(TRIM(speed_to_lead), '') AS NUMERIC)) AS avg_log
FROM log_llamadas
WHERE id_cuenta = 33
  AND speed_to_lead IS NOT NULL
  AND TRIM(speed_to_lead) <> '';
```

**Resultado observado:** `0.00000000000000000000`

---

## Conclusión del panel (front)

- El **panel lee y promedia correctamente** lo que está en BD.
- El problema no es de consultas ni de UI: **quien escribe en BD está guardando siempre `speed_to_lead = "0"`** (o no calcula el valor real).

---

## Preguntas para el agente de backend / Cerebro

1. **¿Dónde se escribe `speed_to_lead` en `log_llamadas` y en `registros_de_llamada`?**  
   (Servicio, job, webhook, script; archivo y función si es posible.)

2. **¿Cómo se calcula hoy el “tiempo al lead”?**  
   - Definición esperada: minutos (o segundos) desde que el lead se crea/asigna hasta la **primera llamada** (o primer contacto).  
   - ¿Se usa la fecha/hora de creación del lead en GHL (u otro sistema)?  
   - ¿Se usa la fecha/hora del primer evento de llamada en Twilio (o del log que alimenta `log_llamadas`)?

3. **¿Por qué en todos los registros revisados (cuenta 33) el valor guardado es `"0"`?**  
   Posibles causas a revisar:
   - El cálculo no está implementado y se envía 0 por defecto.
   - La fecha de “asignación” o “creación” del lead no está disponible en el momento de escribir.
   - Se usa una unidad distinta (p. ej. segundos) y se guarda mal (o se trunca a 0).
   - El campo se rellena en otro flujo que no se está ejecutando para esta cuenta.

4. **¿En qué momento del flujo (webhook de Twilio, job nocturno, API de reasignación, etc.) se actualiza `speed_to_lead`?**  
   Si solo se actualiza en un flujo concreto, podría no estar llegando para todos los eventos.

5. **¿Se puede añadir logging (o trazas) cuando se escribe `speed_to_lead`?**  
   Por ejemplo: loguear el valor calculado (minutos/segundos), el id del lead, el id del evento de llamada y el origen de las fechas usadas. Así se puede comprobar si el cálculo da > 0 y por qué en BD queda 0.

---

## Qué debe hacer el backend para que el panel muestre datos útiles

- Calcular el tiempo al lead como **diferencia** entre:
  - Fecha/hora de **primera llamada** (desde Twilio / `log_llamadas` o equivalente).
  - Fecha/hora de **creación o asignación del lead** (GHL, CRM o tabla de registros).
- Persistir ese valor en **minutos** (o la unidad acordada y documentada) en:
  - `log_llamadas.speed_to_lead`
  - Y, si aplica, en `registros_de_llamada.speed_to_lead` cuando se actualice el registro del lead.
- Dejar de escribir `"0"` por defecto cuando sí se disponga de las dos fechas para el cálculo.

Cuando esos valores sean distintos de 0 en BD, el panel los promediará y mostrará correctamente el "Tiempo al lead (prom.)" y el Speed to lead por lead/asesor.
