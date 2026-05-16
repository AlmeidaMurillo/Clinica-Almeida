import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import AppLayout from "../../components/AppLayout/AppLayout";
import {
  dashboardFallbackData,
  getDashboardData,
  type ChartPoint,
  type DashboardData,
  type DashboardIconName,
} from "./dashboardData";
import styles from "./dashboard.module.css";

type DashboardIconProps = {
  name: DashboardIconName;
};

type BarChartProps = {
  title: string;
  description: string;
  suffix?: string;
  data: ChartPoint[];
};

function DashboardIcon({ name }: DashboardIconProps) {
  const icons: Record<DashboardIconName, ReactElement> = {
    calendar: (
      <>
        <path d="M6 5h12v14H6z" />
        <path d="M9 3v4" />
        <path d="M15 3v4" />
        <path d="M6 10h12" />
      </>
    ),
    patient: (
      <>
        <circle cx="10" cy="8" r="3" />
        <path d="M4 19a6 6 0 0 1 12 0" />
        <path d="M18 8v6" />
        <path d="M15 11h6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icons[name]}
    </svg>
  );
}

function BarChart({ title, description, suffix = "", data }: BarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((point) => point.value), 1), [data]);

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span>{description}</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className={styles.barChart} aria-label={title}>
        {data.map((point) => {
          const height = Math.max(8, Math.round((point.value / maxValue) * 150));
          const tooltip = `${point.label}: ${point.value}${suffix}`;

          return (
            <div className={styles.barGroup} key={point.label}>
              <button
                className={styles.barButton}
                type="button"
                style={{ height: `${height}px` }}
                data-tooltip={tooltip}
                aria-label={tooltip}
                title={tooltip}
              />
              <small>{point.label}</small>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(dashboardFallbackData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getDashboardData()
      .then((data) => {
        if (active) setDashboardData(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppLayout>
      <div className={styles.dashboard}>
        <header className={styles.dashboardHeader}>
          <div>
            <span className={styles.kicker}>Resumo da clinica</span>
            <h1>Dashboard</h1>
          </div>
          <span className={styles.updatedAt}>
            {loading ? "Carregando dados" : `Atualizado: ${dashboardData.updatedAt}`}
          </span>
        </header>

        <section className={styles.metricsGrid} aria-label="Indicadores principais">
          {dashboardData.metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.title}>
              <div>
                <span>{metric.title}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </div>
              <div className={`${styles.metricIcon} ${styles[metric.tone]}`}>
                <DashboardIcon name={metric.icon} />
              </div>
            </article>
          ))}
        </section>

        <section className={styles.chartsGrid}>
          <BarChart
            title="Consultas por dia"
            description="Total da semana"
            data={dashboardData.consultationsByDay}
          />
          <BarChart
            title="Tempo de espera"
            description="Media em minutos"
            suffix=" min"
            data={dashboardData.waitingTimeByDay}
          />
        </section>
      </div>
    </AppLayout>
  );
}
