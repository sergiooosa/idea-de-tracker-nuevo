-- AUT-1818: MVP registro de accesos al dashboard (login-log)
-- Tabla para registrar cada login exitoso al dashboard.

CREATE TABLE IF NOT EXISTS public.accesos_dashboard (
  id            serial       PRIMARY KEY,
  id_cuenta     integer,
  email         text         NOT NULL,
  nombre        text,
  ip            text,
  user_agent    text,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accesos_dashboard_cuenta
  ON public.accesos_dashboard (id_cuenta);

CREATE INDEX IF NOT EXISTS idx_accesos_dashboard_created
  ON public.accesos_dashboard (created_at);
