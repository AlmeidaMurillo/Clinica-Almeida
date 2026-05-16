import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Medico } from "../../lib/clinicTypes";
import { supabase } from "../../lib/supabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { nome: "", crm: "", especialidade: "", telefone: "", email: "" };

function toForm(medico: Medico) {
  return {
    nome: medico.nome,
    crm: medico.crm,
    especialidade: medico.especialidade,
    telefone: medico.telefone ?? "",
    email: medico.email ?? "",
  };
}

export default function Medicos() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadMedicos = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("medicos").select("id,nome,crm,especialidade,telefone,email,ativo").order("created_at", { ascending: false }).returns<Medico[]>();
    setMedicos(data ?? []);
  };

  useEffect(() => {
    void loadMedicos();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);

    const payload = { ...form, telefone: form.telefone || null, email: form.email || null, ativo: true };
    const { error } = editingId
      ? await supabase.from("medicos").update(payload).eq("id", editingId)
      : await supabase.from("medicos").insert(payload);

    setSaving(false);
    setMessage(error ? "Nao foi possivel salvar o medico." : editingId ? "Medico atualizado com sucesso." : "Medico cadastrado com sucesso.");
    if (!error) {
      resetForm();
      await loadMedicos();
    }
  };

  const deleteMedico = async (medico: Medico) => {
    if (!supabase || !window.confirm(`Apagar ${medico.nome}?`)) return;
    const { error } = await supabase.from("medicos").update({ ativo: false }).eq("id", medico.id);
    setMessage(error ? "Nao foi possivel apagar o medico." : "Medico apagado da lista ativa.");
    await loadMedicos();
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}><div><h1>Medicos</h1><p>Equipe medica vinculada aos atendimentos.</p></div></header>
        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.formCard}`}>
            <h2>{editingId ? "Editar medico" : "Novo medico"}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}><span>Nome</span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></label>
              <label className={styles.field}><span>CRM</span><input value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} required /></label>
              <label className={styles.field}><span>Especialidade</span><input value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} required /></label>
              <label className={styles.field}><span>Telefone</span><input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
              <label className={styles.field}><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button} disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar" : "Cadastrar"}</button>
              </div>
            </form>
          </article>
          <article className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.toolbar}><h2>Medicos cadastrados</h2><span>{medicos.length} registros</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Nome</th><th>CRM</th><th>Especialidade</th><th>Email</th><th>Status</th><th>Acoes</th></tr></thead>
                <tbody>{medicos.map((medico) => <tr key={medico.id}><td>{medico.nome}</td><td>{medico.crm}</td><td>{medico.especialidade}</td><td>{medico.email ?? "-"}</td><td><span className={`${styles.badge} ${medico.ativo ? styles.success : styles.danger}`}>{medico.ativo ? "Ativo" : "Inativo"}</span></td><td><div className={styles.rowActions}><button className={styles.ghostButton} type="button" onClick={() => { setForm(toForm(medico)); setEditingId(medico.id); setMessage(""); }}>Editar</button><button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteMedico(medico)}>Apagar</button></div></td></tr>)}</tbody></table>
              {medicos.length === 0 && <div className={styles.empty}>Nenhum medico cadastrado.</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
