import type { Profile } from "../auth/authStore";
import { localDb } from "./localDatabase";

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
  if (!localDb || profile?.role !== "medico") return profile?.medico_id ?? null;
  if (profile.medico_id) return profile.medico_id;

  const normalizedProfileName = normalizeName(profile.nome);

  const { data, error } = await localDb
    .from("medicos")
    .select("id,nome,email,ativo")
    .eq("ativo", true)
    .returns<Array<{ id: string; nome: string; email: string | null; ativo: boolean }>>();

  if (error) {
    console.error("Erro ao resolver cadastro do medico", error);
    return null;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  const byEmail = normalizedEmail
    ? data?.find((medico) => medico.email?.trim().toLowerCase() === normalizedEmail)
    : null;

  if (byEmail) {
    await linkProfileToMedico(profile.id, byEmail.id);
    return byEmail.id;
  }

  const byName = data?.find((medico) => {
    const normalizedMedicoName = normalizeName(medico.nome);
    return normalizedMedicoName === normalizedProfileName
      || normalizedMedicoName.includes(normalizedProfileName)
      || normalizedProfileName.includes(normalizedMedicoName);
  });

  if (byName) {
    await linkProfileToMedico(profile.id, byName.id);
    return byName.id;
  }

  return null;
}

async function linkProfileToMedico(profileId: string, medicoId: string) {
  if (!localDb) return;

  const { error } = await localDb
    .from("profiles")
    .update({ medico_id: medicoId })
    .eq("id", profileId)
    .is("medico_id", null);

  if (error) {
    console.warn("Nao foi possivel vincular o perfil ao medico automaticamente", error);
  }
}
