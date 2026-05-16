import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Convenio } from "../../lib/clinicTypes";
import { supabase } from "../../lib/supabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { nome: "", contato: "", telefone: "" };

function toForm(convenio: Convenio) {
  return {
    nome: convenio.nome,
    contato: convenio.contato ?? "",
    telefone: convenio.telefone ?? "",
  };
}

function getPhoneDigits(phone: string | null) {
  return phone?.replace(/\D/g, "") ?? "";
}

export default function Convenios() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadConvenios = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("convenios").select("id,nome,contato,telefone,ativo").order("nome").returns<Convenio[]>();
    setConvenios(data ?? []);
  };

  useEffect(() => { void loadConvenios(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    const payload = { nome: form.nome, contato: form.contato || null, telefone: form.telefone || null, ativo: true };
    const { error } = editingId
      ? await supabase.from("convenios").update(payload).eq("id", editingId)
      : await supabase.from("convenios").insert(payload);

    setMessage(error ? "Nao foi possivel salvar o convenio." : editingId ? "Convenio atualizado com sucesso." : "Convenio cadastrado com sucesso.");
    if (!error) {
      resetForm();
      await loadConvenios();
    }
  };

  const deleteConvenio = async (convenio: Convenio) => {
    if (!supabase || !window.confirm(`Apagar ${convenio.nome}?`)) return;
    const { error } = await supabase.from("convenios").update({ ativo: false }).eq("id", convenio.id);
    setMessage(error ? "Nao foi possivel apagar o convenio." : "Convenio apagado da lista ativa.");
    await loadConvenios();
  };

  const restoreConvenio = async (convenio: Convenio) => {
    if (!supabase) return;
    const { error } = await supabase.from("convenios").update({ ativo: true }).eq("id", convenio.id);
    setMessage(error ? "Nao foi possivel reativar o convenio." : "Convenio reativado.");
    await loadConvenios();
  };

  const copyContato = async (convenio: Convenio) => {
    const texto = `${convenio.nome}${convenio.contato ? ` - ${convenio.contato}` : ""}${convenio.telefone ? ` - ${convenio.telefone}` : ""}`;

    try {
      await navigator.clipboard.writeText(texto);
      setMessage("Contato do convenio copiado.");
    } catch {
      setMessage(texto);
    }
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}><div><h1>Convenios</h1><p>Operadoras e contatos utilizados pela recepcao.</p></div></header>
        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.formCard}`}>
            <h2>{editingId ? "Editar convenio" : "Novo convenio"}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}><span>Nome</span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></label>
              <label className={styles.field}><span>Contato</span><input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></label>
              <label className={styles.field}><span>Telefone</span><input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button}>{editingId ? "Salvar" : "Cadastrar"}</button>
              </div>
            </form>
          </article>
          <article className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.toolbar}><h2>Convenios cadastrados</h2><span>{convenios.length} registros</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Nome</th><th>Contato</th><th>Telefone</th><th>Status</th><th>Acoes</th></tr></thead>
                <tbody>{convenios.map((item) => {
                  const telefone = getPhoneDigits(item.telefone);
                  const whatsapp = telefone ? `https://wa.me/55${telefone}` : "";
                  const ligar = telefone ? `tel:${telefone}` : "";

                  return (
                    <tr key={item.id}>
                      <td>{item.nome}</td>
                      <td>{item.contato ?? "-"}</td>
                      <td>{item.telefone ?? "-"}</td>
                      <td><span className={`${styles.badge} ${item.ativo ? styles.success : styles.danger}`}>{item.ativo ? "Ativo" : "Inativo"}</span></td>
                      <td>
                        <div className={styles.rowActions}>
                          {ligar && <a className={styles.ghostButton} href={ligar}>Ligar</a>}
                          {whatsapp && <a className={styles.ghostButton} href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
                          <button className={styles.ghostButton} type="button" onClick={() => void copyContato(item)}>Copiar</button>
                          <button className={styles.ghostButton} type="button" onClick={() => { setForm(toForm(item)); setEditingId(item.id); setMessage(""); }}>Editar</button>
                          {!item.ativo && <button className={styles.ghostButton} type="button" onClick={() => void restoreConvenio(item)}>Reativar</button>}
                          <button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteConvenio(item)}>Apagar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody></table>
              {convenios.length === 0 && <div className={styles.empty}>Nenhum convenio cadastrado.</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
