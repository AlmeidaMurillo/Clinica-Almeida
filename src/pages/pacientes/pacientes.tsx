import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Paciente } from "../../lib/clinicTypes";
import { supabase } from "../../lib/supabase";
import styles from "../../components/CrudPage.module.css";

type PacienteForm = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  data_nascimento: string;
};

const initialForm: PacienteForm = { nome: "", cpf: "", telefone: "", email: "", data_nascimento: "" };

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

  const loadPacientes = async () => {
    if (!supabase) return;

    setLoading(true);
    const { data } = await supabase
      .from("pacientes")
      .select("id,nome,cpf,telefone,email,data_nascimento,ativo")
      .order("created_at", { ascending: false })
      .returns<Paciente[]>();

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
    if (!supabase) return;

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
      ? await supabase.from("pacientes").update(payload).eq("id", editingId)
      : await supabase.from("pacientes").insert(payload);

    setSaving(false);

    if (error) {
      setMessage(editingId ? "Nao foi possivel atualizar o paciente." : "Nao foi possivel cadastrar o paciente.");
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

  const deletePaciente = async (paciente: Paciente) => {
    if (!supabase || !window.confirm(`Apagar ${paciente.nome}?`)) return;

    const { error } = await supabase.from("pacientes").update({ ativo: false }).eq("id", paciente.id);
    setMessage(error ? "Nao foi possivel apagar o paciente." : "Paciente apagado da lista ativa.");
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
              <span>{pacientes.length} registros</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Email</th><th>Status</th><th>Acoes</th></tr>
                </thead>
                <tbody>
                  {pacientes.map((paciente) => (
                    <tr key={paciente.id}>
                      <td>{paciente.nome}</td>
                      <td className={styles.muted}>{paciente.cpf ?? "-"}</td>
                      <td>{paciente.telefone ?? "-"}</td>
                      <td>{paciente.email ?? "-"}</td>
                      <td><span className={`${styles.badge} ${paciente.ativo ? styles.success : styles.danger}`}>{paciente.ativo ? "Ativo" : "Inativo"}</span></td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.ghostButton} type="button" onClick={() => editPaciente(paciente)}>Editar</button>
                          <button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deletePaciente(paciente)}>Apagar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && pacientes.length === 0 && <div className={styles.empty}>Nenhum paciente cadastrado.</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
