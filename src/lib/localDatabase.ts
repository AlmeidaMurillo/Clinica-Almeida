import type {
  Agendamento,
  AgendamentoStatus,
  Consulta,
  ConsultaStatus,
  Convenio,
  Medico,
  Paciente,
  Prontuario,
  Servico,
} from "./clinicTypes";
import type { Profile, Session, User } from "../auth/authStore";

type TableName =
  | "profiles"
  | "pacientes"
  | "medicos"
  | "servicos"
  | "convenios"
  | "agendamentos"
  | "consultas"
  | "prontuarios";

type RowBase = { id: string; created_at: string; [key: string]: unknown };
type ProfileRow = Profile & { email: string; password: string; created_at: string };
type PacienteRow = Paciente & RowBase;
type MedicoRow = Medico & RowBase;
type ServicoRow = Servico & RowBase;
type ConvenioRow = Convenio & RowBase;
type AgendamentoRow = Agendamento & RowBase;
type ConsultaRow = Consulta & RowBase;
type ProntuarioRow = Prontuario & RowBase;

type LocalTables = {
  profiles: ProfileRow[];
  pacientes: PacienteRow[];
  medicos: MedicoRow[];
  servicos: ServicoRow[];
  convenios: ConvenioRow[];
  agendamentos: AgendamentoRow[];
  consultas: ConsultaRow[];
  prontuarios: ProntuarioRow[];
};

type QueryError = { message: string; code?: string; details?: string; hint?: string };
type QueryResponse<T> = { data: T | null; error: QueryError | null; count?: number | null };
type Filter = { field: string; operator: "eq" | "in" | "gte" | "lte" | "lt" | "is"; value: unknown };
type Order = { field: string; ascending: boolean };

const DB_KEY = "clinica-local-db-v2";
const SESSION_KEY = "clinica-local-session-v2";

const ids = {
  recepcao: "profile-recepcao",
  teste: "profile-teste",
  ana: "medico-ana",
  bruno: "medico-bruno",
  clara: "medico-clara",
  diego: "medico-diego",
  elisa: "medico-elisa",
};

