export function kioskLogoutOperator() {
  sessionStorage.removeItem("kiosk_jwt");
  sessionStorage.removeItem("kiosk_jwt_exp");
}
export function kioskUnpairDevice() {
  kioskLogoutOperator();
  sessionStorage.removeItem("kiosk_token");
  sessionStorage.removeItem("cash_shift_id");
}
