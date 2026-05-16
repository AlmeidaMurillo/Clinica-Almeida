import styles from "./BrandLogo.module.css";

type BrandLogoProps = {
  className?: string;
};

export default function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <div className={`${styles.logo} ${className}`} role="img" aria-label="Clinica Almeida">
      <svg className={styles.mark} viewBox="0 0 74 58" aria-hidden="true" focusable="false">
        <path className={styles.paintWash} d="M8 34c9-18 23-27 42-26 9 1 15 4 17 9 3 8-3 18-15 25-12 8-30 11-42 7-7-2-9-7-2-15Z" />
        <path className={styles.paintScratch} d="M5 44c15-3 30-7 50-18" />
        <path className={styles.paintScratchAlt} d="M15 50c13-7 25-12 47-16" />
        <path className={styles.letterStroke} d="M18 43 34 12l15 31" />
        <path className={styles.letterStroke} d="M25 32h17" />
        <path className={styles.crossStroke} d="M51 17v21" />
        <path className={styles.crossStroke} d="M41 27h20" />
        <path className={styles.inkFleck} d="M9 18h.2" />
        <path className={styles.inkFleck} d="M63 45h.2" />
        <path className={styles.inkFleck} d="M58 10h.2" />
      </svg>
      <span className={styles.wordmark}>
        <strong>Clinica</strong>
        <span>Almeida</span>
      </span>
    </div>
  );
}