function isoDaysFromNow(days: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function createId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSeedData(): LocalTables {
  const now = new Date().toISOString();

  const medicos: MedicoRow[] = [
    { id: ids.ana, nome: "Dra. Ana Ribeiro", crm: "CRM-SP 128734", especialidade: "Cardiologia", telefone: "(11) 98888-1001", email: "ana.ribeiro@clinica.com", senha_login: "Clinica@123456", ativo: true, created_at: now },
    { id: ids.bruno, nome: "Dr. Bruno Matos", crm: "CRM-SP 98221", especialidade: "Ortopedia", telefone: "(11) 98888-1002", email: "bruno.matos@clinica.com", senha_login: "Clinica@123456", ativo: true, created_at: now },
    { id: ids.clara, nome: "Dra. Clara Neves", crm: "CRM-SP 143552", especialidade: "Pediatria", telefone: "(11) 98888-1003", email: "clara.neves@clinica.com", senha_login: "Clinica@123456", ativo: true, created_at: now },
    { id: ids.diego, nome: "Dr. Diego Lima", crm: "CRM-SP 119843", especialidade: "Dermatologia", telefone: "(11) 98888-1004", email: "diego.lima@clinica.com", senha_login: "Clinica@123456", ativo: true, created_at: now },
    { id: ids.elisa, nome: "Dra. Elisa Torres", crm: "CRM-SP 150334", especialidade: "Clinica Geral", telefone: "(11) 98888-1005", email: "elisa.torres@clinica.com", senha_login: "Clinica@123456", ativo: true, created_at: now },
  ];

  const pacientes: PacienteRow[] = [
    { id: "paciente-marina", nome: "Marina Costa", cpf: "123.456.789-10", telefone: "(11) 97777-1101", email: "marina.costa@email.com", data_nascimento: "1989-04-12", ativo: true, created_at: now },
    { id: "paciente-joao", nome: "Joao Pereira", cpf: "234.567.890-11", telefone: "(11) 97777-1102", email: "joao.pereira@email.com", data_nascimento: "1978-09-03", ativo: true, created_at: now },
    { id: "paciente-luiza", nome: "Luiza Fernandes", cpf: "345.678.901-12", telefone: "(11) 97777-1103", email: "luiza.fernandes@email.com", data_nascimento: "2016-01-22", ativo: true, created_at: now },
    { id: "paciente-roberto", nome: "Roberto Almeida", cpf: "456.789.012-13", telefone: "(11) 97777-1104", email: "roberto.almeida@email.com", data_nascimento: "1965-11-18", ativo: true, created_at: now },
  ];

  const servicos: ServicoRow[] = [
    { id: "servico-consulta", nome: "Consulta medica", descricao: "Atendimento ambulatorial padrao", duracao_minutos: 30, valor: 180, ativo: true, created_at: now },
    { id: "servico-retorno", nome: "Retorno", descricao: "Retorno dentro do periodo combinado", duracao_minutos: 20, valor: 0, ativo: true, created_at: now },
    { id: "servico-avaliacao", nome: "Avaliacao especializada", descricao: "Consulta com especialista", duracao_minutos: 45, valor: 260, ativo: true, created_at: now },
  ];

  const convenios: ConvenioRow[] = [
    { id: "convenio-vida", nome: "Vida Plena Saude", contato: "Central de guias", telefone: "(11) 4002-2200", ativo: true, created_at: now },
    { id: "convenio-sul", nome: "SulMed", contato: "Relacionamento clinicas", telefone: "(11) 3003-4455", ativo: true, created_at: now },
  ];

  const agendamentos: AgendamentoRow[] = [
    { id: "agendamento-1", paciente_id: "paciente-marina", medico_id: ids.ana, servico_id: "servico-consulta", data_hora: isoDaysFromNow(0, 10, 30), status: "pendente", observacoes: "Paciente relatou dor no peito leve.", created_at: now },
    { id: "agendamento-2", paciente_id: "paciente-joao", medico_id: ids.bruno, servico_id: "servico-avaliacao", data_hora: isoDaysFromNow(1, 14, 0), status: "confirmado", observacoes: null, created_at: now },
    { id: "agendamento-3", paciente_id: "paciente-luiza", medico_id: ids.clara, servico_id: "servico-consulta", data_hora: isoDaysFromNow(2, 9, 0), status: "confirmado", observacoes: "Primeira consulta.", created_at: now },
  ];

  const consultas: ConsultaRow[] = [
    { id: "consulta-1", agendamento_id: "agendamento-2", paciente_id: "paciente-joao", medico_id: ids.bruno, inicio: null, fim: null, status: "aguardando", created_at: now },
    { id: "consulta-2", agendamento_id: "agendamento-3", paciente_id: "paciente-luiza", medico_id: ids.clara, inicio: isoDaysFromNow(-1, 9, 10), fim: isoDaysFromNow(-1, 9, 38), status: "finalizada", created_at: isoDaysFromNow(-1, 9, 0) },
  ];

  const prontuarios: ProntuarioRow[] = [
    { id: "prontuario-1", consulta_id: "consulta-2", paciente_id: "paciente-luiza", medico_id: ids.clara, queixa: "Febre baixa e tosse ha dois dias.", diagnostico: "Quadro viral leve.", prescricao: "Hidratacao, repouso e antitermico se necessario.", observacoes: "Retorno se houver piora.", created_at: isoDaysFromNow(-1, 9, 45) },
  ];

  return {
    profiles: [
      { id: ids.recepcao, nome: "Recepcao", role: "recepcao", medico_id: null, email: "recepcao@clinica.com", password: "Clinica@123456", created_at: now },
      { id: ids.teste, nome: "Usuario Teste", role: "recepcao", medico_id: null, email: "teste@clinica.com", password: "Clinica@123456", created_at: now },
      ...medicos.map((medico) => ({
        id: `profile-${medico.id}`,
        nome: medico.nome,
        role: "medico" as const,
        medico_id: medico.id,
        email: medico.email ?? "",
        password: medico.senha_login ?? "Clinica@123456",
        created_at: now,
      })),
    ],
    pacientes,
    medicos,
    servicos,
    convenios,
    agendamentos,
    consultas,
    prontuarios,
  };
}

function loadTables(): LocalTables {
  const stored = window.localStorage.getItem(DB_KEY);
  if (!stored) {
    const seed = createSeedData();
    saveTables(seed);
    return seed;
  }

  try {
    return JSON.parse(stored) as LocalTables;
  } catch {
    const seed = createSeedData();
    saveTables(seed);
    return seed;
  }
}

function saveTables(tables: LocalTables) {
  window.localStorage.setItem(DB_KEY, JSON.stringify(tables));
}

function publicProfile(profile: ProfileRow): Profile {
  return {
    id: profile.id,
    nome: profile.nome,
    role: profile.role,
    medico_id: profile.medico_id,
  };
}

function createSession(profile: ProfileRow): Session {
  return {
    access_token: `local-${profile.id}`,
    user: {
      id: profile.id,
      email: profile.email,
    },
  };
}

function getStoredSession(): Session | null {
  const stored = window.localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as Session;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function getValue(row: RowBase, field: string) {
  return row[field];
}

function matchesFilter(row: RowBase, filter: Filter) {
  const value = getValue(row, filter.field);

  if (filter.operator === "eq") return value === filter.value;
  if (filter.operator === "in") return Array.isArray(filter.value) && filter.value.includes(value);
  if (filter.operator === "gte") return String(value) >= String(filter.value);
  if (filter.operator === "lte") return String(value) <= String(filter.value);
  if (filter.operator === "lt") return String(value) < String(filter.value);
  if (filter.operator === "is") return value === filter.value;

  return true;
}

function addRelations(table: TableName, row: RowBase, tables: LocalTables): RowBase {
  const next = { ...row };

  if (table === "agendamentos") {
    const agendamento = row as AgendamentoRow;
    const paciente = tables.pacientes.find((item) => item.id === agendamento.paciente_id);
    const medico = tables.medicos.find((item) => item.id === agendamento.medico_id);
    const servico = agendamento.servico_id ? tables.servicos.find((item) => item.id === agendamento.servico_id) : null;
    next.pacientes = paciente ? { nome: paciente.nome } : null;
    next.medicos = medico ? { nome: medico.nome, especialidade: medico.especialidade } : null;
    next.servicos = servico ? { nome: servico.nome } : null;
  }

  if (table === "consultas") {
    const consulta = row as ConsultaRow;
    const paciente = tables.pacientes.find((item) => item.id === consulta.paciente_id);
    const medico = tables.medicos.find((item) => item.id === consulta.medico_id);
    next.pacientes = paciente ? { nome: paciente.nome } : null;
    next.medicos = medico ? { nome: medico.nome, especialidade: medico.especialidade } : null;
  }

  if (table === "prontuarios") {
    const prontuario = row as ProntuarioRow;
    const paciente = tables.pacientes.find((item) => item.id === prontuario.paciente_id);
    const medico = tables.medicos.find((item) => item.id === prontuario.medico_id);
    next.pacientes = paciente ? { nome: paciente.nome } : null;
    next.medicos = medico ? { nome: medico.nome } : null;
  }

  return next;
}

function normalizeInsert(table: TableName, payload: Record<string, unknown>): RowBase {
  const now = new Date().toISOString();
  const base: RowBase = {
    id: typeof payload.id === "string" ? payload.id : createId(table),
    created_at: typeof payload.created_at === "string" ? payload.created_at : now,
    ...payload,
  };

  if (table === "agendamentos" && !base.status) base.status = "pendente" satisfies AgendamentoStatus;
  if (table === "consultas") {
    if (!base.status) base.status = "aguardando" satisfies ConsultaStatus;
    if (!("inicio" in base)) base.inicio = null;
    if (!("fim" in base)) base.fim = null;
  }
  if (table === "prontuarios" && !base.created_at) base.created_at = now;

  return base as RowBase;
}

function syncDoctorProfile(tables: LocalTables, medico: MedicoRow) {
  if (!medico.email) return;

  const existing = tables.profiles.find((profile) => profile.medico_id === medico.id || profile.email === medico.email);
  const password = medico.senha_login || "Clinica@123456";

  if (existing) {
    existing.nome = medico.nome;
    existing.email = medico.email;
    existing.password = password;
    existing.role = "medico";
    existing.medico_id = medico.id;
    return;
  }

  tables.profiles.push({
    id: `profile-${medico.id}`,
    nome: medico.nome,
    role: "medico",
    medico_id: medico.id,
    email: medico.email,
    password,
    created_at: new Date().toISOString(),
  });
}

class LocalQueryBuilder {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private countMode = false;
  private headOnly = false;

  constructor(private table: TableName) {}

  select(_columns?: string, options?: { count?: "exact"; head?: boolean }) {
    this.operation = this.operation === "select" ? "select" : this.operation;
    this.countMode = options?.count === "exact";
    this.headOnly = Boolean(options?.head);
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, operator: "eq", value });
    return this;
  }

  in(field: string, value: readonly unknown[]) {
    this.filters.push({ field, operator: "in", value });
    return this;
  }

  gte(field: string, value: unknown) {
    this.filters.push({ field, operator: "gte", value });
    return this;
  }

  lte(field: string, value: unknown) {
    this.filters.push({ field, operator: "lte", value });
    return this;
  }

  lt(field: string, value: unknown) {
    this.filters.push({ field, operator: "lt", value });
    return this;
  }

  is(field: string, value: unknown) {
    this.filters.push({ field, operator: "is", value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orders.push({ field, ascending: options?.ascending ?? true });
    return this;
  }

  async returns<T>() {
    return this.execute<T>();
  }

  async single<T>() {
    const response = await this.execute<T[]>();
    const rows = Array.isArray(response.data) ? response.data : [];
    if (rows.length !== 1) {
      return { data: null, error: { message: "Registro nao encontrado." }, count: response.count } as QueryResponse<T>;
    }

    return { data: rows[0] as T, error: null, count: response.count } as QueryResponse<T>;
  }

  async maybeSingle<T = RowBase>() {
    const response = await this.execute<T[]>();
    const rows = Array.isArray(response.data) ? response.data : [];
    return { data: (rows[0] as T | undefined) ?? null, error: null, count: response.count } as QueryResponse<T>;
  }

  then<TResult1 = QueryResponse<RowBase[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<RowBase[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute<RowBase[]>().then(onfulfilled, onrejected);
  }

  private async execute<T>(): Promise<QueryResponse<T>> {
    try {
      const tables = loadTables();
      const rows = tables[this.table] as RowBase[];

      if (this.operation === "insert") {
        const payloads = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
        const inserted = payloads.map((payload) => normalizeInsert(this.table, payload));
        rows.push(...inserted);
        if (this.table === "medicos") inserted.forEach((row) => syncDoctorProfile(tables, row as MedicoRow));
        saveTables(tables);
        return this.formatResponse(inserted, tables) as QueryResponse<T>;
      }

      const matchedIndexes = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => this.filters.every((filter) => matchesFilter(row, filter)));

      if (this.operation === "update") {
        const patch = (this.payload ?? {}) as Record<string, unknown>;
        const updated = matchedIndexes.map(({ row }) => Object.assign(row, patch));
        if (this.table === "medicos") updated.forEach((row) => syncDoctorProfile(tables, row as MedicoRow));
        saveTables(tables);
        return this.formatResponse(updated, tables) as QueryResponse<T>;
      }

      if (this.operation === "delete") {
        const indexes = new Set(matchedIndexes.map(({ index }) => index));
        const deleted = matchedIndexes.map(({ row }) => row);
        tables[this.table] = rows.filter((_row, index) => !indexes.has(index)) as never;
        saveTables(tables);
        return this.formatResponse(deleted, tables) as QueryResponse<T>;
      }

      let selected = matchedIndexes.map(({ row }) => row);
      this.orders.forEach((order) => {
        selected = [...selected].sort((a, b) => {
          const left = getValue(a, order.field);
          const right = getValue(b, order.field);
          if (left === right) return 0;
          return String(left) > String(right) ? (order.ascending ? 1 : -1) : (order.ascending ? -1 : 1);
        });
      });

      return this.formatResponse(selected, tables) as QueryResponse<T>;
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : "Erro no banco local." },
      };
    }
  }

  private formatResponse(rows: RowBase[], tables: LocalTables): QueryResponse<RowBase[]> {
    const data = this.headOnly ? null : rows.map((row) => addRelations(this.table, clone(row), tables));
    return {
      data,
      error: null,
      count: this.countMode || this.headOnly ? rows.length : null,
    };
  }
}

