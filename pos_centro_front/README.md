#mi usuario

email: hectoremilio1000@gmail.com
contraseña: admin20251

### pasos a hacer

4. Qué puedo mostrar ya en el Dashboard v0 de Super Admin (sin migrar nada)

Con lo actual, podemos tener un panel sencillito enfocado a “clientes nuevos” y navegación:

Nuevos clientes (hoy) → GET /api/restaurants?created=today&limit=5

Muestra: name, plan, status, created_at.

Owners/usuarios nuevos (hoy) → GET /api/users?created=today&role=owner&limit=5

(si ya tienes el rol “owner” en roles)

Acciones rápidas

Crear restaurante → /api/restaurants (form)

Crear usuario (owner) → /api/users (form)

Configurar plan del restaurante (por ahora sólo actualiza restaurants.plan y status desde un form simple)

Salud de servicios (mini): /health de auth/order/cash (verde/rojo)

Esto te da valor inmediato sin tocar DB.

5. Qué agregamos después (para el flujo de mensualidades real)

Añadimos estas migraciones y endpoints en pos-auth:

plans, subscriptions, invoices (migraciones y modelos)

Endpoints SA:

GET /api/sa/subscriptions/summary → { active, pastDue, trial }

GET /api/sa/subscriptions/upcoming?days=14 → renovaciones próximas

GET /api/sa/invoices?status=past_due&limit=5 → vencidas

POST /api/sa/subscriptions → { restaurantId, planCode }

(opcional) POST /api/sa/invoices/:id/mark-paid si liquidas manualmente al inicio

Con eso ya puedes ver si pagó, cuándo renueva, quién está en mora; y tu dashboard escala a KPIs.
