Ejecuté la migración en pos_cash_api y quedó aplicada (la nueva tabla/columns de impresión ya existen).

Pasos para configurar en Centro de Control:

1. Entra a POS Centro Control → Restaurantes.
2. En el restaurante, haz clic en Impresión.
3. Ajusta:
   - Modo de impresión: local | cloud | hybrid
   - Confirmar antes de imprimir: ON/OFF
   - Entrega de recibo: QR | Email | WhatsApp | Ninguno
4. Guardar.

Pasos para probar en Comandero:

1. Abre una mesa → Capturar → agrega productos.
2. Comandar (si confirm_print está ON, te preguntará).
3. Desde la tarjeta de la orden → Imprimir: - Si print_mode=cloud: no imprime local, solo KDS + recibo. - Si receipt_delivery=email: te abre el modal para enviar email.
   Nota: si no hay impresoras configuradas, el sistema cae automáticamente a cloud.

Sobre SMTP real (email automático):

- Hoy el envío por email usa mailto: (abre el cliente de correo).
- Para envío real necesitas:
  1. Proveedor SMTP (SendGrid, Mailgun, SES, Gmail SMTP).
  2. Credenciales: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM.
  3. Implementar endpoint backend que envíe el recibo (ej. POST /api/receipts/email).

Si quieres que lo implemente, dime:

- Proveedor SMTP y credenciales (o me dices cuál vas a usar).
- “From” que quieres mostrar.

Siguiente paso recomendado (si quieres):

1. Reiniciar pos_cash_api, pos_order_api, pos_comandero_front, pos_centro_front para que tomen cambios.

› Find and fix a bug in @filename

36% context left · ? for shortcuts

1.- haer calendario
2.- hacer marketing
3.-
