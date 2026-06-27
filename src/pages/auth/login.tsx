import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import BrandLogo from "../../components/BrandLogo/BrandLogo";
import styles from "./login.module.css";

const demoCredentials = [
  { role: "Recepcao", email: "recepcao@clinica.com", password: "Clinica@123456" },
  { role: "teste", email: "teste@clinica.com", password: "Clinica@123456" },
  { role: "Dra. Ana", email: "ana.ribeiro@clinica.com", password: "Clinica@123456" },
  { role: "Dr. Bruno", email: "bruno.matos@clinica.com", password: "Clinica@123456" },
  { role: "Dra. Clara", email: "clara.neves@clinica.com", password: "Clinica@123456" },
  { role: "Dr. Diego", email: "diego.lima@clinica.com", password: "Clinica@123456" },
  { role: "Dra. Elisa", email: "elisa.torres@clinica.com", password: "Clinica@123456" },
];

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const fillDemoCredential = (credential: typeof demoCredentials[number]) => {
    setEmail(credential.email);
    setPassword(credential.password);
    setErrorMessage("");
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

          <section className={styles.demoAccess} aria-label="Acessos de teste">
            <div>
              <strong>Acessos para recrutadores</strong>
              <span>Clique em uma credencial para preencher o login.</span>
            </div>
            <div className={styles.demoList}>
              {demoCredentials.map((credential) => (
                <button key={credential.email} type="button" onClick={() => fillDemoCredential(credential)}>
                  <span>{credential.role}</span>
                  <code>{credential.email}</code>
                  <small>Senha: {credential.password}</small>
                </button>
              ))}
            </div>
          </section>
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
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button className={styles.eyeButton} type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                  <EyeIcon crossed={showPassword} />
                </button>
              </div>
            </label>

            <label className={styles.remember}>
              <input type="checkbox" />
              <span>Manter conectado</span>
            </label>

            {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Entrando..." : "Acessar painel"}
            </button>

            <p className={styles.support}>Use um dos acessos de teste ao lado para explorar o sistema.</p>
          </form>
        </section>
      </section>
    </main>
  );
}
