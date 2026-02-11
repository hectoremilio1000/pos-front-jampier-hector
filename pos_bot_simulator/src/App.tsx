import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Restaurant = {
  id: number
  name: string
  phone: string | null
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  ts: string
}

type OutboundBotPayload = {
  phone: string
  text: string
  provider: string
  providerMessageId: string
}

type BotMessageResponse = {
  replies?: unknown
  conversationId?: string | number | null
  intent?: string | null
  intentPayload?: unknown
}

type LastBotResponseMeta = {
  conversationId: string | null
  intent: string | null
  intentPayload: unknown
}

const DEFAULT_BASE =
  import.meta.env.VITE_BOT_API_BASE || 'http://localhost:3357/api'
const DEFAULT_SECRET = import.meta.env.VITE_BOT_SECRET || ''
const DEFAULT_PROVIDER = 'simulator'

function normalizeProvider(value: string) {
  return String(value || '').trim().toLowerCase() || DEFAULT_PROVIDER
}

function buildAutoProviderMessageId(provider: string) {
  return `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function App() {
  const [apiBase, setApiBase] = useState(
    localStorage.getItem('bot.apiBase') || DEFAULT_BASE
  )
  const [secret, setSecret] = useState(
    localStorage.getItem('bot.secret') || DEFAULT_SECRET
  )
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [phone, setPhone] = useState('')
  const [provider, setProvider] = useState(
    normalizeProvider(localStorage.getItem('bot.provider') || DEFAULT_PROVIDER)
  )
  const [providerMessageIdInput, setProviderMessageIdInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastPayload, setLastPayload] = useState<OutboundBotPayload | null>(null)
  const [lastBotResponseMeta, setLastBotResponseMeta] = useState<LastBotResponseMeta | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('bot.apiBase', apiBase)
  }, [apiBase])

  useEffect(() => {
    localStorage.setItem('bot.secret', secret)
  }, [secret])

  useEffect(() => {
    localStorage.setItem('bot.provider', normalizeProvider(provider))
  }, [provider])

  const apiBaseClean = useMemo(
    () => String(apiBase || '').replace(/\/+$/, ''),
    [apiBase]
  )

  const selectedRestaurant = useMemo(
    () =>
      restaurants.find((r) => String(r.id) === String(selectedRestaurantId)) ||
      null,
    [restaurants, selectedRestaurantId]
  )
  const lastIntentPayloadText = useMemo(() => {
    if (!lastBotResponseMeta) return 'Sin payload todavia.'
    try {
      return JSON.stringify(lastBotResponseMeta.intentPayload ?? null, null, 2)
    } catch {
      return String(lastBotResponseMeta.intentPayload ?? null)
    }
  }, [lastBotResponseMeta])

  useEffect(() => {
    if (selectedRestaurant?.phone) {
      setPhone(selectedRestaurant.phone)
    }
  }, [selectedRestaurant?.phone])

  async function loadRestaurants() {
    setStatus(null)
    if (!apiBaseClean || !secret) {
      setStatus('Configura API Base y Bot Secret para cargar restaurantes.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiBaseClean}/debug/restaurants?limit=200`, {
        headers: { 'x-bot-secret': secret },
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} ${text}`)
      }
      const data = await res.json()
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setRestaurants(rows)
      if (rows.length === 0) {
        setStatus('No hay restaurantes con telefono en la base.')
      }
    } catch (err: any) {
      setStatus(err?.message || 'Error al cargar restaurantes.')
    } finally {
      setLoading(false)
    }
  }

  async function dispatchToBot(payload: OutboundBotPayload, options?: { replay?: boolean }) {
    if (!secret || !apiBaseClean) {
      setStatus('Configura API Base y Bot Secret antes de enviar.')
      return
    }

    const isReplay = options?.replay === true
    if (isReplay) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system',
          text: `Reenvio con mismo providerMessageId: ${payload.providerMessageId}`,
          ts: new Date().toISOString(),
        },
      ])
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          text: payload.text,
          ts: new Date().toISOString(),
        },
      ])
      setText('')
    }

    setLoading(true)
    setStatus(`Enviando ${payload.provider}/${payload.providerMessageId}...`)

    try {
      const res = await fetch(`${apiBaseClean}/bot/message`, {
        method: 'POST',
        headers: {
          'x-bot-secret': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`)
      }

      setLastPayload(payload)
      const typedData = (data || {}) as BotMessageResponse
      setLastBotResponseMeta({
        conversationId:
          typedData.conversationId === undefined || typedData.conversationId === null
            ? null
            : String(typedData.conversationId),
        intent: typeof typedData.intent === 'string' ? typedData.intent : null,
        intentPayload: typedData.intentPayload ?? null,
      })

      const replies = Array.isArray(typedData.replies) ? typedData.replies : []
      if (!replies.length) {
        setStatus(`Sin respuestas del bot (${payload.providerMessageId}).`)
        return
      }

      const replyMessages: ChatMessage[] = replies.map((reply: unknown) => ({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: String(reply || ''),
        ts: new Date().toISOString(),
      }))
      setMessages((prev) => [...prev, ...replyMessages])
      setStatus(`OK (${payload.provider}/${payload.providerMessageId})`)
    } catch (err: any) {
      setStatus(err?.message || 'Error al enviar mensaje.')
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system',
          text: 'No se pudo enviar el mensaje. Revisa API Base y Bot Secret.',
          ts: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    const cleanPhone = String(phone || '').trim()
    const cleanText = String(text || '').trim()
    const cleanProvider = normalizeProvider(provider)
    const cleanProviderMessageId = String(providerMessageIdInput || '').trim()
    if (!cleanPhone || !cleanText || !secret || !apiBaseClean) return

    const payload: OutboundBotPayload = {
      phone: cleanPhone,
      text: cleanText,
      provider: cleanProvider,
      providerMessageId:
        cleanProviderMessageId || buildAutoProviderMessageId(cleanProvider),
    }

    await dispatchToBot(payload)
  }

  async function replayLastMessage() {
    if (!lastPayload) {
      setStatus('Todavia no hay payload previo para reintentar.')
      return
    }

    await dispatchToBot(lastPayload, { replay: true })
  }

  function resetChat() {
    setMessages([])
    setStatus(null)
  }

  return (
    <div className="app">
      <aside className="panel">
        <div className="brand">
          <span className="brand-tag">POS Bot</span>
          <h1>Simulador WhatsApp</h1>
          <p>Prueba la conversacion por restaurante antes de ir a WhatsApp.</p>
        </div>

        <div className="field">
          <label>API Base</label>
          <input
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="http://localhost:3357/api"
          />
        </div>

        <div className="field">
          <label>Bot Secret</label>
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="x-bot-secret"
            type="password"
          />
        </div>

        <div className="field">
          <label>Restaurante</label>
          <select
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
          >
            <option value="">Selecciona un restaurante</option>
            {restaurants.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name} — {r.phone || 'sin telefono'}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={loadRestaurants} disabled={loading}>
            {loading ? 'Cargando...' : 'Cargar restaurantes'}
          </button>
        </div>

        <div className="field">
          <label>Telefono activo</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="521XXXXXXXXXX"
          />
          <div className="hint">
            {selectedRestaurant
              ? `ID ${selectedRestaurant.id}`
              : 'Si no hay seleccion, escribe un telefono manual.'}
          </div>
        </div>

        <div className="field">
          <label>Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(normalizeProvider(e.target.value))}
          >
            <option value="simulator">simulator</option>
            <option value="whatsapp">whatsapp</option>
          </select>
          <div className="hint">Para webhook real usa whatsapp.</div>
        </div>

        <div className="field">
          <label>Provider Message ID (opcional)</label>
          <input
            value={providerMessageIdInput}
            onChange={(e) => setProviderMessageIdInput(e.target.value)}
            placeholder="wa-msg-123"
          />
          <div className="hint">
            Vacio = autogenerado. Repetido = prueba de idempotencia.
          </div>
        </div>

        <div className="field">
          <label>Estado</label>
          <div className="status">{status || 'Listo para enviar.'}</div>
        </div>

        <div className="field">
          <label>Ultimo payload</label>
          <div className="status">
            {lastPayload
              ? `${lastPayload.provider}/${lastPayload.providerMessageId}`
              : 'Aun no se ha enviado ninguno.'}
          </div>
        </div>

        <div className="field">
          <label>Intent detectado</label>
          <div className="status">
            {lastBotResponseMeta?.intent || 'Sin intent detectado todavia.'}
          </div>
          <div className="hint">
            {lastBotResponseMeta?.conversationId
              ? `conversationId: ${lastBotResponseMeta.conversationId}`
              : 'Sin conversationId en la ultima respuesta.'}
          </div>
        </div>

        <div className="field">
          <label>Intent payload</label>
          <pre className="json-block">{lastIntentPayloadText}</pre>
        </div>

        <div className="field actions">
          <button onClick={resetChat} className="ghost">
            Limpiar chat
          </button>
        </div>
      </aside>

      <main className="chat">
        <div className="chat-header">
          <div>
            <h2>Conversacion</h2>
            <p>
              Envia mensajes como si fueras WhatsApp. Se guardan por telefono.
            </p>
          </div>
        </div>

        <div className="chat-body">
          {messages.length === 0 ? (
            <div className="empty">
              Escribe un mensaje para iniciar la prueba.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`bubble ${msg.role}`}>
                <div className="bubble-role">
                  {msg.role === 'user'
                    ? 'Tu'
                    : msg.role === 'assistant'
                    ? 'Bot'
                    : 'Sistema'}
                </div>
                <div className="bubble-text">{msg.text}</div>
              </div>
            ))
          )}
        </div>

        <div className="chat-input">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return
              e.preventDefault()
              if (loading) return
              if (!text.trim() || !phone.trim() || !secret) return
              void sendMessage()
            }}
            placeholder="Escribe tu mensaje..."
            rows={3}
          />
          <div className="chat-actions">
            <button
              onClick={sendMessage}
              disabled={loading || !text.trim() || !phone.trim() || !secret}
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
            <button
              className="ghost"
              onClick={replayLastMessage}
              disabled={loading || !lastPayload || !phone.trim() || !secret}
            >
              Reenviar mismo ID
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