export const isLocalDatabaseReady = true;

export const localDb = {
  from(table: TableName) {
    return new LocalQueryBuilder(table);
  },
  auth: {
    async getSession() {
      return { data: { session: getStoredSession() }, error: null };
    },
    onAuthStateChange(callback: (_event: string, session: Session | null) => void) {
      const listener = (event: StorageEvent) => {
        if (event.key === SESSION_KEY) callback("SIGNED_IN", getStoredSession());
      };

      window.addEventListener("storage", listener);
      return {
        data: {
          subscription: {
            unsubscribe: () => window.removeEventListener("storage", listener),
          },
        },
      };
    },
    async signInWithPassword(credentials: { email: string; password: string }) {
      const tables = loadTables();
      const email = credentials.email.trim().toLowerCase();
      const profile = tables.profiles.find(
        (item) => item.email.trim().toLowerCase() === email && item.password === credentials.password
      );

      if (!profile) {
        return { data: { session: null }, error: { message: "Email ou senha invalidos." } };
      }

      const session = createSession(profile);
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { data: { session }, error: null };
    },
    async updateUser(payload: { password?: string }) {
      const session = getStoredSession();
      if (!session?.user || !payload.password) {
        return { error: { message: "Usuario nao autenticado." } };
      }

      const tables = loadTables();
      const profile = tables.profiles.find((item) => item.id === session.user.id);
      if (!profile) return { error: { message: "Usuario nao encontrado." } };

      profile.password = payload.password;
      if (profile.medico_id) {
        const medico = tables.medicos.find((item) => item.id === profile.medico_id);
        if (medico) medico.senha_login = payload.password;
      }
      saveTables(tables);
      return { error: null };
    },
    async signOut() {
      window.localStorage.removeItem(SESSION_KEY);
      return { error: null };
    },
    async getUser() {
      const session = getStoredSession();
      return { data: { user: session?.user ?? null }, error: null };
    },
  },
  functions: {
    async invoke<T>(name: string, options?: { body?: Record<string, unknown> }) {
      if (name === "create-medico-user") {
        const body = options?.body ?? {};
        const tables = loadTables();
        const medico = tables.medicos.find((item) => item.id === body.medicoId);
        if (medico) {
          medico.nome = String(body.nome ?? medico.nome);
          medico.email = String(body.email ?? medico.email ?? "");
          medico.senha_login = String(body.password ?? medico.senha_login ?? "Clinica@123456");
          syncDoctorProfile(tables, medico);
          saveTables(tables);
        }
        return { data: { ok: true } as T, error: null };
      }

      if (name === "chatbot") {
        const message = String(options?.body?.message ?? "").toLowerCase();
        const reply = getLocalAssistantReply(message);
        return { data: { reply } as T, error: null };
      }

      return { data: null, error: { message: "Funcao local nao encontrada." } };
    },
  },
  reset() {
    saveTables(createSeedData());
    window.localStorage.removeItem(SESSION_KEY);
  },
  getProfileByUser(user: User | null) {
    if (!user) return null;
    const profile = loadTables().profiles.find((item) => item.id === user.id);
    return profile ? publicProfile(profile) : null;
  },
};

