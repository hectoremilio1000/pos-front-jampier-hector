import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Drawer, Input, Space, Typography } from "antd";
import {
  ClearOutlined,
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import apiAuth from "./apis/apiAuth";
import { useAuth } from "./Auth/AuthContext";
import "./BotAdminAssistant.css";

type ChatRole = "user" | "assistant";
type ChatEntry = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
};
type GuideCard = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  route?: string;
  routeLabel?: string;
};
type ContextProfile = {
  id: string;
  label: string;
  statusText: string;
  statusPrompt: string;
  statusRoute?: string;
  statusRouteLabel?: string;
  cards: GuideCard[];
  match: (pathname: string) => boolean;
};
type ModuleLink = {
  id: string;
  label: string;
  to: string;
  keywords: string[];
};
type ParsedAssistantMessage = {
  paragraphs: string[];
  steps: string[];
};

const { Text } = Typography;
const HISTORY_LIMIT = 80;
const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
});

const QUICK_PROMPTS = [
  { label: "Sacar corte X", prompt: "Como saco corte X" },
  { label: "Cerrar turno", prompt: "Como cierro turno en POS Cash" },
  { label: "Configurar caja", prompt: "Como configuro una caja" },
  {
    label: "Emparejar comandero",
    prompt: "Como emparejar una tablet para comandero",
  },
];
const DEFAULT_CONTEXT_PROFILE: ContextProfile = {
  id: "general",
  label: "General",
  statusText: "Estas en vista general del admin. ¿Quieres una guia por modulo?",
  statusPrompt:
    "Estoy en una vista general del POS Admin. Dame un menu de ayuda corto para inventario, caja y comandero.",
  cards: [
    {
      id: "guide-cut-x",
      title: "Sacar corte X",
      description: "Flujo completo del corte X con validaciones previas.",
      prompt:
        "Dame los pasos exactos para sacar corte X desde POS Admin y que revisar si no aparece informacion.",
      route: "/folio_series",
      routeLabel: "Abrir Corte X",
    },
    {
      id: "guide-cash-station",
      title: "Configurar caja",
      description: "Crear caja, asignar cajero y parametros base.",
      prompt:
        "Explicame paso a paso como configurar una caja nueva en POS Admin y errores comunes.",
      route: "/cash_stations",
      routeLabel: "Abrir Cajas",
    },
    {
      id: "guide-pairing",
      title: "Emparejar comandero",
      description: "Vincula tablet y valida conectividad operativa.",
      prompt:
        "Guiame para emparejar una tablet de comandero desde admin y como validar que quedo conectada.",
      route: "/generatePairing",
      routeLabel: "Abrir Pairing",
    },
  ],
  match: () => false,
};
const CONTEXT_PROFILES: ContextProfile[] = [
  {
    id: "inventory-wastes",
    label: "Mermas",
    statusText: "Estas en Mermas. ¿Quieres crear un insumo y registrar la merma completa?",
    statusPrompt:
      "Estoy en Inventario > Mermas. Dame el flujo exacto para crear un insumo y luego registrar una merma aplicada.",
    statusRoute: "/inventario/insumos",
    statusRouteLabel: "Abrir Insumos",
    cards: [
      {
        id: "wastes-create-input",
        title: "Crear insumo",
        description: "Alta de materia prima con unidad base y control.",
        prompt: "Como crear un insumo nuevo correctamente en POS Admin.",
        route: "/inventario/insumos",
        routeLabel: "Ir a Insumos",
      },
      {
        id: "wastes-register",
        title: "Registrar merma",
        description: "Captura, motivo y aplicacion al inventario.",
        prompt:
          "Como registrar una merma paso a paso en el modulo de mermas y aplicarla al inventario.",
        route: "/inventario/mermas",
        routeLabel: "Ir a Mermas",
      },
      {
        id: "wastes-audit",
        title: "Validar movimiento",
        description: "Revisa que la merma genere movimiento correcto.",
        prompt: "Como verifico en movimientos que una merma quedo aplicada correctamente.",
        route: "/inventario/movimientos",
        routeLabel: "Ir a Movimientos",
      },
    ],
    match: (pathname) => pathname.startsWith("/inventario/mermas"),
  },
  {
    id: "inventory-items",
    label: "Insumos",
    statusText: "Estas en Insumos. ¿Quieres que te guie para alta completa sin errores?",
    statusPrompt:
      "Estoy en Inventario > Insumos. Dame checklist breve para crear insumo y dejarlo listo para compras y recetas.",
    statusRoute: "/inventario/insumos",
    statusRouteLabel: "Abrir Insumos",
    cards: [
      {
        id: "items-create",
        title: "Alta de insumo",
        description: "Nombre, unidad base y datos minimos operativos.",
        prompt: "Dame los pasos exactos para crear un insumo en POS Admin.",
        route: "/inventario/insumos",
        routeLabel: "Abrir Insumos",
      },
      {
        id: "items-presentation",
        title: "Presentaciones",
        description: "Define conversion de compra a unidad base.",
        prompt:
          "Como crear presentaciones de compra para un insumo y no romper conversiones de inventario.",
        route: "/inventario/presentaciones",
        routeLabel: "Abrir Presentaciones",
      },
      {
        id: "items-recipe",
        title: "Vincular receta",
        description: "Conecta insumo a producto para consumo real.",
        prompt: "Como vinculo insumos a recetas para que se descuente inventario al vender.",
        route: "/inventario/bom",
        routeLabel: "Abrir Recetas",
      },
    ],
    match: (pathname) => pathname === "/inventario" || pathname.startsWith("/inventario/insumos"),
  },
  {
    id: "cash-stations",
    label: "Cajas",
    statusText: "Estas en Cajas. ¿Quieres configurar caja y dejarla lista para turno?",
    statusPrompt:
      "Estoy en modulo de cajas. Dame flujo completo para crear una caja, asignar cajero y validar apertura.",
    statusRoute: "/cash_stations",
    statusRouteLabel: "Abrir Cajas",
    cards: [
      {
        id: "cash-create",
        title: "Crear caja",
        description: "Configura estacion y parametros iniciales.",
        prompt: "Como crear una caja nueva en POS Admin paso a paso.",
        route: "/cash_stations",
        routeLabel: "Abrir Cajas",
      },
      {
        id: "cash-shift",
        title: "Cerrar turno",
        description: "Checklist de cierre en POS Cash sin diferencias.",
        prompt: "Como cerrar turno en POS Cash correctamente y que validar antes del cierre.",
      },
      {
        id: "cash-cutx",
        title: "Corte X",
        description: "Consulta y genera corte por turno o caja.",
        prompt: "Como sacar corte X y leer los datos principales en POS Admin.",
        route: "/folio_series",
        routeLabel: "Abrir Corte X",
      },
    ],
    match: (pathname) => pathname.startsWith("/cash_stations"),
  },
  {
    id: "pairing",
    label: "Pairing",
    statusText: "Estas en Pairing. ¿Quieres emparejar una tablet de comandero ahora?",
    statusPrompt:
      "Estoy en Pairing. Guiame para vincular una tablet de comandero y validar que quede operativa.",
    statusRoute: "/generatePairing",
    statusRouteLabel: "Abrir Pairing",
    cards: [
      {
        id: "pairing-commander",
        title: "Emparejar comandero",
        description: "Asocia tablet y revisa estado de conexion.",
        prompt: "Dame pasos para emparejar una tablet de comandero desde admin.",
        route: "/generatePairing",
        routeLabel: "Ir a Pairing",
      },
      {
        id: "pairing-cash",
        title: "Emparejar POS Cash",
        description: "Vincula dispositivo de caja a su estacion.",
        prompt: "Como emparejar un dispositivo de POS Cash y asignarlo a una caja.",
        route: "/generatePairing",
        routeLabel: "Ir a Pairing",
      },
      {
        id: "pairing-troubleshoot",
        title: "Resolver conexion",
        description: "Checklist rapido cuando no conecta la tablet.",
        prompt:
          "Si una tablet no se conecta en comandero, dame diagnostico rapido y pasos de solucion.",
      },
    ],
    match: (pathname) => pathname.startsWith("/generatePairing"),
  },
];
const MESSAGE_CTA_LINKS: ModuleLink[] = [
  {
    id: "goto-insumos",
    label: "Abrir Insumos",
    to: "/inventario/insumos",
    keywords: ["insumo", "insumos", "materia prima"],
  },
  {
    id: "goto-mermas",
    label: "Abrir Mermas",
    to: "/inventario/mermas",
    keywords: ["merma", "mermas", "desperdicio"],
  },
  {
    id: "goto-cajas",
    label: "Abrir Cajas",
    to: "/cash_stations",
    keywords: ["caja", "cajas", "cajero", "cajeros"],
  },
  {
    id: "goto-cutx",
    label: "Abrir Corte X",
    to: "/folio_series",
    keywords: ["corte x", "corte", "turno cerrado", "cierre"],
  },
  {
    id: "goto-pairing",
    label: "Abrir Pairing",
    to: "/generatePairing",
    keywords: ["pairing", "comandero", "tablet", "emparejar"],
  },
  {
    id: "goto-hour-cut",
    label: "Abrir Hora Corte",
    to: "/hour_cut",
    keywords: ["hora de corte", "corte fiscal", "fiscal"],
  },
];

