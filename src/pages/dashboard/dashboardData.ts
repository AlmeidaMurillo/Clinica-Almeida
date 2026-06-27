import { isLocalDatabaseReady, localDb } from "../../lib/localDatabase";

export type DashboardIconName = "calendar" | "patient" | "clock" | "check";
export type MetricTone = "teal" | "mint" | "gold" | "blue";

export type Metric = {
  title: string;
  value: string;
  detail: string;
  tone: MetricTone;
  icon: DashboardIconName;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type DashboardData = {
  updatedAt: string;
  metrics: Metric[];
  consultationsByDay: ChartPoint[];
  waitingTimeByDay: ChartPoint[];
};

export const dashboardFallbackData: DashboardData = {
  updatedAt: "Hoje, 08:42",
  metrics: [
    {
      title: "Pacientes ativos",
      value: "1.248",
      detail: "Cadastros em acompanhamento",
      tone: "mint",
      icon: "patient",
    },
    {
      title: "Consultas pendentes hoje",
      value: "9",
      detail: "Ainda aguardando atendimento",
      tone: "gold",
      icon: "clock",
    },
    {
      title: "Tempo medio de espera",
      value: "14 min",
      detail: "Media dos atendimentos de hoje",
      tone: "blue",
      icon: "clock",
    },
    {
      title: "Total de consultas",
      value: "3.842",
      detail: "Consultas registradas no sistema",
      tone: "teal",
      icon: "calendar",
    },
  ],
  consultationsByDay: [
    { label: "Seg", value: 38 },
    { label: "Ter", value: 44 },
    { label: "Qua", value: 32 },
    { label: "Qui", value: 47 },
    { label: "Sex", value: 41 },
    { label: "Sab", value: 18 },
  ],
  waitingTimeByDay: [
    { label: "Seg", value: 16 },
    { label: "Ter", value: 12 },
    { label: "Qua", value: 18 },
    { label: "Qui", value: 11 },
    { label: "Sex", value: 14 },
    { label: "Sab", value: 9 },
  ],
};

type ConsultationRow = {
  created_at: string;
  inicio: string | null;
  fim: string | null;
};

const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getWeekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 5);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function createEmptyWeek(): ChartPoint[] {
  const today = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (5 - index));

    return {
      label: weekLabels[date.getDay()],
      value: 0,
    };
  });
}

function getAverageWaitingTime(consultations: ConsultationRow[]) {
  const finishedConsultations = consultations.filter((consultation) => consultation.inicio && consultation.fim);

  if (finishedConsultations.length === 0) {
    return 0;
  }

  const totalMinutes = finishedConsultations.reduce((total, consultation) => {
    const start = new Date(consultation.inicio as string).getTime();
    const end = new Date(consultation.fim as string).getTime();
    return total + Math.max(0, Math.round((end - start) / 60000));
  }, 0);

  return Math.round(totalMinutes / finishedConsultations.length);
}

function getConsultationsByDay(consultations: ConsultationRow[]) {
  const chart = createEmptyWeek();

  consultations.forEach((consultation) => {
    const label = weekLabels[new Date(consultation.created_at).getDay()];
    const point = chart.find((item) => item.label === label);
    if (point) point.value += 1;
  });

  return chart;
}

function getWaitingTimeByDay(consultations: ConsultationRow[]) {
  const chart = createEmptyWeek();
  const totals = new Map<string, { total: number; count: number }>();

  consultations.forEach((consultation) => {
    if (!consultation.inicio || !consultation.fim) return;

    const label = weekLabels[new Date(consultation.created_at).getDay()];
    const start = new Date(consultation.inicio).getTime();
    const end = new Date(consultation.fim).getTime();
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    const current = totals.get(label) ?? { total: 0, count: 0 };

    totals.set(label, {
      total: current.total + minutes,
      count: current.count + 1,
    });
  });

  chart.forEach((point) => {
    const total = totals.get(point.label);
    point.value = total ? Math.round(total.total / total.count) : 0;
  });

  return chart;
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isLocalDatabaseReady || !localDb) {
    return dashboardFallbackData;
  }

  const today = getTodayRange();
  const week = getWeekRange();

  const [
    activePatientsResponse,
    pendingAppointmentsResponse,
    totalConsultationsResponse,
    weekConsultationsResponse,
  ] = await Promise.all([
    localDb
      .from("pacientes")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true),
    localDb
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .gte("data_hora", today.start)
      .lt("data_hora", today.end),
    localDb
      .from("consultas")
      .select("id", { count: "exact", head: true }),
    localDb
      .from("consultas")
      .select("created_at,inicio,fim")
      .gte("created_at", week.start)
      .lte("created_at", week.end)
      .returns<ConsultationRow[]>(),
  ]);

  if (
    activePatientsResponse.error ||
    pendingAppointmentsResponse.error ||
    totalConsultationsResponse.error ||
    weekConsultationsResponse.error
  ) {
    return dashboardFallbackData;
  }

  const consultations = weekConsultationsResponse.data ?? [];
  const averageWaitingTime = getAverageWaitingTime(consultations);

  return {
    updatedAt: new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    metrics: [
      {
        title: "Pacientes ativos",
        value: String(activePatientsResponse.count ?? 0),
        detail: "Cadastros em acompanhamento",
        tone: "mint",
        icon: "patient",
      },
      {
        title: "Consultas pendentes hoje",
        value: String(pendingAppointmentsResponse.count ?? 0),
        detail: "Agendamentos com status pendente",
        tone: "gold",
        icon: "clock",
      },
      {
        title: "Tempo medio de espera",
        value: `${averageWaitingTime} min`,
        detail: "Media das consultas finalizadas",
        tone: "blue",
        icon: "clock",
      },
      {
        title: "Total de consultas",
        value: String(totalConsultationsResponse.count ?? 0),
        detail: "Consultas registradas no sistema",
        tone: "teal",
        icon: "calendar",
      },
    ],
    consultationsByDay: getConsultationsByDay(consultations),
    waitingTimeByDay: getWaitingTimeByDay(consultations),
  };
}
