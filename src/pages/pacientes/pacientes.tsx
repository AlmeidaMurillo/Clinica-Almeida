import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Paciente } from "../../lib/clinicTypes";
import { localDb } from "../../lib/localDatabase";
import styles from "../../components/CrudPage.module.css";

type PacienteForm = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  data_nascimento: string;
};

const initialForm: PacienteForm = { nome: "", cpf: "", telefone: "", email: "", data_nascimento: "" };

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toForm(paciente: Paciente): PacienteForm {
  return {
    nome: paciente.nome,
    cpf: paciente.cpf ?? "",
    telefone: paciente.telefone ?? "",
    email: paciente.email ?? "",
    data_nascimento: paciente.data_nascimento ?? "",
  };
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [form, setForm] = useState<PacienteForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const pacientesFiltrados = useMemo(() => {
    const term = normalizeSearch(search);
    if (!term) return pacientes;

    return pacientes.filter((paciente) => {
      const searchable = normalizeSearch([
        paciente.nome,
        paciente.cpf ?? "",
        paciente.telefone ?? "",
        paciente.email ?? "",
        paciente.data_nascimento ?? "",
      ].join(" "));

      return searchable.includes(term);
    });
  }, [pacientes, search]);

  const loadPacientes = async () => {
    if (!localDb) return;

    setLoading(true);
    const { data, error } = await localDb
      .from("pacientes")
      .select("id,nome,cpf,telefone,email,data_nascimento,ativo")
      .order("created_at", { ascending: false })
      .returns<Paciente[]>();

    if (error) {
      console.error("Erro ao carregar pacientes", error);
      setMessage(`Nao foi possivel carregar os pacientes. ${error.message}`);
      setLoading(false);
      return;
    }

    setPacientes(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadPacientes();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localDb) return;

    setSaving(true);
    setMessage("");

    const payload = {
      nome: form.nome,
      cpf: form.cpf || null,
      telefone: form.telefone || null,
      email: form.email || null,
      data_nascimento: form.data_nascimento || null,
      ativo: true,
    };

    const { error } = editingId
      ? await localDb.from("pacientes").update(payload).eq("id", editingId)
      : await localDb.from("pacientes").insert(payload);

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar paciente", error);
      setMessage(`${editingId ? "Nao foi possivel atualizar o paciente." : "Nao foi possivel cadastrar o paciente."} ${error.message}`);
      return;
    }

    resetForm();
    setMessage(editingId ? "Paciente atualizado com sucesso." : "Paciente cadastrado com sucesso.");
    await loadPacientes();
  };

  const editPaciente = (paciente: Paciente) => {
    setForm(toForm(paciente));
    setEditingId(paciente.id);
    setMessage("");
  };

  const togglePacienteStatus = async (paciente: Paciente) => {
    if (!localDb) return;

    const { error } = await localDb.from("pacientes").update({ ativo: !paciente.ativo }).eq("id", paciente.id);
    if (error) {
      console.error("Erro ao alterar status do paciente", error);
      setMessage(`Nao foi possivel ${paciente.ativo ? "desativar" : "ativar"} o paciente. ${error.message}`);
      return;
    }

    setMessage(paciente.ativo ? "Paciente desativado." : "Paciente ativado.");
    await loadPacientes();
  };

  const deletePaciente = async (paciente: Paciente) => {
    if (!localDb || !window.confirm(`Apagar definitivamente ${paciente.nome}? Esta acao nao pode ser desfeita.`)) return;

    const { error } = await localDb.from("pacientes").delete().eq("id", paciente.id);
    if (error) {
      console.error("Erro ao apagar paciente", error);
      setMessage(`Nao foi possivel apagar o paciente. ${error.message}`);
      return;
    }

    setMessage("Paciente apagado definitivamente.");
    await loadPacientes();
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}>
          <div>
            <h1>Pacientes</h1>
            <p>Cadastro e acompanhamento dos pacientes ativos da clinica.</p>
          </div>
        </header>

        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.formCard}`}>
            <h2>{editingId ? "Editar paciente" : "Novo paciente"}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>Nome</span>
                <input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required />
              </label>
              <label className={styles.field}>
                <span>CPF</span>
                <input value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Telefone</span>
                <input value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Data de nascimento</span>
                <input type="date" value={form.data_nascimento} onChange={(event) => setForm({ ...form, data_nascimento: event.target.value })} />
              </label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button} type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar" : "Cadastrar"}</button>
              </div>
            </form>
          </article>

          <article className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.toolbar}>
              <h2>Pacientes cadastrados</h2>
              <span>{pacientesFiltrados.length} de {pacientes.length} registros</span>
            </div>
            <label className={`${styles.field} ${styles.searchField}`}>
              <span>Pesquisar paciente</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, CPF, telefone ou email" />
            </label>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Email</th><th>Status</th><th>Acoes</th></tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.map((paciente) => (
                    <tr key={paciente.id}>
                      <td>{paciente.nome}</td>
                      <td className={styles.muted}>{paciente.cpf ?? "-"}</td>
                      <td>{paciente.telefone ?? "-"}</td>
                      <td>{paciente.email ?? "-"}</td>
                      <td><span className={`${styles.badge} ${paciente.ativo ? styles.success : styles.danger}`}>{paciente.ativo ? "Ativo" : "Inativo"}</span></td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.ghostButton} type="button" onClick={() => editPaciente(paciente)}>Editar</button>
                          <button className={styles.ghostButton} type="button" onClick={() => void togglePacienteStatus(paciente)}>{paciente.ativo ? "Desativar" : "Ativar"}</button>
                          <button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deletePaciente(paciente)}>Apagar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && pacientesFiltrados.length === 0 && <div className={styles.empty}>{search ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