function buildStorageKey(restaurantId: number, userId: number) {
  return `pos_admin_bot_history:${restaurantId}:${userId}`;
}

function loadHistory(storageKey: string): ChatEntry[] {
  if (!storageKey || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row: any): ChatEntry => {
        const role: ChatRole = row?.role === "assistant" ? "assistant" : "user";
        return {
          id: String(row?.id || ""),
          role,
          text: String(row?.text || ""),
          createdAt: Number(row?.createdAt || 0),
        };
      })
      .filter((row) => row.id && row.text);
  } catch {
    return [];
  }
}

function persistHistory(storageKey: string, entries: ChatEntry[]) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries.slice(-HISTORY_LIMIT)));
  } catch {}
}

function formatEntryTime(createdAt: number) {
  if (!Number.isFinite(createdAt) || createdAt <= 0) return "";
  return timeFormatter.format(new Date(createdAt));
}

function buildGuidedCards(contextProfile: ContextProfile): GuideCard[] {
  const dedup = new Map<string, GuideCard>();
  [...contextProfile.cards, ...DEFAULT_CONTEXT_PROFILE.cards].forEach((card) => {
    if (!dedup.has(card.id)) dedup.set(card.id, card);
  });
  return Array.from(dedup.values()).slice(0, 4);
}

