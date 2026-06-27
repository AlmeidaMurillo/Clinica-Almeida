import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/AppLayout/AppLayout";
import { useAuth } from "../../auth/authStore";
import type { Consulta, ConsultaStatus } from "../../lib/clinicTypes";
import { resolveMedicoId } from "../../lib/medicoProfile";
import { localDb } from "../../lib/localDatabase";
import styles from "../../components/CrudPage.module.css";

function statusClass(status: ConsultaStatus) {
  if (status === "aguardando") return styles.warning;
  if (status === "cancelada" || status === "nao_compareceu") return styles.danger;
  return styles.success;
}

function statusLabel(status: ConsultaStatus) {
  const labels: Record<ConsultaStatus, string> = {
    aguardando: "aguardando",
    em_atendimento: "em atendimento",
    finalizada: "finalizada",
    cancelada: "cancelada",
    nao_compareceu: "nao compareceu",
  };

  return labels[status];
}

export default function Consultas() {
  const { profile, user } = useAuth();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [message, setMessage] = useState("");
  const isRecepcao = profile?.role === "recepcao";

  const loadConsultas = async () => {
    if (!localDb) return;
    let query = localDb.from("consultas").select("id,agendamento_id,paciente_id,medico_id,inicio,fim,status,pacientes(nome),medicos(nome,especialidade)").order("created_at", { ascending: false });
    const medicoId = await resolveMedicoId(profile, user?.email);
    if (profile?.role === "medico") {
      if (!medicoId) {
        setConsultas([]);
        setMessage("Seu usuario medico nao foi encontrado no cadastro de medicos.");
        return;
      }

      query = query.eq("medico_id", medicoId);
    }

    const { data, error } = await query.returns<Consulta[]>();
    if (error) {
      console.error("Erro ao carregar consultas", error);
      setMessage("Nao foi possivel carregar as consultas.");
      return;
    }

    setConsultas(data ?? []);
  };

  useEffect(() => { void loadConsultas(); }, [profile, user?.email]);

  const updateStatus = async (consulta: Consulta, status: Consulta["status"]) => {
    if (!localDb) return;

    const podeIrParaAtendimento = ["aguardando", "finalizada", "cancelada", "nao_compareceu"].includes(consulta.status);

    if (status === "em_atendimento" && !podeIrParaAtendimento) {
      setMessage("Esta consulta nao pode ser iniciada a partir do status atual.");
      return;
    }

    if (status === "finalizada" && consulta.status !== "em_atendimento") {
      setMessage("A consulta precisa estar em atendimento para ser finalizada.");
      return;
    }

    const patch = {
      status,
      inicio: status === "em_atendimento" ? (consulta.inicio ?? new Date().toISOString()) : status === "aguardando" ? null : consulta.inicio,
      fim: status === "finalizada" || status === "nao_compareceu" ? new Date().toISOString() : status === "em_atendimento" || status === "aguardando" ? null : consulta.fim,
    };

    const { error } = await localDb.from("consultas").update(patch).eq("id", consulta.id);
    if (!error && consulta.agendamento_id) {
      const agendamentoStatus =
        status === "cancelada"
          ? "cancelado"
          : status === "nao_compareceu"
            ? "nao_compareceu"
            : status === "finalizada"
              ? "concluido"
              : status === "em_atendimento"
                ? "confirmado"
                : status === "aguardando"
                  ? "confirmado"
                  : null;
      if (agendamentoStatus) {
        await localDb.from("agendamentos").update({ status: agendamentoStatus }).eq("id", consulta.agendamento_id);
      }
    }

    setMessage(error ? "Nao foi possivel atualizar a consulta." : "Consulta atualizada.");
    await loadConsultas();
  };

  const deleteConsulta = async (consulta: Consulta) => {
    if (!localDb || !isRecepcao || !window.confirm("Apagar esta consulta?")) return;
    const { error } = await localDb.from("consultas").delete().eq("id", consulta.id);
    setMessage(error ? "Nao foi possivel apagar a consulta." : "Consulta apagada.");
    await loadConsultas();
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}><div><h1>Consultas</h1><p>Fila de atendimentos e andamento das consultas.</p></div></header>
        {message && <p className={styles.message}>{message}</p>}
        <section className={`${styles.card} ${styles.listCard}`}>
          <div className={styles.toolbar}><h2>Consultas registradas</h2><span>{consultas.length} registros</span></div>
          <div className={styles.tableWrap}>
            <table className={styles.table}><thead><tr><th>Paciente</th><th>Medico</th><th>Especialidade</th><th>Status</th><th>Inicio</th><th>Fim</th><th>Acoes</th></tr></thead>
              <tbody>{consultas.map((consulta) => <tr key={consulta.id}><td>{consulta.pacientes?.nome ?? "-"}</td><td>{consulta.medicos?.nome ?? "-"}</td><td>{consulta.medicos?.especialidade ?? "-"}</td><td><span className={`${styles.badge} ${statusClass(consulta.status)}`}>{statusLabel(consulta.status)}</span></td><td>{consulta.inicio ? new Date(consulta.inicio).toLocaleTimeString("pt-BR") : "-"}</td><td>{consulta.fim ? new Date(consulta.fim).toLocaleTimeString("pt-BR") : "-"}</td><td><div className={styles.rowActions}>{consulta.status !== "aguardando" && <button className={styles.ghostButton} type="button" onClick={() => void updateStatus(consulta, "aguardando")}>Voltar para fila</button>}<button className={styles.ghostButton} type="button" disabled={consulta.status === "em_atendimento"} onClick={() => void updateStatus(consulta, "em_atendimento")}>{consulta.status === "finalizada" ? "Reabrir" : "Iniciar"}</button><button className={styles.ghostButton} type="button" disabled={consulta.status !== "em_atendimento"} onClick={() => void updateStatus(consulta, "finalizada")}>Finalizar</button><Link className={styles.ghostButton} to={`/prontuarios?consulta=${consulta.id}`}>Prontuario</Link>{isRecepcao && <button className={styles.ghostButton} type="button" disabled={consulta.status === "nao_compareceu" || consulta.status === "finalizada"} onClick={() => void updateStatus(consulta, "nao_compareceu")}>Nao compareceu</button>}{isRecepcao && <button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" disabled={consulta.status === "finalizada"} onClick={() => void updateStatus(consulta, "cancelada")}>Cancelar</button>}{isRecepcao && <button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteConsulta(consulta)}>Apagar</button>}</div></td></tr>)}</tbody></table>
            {consultas.length === 0 && <div className={styles.empty}>Nenhuma consulta registrada.</div>}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
