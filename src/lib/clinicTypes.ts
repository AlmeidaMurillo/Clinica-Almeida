export type Paciente = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  ativo: boolean;
};

export type Medico = {
  id: string;
  nome: string;
  crm: string;
  especialidade: string;
  telefone: string | null;
  email: string | null;
  senha_login?: string | null;
  ativo: boolean;
};

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao_minutos: number;
  valor: number;
  ativo: boolean;
};

export type Convenio = {
  id: string;
  nome: string;
  contato: string | null;
  telefone: string | null;
  ativo: boolean;
};

export type AgendamentoStatus = "pendente" | "confirmado" | "cancelado" | "concluido" | "nao_compareceu";
export type ConsultaStatus = "aguardando" | "em_atendimento" | "finalizada" | "cancelada" | "nao_compareceu";

export type Agendamento = {
  id: string;
  paciente_id: string;
  medico_id: string;
  servico_id: string | null;
  data_hora: string;
  status: AgendamentoStatus;
  observacoes: string | null;
  pacientes?: Pick<Paciente, "nome"> | null;
  medicos?: Pick<Medico, "nome" | "especialidade"> | null;
  servicos?: Pick<Servico, "nome"> | null;
};

export type Consulta = {
  id: string;
  agendamento_id: string | null;
  paciente_id: string;
  medico_id: string;
  inicio: string | null;
  fim: string | null;
  status: ConsultaStatus;
  pacientes?: Pick<Paciente, "nome"> | null;
  medicos?: Pick<Medico, "nome" | "especialidade"> | null;
};

export type Prontuario = {
  id: string;
  consulta_id: string;
  paciente_id: string;
  medico_id: string;
  queixa: string | null;
  diagnostico: string | null;
  prescricao: string | null;
  observacoes: string | null;
  created_at: string;
  pacientes?: Pick<Paciente, "nome"> | null;
  medicos?: Pick<Medico, "nome"> | null;
};