function parseAssistantMessage(text: string): ParsedAssistantMessage {
  const raw = String(text || "").trim();
  if (!raw) return { paragraphs: [], steps: [] };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const stepMatches = lines.filter((line) => /^\d+[\.)]\s+/.test(line));

  if (stepMatches.length < 2) {
    return { paragraphs: [raw], steps: [] };
  }

  const paragraphs = lines.filter((line) => !/^\d+[\.)]\s+/.test(line));
  const steps = stepMatches.map((line) => line.replace(/^\d+[\.)]\s+/, "").trim());
  return { paragraphs, steps };
}

function inferMessageCtas(assistantText: string, userText?: string): ModuleLink[] {
  const haystack = `${assistantText} ${userText || ""}`.toLowerCase();
  const matches = MESSAGE_CTA_LINKS.filter((link) =>
    link.keywords.some((keyword) => haystack.includes(keyword))
  );
  const dedup = new Map<string, ModuleLink>();
  matches.forEach((match) => dedup.set(match.id, match));
  return Array.from(dedup.values()).slice(0, 2);
}

export default function BotAdminAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const restaurantId = Number(user?.restaurant?.id ?? user?.restaurantId ?? 0);
  const userId = Number(user?.id ?? 0);
  const storageKey = useMemo(
    () => (restaurantId > 0 && userId > 0 ? buildStorageKey(restaurantId, userId) : ""),
    [restaurantId, userId]
  );
  const userRoleCode = String(user?.role?.code || "").toLowerCase();
  const isOwner = userRoleCode === "owner";
  const contextProfile = useMemo(
    () => CONTEXT_PROFILES.find((profile) => profile.match(location.pathname)) || DEFAULT_CONTEXT_PROFILE,
    [location.pathname]
  );
  const guidedCards = useMemo(() => buildGuidedCards(contextProfile), [contextProfile]);

  useEffect(() => {
    setEntries(loadHistory(storageKey));
  }, [storageKey]);

  useEffect(() => {
    persistHistory(storageKey, entries);
  }, [storageKey, entries]);

  useEffect(() => {
    if (!open) return;
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, open]);

  const appendEntry = (role: ChatRole, text: string) => {
    setEntries((prev) => [
      ...prev.slice(-(HISTORY_LIMIT - 1)),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        text,
        createdAt: Date.now(),
      },
    ]);
  };

  const handleSend = async (rawText?: string) => {
    const text = String(rawText ?? input).trim();
    if (!text || sending) return;
    if (!restaurantId || !userId) {
      appendEntry(
        "assistant",
        "No encuentro el restaurante de tu sesion. Cierra sesion y vuelve a entrar."
      );
      return;
    }

    setInput("");
    appendEntry("user", text);
    setSending(true);

    try {
      const { data } = await apiAuth.post("/bot/message", { text });
      const replies = Array.isArray(data?.replies) ? data.replies.filter(Boolean) : [];

      if (!replies.length) {
        appendEntry("assistant", "Listo, recibi tu mensaje pero no hubo respuesta del bot.");
      } else {
        replies.forEach((reply: string) => appendEntry("assistant", String(reply)));
      }
    } catch (error: any) {
      const errorText =
        String(error?.response?.data?.error || "").trim() ||
        String(error?.response?.data?.message || "").trim() ||
        "No pude procesar la solicitud en este momento.";
      appendEntry("assistant", `Error: ${errorText}`);
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => setEntries([]);
  const goToRoute = (route: string) => navigate(route);

  if (!isOwner) return null;

  return (
    <>
      <Button
        className="bot-admin-launcher"
        type="primary"
        shape="round"
        size="large"
        icon={<RobotOutlined />}
        onClick={() => setOpen(true)}
      >
        Asistente POS
      </Button>

      <Drawer
        className="bot-admin-drawer"
        title={
          <div className="bot-admin-header">
            <div className="bot-admin-header__icon">
              <MessageOutlined />
            </div>
            <div className="bot-admin-header__text">
              <strong>Asistente POS Admin</strong>
              <span>Guia operativa para POS, Comandero y POS Cash</span>
            </div>
          </div>
        }
        placement="right"
        width="min(440px, calc(100vw - 12px))"
        onClose={() => setOpen(false)}
        open={open}
        extra={
          <Space size={8}>
            <Button
              icon={<ClearOutlined />}
              onClick={clearChat}
              disabled={!entries.length}
              size="small"
            >
              Nuevo chat
            </Button>
          </Space>
        }
      >
        <div className="bot-admin-intro">
          <RobotOutlined />
          <Text>
            Preguntame pasos concretos para operar el sistema. Te respondo con flujo real del POS.
          </Text>
        </div>

        <div className="bot-admin-context">
          <div className="bot-admin-context__text">
            <strong>Contexto: {contextProfile.label}</strong>
            <span>{contextProfile.statusText}</span>
          </div>
          <div className="bot-admin-context__actions">
            <Button size="small" type="primary" onClick={() => handleSend(contextProfile.statusPrompt)}>
              Guiarme aqui
            </Button>
            {contextProfile.statusRoute && (
              <Button
                size="small"
                onClick={() => goToRoute(contextProfile.statusRoute!)}
                className="bot-admin-ghost-btn"
              >
                {contextProfile.statusRouteLabel || "Abrir modulo"}
              </Button>
            )}
          </div>
        </div>

        <div className="bot-admin-guide-grid">
          {guidedCards.map((card) => (
            <div key={card.id} className="bot-admin-guide-card">
              <div className="bot-admin-guide-card__title">{card.title}</div>
              <div className="bot-admin-guide-card__desc">{card.description}</div>
              <div className="bot-admin-guide-card__actions">
                <Button size="small" type="primary" onClick={() => handleSend(card.prompt)}>
                  Ver pasos
                </Button>
                {card.route && (
                  <Button
                    size="small"
                    className="bot-admin-ghost-btn"
                    onClick={() => goToRoute(card.route!)}
                  >
                    {card.routeLabel || "Abrir"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bot-admin-chips">
          {QUICK_PROMPTS.map((item) => (
            <Button
              key={item.prompt}
              className="bot-admin-chip"
              size="small"
              onClick={() => handleSend(item.prompt)}
              disabled={sending}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div ref={feedRef} className="bot-admin-feed">
          {!entries.length && (
            <div className="bot-admin-empty">
              <MessageOutlined />
              Preguntame como usar POS Admin, Comandero o POS Cash: cortes, turnos, cajas, pairing y
              reportes.
            </div>
          )}

          {entries.map((entry, index) => {
            const isUser = entry.role === "user";
            const previousUserText =
              entries
                .slice(0, index)
                .reverse()
                .find((row) => row.role === "user")?.text || "";
            const parsed = isUser ? null : parseAssistantMessage(entry.text);
            const ctas = isUser ? [] : inferMessageCtas(entry.text, previousUserText);
            return (
              <div key={entry.id} className={`bot-admin-row ${isUser ? "is-user" : "is-assistant"}`}>
                <div className="bot-admin-bubble">
                  <div className="bot-admin-text">
                    {!isUser && parsed && parsed.steps.length > 0 ? (
                      <>
                        {parsed.paragraphs.map((paragraph, pIndex) => (
                          <p key={`${entry.id}-p-${pIndex}`} className="bot-admin-paragraph">
                            {paragraph}
                          </p>
                        ))}
                        <ol className="bot-admin-steps">
                          {parsed.steps.map((step, sIndex) => (
                            <li key={`${entry.id}-s-${sIndex}`}>{step}</li>
                          ))}
                        </ol>
                      </>
                    ) : (
                      entry.text
                    )}
                  </div>

                  {!!ctas.length && (
                    <div className="bot-admin-inline-cta">
                      {ctas.map((cta) => (
                        <Button
                          key={`${entry.id}-${cta.id}`}
                          size="small"
                          className="bot-admin-inline-cta__btn"
                          onClick={() => goToRoute(cta.to)}
                        >
                          {cta.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="bot-admin-meta">{formatEntryTime(entry.createdAt)}</div>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="bot-admin-row is-assistant">
              <div className="bot-admin-bubble bot-admin-bubble--typing">
                <span className="bot-admin-typing" aria-label="Escribiendo">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bot-admin-composer">
          <Input.TextArea
            className="bot-admin-input"
            autoSize={{ minRows: 2, maxRows: 5 }}
            value={input}
            placeholder="Ej: como sacar corte X de la caja de hoy"
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={(e) => {
              if (e.shiftKey) return;
              e.preventDefault();
              void handleSend();
            }}
            disabled={sending}
          />
          <Button
            className="bot-admin-send"
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSend()}
            loading={sending}
            disabled={!input.trim() || sending}
          >
            Enviar
          </Button>
        </div>
        <Text type="secondary" className="bot-admin-footnote">
          Enter envia. Shift + Enter agrega salto de linea.
        </Text>
      </Drawer>
    </>
  );
}
