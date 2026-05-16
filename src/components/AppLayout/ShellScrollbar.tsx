import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, RefObject } from "react";
import styles from "./AppLayout.module.css";

type ScrollbarMetrics = {
  visible: boolean;
  top: number;
  height: number;
};

type DragState = {
  railTop: number;
  maxThumbTop: number;
  maxScrollTop: number;
  thumbOffset: number;
};

type ShellScrollbarProps = {
  scrollerRef: RefObject<HTMLElement | null>;
  className?: string;
};

// Estado usado quando nao existe scroll suficiente para mostrar a barra.
const HIDDEN: ScrollbarMetrics = { visible: false, top: 0, height: 0 };

// Mantem um numero dentro do limite permitido: nunca menor que 0, nunca maior que max.
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

// Evita atualizar o React quando a posicao/tamanho da barra nao mudou.
const same = (a: ScrollbarMetrics, b: ScrollbarMetrics) => a.visible === b.visible && a.top === b.top && a.height === b.height;

type ScrollbarStyle = CSSProperties & {
  "--scrollbar-thumb-top": string;
  "--scrollbar-thumb-height": string;
};

// Calcula se a scrollbar deve aparecer, qual altura ela tera e onde ela fica no trilho.
function getMetrics(scroller: HTMLElement | null): ScrollbarMetrics {
  if (!scroller) return HIDDEN;

  // clientHeight = area visivel, scrollHeight = conteudo total, scrollTop = quanto ja rolou.
  const { clientHeight, scrollHeight, scrollTop } = scroller;
  const maxScrollTop = scrollHeight - clientHeight;

  // Se o conteudo cabe inteiro na tela, nao precisa de scrollbar customizada.
  if (clientHeight <= 0 || maxScrollTop <= 1) return HIDDEN;

  // A bolinha fica proporcional ao conteudo, mas nunca menor que 56px.
  const height = Math.max(Math.min(56, clientHeight), Math.round((clientHeight / scrollHeight) * clientHeight));
  const maxTop = clientHeight - height;

  return {
    visible: true,
    top: clamp(Math.round((scrollTop / maxScrollTop) * maxTop), maxTop),
    height,
  };
}

export default function ShellScrollbar({ scrollerRef, className = "" }: ShellScrollbarProps) {
  // railRef aponta para o trilho da scrollbar; dragRef guarda os dados enquanto arrasta.
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // metrics controla visualmente a barra; dragging serve para aplicar o estilo de arrasto.
  const [metrics, setMetrics] = useState(HIDDEN);
  const [dragging, setDragging] = useState(false);

  // Pega os limites atuais do arrasto: tamanho do trilho e quanto o conteudo pode rolar.
  const getDrag = (): Omit<DragState, "thumbOffset"> | null => {
    const rail = railRef.current;
    const scroller = scrollerRef.current;
    if (!rail || !scroller || !metrics.visible) return null;

    const { top, height } = rail.getBoundingClientRect();
    const drag = {
      railTop: top,
      maxThumbTop: height - metrics.height,
      maxScrollTop: scroller.scrollHeight - scroller.clientHeight,
    };

    return drag.maxThumbTop > 0 && drag.maxScrollTop > 0 ? drag : null;
  };

  // Converte a posicao do mouse/toque em scrollTop do conteudo real.
  const scrollToPointer = (clientY: number, drag: Omit<DragState, "thumbOffset">, thumbOffset: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const thumbTop = clamp(clientY - drag.railTop - thumbOffset, drag.maxThumbTop);
    scroller.scrollTop = (thumbTop / drag.maxThumbTop) * drag.maxScrollTop;
  };

  // Clique no trilho: pula a bolinha para perto do ponto clicado.
  const handleRailPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();

    const drag = getDrag();
    if (drag) scrollToPointer(event.clientY, drag, metrics.height / 2);
  };

  // Clique na bolinha: inicia o arrasto e guarda a distancia entre o ponteiro e o topo dela.
  const handleThumbPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const drag = getDrag();
    if (!drag) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { ...drag, thumbOffset: event.clientY - drag.railTop - metrics.top };
    setDragging(true);
  };

  // Enquanto arrasta, atualiza o scroll conforme o ponteiro se move.
  const handleThumbPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag) scrollToPointer(event.clientY, drag, drag.thumbOffset);
  };

  // Soltou ou cancelou o ponteiro: encerra o arrasto.
  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    setDragging(false);
  };

  // Observa scroll, resize da janela e mudancas de tamanho no conteudo para recalcular a barra.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const updateMetrics = () => {
      setMetrics((current) => {
        const next = getMetrics(scrollerRef.current);
        return same(current, next) ? current : next;
      });
    };

    // ResizeObserver cobre mudancas no container e no primeiro filho, que geralmente segura o conteudo.
    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(scroller);
    if (scroller.firstElementChild) resizeObserver.observe(scroller.firstElementChild);

    scroller.addEventListener("scroll", updateMetrics, { passive: true });
    window.addEventListener("resize", updateMetrics);
    const frameId = window.requestAnimationFrame(updateMetrics);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", updateMetrics);
      window.removeEventListener("resize", updateMetrics);
    };
  }, [scrollerRef]);

  return (
    // O CSS usa as variaveis abaixo para posicionar e dimensionar a bolinha.
    <div
      aria-hidden="true"
      className={`${styles.customScrollbar} ${className} ${metrics.visible ? styles.customScrollbarVisible : ""} ${dragging ? styles.customScrollbarDragging : ""}`}
      onPointerDown={handleRailPointerDown}
      ref={railRef}
      style={{
        "--scrollbar-thumb-top": `${metrics.top}px`,
        "--scrollbar-thumb-height": `${metrics.height}px`,
      } as ScrollbarStyle}
    >
      <div
        className={styles.customScrollbarThumb}
        onPointerCancel={stopDragging}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={stopDragging}
      />
    </div>
  );
}
