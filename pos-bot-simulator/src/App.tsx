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

const DEFAULT_BASE =
  import.meta.env.VITE_BOT_API_BASE || 'http://localhost:3357/api'
const DEFAULT_SECRET = import.meta.env.VITE_BOT_SECRET || ''

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('bot.apiBase', apiBase)
  }, [apiBase])

  useEffect(() => {
    localStorage.setItem('bot.secret', secret)
  }, [secret])

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

  async function sendMessage() {
    const cleanPhone = String(phone || '').trim()
    const cleanText = String(text || '').trim()
    if (!cleanPhone || !cleanText || !secret || !apiBaseClean) return

    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: cleanText,
      ts: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMsg])
    setText('')
    setLoading(true)
    setStatus(null)

    try {
      const res = await fetch(`${apiBaseClean}/bot/message`, {
        method: 'POST',
        headers: {
          'x-bot-secret': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone, text: cleanText }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`)
      }
      const replies = Array.isArray(data?.replies) ? data.replies : []
      if (!replies.length) {
        setStatus('Sin respuestas del bot.')
        return
      }
      const replyMessages: ChatMessage[] = replies.map((reply: string) => ({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: String(reply),
        ts: new Date().toISOString(),
      }))
      setMessages((prev) => [...prev, ...replyMessages])
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
          <label>Estado</label>
          <div className="status">{status || 'Listo para enviar.'}</div>
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
            placeholder="Escribe tu mensaje..."
            rows={3}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !text.trim() || !phone.trim() || !secret}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
