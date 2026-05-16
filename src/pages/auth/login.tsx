import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import BrandLogo from "../../components/BrandLogo/BrandLogo";
import styles from "./login.module.css";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.containerLogin}>
      <section className={styles.shell}>
        <aside className={styles.panel}>
          <div className={styles.brand}>
            <BrandLogo className={styles.panelLogo} />
            <small>Sistema de gestao interna</small>
          </div>

          <div className={styles.panelContent}>
            <p className={styles.kicker}>Agenda, pacientes e atendimentos</p>
            <h1>Uma rotina clinica mais organizada para toda a equipe.</h1>
            <p>
              Acesse o painel administrativo para acompanhar horarios, consultas e informacoes essenciais
              dos pacientes em um unico lugar.
            </p>
          </div>

          <p className={styles.panelFooter}>Acesso exclusivo para colaboradores autorizados.</p>
        </aside>

        <section className={styles.loginArea}>
          <form className={styles.card} onSubmit={handleSubmit}>
            <div className={styles.cardHeader}>
              <span>Bem-vindo de volta</span>
              <h2>Entrar no sistema</h2>
              <p>Informe suas credenciais para continuar.</p>
            </div>

            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                placeholder="nome@clinicaalmeida.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Senha</span>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <label className={styles.remember}>
              <input type="checkbox" />
              <span>Manter conectado</span>
            </label>

            {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Entrando..." : "Acessar painel"}
            </button>

            <p className={styles.support}>Em caso de dificuldade, procure o administrador da clinica.</p>
          </form>
        </section>
      </section>
    </main>
  );
}
