export function agendaDedupKey(a: {
  idcliente?: string | null;
  ghl_contact_id?: string | null;
  email_lead?: string | null;
  id_registro_agenda: number;
}): string {
  return (
    a.idcliente?.trim() ||
    a.ghl_contact_id?.trim() ||
    a.email_lead?.trim().toLowerCase() ||
    `nokey_${a.id_registro_agenda}`
  );
}
