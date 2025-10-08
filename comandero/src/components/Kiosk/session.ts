// Operador: cerrar sesión (mantiene pairing)
export function kioskLogoutOperator() {
  sessionStorage.removeItem("kiosk_jwt");
  sessionStorage.removeItem("kiosk_jwt_exp");
}

// Desemparejar (borra todo y fuerza pairing de nuevo)
export function kioskUnpairDevice() {
  kioskLogoutOperator();
  sessionStorage.removeItem("kiosk_token");
}
