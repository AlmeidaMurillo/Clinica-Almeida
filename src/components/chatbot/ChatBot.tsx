import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { localDb } from "../../lib/localDatabase";
import BrandLogo from "../BrandLogo/BrandLogo";
import styles from "./ChatBot.module.css";

export type ChatRole = "assistant" | "user";

export type ChatMessageData = {
  id: string;
  role: ChatRole;
  content: string;
  time: string;
};

export type ChatRequestMessage = {
  role: ChatRole;
  content: string;
};

type ChatThemeStyle = CSSProperties & Record<`--${string}`, string>;

type ChatButtonProps = {
  open: boolean;
  unread: number;
  onClick: () => void;
};

type ChatHeaderProps = {
  onClose: () => void;
  onNewChat: () => void;
  onDeleteChat: () => void;
};

type ChatWindowProps = {
  open: boolean;
  loading: boolean;
  messages: ChatMessageData[];
  onClose: () => void;
  onNewChat: () => void;
  onDeleteChat: () => void;
  onSendMessage: (message: string) => Promise<void>;
};

type ChatInputProps = {
  disabled: boolean;
  onSendMessage: (message: string) => Promise<void>;
};

type ChatMessageProps = {
  message: ChatMessageData;
};

const INITIAL_MESSAGE =
  "Ola! Sou o assistente virtual da Clinica Almeida. Posso te ajudar a usar o sistema, explicar telas, agendamentos, pacientes, medicos, consultas, prontuarios e recepcao.";

function createMessage(role: ChatRole, content: string): ChatMessageData {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
  };
}

function getFallbackReply() {
  return "Estou funcionando em modo local. Posso orientar sobre pacientes, medicos, agendamentos, consultas, prontuarios e hospedagem estatica.";
}

function useChatTheme() {
  const [theme, setTheme] = useState<ChatThemeStyle>({});

  useEffect(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => rootStyles.getPropertyValue(name).trim() || fallback;

    setTheme({
      "--chatbot-accent": read("--accent", "#2c7a73"),
      "--chatbot-primary": read("--brand-forest", "#12343b"),
      "--chatbot-primary-strong": read("--brand-forest-strong", "#0e2a30"),
      "--chatbot-surface": read("--surface", "#ffffff"),
      "--chatbot-bg": read("--bg-primary", "#edf4f5"),
      "--chatbot-text": read("--text-strong", "#10202a"),
      "--chatbot-muted": read("--text-muted", "#637780"),
      "--chatbot-line": read("--line", "#d7e3e7"),
      "--chatbot-contrast": read("--accent-contrast", "#ffffff"),
      "--chatbot-glow": read("--accent-glow", "rgba(44, 122, 115, 0.14)"),
    });
  }, []);

  return theme;
}

function ChatIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 6.5A4.5 4.5 0 0 1 9.5 2h5A4.5 4.5 0 0 1 19 6.5v4A4.5 4.5 0 0 1 14.5 15H12l-4.5 4v-4A4.5 4.5 0 0 1 3 10.5v-4Z" />
      <path d="M8 8.5h8" />
      <path d="M8 11.5h5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className={styles.sendIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function ChatButton({ open, unread, onClick }: ChatButtonProps) {
  return (
    <button
      className={`${styles.button} ${open ? styles.buttonOpen : ""}`}
      type="button"
      onClick={onClick}
      aria-label={open ? "Fechar assistente virtual" : "Abrir assistente virtual"}
      aria-expanded={open}
    >
      <span className={styles.brandMark} aria-hidden="true">
        <BrandLogo />
      </span>
      <span className={styles.iconWrap}>{open ? <CloseIcon /> : <ChatIcon />}</span>
      {unread > 0 && <span className={styles.badge}>{unread}</span>}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function ChatHeader({ onClose, onNewChat, onDeleteChat }: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <BrandLogo className={styles.logo} />
        <div className={styles.status}>
          <strong>Assistente IA</strong>
          <span>
            <i aria-hidden="true" />
            Online agora
          </span>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button className={styles.closeButton} type="button" onClick={onNewChat} aria-label="Novo chat">
          <PlusIcon />
        </button>
        <button className={styles.closeButton} type="button" onClick={onDeleteChat} aria-label="Apagar chat">
          <TrashIcon />
        </button>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Fechar assistente virtual">
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <article className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && (
        <span className={styles.avatar} aria-hidden="true">
          IA
        </span>
      )}
      <div className={styles.content}>
        <p>{message.content}</p>
        <time>{message.time}</time>
      </div>
    </article>
  );
}

