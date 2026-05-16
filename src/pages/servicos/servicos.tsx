import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Servico } from "../../lib/clinicTypes";
import { supabase } from "../../lib/supabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { nome: "", descricao: "", duracao_minutos: "30", valor: "0" };

function toForm(servico: Servico) {
  return {
    nome: servico.nome,
    descricao: servico.descricao ?? "",
    duracao_minutos: String(servico.duracao_minutos),
    valor: String(servico.valor),
  };
}

export default function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadServicos = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("servicos").select("id,nome,descricao,duracao_minutos,valor,ativo").order("created_at", { ascending: false }).returns<Servico[]>();
    setServicos(data ?? []);
  };

  useEffect(() => { void loadServicos(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      duracao_minutos: Number(form.duracao_minutos),
      valor: Number(form.valor),
      ativo: true,
    };

    const { error } = editingId
      ? await supabase.from("servicos").update(payload).eq("id", editingId)
      : await supabase.from("servicos").insert(payload);

    setMessage(error ? "Nao foi possivel salvar o servico." : editingId ? "Servico atualizado com sucesso." : "Servico cadastrado com sucesso.");
    if (!error) {
      resetForm();
      await loadServicos();
    }
  };

  const deleteServico = async (servico: Servico) => {
    if (!supabase || !window.confirm(`Apagar ${servico.nome}?`)) return;
    const { error } = await supabase.from("servicos").update({ ativo: false }).eq("id", servico.id);
    setMessage(error ? "Nao foi possivel apagar o servico." : "Servico apagado da lista ativa.");
    await loadServicos();
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}><div><h1>Servicos</h1><p>Procedimentos oferecidos pela clinica.</p></div></header>
        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.formCard}`}>
            <h2>{editingId ? "Editar servico" : "Novo servico"}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}><span>Nome</span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></label>
              <label className={styles.field}><span>Descricao</span><textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label>
              <label className={styles.field}><span>Duracao em minutos</span><input type="number" min="1" value={form.duracao_minutos} onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })} required /></label>
              <label className={styles.field}><span>Valor</span><input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required /></label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button}>{editingId ? "Salvar" : "Cadastrar"}</button>
              </div>
            </form>
          </article>
          <article className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.toolbar}><h2>Servicos cadastrados</h2><span>{servicos.length} registros</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Nome</th><th>Duracao</th><th>Valor</th><th>Status</th><th>Acoes</th></tr></thead>
                <tbody>{servicos.map((servico) => <tr key={servico.id}><td>{servico.nome}</td><td>{servico.duracao_minutos} min</td><td>R$ {Number(servico.valor).toFixed(2)}</td><td><span className={`${styles.badge} ${servico.ativo ? styles.success : styles.danger}`}>{servico.ativo ? "Ativo" : "Inativo"}</span></td><td><div className={styles.rowActions}><button className={styles.ghostButton} type="button" onClick={() => { setForm(toForm(servico)); setEditingId(servico.id); setMessage(""); }}>Editar</button><button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteServico(servico)}>Apagar</button></div></td></tr>)}</tbody></table>
              {servicos.length === 0 && <div className={styles.empty}>Nenhum servico cadastrado.</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
