export async function GET() {
  const csv = [
    "nombre,email,password,rol,fathom_api_key",
    "Juan Pérez,juan@ejemplo.com,Segura123!,usuario,",
    "Ana Admin,ana@ejemplo.com,Clave456!,superadmin,fk_abc123xyz",
  ].join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla_usuarios.csv"',
    },
  });
}
