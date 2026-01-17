export const moneyFormatter = (v?: number | string) =>
  v === undefined || v === null
    ? ""
    : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Debe regresar string|number SIEMPRE; para vacío, regresa '' */
export const moneyParser = (v?: string) =>
  v ? String(v).replace(/,/g, "") : "";
