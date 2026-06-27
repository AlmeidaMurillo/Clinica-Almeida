import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Servico } from "../../lib/clinicTypes";
import { localDb } from "../../lib/localDatabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { nome: "", descricao: "", duracao_minutos: "30", valor: "0" };

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

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
  const [search, setSearch] = useState("");

  const servicosFiltrados = useMemo(() => {
    const term = normalizeSearch(search);
    if (!term) return servicos;

    return servicos.filter((servico) => {
      const searchable = normalizeSearch([
        servico.nome,
        servico.descricao ?? "",
        String(servico.duracao_minutos),
        String(servico.valor),
      ].join(" "));

      return searchable.includes(term);
    });
  }, [servicos, search]);

  const loadServicos = async () => {
    if (!localDb) return;
    const { data, error } = await localDb.from("servicos").select("id,nome,descricao,duracao_minutos,valor,ativo").order("created_at", { ascending: false }).returns<Servico[]>();
    if (error) {
      console.error("Erro ao carregar servicos", error);
      setMessage(`Nao foi possivel carregar os servicos. ${error.message}`);
      return;
    }

    setServicos(data ?? []);
  };

  useEffect(() => { void loadServicos(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localDb) return;

    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      duracao_minutos: Number(form.duracao_minutos),
      valor: Number(form.valor),
      ativo: true,
    };

    const { error } = editingId
      ? await localDb.from("servicos").update(payload).eq("id", editingId)
      : await localDb.from("servicos").insert(payload);

    if (error) {
      console.error("Erro ao salvar servico", error);
      setMessage(`Nao foi possivel salvar o servico. ${error.message}`);
      return;
    }

    setMessage(editingId ? "Servico atualizado com sucesso." : "Servico cadastrado com sucesso.");
    resetForm();
    await loadServicos();
  };

  const toggleServicoStatus = async (servico: Servico) => {
    if (!localDb) return;

    const { error } = await localDb.from("servicos").update({ ativo: !servico.ativo }).eq("id", servico.id);
    if (error) {
      console.error("Erro ao alterar status do servico", error);
      setMessage(`Nao foi possivel ${servico.ativo ? "desativar" : "ativar"} o servico. ${error.message}`);
      return;
    }

    setMessage(servico.ativo ? "Servico desativado." : "Servico ativado.");
    await loadServicos();
  };

  const deleteServico = async (servico: Servico) => {
    if (!localDb || !window.confirm(`Apagar definitivamente ${servico.nome}? Esta acao nao pode ser desfeita.`)) return;

    const { error } = await localDb.from("servicos").delete().eq("id", servico.id);
    if (error) {
      console.error("Erro ao apagar servico", error);
      setMessage(`Nao foi possivel apagar o servico. ${error.message}`);
      return;
    }

    setMessage("Servico apagado definitivamente.");
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
            <div className={styles.toolbar}><h2>Servicos cadastrados</h2><span>{servicosFiltrados.length} de {servicos.length} registros</span></div>
            <label className={`${styles.field} ${styles.searchField}`}>
              <span>Pesquisar servico</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, descricao, duracao ou valor" />
            </label>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Nome</th><th>Duracao</th><th>Valor</th><th>Status</th><th>Acoes</th></tr></thead>
                <tbody>{servicosFiltrados.map((servico) => <tr key={servico.id}><td>{servico.nome}</td><td>{servico.duracao_minutos} min</td><td>R$ {Number(servico.valor).toFixed(2)}</td><td><span className={`${styles.badge} ${servico.ativo ? styles.success : styles.danger}`}>{servico.ativo ? "Ativo" : "Inativo"}</span></td><td><div className={styles.rowActions}><button className={styles.ghostButton} type="button" onClick={() => { setForm(toForm(servico)); setEditingId(servico.id); setMessage(""); }}>Editar</button><button className={styles.ghostButton} type="button" onClick={() => void toggleServicoStatus(servico)}>{servico.ativo ? "Desativar" : "Ativar"}</button><button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteServico(servico)}>Apagar</button></div></td></tr>)}</tbody></table>
              {servicosFiltrados.length === 0 && <div className={styles.empty}>{search ? "Nenhum servico encontrado." : "Nenhum servico cadastrado."}</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
