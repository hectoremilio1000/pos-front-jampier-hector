- subscriptions → plan activo del restaurante.
- subscription_payments → pagos de la suscripción (Stripe/MP/cash).
- invoices → facturas internas de cobro (amount_due, status).
- invoice_payments → pagos aplicados a esas facturas internas.

- subscriptions = contrato/plan del restaurante.
- subscription_payments = pagos reales (Stripe/MP/cash).
  - invoices + invoice_payments = cuentas por cobrar internas (monto due, ajustes, vencimientos).

### pasos

### YA

       1. Crear restaurante (ya lo hiciste)
      - Panel → Restaurantes → Nuevo restaurante.
      - Aquí defines plan/status “visual” para que la lista se vea bien.

2. Crear dueño (owner)
   - Panel → Usuarios → Nuevo usuario.
   - Rol: owner.
   - Asignar el restaurante.
   - Esto habilita que el dueño pueda entrar al POS/Panel del restaurante.
     1. Crear restaurante (ya lo hiciste)

   - Panel → Restaurantes → Nuevo restaurante.
   - Aquí defines plan/status “visual” para que la lista se vea bien.
   - Panel → Usuarios → Nuevo usuario.
   - Rol: owner.
   - Asignar el restaurante.
   - Esto habilita que el dueño pueda entrar al POS/Panel del restaurante.
   - Selecciona restaurante + plan + periodo + precio.
   - Si ya pagó, marca pago en la misma creación (o lo registras después).

3. Registrar pago (si aplica)
   - Desde Suscripciones → botón “Pagos”.
   - Registrar pago (efectivo/transferencia/Stripe).
4. Datos fiscales del restaurante (SaaS)
   - Crear saas_customer con RFC/razón/social/CP/email.
   - Esto es para emitir CFDI al restaurante.
5. Emitir factura SaaS
   - Endpoint POST /api/saas/invoices/issue.
   - Se timbra en Facturapi y guarda PDF/XML/ZIP en FTP.
   - Luego se ve en Facturación SaaS con botones de descarga.

Si quieres, empezamos ahora con el paso 2: crear el dueño.
Dime si quieres que lo hagas tú en la UI o prefieres que te guíe con los datos exactos (nombre/email/contraseña).
