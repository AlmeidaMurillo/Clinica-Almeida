import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Convenio } from "../../lib/clinicTypes";
import { localDb } from "../../lib/localDatabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { nome: "", contato: "", telefone: "" };

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

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
  const [search, setSearch] = useState("");

  const conveniosFiltrados = useMemo(() => {
    const term = normalizeSearch(search);
    if (!term) return convenios;

    return convenios.filter((convenio) => {
      const searchable = normalizeSearch([
        convenio.nome,
        convenio.contato ?? "",
        convenio.telefone ?? "",
      ].join(" "));

      return searchable.includes(term);
    });
  }, [convenios, search]);

  const loadConvenios = async () => {
    if (!localDb) return;
    const { data, error } = await localDb.from("convenios").select("id,nome,contato,telefone,ativo").order("created_at", { ascending: false }).returns<Convenio[]>();
    if (error) {
      console.error("Erro ao carregar convenios", error);
      setMessage(`Nao foi possivel carregar os convenios. ${error.message}`);
      return;
    }

    setConvenios(data ?? []);
  };

  useEffect(() => { void loadConvenios(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localDb) return;

    const payload = { nome: form.nome, contato: form.contato || null, telefone: form.telefone || null, ativo: true };
    const { error } = editingId
      ? await localDb.from("convenios").update(payload).eq("id", editingId)
      : await localDb.from("convenios").insert(payload);

    if (error) {
      console.error("Erro ao salvar convenio", error);
      setMessage(`Nao foi possivel salvar o convenio. ${error.message}`);
      return;
    }

    setMessage(editingId ? "Convenio atualizado com sucesso." : "Convenio cadastrado com sucesso.");
    resetForm();
    await loadConvenios();
  };

  const toggleConvenioStatus = async (convenio: Convenio) => {
    if (!localDb) return;

    const { error } = await localDb.from("convenios").update({ ativo: !convenio.ativo }).eq("id", convenio.id);
    if (error) {
      console.error("Erro ao alterar status do convenio", error);
      setMessage(`Nao foi possivel ${convenio.ativo ? "desativar" : "ativar"} o convenio. ${error.message}`);
      return;
    }

    setMessage(convenio.ativo ? "Convenio desativado." : "Convenio ativado.");
    await loadConvenios();
  };

  const deleteConvenio = async (convenio: Convenio) => {
    if (!localDb || !window.confirm(`Apagar definitivamente ${convenio.nome}? Esta acao nao pode ser desfeita.`)) return;

    const { error } = await localDb.from("convenios").delete().eq("id", convenio.id);
    if (error) {
      console.error("Erro ao apagar convenio", error);
      setMessage(`Nao foi possivel apagar o convenio. ${error.message}`);
      return;
    }

    setMessage("Convenio apagado definitivamente.");
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
            <div className={styles.toolbar}><h2>Convenios cadastrados</h2><span>{conveniosFiltrados.length} de {convenios.length} registros</span></div>
            <label className={`${styles.field} ${styles.searchField}`}>
              <span>Pesquisar convenio</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, contato ou telefone" />
            </label>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Nome</th><th>Contato</th><th>Telefone</th><th>Status</th><th>Acoes</th></tr></thead>
                <tbody>{conveniosFiltrados.map((item) => {
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
                          <button className={styles.ghostButton} type="button" onClick={() => void toggleConvenioStatus(item)}>{item.ativo ? "Desativar" : "Ativar"}</button>
                          <button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteConvenio(item)}>Apagar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody></table>
              {conveniosFiltrados.length === 0 && <div className={styles.empty}>{search ? "Nenhum convenio encontrado." : "Nenhum convenio cadastrado."}</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
