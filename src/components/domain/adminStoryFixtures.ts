import type {
  AdminCatalogExercise,
  AdminMostUsedExercise,
  AdminActionEntry,
  AdminClientProfile,
  AdminDashboard,
  AdminDirectoryUser,
  AdminTrainerProfile,
  AdminWeeklySignups,
  FeatureFlag,
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

const carla = { id: 9, name: "Carla Mendes", role: "ADMIN" as const };
const joao = { id: 10, name: "João Pires", role: "ADMIN" as const };

function historyEntry(id: number, overrides: Partial<AdminActionEntry>): AdminActionEntry {
  return {
    id,
    admin: carla,
    action: "VIEW_USER_PROFILE",
    targetUser: null,
    relatedUser: null,
    targetExerciseId: null,
    targetMuscleGroupId: null,
    subjectLabel: null,
    reason: null,
    createdAt: "2026-11-17T12:31:00Z",
    ...overrides,
  };
}

/** `GET /admin/actions/admins`. */
export const adminActionAdmins = { admins: [carla, joao] };

/** One page of `GET /admin/actions` as frame `TExWT` shows it, newest first. */
export const adminHistory: AdminActionEntry[] = [
  historyEntry(6, {
    action: "SUSPEND_USER",
    targetUser: { id: 3, name: "Rafael Torres", role: "TRAINER" },
    reason: "Denúncia de cobrança indevida em análise pelo suporte (ticket #4821).",
  }),
  historyEntry(5, {
    action: "SEND_PASSWORD_RESET_EMAIL",
    targetUser: { id: 1, name: "Ana Ribeiro", role: "TRAINER" },
    createdAt: "2026-11-17T12:12:00Z",
  }),
  historyEntry(4, {
    admin: joao,
    action: "PROMOTE_EXERCISE",
    targetUser: { id: 1, name: "Ana Ribeiro", role: "TRAINER" },
    targetExerciseId: 55,
    subjectLabel: "Elevação pélvica com pausa",
    createdAt: "2026-11-16T21:40:00Z",
  }),
  historyEntry(3, {
    admin: joao,
    action: "END_RELATIONSHIP",
    targetUser: { id: 2, name: "Marina Costa", role: "CLIENT" },
    relatedUser: { id: 3, name: "Rafael Torres", role: "TRAINER" },
    createdAt: "2026-11-16T18:02:00Z",
  }),
  historyEntry(2, {
    action: "VIEW_USER_PROFILE",
    targetUser: { id: 77, name: "Usuário removido", role: "CLIENT" },
    createdAt: "2026-11-15T13:00:00Z",
  }),
  historyEntry(1, { action: "CHANGE_OWN_PASSWORD", createdAt: "2026-11-14T11:00:00Z" }),
];

const group = (id: number, name: string) => ({ id, name });

/** The muscle groups of `D2koD`, in list order. */
export const adminMuscleGroups = [
  group(1, "Peito"),
  group(2, "Costas"),
  group(3, "Ombros"),
  group(4, "Bíceps"),
  group(5, "Tríceps"),
  group(6, "Quadríceps"),
  group(7, "Posteriores de coxa"),
  group(8, "Glúteos"),
  group(9, "Abdômen"),
];

const groupsNamed = (...names: string[]) => names.map((name) => adminMuscleGroups.find((g) => g.name === name)!);

function catalogExercise(
  id: number,
  name: string,
  groups: string[],
  owner: AdminCatalogExercise["owner"] = null,
  extra: Partial<AdminCatalogExercise> = {},
): AdminCatalogExercise {
  return {
    id,
    name,
    description: "",
    videoUrl: "",
    muscleGroups: groupsNamed(...groups),
    isStarter: owner === null,
    owner,
    ...extra,
  };
}

/** The "Catálogo inicial" rows of `c53jx`. */
export const adminStarterExercises: AdminCatalogExercise[] = [
  catalogExercise(101, "Supino reto com barra", ["Peito", "Tríceps"]),
  catalogExercise(102, "Agachamento livre", ["Quadríceps", "Glúteos"], null, {
    description: "Pés na largura dos ombros, desça até a coxa ficar paralela ao chão mantendo a coluna neutra.",
    videoUrl: "https://youtube.com/watch?v=aclHkVaku9U",
  }),
  catalogExercise(103, "Puxada alta na polia", ["Costas", "Bíceps"]),
  catalogExercise(104, "Leg press 45°", ["Quadríceps", "Glúteos"]),
  catalogExercise(105, "Remada curvada com barra", ["Costas"]),
  catalogExercise(106, "Desenvolvimento com halteres", ["Ombros", "Tríceps"]),
  catalogExercise(107, "Rosca direta com barra", ["Bíceps"]),
  catalogExercise(108, "Prancha abdominal", ["Abdômen"]),
];

/** The "Exercícios dos treinadores" rows of `iiou2`. */
export const adminPrivateExercises: AdminCatalogExercise[] = [
  catalogExercise(201, "Elevação pélvica com pausa", ["Glúteos", "Posteriores de coxa"], { id: 1, name: "Ana Ribeiro" }, {
    description: "Pausa de 2 s no topo, contraindo os glúteos. Banco na altura das escápulas.",
    videoUrl: "https://youtube.com/watch?v=xDmFkJxPzeM",
  }),
  catalogExercise(202, "Agachamento búlgaro no smith", ["Quadríceps", "Glúteos"], { id: 3, name: "Rafael Torres" }),
  catalogExercise(203, "Remada serrote com apoio", ["Costas"], { id: 5, name: "Bruno Almeida" }),
];

/** The first rows of `QdD67` ("Exercícios mais usados" in `En3Ju`), one of them a trainer's. */
export const adminMostUsed: AdminMostUsedExercise[] = [
  { exercise: adminStarterExercises[0], workoutCount: 412 },
  { exercise: adminStarterExercises[1], workoutCount: 398 },
  { exercise: adminStarterExercises[2], workoutCount: 351 },
  { exercise: adminStarterExercises[3], workoutCount: 330 },
  { exercise: adminStarterExercises[4], workoutCount: 297 },
  { exercise: adminPrivateExercises[0], workoutCount: 241 },
  { exercise: adminStarterExercises[5], workoutCount: 233 },
  { exercise: adminStarterExercises[6], workoutCount: 219 },
  { exercise: adminStarterExercises[7], workoutCount: 205 },
  { exercise: adminPrivateExercises[1], workoutCount: 188 },
];

/**
 * The two seeded flags (feature-flags spec §5; frames `ufeI3`, `gJQrD`), with user settings for the
 * detail stories. Fresh copies each call: the flag stories' fetch stub mutates them.
 */
export function adminFeatureFlags(): FeatureFlag[] {
  return [
    {
      key: "AI_ASSISTANT_ENABLED",
      description:
        "Assistente de IA no editor de treino. A configuração por usuário vale para o treinador (o número é o do treinador).",
      enabled: true,
      users: [
        { userId: 1, enabled: true },
        { userId: 57, enabled: false },
        { userId: 1234, enabled: true },
      ],
    },
    {
      key: "FIRST_ACCESS_EMAIL_ENABLED",
      description:
        "Envio do e-mail de primeiro acesso ao aluno, no lugar do link entregue pelo treinador. A configuração por usuário vale para o treinador.",
      enabled: false,
      users: [],
    },
  ];
}
