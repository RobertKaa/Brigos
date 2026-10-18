// Run npm run server:bundle before serving/deploying this function.
// @ts-ignore generated bundle is intentionally ignored by Git
import { createContactHandler } from "./generated/contact.js";
const env = (name: string) => Deno.env.get(name) ?? "";
Deno.serve(createContactHandler({
  allowedOrigins: env("BRIGO_ALLOWED_ORIGINS").split(",").map(value => value.trim()).filter(Boolean),
  recipient: env("BRIGOS_CONTACT_TO"),
  from: env("BRIGOS_CONTACT_FROM"),
  resendKey: env("BRIGOS_CONTACT_RESEND_KEY"),
  turnstileSecret: env("BRIGOS_CONTACT_TURNSTILE_SECRET"),
}));
