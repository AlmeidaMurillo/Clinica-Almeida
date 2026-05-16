import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../../components/AppLayout/AppLayout";
import { useAuth } from "../../auth/authStore";
import type { Consulta, Prontuario } from "../../lib/clinicTypes";
import { resolveMedicoId } from "../../lib/medicoProfile";
import { supabase } from "../../lib/supabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { consulta_id: "", queixa: "", diagnostico: "", prescricao: "", observacoes: "" };
const allowedConsultaStatuses = ["em_atendimento", "finalizada"] as const;

type AgendamentoProntuario = {
  id: string;
  paciente_id: string;
  medico_id: string;
  data_hora: string;
  status: "pendente" | "confirmado" | "cancelado" | "concluido" | "nao_compareceu";
  pacientes?: Consulta["pacientes"];
  medicos?: Consulta["medicos"];
};

type ConsultaRow = Omit<Consulta, "pacientes" | "medicos"> & {
  pacientes?: Consulta["pacientes"];
  medicos?: Consulta["medicos"];
};

type AgendamentoRow = AgendamentoProntuario;

type ConsultaOption = {
  value: string;
  label: string;
};

type SupabaseErrorLike = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

function formatSupabaseError(error: SupabaseErrorLike) {
  return [error.message, error.code && `codigo: ${error.code}`, error.details, error.hint]
    .filter(Boolean)
    .join(" | ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toForm(prontuario: Prontuario) {
  return {
    consulta_id: prontuario.consulta_id,
    queixa: prontuario.queixa ?? "",
    diagnostico: prontuario.diagnostico ?? "",
    prescricao: prontuario.prescricao ?? "",
    observacoes: prontuario.observacoes ?? "",
  };
}

export default function Prontuarios() {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoProntuario[]>([]);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isRecepcao = profile?.role === "recepcao";
  const consultaSelecionada = searchParams.get("consulta");

  const loadData = async () => {
    if (!supabase) {
      setMessage("Supabase nao configurado. Confira as variaveis de ambiente.");
      return;
    }

    setLoading(true);
    let consultasQuery = supabase
      .from("consultas")
      .select("id,agendamento_id,paciente_id,medico_id,inicio,fim,status,pacientes(nome),medicos(nome,especialidade)")
      .in("status", allowedConsultaStatuses)
      .order("created_at", { ascending: false });
    let prontuariosQuery = supabase.from("prontuarios").select("id,consulta_id,paciente_id,medico_id,queixa,diagnostico,prescricao,observacoes,created_at,pacientes(nome),medicos(nome)").order("created_at", { ascending: false });
    const medicoId = await resolveMedicoId(profile, user?.email);
    if (profile?.role === "medico") {
      if (!medicoId) {
        setLoading(false);
        setConsultas([]);
        setAgendamentos([]);
        setProntuarios([]);
        setMessage("Seu usuario medico nao foi encontrado no cadastro de medicos.");
        return;
      }

      consultasQuery = consultasQuery.eq("medico_id", medicoId);
      prontuariosQuery = prontuariosQuery.eq("medico_id", medicoId);
    }
    const [consultasRes, agendamentosRes, prontuariosRes] = await Promise.all([
      consultasQuery.returns<ConsultaRow[]>(),
      Promise.resolve({ data: [], error: null } as { data: AgendamentoRow[]; error: null }),
      prontuariosQuery.returns<Prontuario[]>(),
    ]);

    let consultasData = consultasRes.error ? [] : (consultasRes.data ?? []) as Consulta[];
    let agendamentosData = agendamentosRes.error ? [] : agendamentosRes.data ?? [];
    let prontuariosData = prontuariosRes.error ? [] : prontuariosRes.data ?? [];

    if (consultasRes.error) {
      console.error("Erro ao carregar consultas com relacionamentos", consultasRes.error);
      let consultasFallbackQuery = supabase
        .from("consultas")
        .select("id,agendamento_id,paciente_id,medico_id,inicio,fim,status")
        .in("status", allowedConsultaStatuses)
        .order("created_at", { ascending: false });

      if (profile?.role === "medico" && medicoId) {
        consultasFallbackQuery = consultasFallbackQuery.eq("medico_id", medicoId);
      }

      const { data, error } = await consultasFallbackQuery.returns<Consulta[]>();
      if (error) {
        setLoading(false);
        console.error("Erro ao carregar consultas simples", error);
        setMessage(`Nao foi possivel carregar consultas: ${formatSupabaseError(error)}`);
        return;
      }

      consultasData = data ?? [];
    }

    if (prontuariosRes.error) {
      console.error("Erro ao carregar prontuarios com relacionamentos", prontuariosRes.error);
      let prontuariosFallbackQuery = supabase
        .from("prontuarios")
        .select("id,consulta_id,paciente_id,medico_id,queixa,diagnostico,prescricao,observacoes,created_at")
        .order("created_at", { ascending: false });

      if (profile?.role === "medico" && medicoId) {
        prontuariosFallbackQuery = prontuariosFallbackQuery.eq("medico_id", medicoId);
      }

      const { data, error } = await prontuariosFallbackQuery.returns<Prontuario[]>();
      if (error) {
        setLoading(false);
        console.error("Erro ao carregar prontuarios simples", error);
        setMessage(`Nao foi possivel carregar prontuarios: ${formatSupabaseError(error)}`);
        return;
      }

      prontuariosData = data ?? [];
    }

    setLoading(false);

    if (profile?.role === "medico" && medicoId && consultasData.length === 0) {
      const { data, error } = await supabase
        .from("consultas")
        .select("id,agendamento_id,paciente_id,medico_id,inicio,fim,status")
        .eq("medico_id", medicoId)
        .in("status", allowedConsultaStatuses)
        .order("created_at", { ascending: false })
        .returns<Consulta[]>();

      if (error) {
        console.error("Erro ao carregar consultas simples", error);
      } else {
        consultasData = data ?? [];
      }
    }

    setConsultas(consultasData);
    setAgendamentos(agendamentosData);
    setProntuarios(prontuariosData);

    if (consultaSelecionada && consultasRes.data?.some((consulta) => consulta.id === consultaSelecionada)) {
      const prontuarioExistente = prontuariosRes.data?.find((item) => item.consulta_id === consultaSelecionada);

      if (prontuarioExistente) {
        setForm(toForm(prontuarioExistente));
        setEditingId(prontuarioExistente.id);
        setMessage("Esta consulta ja tem prontuario. Voce pode revisar e atualizar o registro.");
      } else {
        setForm((currentForm) => ({ ...currentForm, consulta_id: consultaSelecionada }));
      }
    } else if (consultaSelecionada) {
      setMessage("Consulta nao encontrada para criar o prontuario. Verifique se ela esta confirmada e visivel para seu perfil.");
    }
  };

  useEffect(() => { void loadData(); }, [profile, user?.email, consultaSelecionada]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setSearchParams({});
  };

  const consultaOptions: ConsultaOption[] = [
    ...consultas.map((consulta) => ({
      value: consulta.id,
      label: `${consulta.pacientes?.nome ?? `Paciente ${consulta.paciente_id.slice(0, 8)}`} - ${consulta.medicos?.nome ?? `Medico ${consulta.medico_id.slice(0, 8)}`} (${consulta.status.replace("_", " ")})`,
    })),
    ...agendamentos.map((agendamento) => ({
      value: `agendamento:${agendamento.id}`,
      label: `${agendamento.pacientes?.nome ?? `Paciente ${agendamento.paciente_id.slice(0, 8)}`} - ${agendamento.medicos?.nome ?? `Medico ${agendamento.medico_id.slice(0, 8)}`} (${agendamento.status}, ${formatDateTime(agendamento.data_hora)})`,
    })),
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase nao configurado. Confira as variaveis de ambiente.");
      return;
    }

    const isAgendamento = form.consulta_id.startsWith("agendamento:");
    const agendamentoId = isAgendamento ? form.consulta_id.replace("agendamento:", "") : "";
    let consulta = consultas.find((item) => item.id === form.consulta_id);

    if (!consulta && isAgendamento) {
      const agendamento = agendamentos.find((item) => item.id === agendamentoId);
      if (!agendamento) {
        setMessage("Selecione uma consulta ou agendamento valido antes de salvar o prontuario.");
        return;
      }

      const { data: consultaExistente, error: consultaExistenteError } = await supabase
        .from("consultas")
        .select("id,agendamento_id,paciente_id,medico_id,inicio,fim,status,pacientes(nome),medicos(nome,especialidade)")
        .eq("agendamento_id", agendamento.id)
        .maybeSingle<Consulta>();

      if (consultaExistenteError) {
        console.error("Erro ao verificar consulta do agendamento", consultaExistenteError);
        setMessage(`Nao foi possivel verificar a consulta do agendamento: ${consultaExistenteError.message}`);
        return;
      }

      if (consultaExistente) {
        consulta = consultaExistente;
      } else {
        const { data: novaConsulta, error: novaConsultaError } = await supabase
          .from("consultas")
          .insert({
            agendamento_id: agendamento.id,
            paciente_id: agendamento.paciente_id,
            medico_id: agendamento.medico_id,
            status: agendamento.status === "concluido" ? "finalizada" : "aguardando",
          })
          .select("id,agendamento_id,paciente_id,medico_id,inicio,fim,status,pacientes(nome),medicos(nome,especialidade)")
          .single<Consulta>();

        if (novaConsultaError) {
          console.error("Erro ao criar consulta para prontuario", novaConsultaError);
          setMessage(`Nao foi possivel criar a consulta para este prontuario: ${novaConsultaError.message}`);
          return;
        }

        consulta = novaConsulta;
      }
    }

    if (!consulta) {
      setMessage("Selecione uma consulta ou agendamento valido antes de salvar o prontuario.");
      return;
    }

    const payload = {
      consulta_id: consulta.id,
      paciente_id: consulta.paciente_id,
      medico_id: consulta.medico_id,
      queixa: form.queixa || null,
      diagnostico: form.diagnostico || null,
      prescricao: form.prescricao || null,
      observacoes: form.observacoes || null,
    };

    setMessage("");
    const { data: prontuarioExistente, error: consultaProntuarioError } = editingId
      ? { data: null }
      : await supabase
          .from("prontuarios")
          .select("id")
          .eq("consulta_id", consulta.id)
          .maybeSingle();

    if (consultaProntuarioError) {
      console.error("Erro ao verificar prontuario existente", consultaProntuarioError);
      setMessage(`Nao foi possivel verificar se a consulta ja tem prontuario: ${formatSupabaseError(consultaProntuarioError)}`);
      return;
    }

    setSaving(true);
    const { error } = editingId
      ? await supabase.from("prontuarios").update(payload).eq("id", editingId)
      : prontuarioExistente
        ? await supabase.from("prontuarios").update(payload).eq("id", prontuarioExistente.id)
        : await supabase.from("prontuarios").insert(payload);
    setSaving(false);

    if (error) {
      console.error("Erro ao salvar prontuario", error);
      setMessage(`Nao foi possivel salvar o prontuario: ${formatSupabaseError(error)}`);
      return;
    }

    setMessage(editingId || prontuarioExistente ? "Prontuario atualizado com sucesso." : "Prontuario salvo com sucesso.");
    resetForm();
    await loadData();
  };

  const deleteProntuario = async (item: Prontuario) => {
    if (!supabase || !isRecepcao || !window.confirm("Apagar este prontuario?")) return;
    const { error } = await supabase.from("prontuarios").delete().eq("id", item.id);
    setMessage(error ? "Nao foi possivel apagar o prontuario." : "Prontuario apagado.");
    await loadData();
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}><div><h1>Prontuarios</h1><p>Registro clinico vinculado a consulta do paciente.</p></div></header>
        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.formCard}`}>
            <h2>{editingId ? "Editar prontuario" : "Novo prontuario"}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}><span>Consulta</span><select value={form.consulta_id} onChange={(e) => setForm({ ...form, consulta_id: e.target.value })} required><option value="">Selecione</option>{consultaOptions.map((consulta) => <option key={consulta.value} value={consulta.value}>{consulta.label}</option>)}</select></label>
              {!loading && consultaOptions.length === 0 && <p className={styles.message}>Nenhuma consulta em andamento ou finalizada disponivel para prontuario.</p>}
              <label className={styles.field}><span>Queixa</span><textarea value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} /></label>
              <label className={styles.field}><span>Diagnostico</span><textarea value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} /></label>
              <label className={styles.field}><span>Prescricao</span><textarea value={form.prescricao} onChange={(e) => setForm({ ...form, prescricao: e.target.value })} /></label>
              <label className={styles.field}><span>Observacoes</span><textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button} disabled={loading || saving}>{saving ? "Salvando..." : editingId ? "Salvar" : "Salvar prontuario"}</button>
              </div>
            </form>
          </article>
          <article className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.toolbar}><h2>Prontuarios</h2><span>{prontuarios.length} registros</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Data</th><th>Paciente</th><th>Medico</th><th>Diagnostico</th><th>Prescricao</th>{isRecepcao && <th>Acoes</th>}</tr></thead>
                <tbody>{prontuarios.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleDateString("pt-BR")}</td><td>{item.pacientes?.nome ?? "-"}</td><td>{item.medicos?.nome ?? "-"}</td><td>{item.diagnostico ?? "-"}</td><td>{item.prescricao ?? "-"}</td>{isRecepcao && <td><div className={styles.rowActions}><button className={styles.ghostButton} type="button" onClick={() => { setForm(toForm(item)); setEditingId(item.id); setMessage(""); }}>Editar</button><button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteProntuario(item)}>Apagar</button></div></td>}</tr>)}</tbody></table>
              {prontuarios.length === 0 && <div className={styles.empty}>Nenhum prontuario cadastrado.</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
