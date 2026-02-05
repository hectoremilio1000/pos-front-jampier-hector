import { Transmit } from "@adonisjs/transmit-client";

export const transmit = new Transmit({
  baseUrl: import.meta.env.VITE_API_URL_CENTER,
});
