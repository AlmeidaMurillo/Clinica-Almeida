import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Agendamento, AgendamentoStatus, Medico, Paciente, Servico } from "../../lib/clinicTypes";
import { localDb } from "../../lib/localDatabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { paciente_id: "", medico_id: "", servico_id: "", data_hora: "", observacoes: "" };

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusClass(status: AgendamentoStatus) {
  if (status === "pendente") return styles.warning;
  if (status === "cancelado" || status === "nao_compareceu") return styles.danger;
  return styles.success;
}

function statusLabel(status: AgendamentoStatus) {
  const labels: Record<AgendamentoStatus, string> = {
    pendente: "a confirmar",
    confirmado: "confirmado",
    cancelado: "cancelado",
    concluido: "concluido",
    nao_compareceu: "nao compareceu",
  };

  return labels[status];
}

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    if (!localDb) return;
    const [agendamentosRes, pacientesRes, medicosRes, servicosRes] = await Promise.all([
      localDb.from("agendamentos").select("id,paciente_id,medico_id,servico_id,data_hora,status,observacoes,pacientes(nome),medicos(nome,especialidade),servicos(nome)").order("data_hora", { ascending: true }).returns<Agendamento[]>(),
      localDb.from("pacientes").select("id,nome,cpf,telefone,email,data_nascimento,ativo").eq("ativo", true).order("nome").returns<Paciente[]>(),
      localDb.from("medicos").select("id,nome,crm,especialidade,telefone,email,ativo").eq("ativo", true).order("nome").returns<Medico[]>(),
      localDb.from("servicos").select("id,nome,descricao,duracao_minutos,valor,ativo").eq("ativo", true).order("nome").returns<Servico[]>(),
    ]);
    setAgendamentos(agendamentosRes.data ?? []);
    setPacientes(pacientesRes.data ?? []);
    setMedicos(medicosRes.data ?? []);
    setServicos(servicosRes.data ?? []);
  };

  useEffect(() => { void loadData(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localDb) return;

    const payload = {
      paciente_id: form.paciente_id,
      medico_id: form.medico_id,
      servico_id: form.servico_id || null,
      data_hora: new Date(form.data_hora).toISOString(),
      observacoes: form.observacoes || null,
    };

    const { error } = editingId
      ? await localDb.from("agendamentos").update(payload).eq("id", editingId)
      : await localDb.from("agendamentos").insert(payload);

    setMessage(error ? "Nao foi possivel salvar o agendamento." : editingId ? "Agendamento atualizado com sucesso." : "Agendamento criado com sucesso.");
    if (!error) {
      resetForm();
      await loadData();
    }
  };

  const updateStatus = async (agendamento: Agendamento, status: Agendamento["status"]) => {
    if (!localDb) return;

    if (status === "confirmado") {
      const { data: consultaExistente } = await localDb
        .from("consultas")
        .select("id")
        .eq("agendamento_id", agendamento.id)
        .maybeSingle();

      if (consultaExistente) {
        await localDb
          .from("consultas")
          .update({ status: "aguardando", inicio: null, fim: null })
          .eq("agendamento_id", agendamento.id);
      } else {
        const { error: consultaError } = await localDb.from("consultas").insert({
          agendamento_id: agendamento.id,
          paciente_id: agendamento.paciente_id,
          medico_id: agendamento.medico_id,
          status: "aguardando",
        });

        if (consultaError) {
          setMessage("Nao foi possivel criar a consulta do agendamento.");
          return;
        }
      }
    }

    await localDb.from("agendamentos").update({ status }).eq("id", agendamento.id);
    if (status === "pendente") {
      await localDb.from("consultas").delete().eq("agendamento_id", agendamento.id);
    }
    if (status === "cancelado" || status === "nao_compareceu") {
      await localDb
        .from("consultas")
        .update({ status: status === "cancelado" ? "cancelada" : "nao_compareceu" })
        .eq("agendamento_id", agendamento.id);
    }
    setMessage(status === "nao_compareceu" ? "Paciente marcado como nao compareceu." : "Status atualizado.");
    await loadData();
  };

  const editAgendamento = (agendamento: Agendamento) => {
    setForm({
      paciente_id: agendamento.paciente_id,
      medico_id: agendamento.medico_id,
      servico_id: agendamento.servico_id ?? "",
      data_hora: toLocalDateTime(agendamento.data_hora),
      observacoes: agendamento.observacoes ?? "",
    });
    setEditingId(agendamento.id);
    setMessage("");
  };

  const deleteAgendamento = async (agendamento: Agendamento) => {
    if (!localDb || !window.confirm("Apagar este agendamento?")) return;
    await localDb.from("consultas").delete().eq("agendamento_id", agendamento.id);
    const { error } = await localDb.from("agendamentos").delete().eq("id", agendamento.id);
    setMessage(error ? "Nao foi possivel apagar o agendamento." : "Agendamento apagado.");
    await loadData();
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}><div><h1>Agendamentos</h1><p>Agenda de consultas da clinica.</p></div></header>
        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.formCard}`}>
            <h2>{editingId ? "Editar agendamento" : "Novo agendamento"}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}><span>Paciente</span><select value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })} required><option value="">Selecione</option>{pacientes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
              <label className={styles.field}><span>Medico</span><select value={form.medico_id} onChange={(e) => setForm({ ...form, medico_id: e.target.value })} required><option value="">Selecione</option>{medicos.map((item) => <option key={item.id} value={item.id}>{item.nome} - {item.especialidade}</option>)}</select></label>
              <label className={styles.field}><span>Servico</span><select value={form.servico_id} onChange={(e) => setForm({ ...form, servico_id: e.target.value })}><option value="">Sem servico</option>{servicos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
              <label className={styles.field}><span>Data e hora</span><input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} required /></label>
              <label className={styles.field}><span>Observacoes</span><textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button}>{editingId ? "Salvar" : "Agendar"}</button>
              </div>
            </form>
          </article>
          <article className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.toolbar}><h2>Agenda</h2><span>{agendamentos.length} registros</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Data</th><th>Paciente</th><th>Medico</th><th>Servico</th><th>Status</th><th>Acoes</th></tr></thead>
                <tbody>{agendamentos.map((item) => <tr key={item.id}><td>{new Date(item.data_hora).toLocaleString("pt-BR")}</td><td>{item.pacientes?.nome ?? "-"}</td><td>{item.medicos?.nome ?? "-"}</td><td>{item.servicos?.nome ?? "-"}</td><td><span className={`${styles.badge} ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td><td><div className={styles.rowActions}>{item.status !== "pendente" && <button className={styles.ghostButton} type="button" onClick={() => void updateStatus(item, "pendente")}>A confirmar</button>}<button className={styles.ghostButton} type="button" disabled={item.status === "confirmado"} onClick={() => void updateStatus(item, "confirmado")}>Confirmar</button><button className={styles.ghostButton} type="button" onClick={() => editAgendamento(item)}>Editar</button><button className={styles.ghostButton} type="button" disabled={item.status === "nao_compareceu" || item.status === "concluido"} onClick={() => void updateStatus(item, "nao_compareceu")}>Nao compareceu</button><button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" disabled={item.status === "cancelado" || item.status === "concluido"} onClick={() => void updateStatus(item, "cancelado")}>Cancelar</button><button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteAgendamento(item)}>Apagar</button></div></td></tr>)}</tbody></table>
              {agendamentos.length === 0 && <div className={styles.empty}>Nenhum agendamento cadastrado.</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
