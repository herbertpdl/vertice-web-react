import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CSP_HEADER } from "@/lib/csp";
import { resetServerEnvForTests } from "@/lib/env.server";
import { proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
});

function visit(path: string, { session = false } = {}) {
  return proxy(
    new NextRequest(`https://app.vertice.test${path}`, {
      headers: session ? { Cookie: "vertice_session=jwt" } : {},
    }),
  );
}

function location(res: Response): string | null {
  return res.headers.get("Location");
}

describe("proxy: route guard and redirect", () => {
  it("sends a signed-out visit to a protected page to /login with that path as redirect", () => {
    const res = visit("/alunos/42?tab=planos");
    expect(res.status).toBe(307);
    const url = new URL(location(res)!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirect")).toBe("/alunos/42?tab=planos");
    expect([...url.searchParams.keys()]).toEqual(["redirect"]);
  });

  it("sends a signed-out visit to /perfil to /login too", () => {
    const url = new URL(location(visit("/perfil"))!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirect")).toBe("/perfil");
  });

  it("lets /baixar-app through with or without a session", () => {
    expect(location(visit("/baixar-app"))).toBeNull();
    expect(location(visit("/baixar-app", { session: true }))).toBeNull();
  });

  it("sends a signed-in visit to /login to the redirect path", () => {
    const res = visit("/login?redirect=%2Falunos%2F42%3Ftab%3Dplanos", { session: true });
    expect(location(res)).toBe("https://app.vertice.test/alunos/42?tab=planos");
  });

  it.each([
    "//evil.example",
    "https://evil.example/login",
    "/\\evil.example",
    "/%2F%2Fevil.example",
    "/%09/evil.example",
    "javascript:alert(1)",
    "/.//evil.example",
    "/a/..//evil",
    "/%2e%2e/%2e%2e//evil",
  ])("sends a signed-in visit to /login?redirect=%s to /dashboard", (redirect) => {
    const res = visit(`/login?redirect=${encodeURIComponent(redirect)}`, { session: true });
    expect(location(res)).toBe("https://app.vertice.test/dashboard");
  });

  it("sends a signed-in visit to /cadastro to /dashboard", () => {
    expect(location(visit("/cadastro", { session: true }))).toBe("https://app.vertice.test/dashboard");
  });

  it("renders /definir-senha with or without a session", () => {
    expect(location(visit("/definir-senha?token=t"))).toBeNull();
    expect(location(visit("/definir-senha?token=t", { session: true }))).toBeNull();
  });

  it.each(["/termos", "/privacidade", "/suporte"])("renders %s with or without a session", (path) => {
    for (const session of [false, true]) {
      const res = visit(path, { session });
      expect(location(res)).toBeNull();
      expect(res.headers.get(CSP_HEADER)).toBeTruthy();
    }
  });

  it("renders a protected page when signed in", () => {
    expect(location(visit("/dashboard", { session: true }))).toBeNull();
  });
});

describe("proxy: host × path × cookie matrix (admin-panel spec §1)", () => {
  type Cookie = "none" | "trainer" | "admin";
  const COOKIES: Record<Cookie, string | undefined> = {
    none: undefined,
    trainer: "vertice_session=jwt",
    admin: "vertice_admin=jwt",
  };

  function at(host: string, path: string, cookie: Cookie = "none") {
    const value = COOKIES[cookie];
    return proxy(
      new NextRequest(`http://${host}${path}`, {
        headers: { Host: host, ...(value ? { Cookie: value } : {}) },
      }),
    );
  }

  function expectNotFound(res: Response) {
    expect(res.status).toBe(404);
    expect(location(res)).toBeNull();
  }

  function expectRendered(res: Response) {
    expect(res.status).toBe(200);
    expect(location(res)).toBeNull();
    expect(res.headers.get(CSP_HEADER)).toBeTruthy();
  }

  function expectRedirect(res: Response, pathAndSearch: string) {
    expect(res.status).toBe(307);
    const url = new URL(location(res)!);
    expect(`${url.pathname}${url.search}`).toBe(pathAndSearch);
  }

  const ADMIN = "admin.localhost:5173";
  const TRAINER_HOSTS = ["localhost:5173", "localhost:3000", "unknown.example"];
  const TRAINER_PATHS = ["/login", "/dashboard", "/alunos/1", "/termos", "/definir-senha", "/baixar-app", "/cadastro", "/perfil"];
  const SHARED = ["/healthz", "/icon.png", "/_next/webpack-hmr", "/__nextjs_original-stack-frames"];

  describe("admin host", () => {
    it.each(TRAINER_PATHS.flatMap((p) => (["none", "trainer", "admin"] as Cookie[]).map((c) => [p, c])))(
      "404s the trainer path %s (cookie: %s)",
      (path, cookie) => expectNotFound(at(ADMIN, path, cookie as Cookie)),
    );

    it.each(SHARED.flatMap((p) => (["none", "admin"] as Cookie[]).map((c) => [p, c])))(
      "passes %s (cookie: %s)",
      (path, cookie) => expect(at(ADMIN, path, cookie as Cookie).status).toBe(200),
    );

    it("sends / to the sign-in without a cookie, to /painel with one", () => {
      expectRedirect(at(ADMIN, "/"), "/painel/entrar");
      expectRedirect(at(ADMIN, "/", "trainer"), "/painel/entrar");
      expectRedirect(at(ADMIN, "/", "admin"), "/painel");
    });

    it.each(["none", "trainer", "admin"] as Cookie[])(
      "renders /painel/entrar whatever the cookie (%s): a stale cookie can't loop",
      (cookie) => expectRendered(at(ADMIN, "/painel/entrar?motivo=expirou", cookie)),
    );

    it.each(["/painel", "/painel/usuarios/1"])(
      "sends a cookie-less %s to the sign-in with itself as redirect",
      (path) => {
        expectRedirect(at(ADMIN, `${path}?aba=x`), `/painel/entrar?redirect=${encodeURIComponent(`${path}?aba=x`)}`);
      },
    );

    it("counts a trainer cookie as no cookie", () => {
      expectRedirect(at(ADMIN, "/painel/usuarios/1", "trainer"), "/painel/entrar?redirect=%2Fpainel%2Fusuarios%2F1");
    });

    it.each(["/painel", "/painel/usuarios/1"])("renders %s with the admin cookie", (path) => {
      expectRendered(at(ADMIN, path, "admin"));
    });

    it("reads the __Host- cookie in production, not the dev name", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
      vi.stubEnv("ADMIN_HOST", "admin.vertice.fit");
      const host = "ADMIN.vertice.fit:443";
      const withCookie = (cookie: string) =>
        proxy(new NextRequest(`https://${host}/painel`, { headers: { Host: host, Cookie: cookie } }));
      expectRendered(withCookie("__Host-vertice_admin=jwt"));
      expectRedirect(withCookie("vertice_admin=jwt"), "/painel/entrar?redirect=%2Fpainel");
      expectNotFound(proxy(new NextRequest(`https://${host}/login`, { headers: { Host: host } })));
    });
  });

  describe("trainer hosts", () => {
    it.each(TRAINER_HOSTS.flatMap((h) => ["/painel", "/painel/entrar", "/painel/usuarios/1"].flatMap((p) => (["none", "admin", "trainer"] as Cookie[]).map((c) => [h, p, c]))))(
      "%s 404s %s (cookie: %s)",
      (host, path, cookie) => expectNotFound(at(host, path, cookie as Cookie)),
    );

    it.each(TRAINER_HOSTS.flatMap((h) => SHARED.map((p) => [h, p])))("%s passes %s", (host, path) => {
      expect(at(host, path).status).toBe(200);
    });

    it.each(TRAINER_HOSTS)("%s keeps today's table", (host) => {
      expectRedirect(at(host, "/dashboard"), "/login?redirect=%2Fdashboard");
      expectRendered(at(host, "/dashboard", "trainer"));
      expectRedirect(at(host, "/dashboard", "admin"), "/login?redirect=%2Fdashboard");
      expectRendered(at(host, "/login"));
      expectRedirect(at(host, "/login", "trainer"), "/dashboard");
      expectRendered(at(host, "/termos"));
      expectRendered(at(host, "/definir-senha"));
      expect(at(host, "/baixar-app").status).toBe(200);
      expect(at(host, "/").status).toBe(200);
    });

    it("is every host in production with ADMIN_HOST unset, the admin hostname included", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
      vi.stubEnv("ADMIN_HOST", "");
      for (const host of ["admin.vertice.fit", "www.vertice.fit", "admin.localhost"]) {
        expectNotFound(at(host, "/painel/entrar"));
        expectRedirect(at(host, "/alunos/1"), "/login?redirect=%2Falunos%2F1");
      }
    });
  });
});

describe("proxy: Content-Security-Policy", () => {
  function nonceOf(policy: string | null) {
    return policy?.match(/'nonce-([^']+)'/)?.[1];
  }

  it("sends a report-only CSP with a fresh nonce, and hands the same policy to the renderer", () => {
    const res = visit("/login");
    const policy = res.headers.get(CSP_HEADER);
    expect(CSP_HEADER).toBe("Content-Security-Policy-Report-Only");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(nonceOf(policy)).toBeTruthy();
    // NextResponse.next({ request: { headers } }) passes request overrides as x-middleware-request-*.
    expect(res.headers.get(`x-middleware-request-${CSP_HEADER.toLowerCase()}`)).toBe(policy);
    expect(nonceOf(visit("/login").headers.get(CSP_HEADER))).not.toBe(nonceOf(policy));
  });

  it("drops the dev-only sources in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    const policy = visit("/login").headers.get(CSP_HEADER)!;
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toMatch(/style-src 'self' 'nonce-/);
  });

  it("allows next dev's eval outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(visit("/login").headers.get(CSP_HEADER)).toContain("'unsafe-eval'");
  });
});
