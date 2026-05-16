import type { Profile } from "../auth/authStore";
import { supabase } from "./supabase";

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(dr|dra|doutor|doutora)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function resolveMedicoId(profile: Profile | null, email?: string | null) {
  if (!supabase || profile?.role !== "medico") return profile?.medico_id ?? null;
  if (profile.medico_id) return profile.medico_id;

  const normalizedProfileName = normalizeName(profile.nome);

  const { data, error } = await supabase
    .from("medicos")
    .select("id,nome,email,ativo")
    .eq("ativo", true);

  if (error) {
    console.error("Erro ao resolver cadastro do medico", error);
    return null;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  const byEmail = normalizedEmail
    ? data?.find((medico) => medico.email?.trim().toLowerCase() === normalizedEmail)
    : null;

  if (byEmail) return byEmail.id;

  const byName = data?.find((medico) => {
    const normalizedMedicoName = normalizeName(medico.nome);
    return normalizedMedicoName === normalizedProfileName
      || normalizedMedicoName.includes(normalizedProfileName)
      || normalizedProfileName.includes(normalizedMedicoName);
  });

  return byName?.id ?? null;
}
