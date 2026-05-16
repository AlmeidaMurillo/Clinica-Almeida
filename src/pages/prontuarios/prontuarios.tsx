import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../../components/AppLayout/AppLayout";
import { useAuth } from "../../auth/authStore";
import type { Consulta, Prontuario } from "../../lib/clinicTypes";
import { supabase } from "../../lib/supabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { consulta_id: "", queixa: "", diagnostico: "", prescricao: "", observacoes: "" };

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
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isRecepcao = profile?.role === "recepcao";
  const consultaSelecionada = searchParams.get("consulta");

  const loadData = async () => {
    if (!supabase) {
      setMessage("Supabase nao configurado. Confira as variaveis de ambiente.");
      return;
    }

    setLoading(true);
    let consultasQuery = supabase.from("consultas").select("id,agendamento_id,paciente_id,medico_id,inicio,fim,status,pacientes(nome),medicos(nome,especialidade)").neq("status", "nao_compareceu").order("created_at", { ascending: false });
    let prontuariosQuery = supabase.from("prontuarios").select("id,consulta_id,paciente_id,medico_id,queixa,diagnostico,prescricao,observacoes,created_at,pacientes(nome),medicos(nome)").order("created_at", { ascending: false });
    if (profile?.role === "medico" && profile.medico_id) {
      consultasQuery = consultasQuery.eq("medico_id", profile.medico_id);
      prontuariosQuery = prontuariosQuery.eq("medico_id", profile.medico_id);
    }
    const [consultasRes, prontuariosRes] = await Promise.all([consultasQuery.returns<Consulta[]>(), prontuariosQuery.returns<Prontuario[]>()]);

    setLoading(false);
    if (consultasRes.error || prontuariosRes.error) {
      console.error("Erro ao carregar prontuarios", { consultasError: consultasRes.error, prontuariosError: prontuariosRes.error });
      setMessage("Nao foi possivel carregar consultas/prontuarios. Confira as permissoes do Supabase.");
      return;
    }

    setConsultas(consultasRes.data ?? []);
    setProntuarios(prontuariosRes.data ?? []);

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

  useEffect(() => { void loadData(); }, [profile, consultaSelecionada]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setSearchParams({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase nao configurado. Confira as variaveis de ambiente.");
      return;
    }

    const consulta = consultas.find((item) => item.id === form.consulta_id);
    if (!consulta) {
      setMessage("Selecione uma consulta valida antes de salvar o prontuario.");
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
      setMessage(`Nao foi possivel verificar se a consulta ja tem prontuario: ${consultaProntuarioError.message}`);
      return;
    }

    const { error } = editingId
      ? await supabase.from("prontuarios").update(payload).eq("id", editingId)
      : prontuarioExistente
        ? await supabase.from("prontuarios").update(payload).eq("id", prontuarioExistente.id)
        : await supabase.from("prontuarios").insert(payload);

    if (error) {
      console.error("Erro ao salvar prontuario", error);
      setMessage(`Nao foi possivel salvar o prontuario: ${error.message}`);
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
              <label className={styles.field}><span>Consulta</span><select value={form.consulta_id} onChange={(e) => setForm({ ...form, consulta_id: e.target.value })} required><option value="">Selecione</option>{consultas.map((consulta) => <option key={consulta.id} value={consulta.id}>{consulta.pacientes?.nome ?? "Paciente"} - {consulta.medicos?.nome ?? "Medico"}</option>)}</select></label>
              {!loading && consultas.length === 0 && <p className={styles.message}>Nenhuma consulta disponivel para prontuario.</p>}
              <label className={styles.field}><span>Queixa</span><textarea value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} /></label>
              <label className={styles.field}><span>Diagnostico</span><textarea value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} /></label>
              <label className={styles.field}><span>Prescricao</span><textarea value={form.prescricao} onChange={(e) => setForm({ ...form, prescricao: e.target.value })} /></label>
              <label className={styles.field}><span>Observacoes</span><textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button} disabled={loading}>{editingId ? "Salvar" : "Salvar prontuario"}</button>
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
