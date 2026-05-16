import { useEffect, useRef, useState } from "react";
import type { FocusEvent, MouseEvent, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import type { UserRole } from "../../auth/authStore";
import { supabase } from "../../lib/supabase";
import BrandLogo from "../BrandLogo/BrandLogo";
import ChatBot from "../chatbot/ChatBot";
import ShellScrollbar from "./ShellScrollbar";
import styles from "./AppLayout.module.css";

/*
   ==========
   APP LAYOUT
   ==========

   Layout das paginas logadas:
   cabecalho, menu lateral, conteudo e menu inferior no celular.
*/

const MENU_ABERTO_KEY = "clinica-menu-aberto";
const MOBILE_BREAKPOINT = 1200;

type IconeNome =
  | "bell"
  | "briefcase"
  | "calendar"
  | "clipboard"
  | "dashboard"
  | "doctor"
  | "grid"
  | "logout"
  | "patients"
  | "shield"
  | "stethoscope"
  | "users"
  | "x";

type LinkMenuItem = {
  texto: string;
  rota: string;
  icone: IconeNome;
  end?: boolean;
  destaque?: boolean;
  roles?: UserRole[];
};

type SecaoMenuItem = {
  titulo: string;
  links: LinkMenuItem[];
};

type TooltipMenu = {
  texto: string;
  top: number;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  to: string;
};

type NamedRelation = { nome?: string } | { nome?: string }[] | null | undefined;

type IconeProps = {
  nome: IconeNome;
};

type BotaoMenuProps = {
  aberto: boolean;
  onClick: () => void;
};

type LinkMenuProps = {
  link: LinkMenuItem;
  fecharMenuMobile: () => void;
  mostrarTooltip: (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>, texto: string) => void;
  esconderTooltip: () => void;
};

type SecaoMenuProps = {
  titulo: string;
  links: LinkMenuItem[];
  aberto: boolean;
  menuAberto: boolean;
  alternarSecao: (titulo: string) => void;
  fecharMenuMobile: () => void;
  mostrarTooltip: LinkMenuProps["mostrarTooltip"];
  esconderTooltip: () => void;
};

type MenuMobileProps = {
  aberto: boolean;
  alternarMenu: () => void;
  links: LinkMenuItem[];
};

type AcoesCabecalhoProps = {
  nomeUsuario: string;
  emailUsuario: string;
  cargoUsuario: string;
  notificationItems: NotificationItem[];
  notificationText: string;
  notificationCount: number;
  onSignOut: () => void;
};

type AppLayoutProps = {
  children: ReactNode;
};

/*
   ==========
   MENU
   ==========
*/

const menuPrincipal: SecaoMenuItem[] = [
  {
    titulo: "Atendimento",
    links: [
      { texto: "Dashboard", rota: "/dashboard", icone: "dashboard", end: true },
      { texto: "Agendamentos", rota: "/agendamentos", icone: "calendar", roles: ["recepcao"] },
      { texto: "Pacientes", rota: "/pacientes", icone: "patients", roles: ["recepcao"] },
      { texto: "Consultas", rota: "/consultas", icone: "stethoscope" },
      { texto: "Prontuarios", rota: "/prontuarios", icone: "clipboard" },
    ],
  },
  {
    titulo: "Gestao",
    links: [
      { texto: "Medicos", rota: "/medicos", icone: "doctor", roles: ["recepcao"] },
      { texto: "Servicos", rota: "/servicos", icone: "briefcase", roles: ["recepcao"] },
      { texto: "Convenios", rota: "/convenios", icone: "shield", roles: ["recepcao"] },
    ],
  },
  {
    titulo: "Sistema",
    links: [
      { texto: "Perfil", rota: "/usuarios", icone: "users", },
    ],
  },
];

const menuMobile: LinkMenuItem[] = [
  { texto: "Dashboard", rota: "/dashboard", icone: "dashboard", end: true },
  { texto: "Agenda", rota: "/agendamentos", icone: "calendar", destaque: true, roles: ["recepcao"] },
  { texto: "Consultas", rota: "/consultas", icone: "stethoscope", destaque: true, roles: ["medico"] },
  { texto: "Pacientes", rota: "/pacientes", icone: "patients", roles: ["recepcao"] },
  { texto: "Perfil", rota: "/usuarios", icone: "users", roles: ["medico"] },
];

function getRelationName(relation: NamedRelation, fallback: string) {
  if (Array.isArray(relation)) return relation[0]?.nome ?? fallback;
  return relation?.nome ?? fallback;
}

/*
   ==========
   ICONES
   ==========
*/

function Icone({ nome }: IconeProps) {
  const icones = {
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    briefcase: (
      <>
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        <path d="M4 7h16v12H4z" />
        <path d="M4 12h16" />
      </>
    ),
    calendar: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M5 9h14" />
      </>
    ),
    clipboard: (
      <>
        <path d="M9 4h6l1 2h2v15H6V6h2z" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </>
    ),
    dashboard: (
      <>
        <path d="M4 13a8 8 0 1 1 16 0" />
        <path d="M4 13v6h16v-6" />
        <path d="m12 13 4-4" />
      </>
    ),
    doctor: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
        <path d="M16 14v5" />
        <path d="M13.5 16.5h5" />
      </>
    ),
    grid: (
      <>
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h6v6h-6z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-7" />
      </>
    ),
    patients: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M16 11h6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        <path d="m8.5 12 2.3 2.3 4.7-5" />
      </>
    ),
    stethoscope: (
      <>
        <path d="M6 4v5a4 4 0 0 0 8 0V4" />
        <path d="M4 4h4" />
        <path d="M12 4h4" />
        <path d="M10 13v2a5 5 0 0 0 10 0v-1" />
        <circle cx="20" cy="12" r="2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.8" />
        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  };

  return (
    <svg className={styles.iconeSvg} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icones[nome] || <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

/*
   ==========
   COMPONENTES
   ==========
*/

function BotaoMenu({ aberto, onClick }: BotaoMenuProps) {
  return (
    <button
      className={styles.botaoMenu}
      type="button"
      onClick={onClick}
      aria-label={aberto ? "Fechar menu" : "Abrir menu"}
      aria-pressed={aberto}
    >
      <span />
      <span />
      <span />
    </button>
  );
}

function LinkMenu({ link, fecharMenuMobile, mostrarTooltip, esconderTooltip }: LinkMenuProps) {
  const textoTooltip = link.texto;

  const eventosTooltip = {
    onMouseEnter: (event: MouseEvent<HTMLAnchorElement>) => mostrarTooltip(event, textoTooltip),
    onMouseLeave: esconderTooltip,
    onFocus: (event: FocusEvent<HTMLAnchorElement>) => mostrarTooltip(event, textoTooltip),
    onBlur: esconderTooltip,
  };

  return (
    <NavLink
      className={({ isActive }) => `${styles.linkMenu} ${isActive ? styles.linkAtivo : ""}`}
      to={link.rota}
      end={link.end}
      onClick={fecharMenuMobile}
      {...eventosTooltip}
    >
      <span className={styles.linkIcone}>
        <Icone nome={link.icone} />
      </span>
      <span className={styles.linkTexto}>{link.texto}</span>
    </NavLink>
  );
}

function SecaoMenu({ titulo, links, aberto, menuAberto, alternarSecao, fecharMenuMobile, mostrarTooltip, esconderTooltip }: SecaoMenuProps) {
  const mostrarLinks = !menuAberto || aberto;
  const podeRecolher = titulo !== "";
  const idSecao = `menu-${titulo.toLowerCase()}`;

  return (
    <section className={`${styles.secaoMenu} ${mostrarLinks ? "" : styles.secaoFechada}`}>
      <h2>
        {podeRecolher ? (
          <button
            className={styles.botaoSecao}
            type="button"
            onClick={() => alternarSecao(titulo)}
            aria-expanded={aberto}
            aria-controls={idSecao}
          >
            <span>{titulo}</span>
            <span className={styles.setaSecao} aria-hidden="true" />
          </button>
        ) : (
          <span className={styles.tituloSecao}>{titulo}</span>
        )}
      </h2>

      <div className={styles.painelSecao} data-aberto={mostrarLinks} id={idSecao}>
        <nav className={styles.listaLinks}>
          {links.map((link) => (
            <LinkMenu
              key={link.texto}
              link={link}
              fecharMenuMobile={fecharMenuMobile}
              mostrarTooltip={mostrarTooltip}
              esconderTooltip={esconderTooltip}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}

function AcoesCabecalho({ nomeUsuario, emailUsuario, cargoUsuario, notificationItems, notificationText, notificationCount, onSignOut }: AcoesCabecalhoProps) {
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const acoesRef = useRef<HTMLDivElement | null>(null);

  const iniciais = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const fecharAoClicarFora = (event: globalThis.MouseEvent) => {
      if (!acoesRef.current?.contains(event.target as Node)) {
        setPerfilAberto(false);
        setNotificacoesAbertas(false);
      }
    };

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  return (
    <div className={styles.acoesCabecalho} aria-label="Acoes da conta" ref={acoesRef}>
      <div className={styles.areaPopover}>
        <button
          className={styles.botaoCabecalho}
          type="button"
          aria-label="Notificacoes"
          aria-expanded={notificacoesAbertas}
          onClick={() => {
            setNotificacoesAbertas((aberto) => !aberto);
            setPerfilAberto(false);
          }}
        >
          <Icone nome="bell" />
          {notificationCount > 0 && <span className={styles.pontoNotificacao} />}
        </button>

        {notificacoesAbertas && (
          <div className={styles.popoverConta} role="dialog" aria-label="Notificacoes">
            <div className={styles.popoverTitulo}>
              <strong>Notificacoes</strong>
              <small>{notificationCount > 0 ? `${notificationCount} hoje` : "Tudo certo"}</small>
            </div>
            {notificationItems.length > 0 ? (
              <nav className={styles.listaNotificacoes}>
                {notificationItems.map((item) => (
                  <NavLink key={item.id} className={styles.notificacaoItem} to={item.to} onClick={() => setNotificacoesAbertas(false)}>
                    <Icone nome="bell" />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                  </NavLink>
                ))}
              </nav>
            ) : (
              <div className={styles.notificacaoItem}>
                <Icone nome="bell" />
                <span>{notificationText}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.areaPopover}>
        <button
          className={styles.avatar}
          type="button"
          aria-label={`Perfil de ${nomeUsuario}`}
          aria-expanded={perfilAberto}
          onClick={() => {
            setPerfilAberto((aberto) => !aberto);
            setNotificacoesAbertas(false);
          }}
        >
          {iniciais || "U"}
        </button>

        {perfilAberto && (
          <div className={styles.popoverConta} role="dialog" aria-label="Menu do perfil">
            <div className={styles.perfilResumo}>
              <span className={styles.avatarGrande}>{iniciais || "U"}</span>
              <div>
                <strong>{nomeUsuario}</strong>
                <small>{cargoUsuario}</small>
                <small>{emailUsuario}</small>
              </div>
            </div>
            <nav className={styles.menuConta}>
              <NavLink to="/usuarios" onClick={() => setPerfilAberto(false)}>
                <Icone nome="users" />
                Meu Perfil
              </NavLink>
              <button type="button" onClick={onSignOut}>
                <Icone nome="logout" />
                Sair
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuMobile({ aberto, alternarMenu, links }: MenuMobileProps) {
  return (
    <nav className={styles.menuInferior} aria-label="Navegacao mobile">
      <button
        className={`${styles.itemMobile} ${aberto ? styles.itemMobileAtivo : ""}`}
        type="button"
        onClick={alternarMenu}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-pressed={aberto}
      >
        <span className={styles.iconeMobile}>
          <Icone nome="grid" />
        </span>
        <span className={styles.textoMobile}>Menu</span>
      </button>

      {links.map((link) => (
        <NavLink
          key={link.texto}
          className={({ isActive }) =>
            `${styles.itemMobile} ${link.destaque ? styles.itemMobileDestaque : ""} ${isActive ? styles.itemMobileAtivo : ""}`
          }
          to={link.rota}
          end={link.end}
        >
          <span className={styles.iconeMobile}>
            <Icone nome={link.icone} />
          </span>
          <span className={styles.textoMobile}>{link.texto}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/*
   ==========
   LAYOUT
   ==========
*/

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const conteudoRef = useRef<HTMLElement | null>(null);

  const [mobile, setMobile] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [notificationText, setNotificationText] = useState("Nenhuma notificacao nova por enquanto.");
  const [tooltipMenu, setTooltipMenu] = useState<TooltipMenu | null>(null);
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>(() =>
    menuPrincipal.reduce<Record<string, boolean>>((secoes, secao) => {
      secoes[secao.titulo] = true;
      return secoes;
    }, {})
  );
  const [menuAberto, setMenuAberto] = useState(() => {
    if (typeof window === "undefined") return true;
    if (window.innerWidth <= MOBILE_BREAKPOINT) return false;
    return window.localStorage.getItem(MENU_ABERTO_KEY) !== "fechado";
  });

  const menuFiltrado = menuPrincipal
    .map((secao) => ({
      ...secao,
      links: secao.links.filter((link) => !link.roles || (profile?.role && link.roles.includes(profile.role))),
    }))
    .filter((secao) => secao.links.length > 0);
  const menuMobileFiltrado = menuMobile.filter((link) => !link.roles || (profile?.role && link.roles.includes(profile.role)));

  useEffect(() => {
    const atualizarTela = () => {
      const telaMobile = window.innerWidth <= MOBILE_BREAKPOINT;

      setMobile(telaMobile);
      if (telaMobile) setMenuAberto(false);
    };

    atualizarTela();
    window.addEventListener("resize", atualizarTela);

    return () => window.removeEventListener("resize", atualizarTela);
  }, []);

  useEffect(() => {
    if (!mobile) {
      window.localStorage.setItem(MENU_ABERTO_KEY, menuAberto ? "aberto" : "fechado");
    }
  }, [menuAberto, mobile]);

  useEffect(() => {
    const carregarNotificacoes = async () => {
      if (!supabase || !profile) return;

      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 1);

      const query = supabase
        .from("agendamentos")
        .select("id,data_hora,status,pacientes(nome),medicos(nome)")
        .gte("data_hora", inicio.toISOString())
        .lt("data_hora", fim.toISOString())
        .order("data_hora", { ascending: true });

      const { data, error } =
        profile.role === "medico" && profile.medico_id
          ? await query.eq("medico_id", profile.medico_id).in("status", ["confirmado", "pendente"])
          : await query.eq("status", "pendente");

      if (error) return;

      const items: NotificationItem[] = (data ?? []).slice(0, 6).map((item) => {
        const hora = new Date(item.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const paciente = getRelationName(item.pacientes, "Paciente");
        const medico = getRelationName(item.medicos, "Medico");

        return {
          id: item.id,
          title: profile.role === "medico" ? `${hora} - ${paciente}` : `${hora} - ${paciente}`,
          description: profile.role === "medico" ? "Consulta na sua agenda de hoje." : `Pendente com ${medico}. Clique para confirmar.`,
          to: profile.role === "medico" ? "/consultas" : "/agendamentos",
        };
      });

      const total = data?.length ?? 0;
      setNotificationCount(total);
      setNotificationItems(items);
      setNotificationText(
        profile.role === "medico"
          ? total > 0
            ? `Voce tem ${total} consulta${total === 1 ? "" : "s"} hoje.`
            : "Nenhuma consulta na sua agenda hoje."
          : total > 0
            ? `A recepcao tem ${total} agendamento${total === 1 ? "" : "s"} pendente${total === 1 ? "" : "s"} hoje.`
            : "Nenhum agendamento pendente hoje."
      );
    };

    void carregarNotificacoes();
    const intervalo = window.setInterval(() => void carregarNotificacoes(), 60000);

    return () => window.clearInterval(intervalo);
  }, [profile]);

  const alternarMenu = () => setMenuAberto((aberto) => !aberto);
  const mostrarTooltip = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>, texto: string) => {
    if (menuAberto || mobile) return;

    const posicao = event.currentTarget.getBoundingClientRect();
    setTooltipMenu({
      texto,
      top: posicao.top + posicao.height / 2,
    });
  };

  const esconderTooltip = () => setTooltipMenu(null);

  const alternarSecao = (titulo: string) => {
    setSecoesAbertas((secoes) => ({
      ...secoes,
      [titulo]: !secoes[titulo],
    }));
  };

  const fecharMenuMobile = () => {
    if (mobile) setMenuAberto(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className={`${styles.pagina} ${menuAberto ? styles.menuAberto : styles.menuFechado}`}>
      <header className={styles.cabecalho}>
        <div className={styles.areaLogo}>
          <BotaoMenu
            aberto={menuAberto}
            onClick={() => {
              esconderTooltip();
              alternarMenu();
            }}
          />
          <BrandLogo className={styles.logo} />
        </div>

        <AcoesCabecalho
          nomeUsuario={profile?.nome ?? "Usuario"}
          emailUsuario={user?.email ?? ""}
          cargoUsuario={profile?.role === "medico" ? "Medico" : "Recepcao"}
          notificationCount={notificationCount}
          notificationItems={notificationItems}
          notificationText={notificationText}
          onSignOut={handleSignOut}
        />
      </header>

      <aside className={styles.menuLateral} aria-label="Menu lateral">
        {mobile && (
          <div className={styles.topoMenuMobile}>
            <button className={styles.fecharMobile} type="button" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
              <Icone nome="x" />
            </button>
          </div>
        )}

        <div className={styles.scrollMenu} ref={menuRef}>
          {menuFiltrado.map((secao) => (
            <SecaoMenu
              key={secao.titulo}
              titulo={secao.titulo}
              links={secao.links}
              aberto={secoesAbertas[secao.titulo]}
              menuAberto={menuAberto}
              alternarSecao={alternarSecao}
              fecharMenuMobile={fecharMenuMobile}
              mostrarTooltip={mostrarTooltip}
              esconderTooltip={esconderTooltip}
            />
          ))}
        </div>

        <ShellScrollbar className={styles.scrollbarMenu} scrollerRef={menuRef} />
      </aside>

      <main className={styles.conteudo} ref={conteudoRef}>
        <div className={styles.caixaConteudo}>{children}</div>
      </main>

      <ShellScrollbar className={styles.scrollbarConteudo} scrollerRef={conteudoRef} />
      {mobile && <MenuMobile aberto={menuAberto} alternarMenu={alternarMenu} links={menuMobileFiltrado} />}
      {tooltipMenu && (
        <div className={styles.tooltipMenu} style={{ top: tooltipMenu.top }} role="tooltip">
          {tooltipMenu.texto}
        </div>
      )}
      <ChatBot />
    </div>
  );
}