function TypingIndicator() {
  return (
    <div className={styles.typing} aria-label="Assistente digitando">
      <span />
      <span />
      <span />
    </div>
  );
}

function ChatInput({ disabled, onSendMessage }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = value.trim().length > 0 && !disabled;

  const resetHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "42px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 118)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 118 ? "auto" : "hidden";
  };

  const handleSend = async () => {
    if (!canSend) return;

    const message = value;
    setValue("");
    await onSendMessage(message);

    requestAnimationFrame(() => {
      resetHeight();
      textareaRef.current?.focus();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    void handleSend();
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSend();
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        disabled={disabled}
        placeholder="Pergunte sobre o sistema..."
        aria-label="Mensagem para o assistente virtual"
        onChange={(event) => {
          setValue(event.target.value);
          requestAnimationFrame(resetHeight);
        }}
        onKeyDown={handleKeyDown}
      />
      <button className={styles.sendButton} type="submit" disabled={!canSend} aria-label="Enviar mensagem">
        <SendIcon />
      </button>
    </form>
  );
}

function ChatWindow({ open, loading, messages, onClose, onNewChat, onDeleteChat, onSendMessage }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, open]);

  return (
    <div className={`${styles.window} ${open ? styles.open : ""}`} aria-hidden={!open}>
      <ChatHeader onClose={onClose} onNewChat={onNewChat} onDeleteChat={onDeleteChat} />

      <div className={styles.body} role="log" aria-live="polite" aria-relevant="additions text">
        <div className={styles.intro}>
          <strong>Assistente do sistema</strong>
          <span>Respostas rapidas sobre uso, telas e fluxos da clinica.</span>
        </div>

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput disabled={loading} onSendMessage={onSendMessage} />
    </div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>(() => [createMessage("assistant", INITIAL_MESSAGE)]);
  const [readMessageCount, setReadMessageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const theme = useChatTheme();
  const abortRef = useRef<AbortController | null>(null);

  const unread = useMemo(() => (!open ? Math.max(0, messages.length - readMessageCount) : 0), [messages.length, open, readMessageCount]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (open) setReadMessageCount(messages.length);
  }, [messages.length, open]);

  const resetChat = () => {
    abortRef.current?.abort();
    setLoading(false);
    setMessages([createMessage("assistant", INITIAL_MESSAGE)]);
    setReadMessageCount(1);
  };

  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!text || loading) return;

    const userMessage = createMessage("user", text);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      if (!localDb) {
        throw new Error("Banco local indisponivel.");
      }

      const history: ChatRequestMessage[] = messages.slice(-10).map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const { data, error } = await localDb.functions.invoke<{ reply: string }>("chatbot", {
        body: { message: text, history },
      });

      if (error) {
        throw error;
      }

      setMessages((currentMessages) => [...currentMessages, createMessage("assistant", data?.reply?.trim() || getFallbackReply())]);
    } catch (error) {
      console.error("Erro ao enviar mensagem para o chatbot:", error);
      setMessages((currentMessages) => [...currentMessages, createMessage("assistant", getFallbackReply())]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.chatbot} style={theme} aria-label="Assistente virtual da Clinica Almeida">
      <ChatWindow
        open={open}
        loading={loading}
        messages={messages}
        onClose={() => setOpen(false)}
        onNewChat={resetChat}
        onDeleteChat={resetChat}
        onSendMessage={sendMessage}
      />
      <ChatButton
        open={open}
        unread={unread}
        onClick={() => {
          setOpen((currentOpen) => {
            const nextOpen = !currentOpen;
            if (nextOpen) setReadMessageCount(messages.length);
            return nextOpen;
          });
        }}
      />
    </section>
  );
}