function getLocalAssistantReply(message: string) {
  if (message.includes("login") || message.includes("senha")) {
    return "Use os acessos de teste da tela inicial. A recepcao pode cadastrar medicos e cada medico ganha um login local com o email e senha informados no cadastro.";
  }

  if (message.includes("agendamento") || message.includes("agenda")) {
    return "Em Agendamentos, a recepcao cria horarios, confirma consultas, cancela ou marca nao comparecimento. Ao confirmar, o sistema cria a consulta automaticamente.";
  }

  if (message.includes("consulta")) {
    return "Em Consultas, o medico acompanha a fila, inicia atendimento e finaliza. A recepcao tambem pode cancelar ou remover registros quando necessario.";
  }

  if (message.includes("prontuario")) {
    return "O prontuario fica vinculado a uma consulta em atendimento ou finalizada. Medicos visualizam seus atendimentos, e a recepcao consegue gerenciar todos.";
  }

  if (message.includes("hospedar") || message.includes("deploy")) {
    return "Este projeto agora roda apenas no frontend. Basta gerar o build e hospedar a pasta dist em Vercel, Netlify ou qualquer hospedagem estatica.";
  }

  return "Posso ajudar com os fluxos do sistema: pacientes, medicos, servicos, convenios, agendamentos, consultas e prontuarios. Tudo esta salvo localmente no navegador.";
}
