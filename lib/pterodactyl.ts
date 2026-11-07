function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Environment variable ${name} belum diisi`);
  return v;
}

async function ptero(path: string, init: RequestInit = {}): Promise<any> {
  const base = env("PTERO_URL").replace(/\/$/, "");
  const res = await fetch(`${base}/api/application${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env("PTERO_API_KEY")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data?.errors)
      ? data.errors.map((e: { detail?: string }) => e.detail).filter(Boolean).join("; ")
      : "";
    throw new Error(`Pterodactyl ${res.status}: ${detail || "permintaan gagal"}`);
  }
  return data;
}

function parseEnvironment(): Record<string, string> {
  const raw = process.env.PTERO_ENVIRONMENT;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("PTERO_ENVIRONMENT harus berupa JSON yang valid");
  }
}

export async function findUserIdByEmail(email: string): Promise<number | null> {
  const d = await ptero(`/users?filter[email]=${encodeURIComponent(email)}`);
  const first = d?.data?.[0]?.attributes;
  return typeof first?.id === "number" ? first.id : null;
}

export async function createUser(email: string, username: string, password: string): Promise<number> {
  const d = await ptero("/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      username,
      first_name: "Customer",
      last_name: "Pelanggan",
      password,
      language: "en",
    }),
  });
  return d.attributes.id as number;
}

export async function createServer(opts: {
  userId: number;
  name: string;
  ram: number; // GB
  disk: number; // GB
  cpu: number; // %
}): Promise<number> {
  const d = await ptero("/servers", {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      user: opts.userId,
      egg: Number(env("PTERO_EGG_ID")),
      docker_image: env("PTERO_DOCKER_IMAGE"),
      startup: env("PTERO_STARTUP"),
      environment: parseEnvironment(),
      limits: {
        memory: opts.ram * 1024,
        swap: 0,
        disk: opts.disk * 1024,
        io: 500,
        cpu: opts.cpu,
      },
      feature_limits: { databases: 0, allocations: 1, backups: 2 },
      deploy: {
        locations: [Number(env("PTERO_LOCATION_ID"))],
        dedicated_ip: false,
        port_range: [],
      },
    }),
  });
  return d.attributes.id as number;
}
