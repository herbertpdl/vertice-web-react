import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./bounds";
import { exerciseSchema } from "./exercises";
import { exerciseSetSchema, workoutExerciseSchema } from "./exerciseSets";
import { studentSchema, editStudentSchema } from "./students";
import { trainingPlanSchema } from "./trainingPlans";
import { workoutSchema } from "./workouts";
import { profileSchema } from "./profile";
import { registerSchema } from "./auth";

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe("safeHttpUrl", () => {
  it("passes http and https URLs through", () => {
    expect(safeHttpUrl("https://example.com/v")).toBe("https://example.com/v");
    expect(safeHttpUrl("http://example.com/v")).toBe("http://example.com/v");
  });

  it.each(["javascript:alert(1)", "data:text/html,<b>x</b>", "ftp://x.com/a", "//example.com", "not a url", "", "  https://a.com", "JavaScript:alert(1)"])(
    "refuses %j",
    (url) => expect(safeHttpUrl(url)).toBeNull(),
  );

  it("refuses null and undefined", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});

describe("exerciseSchema bounds", () => {
  const valid = { name: "Remada", muscleGroupIds: [1], description: "", videoUrl: "" };

  it("accepts only http(s) video URLs", () => {
    expect(ok(exerciseSchema, { ...valid, videoUrl: "https://example.com/a" })).toBe(true);
    expect(ok(exerciseSchema, { ...valid, videoUrl: "http://example.com/a" })).toBe(true);
    expect(ok(exerciseSchema, { ...valid, videoUrl: "javascript:alert(1)" })).toBe(false);
    expect(ok(exerciseSchema, { ...valid, videoUrl: "data:text/html;base64,AAAA" })).toBe(false);
    expect(ok(exerciseSchema, { ...valid, videoUrl: "ftp://example.com/a" })).toBe(false);
    // The API's pattern is case-sensitive, so the form must refuse these too.
    expect(ok(exerciseSchema, { ...valid, videoUrl: "HTTP://a.com" })).toBe(false);
    expect(ok(exerciseSchema, { ...valid, videoUrl: "HTTPS://x" })).toBe(false);
  });

  it("caps lengths at the API's columns", () => {
    expect(ok(exerciseSchema, { ...valid, name: "a".repeat(255) })).toBe(true);
    expect(ok(exerciseSchema, { ...valid, name: "a".repeat(256) })).toBe(false);
    expect(ok(exerciseSchema, { ...valid, description: "a".repeat(256) })).toBe(false);
    expect(ok(exerciseSchema, { ...valid, videoUrl: `https://a.com/${"a".repeat(486)}` })).toBe(true);
    expect(ok(exerciseSchema, { ...valid, videoUrl: `https://a.com/${"a".repeat(487)}` })).toBe(false);
  });

  it("refuses a blank name and trims the accepted one", () => {
    expect(ok(exerciseSchema, { ...valid, name: "   " })).toBe(false);
    expect(exerciseSchema.parse({ ...valid, name: "  Remada  " }).name).toBe("Remada");
  });
});

describe("names, descriptions and emails", () => {
  it("refuses blank and over-long names", () => {
    expect(ok(workoutSchema, { name: "  ", dayOfWeek: "MONDAY" })).toBe(false);
    expect(ok(workoutSchema, { name: "a".repeat(256), dayOfWeek: "MONDAY" })).toBe(false);
    expect(ok(workoutSchema, { name: "a".repeat(255), dayOfWeek: "MONDAY" })).toBe(true);
  });

  it("bounds a plan's name and description", () => {
    const plan = { name: "Plano", description: "", startDate: "2026-01-01", endDate: "2026-02-01", level: "BEGINNER" };
    // The schema's lower bound is a parameter, so pin it rather than letting it track today.
    const schema = trainingPlanSchema("2026-01-01");
    expect(ok(schema, plan)).toBe(true);
    expect(ok(schema, { ...plan, name: " " })).toBe(false);
    expect(ok(schema, { ...plan, description: "a".repeat(256) })).toBe(false);
  });

  it("trims and lower-cases an email on create, and caps it at 255", () => {
    const student = { name: "Ana", email: "  Ana@Example.COM ", cpf: "529.982.247-25" };
    expect(studentSchema.parse(student).email).toBe("ana@example.com");
    const long = `${"a".repeat(251)}@b.co`; // 256 characters
    expect(ok(studentSchema, { ...student, email: long })).toBe(false);
    expect(ok(editStudentSchema, { name: "Ana", email: long, newCpf: "", removeCpf: false })).toBe(false);
  });

  it("applies the same rules to the profile and sign-up", () => {
    expect(profileSchema.parse({ name: " Ana ", email: " A@B.com", newCpf: "", cref: "" })).toMatchObject({
      name: "Ana",
      email: "a@b.com",
    });
    expect(ok(profileSchema, { name: "Ana", email: "a@b.com", newCpf: "", cref: "1".repeat(21) })).toBe(false);
    const register = {
      name: "Ana",
      email: "a@b.com",
      cpf: "529.982.247-25",
      cref: "",
      password: "12345678",
      confirmPassword: "12345678",
      terms: true,
    };
    expect(ok(registerSchema, register)).toBe(true);
    expect(ok(registerSchema, { ...register, name: "a".repeat(256) })).toBe(false);
    expect(ok(registerSchema, { ...register, cref: "1".repeat(21) })).toBe(false);
  });
});

describe("set and workout-exercise bounds", () => {
  const set = { setNumber: 1, strategy: "STRAIGHT" as const };

  it("starts orders and set numbers at 1 and caps them at 1000", () => {
    expect(ok(workoutExerciseSchema, { exerciseId: 1, order: 0, restSecondsBetweenSets: 60, notes: "" })).toBe(false);
    expect(ok(workoutExerciseSchema, { exerciseId: 1, order: 1, restSecondsBetweenSets: 60, notes: "" })).toBe(true);
    expect(ok(workoutExerciseSchema, { exerciseId: 1, order: 1001, restSecondsBetweenSets: 60, notes: "" })).toBe(false);
    expect(ok(exerciseSetSchema, { ...set, setNumber: 0 })).toBe(false);
    expect(ok(exerciseSetSchema, { ...set, setNumber: 1000 })).toBe(true);
    expect(ok(exerciseSetSchema, { ...set, setNumber: 1001 })).toBe(false);
  });

  it("bounds reps, duration and rest", () => {
    expect(ok(exerciseSetSchema, { ...set, reps: 1000, durationSeconds: 86400, restSeconds: 3600 })).toBe(true);
    expect(ok(exerciseSetSchema, { ...set, reps: 1001 })).toBe(false);
    expect(ok(exerciseSetSchema, { ...set, durationSeconds: 86401 })).toBe(false);
    expect(ok(exerciseSetSchema, { ...set, restSeconds: 3601 })).toBe(false);
    expect(ok(workoutExerciseSchema, { exerciseId: 1, order: 1, restSecondsBetweenSets: 3601, notes: "" })).toBe(false);
  });

  it.each([
    ["80", true],
    ["80.5", true],
    ["9999.99", true],
    ["", true],
    ["80,5", false],
    ["10000", false],
    ["80.555", false],
    ["-1", false],
    ["1e3", false],
    [".5", false],
  ])("weight %j -> %s", (weight, accepted) => {
    expect(ok(exerciseSetSchema, { ...set, weight })).toBe(accepted);
  });

  it.each([
    ["75", true],
    ["999.99", true],
    ["1000", false],
    ["75,5", false],
  ])("loadPercentage %j -> %s", (loadPercentage, accepted) => {
    expect(ok(exerciseSetSchema, { ...set, loadPercentage })).toBe(accepted);
  });

  it("caps notes at 255", () => {
    expect(ok(exerciseSetSchema, { ...set, notes: "a".repeat(256) })).toBe(false);
    expect(ok(workoutExerciseSchema, { exerciseId: 1, order: 1, restSecondsBetweenSets: 0, notes: "a".repeat(256) })).toBe(false);
  });
});
