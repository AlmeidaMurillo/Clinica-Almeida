import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import type { Medico } from "../../lib/clinicTypes";
import { localDb } from "../../lib/localDatabase";
import styles from "../../components/CrudPage.module.css";

const initialForm = { nome: "", crm: "", especialidade: "", telefone: "", email: "", senha: "" };

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toForm(medico: Medico) {
  return {
    nome: medico.nome,
    crm: medico.crm,
    especialidade: medico.especialidade,
    telefone: medico.telefone ?? "",
    email: medico.email ?? "",
    senha: medico.senha_login ?? "",
  };
}

export default function Medicos() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const medicosFiltrados = useMemo(() => {
    const term = normalizeSearch(search);
    if (!term) return medicos;

    return medicos.filter((medico) => {
      const searchable = normalizeSearch([
        medico.nome,
        medico.crm,
        medico.especialidade,
        medico.email ?? "",
        medico.telefone ?? "",
      ].join(" "));

      return searchable.includes(term);
    });
  }, [medicos, search]);

  const loadMedicos = async () => {
    if (!localDb) return;
    let { data, error } = await localDb.from("medicos").select("id,nome,crm,especialidade,telefone,email,senha_login,ativo").order("created_at", { ascending: false }).returns<Medico[]>();

    if (error && (error.code === "42703" || error.message.toLowerCase().includes("senha_login"))) {
      console.warn("Coluna senha_login ainda nao existe em medicos", error);
      const fallback = await localDb.from("medicos").select("id,nome,crm,especialidade,telefone,email,ativo").order("created_at", { ascending: false }).returns<Medico[]>();
      data = fallback.data;
      error = fallback.error;

      if (!fallback.error) {
        setMessage("Medicos carregados.");
      }
    }

    if (error) {
      console.error("Erro ao carregar medicos", error);
      setMessage(`Nao foi possivel carregar os medicos. ${error.message}`);
      return;
    }

    setMedicos(data ?? []);
  };

  useEffect(() => {
    void loadMedicos();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowPassword(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localDb) return;

    if (form.senha.length < 6) {
      setMessage("A senha do login medico precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSaving(true);

    const payload = {
      nome: form.nome,
      crm: form.crm,
      especialidade: form.especialidade,
      telefone: form.telefone || null,
      email: form.email || null,
      senha_login: form.senha,
      ativo: true,
    };
    const { data: medicoCriado, error } = editingId
      ? await localDb.from("medicos").update(payload).eq("id", editingId)
      : await localDb.from("medicos").insert(payload).select("id").single<{ id: string }>();

    if (error) {
      setSaving(false);
      console.error("Erro ao salvar medico", error);
      setMessage(`Nao foi possivel salvar o medico. ${error.message}`);
      return;
    }

    const medicoId = editingId ?? (Array.isArray(medicoCriado) ? medicoCriado[0]?.id : medicoCriado?.id);

    if (medicoId) {
      const { error: userError } = await localDb.functions.invoke("create-medico-user", {
        body: {
          medicoId,
          nome: form.nome,
          email: form.email,
          password: form.senha,
        },
      });

      if (userError) {
        setSaving(false);
        console.error("Erro ao criar login do medico", userError);
        setMessage("Medico salvo, mas nao foi possivel atualizar o login local.");
        await loadMedicos();
        return;
      }
    }

    setSaving(false);
    setMessage(editingId ? "Medico e login atualizados com sucesso." : "Medico e login cadastrados com sucesso.");
    resetForm();
    await loadMedicos();
  };

  const toggleMedicoStatus = async (medico: Medico) => {
    if (!localDb) return;

    const { error } = await localDb.from("medicos").update({ ativo: !medico.ativo }).eq("id", medico.id);
    if (error) {
      console.error("Erro ao alterar status do medico", error);
      setMessage(`Nao foi possivel ${medico.ativo ? "desativar" : "ativar"} o medico. ${error.message}`);
      return;
    }

    setMessage(medico.ativo ? "Medico desativado." : "Medico ativado.");
    await loadMedicos();
  };

  const deleteMedico = async (medico: Medico) => {
    if (!localDb || !window.confirm(`Apagar definitivamente ${medico.nome}? Esta acao nao pode ser desfeita.`)) return;

    const { error } = await localDb.from("medicos").delete().eq("id", medico.id);
    if (error) {
      console.error("Erro ao apagar medico", error);
      setMessage(`Nao foi possivel apagar o medico. ${error.message}`);
      return;
    }

    setMessage("Medico apagado definitivamente.");
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
              <label className={styles.field}><span>Email de login</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label className={styles.field}>
                <span>Senha do login</span>
                <div className={styles.passwordWrap}>
                  <input type={showPassword ? "text" : "password"} minLength={6} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} autoComplete="new-password" required />
                  <button className={styles.eyeButton} type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    <EyeIcon crossed={showPassword} />
                  </button>
                </div>
              </label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                {editingId && <button className={styles.ghostButton} type="button" onClick={resetForm}>Cancelar</button>}
                <button className={styles.button} disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar" : "Cadastrar"}</button>
              </div>
            </form>
          </article>
          <article className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.toolbar}>
              <h2>Medicos cadastrados</h2>
              <span>{medicosFiltrados.length} de {medicos.length} registros</span>
            </div>
            <label className={`${styles.field} ${styles.searchField}`}>
              <span>Pesquisar medico</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, CRM, especialidade ou email" />
            </label>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Nome</th><th>CRM</th><th>Especialidade</th><th>Email</th><th>Status</th><th>Acoes</th></tr></thead>
                <tbody>{medicosFiltrados.map((medico) => <tr key={medico.id}><td>{medico.nome}</td><td>{medico.crm}</td><td>{medico.especialidade}</td><td>{medico.email ?? "-"}</td><td><span className={`${styles.badge} ${medico.ativo ? styles.success : styles.danger}`}>{medico.ativo ? "Ativo" : "Inativo"}</span></td><td><div className={styles.rowActions}><button className={styles.ghostButton} type="button" onClick={() => { setForm(toForm(medico)); setEditingId(medico.id); setShowPassword(false); setMessage(""); }}>Editar</button><button className={styles.ghostButton} type="button" onClick={() => void toggleMedicoStatus(medico)}>{medico.ativo ? "Desativar" : "Ativar"}</button><button className={`${styles.ghostButton} ${styles.dangerButton}`} type="button" onClick={() => void deleteMedico(medico)}>Apagar</button></div></td></tr>)}</tbody></table>
              {medicosFiltrados.length === 0 && <div className={styles.empty}>{search ? "Nenhum medico encontrado." : "Nenhum medico cadastrado."}</div>}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
