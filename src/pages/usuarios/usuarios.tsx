import { useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import { useAuth } from "../../auth/authStore";
import styles from "../../components/CrudPage.module.css";

export default function Usuarios() {
  const { profile, updatePassword, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas nao conferem.");
      return;
    }

    setSaving(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      setMessage("Senha alterada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel alterar a senha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}>
          <div>
            <h1>Perfil</h1>
            <p>Dados da conta autenticada no Supabase.</p>
          </div>
        </header>

        <section className={styles.split}>
          <article className={`${styles.card} ${styles.listCard}`}>
            <h2>Minha conta</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <tbody>
                  <tr><th>Nome</th><td>{profile?.nome ?? "-"}</td></tr>
                  <tr><th>Email</th><td>{user?.email ?? "-"}</td></tr>
                  <tr><th>Perfil</th><td><span className={styles.badge}>{profile?.role ?? "-"}</span></td></tr>
                  <tr><th>ID do medico</th><td className={styles.muted}>{profile?.medico_id ?? "Nao vinculado"}</td></tr>
                </tbody>
              </table>
            </div>
          </article>

          <article className={`${styles.card} ${styles.formCard}`}>
            <h2>Alterar senha</h2>
            <form className={styles.form} onSubmit={handlePasswordSubmit}>
              <label className={styles.field}>
                <span>Nova senha</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
              </label>
              <label className={styles.field}>
                <span>Confirmar senha</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
              </label>
              {message && <p className={styles.message}>{message}</p>}
              <div className={styles.actions}>
                <button className={styles.button} disabled={saving}>{saving ? "Salvando..." : "Trocar senha"}</button>
              </div>
            </form>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}
