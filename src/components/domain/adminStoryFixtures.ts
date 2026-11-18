import type {
  AdminClientProfile,
  AdminDashboard,
  AdminDirectoryUser,
  AdminTrainerProfile,
  AdminWeeklySignups,
} from "@/lib/api/types";

/** The 12 weeks of frame `izEoo` (25/08 to 10/11), oldest first. */
export const adminWeeklySignups: AdminWeeklySignups[] = [
  ["2026-08-25", 4, 22],
  ["2026-09-01", 6, 31],
  ["2026-09-08", 3, 27],
  ["2026-09-15", 7, 35],
  ["2026-09-22", 5, 29],
  ["2026-09-29", 8, 41],
  ["2026-10-06", 6, 38],
  ["2026-10-13", 9, 46],
  ["2026-10-20", 5, 33],
  ["2026-10-27", 7, 44],
  ["2026-11-03", 8, 52],
  ["2026-11-10", 6, 41],
].map(([weekStart, trainers, clients]) => ({
  weekStart: weekStart as string,
  trainers: trainers as number,
  clients: clients as number,
}));

/** `GET /admin/dashboard` as frame `En3Ju` shows it. */
export const adminDashboard: AdminDashboard = {
  totals: { trainers: 128, clients: 1942 },
  active: { trainers7d: 94, clients7d: 1114, trainers30d: 112, clients30d: 1559 },
  completedWorkouts: { last7d: 3482, last30d: 14106 },
  weeklySignups: adminWeeklySignups,
};

function directoryUser(
  id: number,
  name: string,
  role: AdminDirectoryUser["role"],
  extra: Partial<AdminDirectoryUser> = {},
): AdminDirectoryUser {
  return {
    id,
    name,
    email: `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(" ", ".")}@email.com`,
    role,
    suspended: false,
    createdAt: "2026-03-14T13:00:00Z",
    lastActiveOn: "2026-11-17",
    currentTrainer: null,
    currentClientCount: role === "TRAINER" ? 0 : null,
    ...extra,
  };
}

/** One page of `GET /admin/users` as frame `ETgH1` shows it. */
export const adminDirectoryUsers: AdminDirectoryUser[] = [
  directoryUser(1, "Ana Ribeiro", "TRAINER", { currentClientCount: 12 }),
  directoryUser(2, "Marina Costa", "CLIENT", { currentTrainer: { id: 1, name: "Ana Ribeiro" } }),
  directoryUser(3, "Rafael Torres", "TRAINER", { currentClientCount: 4, suspended: true }),
  directoryUser(4, "Diego Martins", "CLIENT", { currentTrainer: { id: 3, name: "Rafael Torres" } }),
  directoryUser(5, "Júlia Prado", "CLIENT", { suspended: true }),
  directoryUser(6, "Bruno Almeida", "TRAINER", { currentClientCount: 27 }),
  directoryUser(7, "Camila Souza", "CLIENT", { currentTrainer: { id: 6, name: "Bruno Almeida" } }),
  directoryUser(8, "Lucas Ferreira", "CLIENT"),
  directoryUser(9, "Patrícia Nunes", "TRAINER", { currentClientCount: 1 }),
  directoryUser(10, "Felipe Rocha", "CLIENT", { currentTrainer: { id: 1, name: "Ana Ribeiro" } }),
];

const relationship = (
  id: number,
  name: string,
  role: "TRAINER" | "CLIENT",
  startedAt: string,
  endedAt: string | null = null,
) => ({ user: { id, name, role }, startedAt, endedAt, suspended: false });

/** `GET /admin/users/2`: frame `M3SiW`. */
export const adminClientProfile: AdminClientProfile = {
  id: 2,
  name: "Marina Costa",
  email: "marina.costa@email.com",
  role: "CLIENT",
  cpf: "***.***.***-01",
  suspended: false,
  suspendedAt: null,
  createdAt: "2026-03-14T13:00:00Z",
  lastActiveOn: "2026-11-17",
  currentTrainer: relationship(1, "Ana Ribeiro", "TRAINER", "2026-06-02T12:00:00Z"),
  pastTrainers: [
    relationship(3, "Rafael Torres", "TRAINER", "2026-01-10T12:00:00Z", "2026-06-01T12:00:00Z"),
    relationship(6, "Bruno Almeida", "TRAINER", "2025-08-03T12:00:00Z", "2026-01-09T12:00:00Z"),
  ],
  planCount: 6,
  completedWorkoutCount: 148,
  firstAccess: { pending: false, lastSentAt: null, lastSendFailed: false },
};

/** `GET /admin/users/1`: frame `eUOyS`, 12 current clients and 3 former ones. */
export const adminTrainerProfile: AdminTrainerProfile = {
  id: 1,
  name: "Ana Ribeiro",
  email: "ana.ribeiro@email.com",
  role: "TRAINER",
  cpf: "***.***.***-25",
  suspended: false,
  suspendedAt: null,
  createdAt: "2026-02-05T13:00:00Z",
  lastActiveOn: "2026-11-17",
  cref: "012345-G/SP",
  whatsapp: "(11) 91234-5678",
  instagram: "@ana.treina",
  currentClients: [
    "Marina Costa",
    "Felipe Rocha",
    "Larissa Dias",
    "Gustavo Lima",
    "Beatriz Ramos",
    "Caio Mendes",
    "Daniela Faria",
    "Eduardo Pires",
    "Fernanda Luz",
    "Gabriel Melo",
    "Helena Duarte",
    "Igor Barros",
  ].map((name, i) => relationship(100 + i, name, "CLIENT", `2026-0${(i % 9) + 1}-02T12:00:00Z`)),
  formerClients: [
    relationship(200, "Pedro Henrique", "CLIENT", "2026-02-12T12:00:00Z", "2026-09-30T12:00:00Z"),
    relationship(201, "Sofia Martins", "CLIENT", "2026-02-20T12:00:00Z", "2026-07-15T12:00:00Z"),
    relationship(202, "Thiago Costa", "CLIENT", "2026-03-01T12:00:00Z", "2026-05-02T12:00:00Z"),
  ],
  planCount: 84,
  workoutCount: 312,
  privateExerciseCount: 9,
};
