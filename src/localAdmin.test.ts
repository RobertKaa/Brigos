import { describe, expect, it } from "vitest";
import { isLocalAdminEnabled } from "./localAdmin";

describe("commandes admin locales", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "autorise la partie invitée de développement sur %s",
    (hostname) => {
      expect(
        isLocalAdminEnabled({ development: true, hostname, mode: "local" }),
      ).toBe(true);
    },
  );

  it.each(["localhost", "127.0.0.1", "[::1]", "robertkaa.github.io"])(
    "refuse tout build publié, même consulté sur %s",
    (hostname) => {
      expect(
        isLocalAdminEnabled({ development: false, hostname, mode: "local" }),
      ).toBe(false);
    },
  );

  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "refuse les comptes connectés sur %s",
    (hostname) => {
      expect(
        isLocalAdminEnabled({ development: true, hostname, mode: "connected" }),
      ).toBe(false);
    },
  );

  it.each([
    "robertkaa.github.io",
    "192.168.1.2",
    "10.0.0.2",
    "0.0.0.0",
    "127.0.0.2",
    "localhost.example.com",
    "app.localhost",
    "localhost:5173",
    "::1",
    "",
  ])(
    "refuse les autres adresses, y compris le réseau local : %s",
    (hostname) => {
      expect(
        isLocalAdminEnabled({ development: true, hostname, mode: "local" }),
      ).toBe(false);
    },
  );

  it("refuse un mode de partie non établi", () => {
    expect(
      isLocalAdminEnabled({ development: true, hostname: "localhost" }),
    ).toBe(false);
  });
});
