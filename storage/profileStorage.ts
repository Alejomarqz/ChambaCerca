// storage/profileStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Roles:
 * - worker: ofrece servicios (oficio, disponibilidad, mostrarme)
 * - seeker: busca trabajadores (preferencias/lo que busca)
 */
export type Role = "worker" | "seeker";

export type Availability = ("manana" | "tarde" | "noche" | "fin")[];

export type BasicProfile = {
  firstName: string;
  lastName: string;
  zone: string;
  whatsapp: string;
  photoUri?: string;
};

export type WorkerProfile = {
  work: string; // oficio
  availability: Availability;
  isAvailable: boolean; // mostrarme / aparecer en búsqueda
};

export type SeekerProfile = {
  // lo mínimo para filtrar/buscar (puedes expandir luego)
  lookingFor: string; // oficio que busca
  preferredZones: string[]; // zonas donde busca
  availabilityNeeded: Availability; // horarios que le sirven
};

export type Profile = {
  // versionado para migraciones futuras
  schemaVersion: 2;

  // rol activo
  role: Role;

  // bloques
  basic: BasicProfile;
  worker: WorkerProfile;
  seeker: SeekerProfile;

  // index (para búsqueda rápida / consistencia)
  index: {
    fullName: string;
    zoneNormalized: string;
    workNormalized: string;
    lookingForNormalized: string;
  };

  // meta
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/** ===== Keys ===== */
const KEY_PROFILE = "chamba_profile_v2";

// Legacy keys (por si ya guardaste algo antes)
const KEY_PROFILE_V1 = "chamba_v1_profile";
const KEY_BASIC = "basic-profile";
const KEY_WORKER = "seeker-worker-profile";
const KEY_AVAILABLE = "worker_available";
const KEY_ROLE = "chamba_role";

/** ===== Utils ===== */
function nowISO() {
  return new Date().toISOString();
}

function safeParse<T = any>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function norm(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildIndex(p: Profile) {
  const fullName = `${p.basic.firstName} ${p.basic.lastName}`.trim();
  return {
    fullName,
    zoneNormalized: norm(p.basic.zone),
    workNormalized: norm(p.worker.work),
    lookingForNormalized: norm(p.seeker.lookingFor),
  };
}

/** ===== Defaults ===== */
export function createEmptyProfile(role: Role = "worker"): Profile {
  const t = nowISO();
  const profile: Profile = {
    schemaVersion: 2,
    role,

    basic: {
      firstName: "",
      lastName: "",
      zone: "",
      whatsapp: "",
      photoUri: undefined,
    },

    worker: {
      work: "",
      availability: [],
      isAvailable: true,
    },

    seeker: {
      lookingFor: "",
      preferredZones: [],
      availabilityNeeded: [],
    },

    index: {
      fullName: "",
      zoneNormalized: "",
      workNormalized: "",
      lookingForNormalized: "",
    },

    createdAt: t,
    updatedAt: t,
  };

  profile.index = buildIndex(profile);
  return profile;
}

/** ===== Completeness checks (según rol) ===== */
export function isBasicComplete(p: Profile | null) {
  if (!p) return false;
  const fn = p.basic.firstName.trim();
  const ln = p.basic.lastName.trim();
  const zone = p.basic.zone.trim();
  const wa = p.basic.whatsapp.trim();
  return !!fn && !!ln && !!zone && !!wa;
}

export function isWorkerComplete(p: Profile | null) {
  if (!p) return false;
  if (!isBasicComplete(p)) return false;
  const work = p.worker.work.trim();
  return !!work;
}

export function isSeekerComplete(p: Profile | null) {
  if (!p) return false;
  if (!isBasicComplete(p)) return false;
  const lookingFor = p.seeker.lookingFor.trim();
  // zonas/availability pueden ser opcionales, pero oficio que busca normalmente sí
  return !!lookingFor;
}

/** ===== Public API ===== */
export async function getProfile(): Promise<Profile | null> {
  // 1) v2
  const rawV2 = await AsyncStorage.getItem(KEY_PROFILE);
  const parsedV2 = safeParse<Profile>(rawV2);
  if (parsedV2 && parsedV2.schemaVersion === 2) return parsedV2;

  // 2) migrar desde v1 unificado
  const migratedFromV1 = await migrateV1ToV2();
  if (migratedFromV1) return migratedFromV1;

  // 3) migrar desde legacy keys viejas
  const migratedLegacy = await migrateLegacyToV2();
  if (migratedLegacy) return migratedLegacy;

  return null;
}

async function saveProfileInternal(next: Profile): Promise<Profile> {
  const fixed: Profile = {
    ...next,
    updatedAt: nowISO(),
    index: buildIndex(next),
  };
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(fixed));
  return fixed;
}

/**
 * Upsert por bloques (pro):
 * - basic-profile.tsx -> upsertBasic()
 * - worker-form.tsx -> upsertWorker()
 * - seeker-form.tsx -> upsertSeeker()
 */
export async function upsertBasic(partial: Partial<BasicProfile>) {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const next: Profile = {
    ...current,
    basic: { ...current.basic, ...partial },
  };
  return saveProfileInternal(next);
}

export async function upsertWorker(partial: Partial<WorkerProfile>) {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const next: Profile = {
    ...current,
    worker: { ...current.worker, ...partial },
  };
  return saveProfileInternal(next);
}

export async function upsertSeeker(partial: Partial<SeekerProfile>) {
  const current = (await getProfile()) ?? createEmptyProfile("seeker");
  const next: Profile = {
    ...current,
    seeker: { ...current.seeker, ...partial },
  };
  return saveProfileInternal(next);
}

export async function setRole(role: Role) {
  const current = (await getProfile()) ?? createEmptyProfile(role);
  const next: Profile = { ...current, role };
  return saveProfileInternal(next);
}

export async function setAvailability(isAvailable: boolean) {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const next: Profile = {
    ...current,
    worker: { ...current.worker, isAvailable },
  };
  return saveProfileInternal(next);
}

export async function resetProfile() {
  await AsyncStorage.multiRemove([
    KEY_PROFILE,
    KEY_PROFILE_V1,
    KEY_BASIC,
    KEY_WORKER,
    KEY_AVAILABLE,
    KEY_ROLE,
  ]);
}

/** ====== MIGRATIONS ====== */

/**
 * Migración: v1 (tu file actual) -> v2
 * v1 shape:
 * {
 *  role, firstName,lastName,zone,whatsapp,work,photoUri,isAvailable,updatedAt
 * }
 */
async function migrateV1ToV2(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(KEY_PROFILE_V1);
  const v1 = safeParse<any>(raw);
  if (!v1 || typeof v1 !== "object") return null;

  const role: Role = v1.role === "seeker" ? "seeker" : "worker";
  const p = createEmptyProfile(role);

  p.basic.firstName = String(v1.firstName ?? "");
  p.basic.lastName = String(v1.lastName ?? "");
  p.basic.zone = String(v1.zone ?? "");
  p.basic.whatsapp = String(v1.whatsapp ?? "");
  p.basic.photoUri = v1.photoUri ? String(v1.photoUri) : undefined;

  p.worker.work = String(v1.work ?? "");
  p.worker.isAvailable = typeof v1.isAvailable === "boolean" ? v1.isAvailable : true;

  // seeker defaults (no existía)
  p.seeker.lookingFor = role === "seeker" ? String(v1.work ?? "") : "";
  p.createdAt = String(v1.updatedAt ?? nowISO());
  p.updatedAt = nowISO();
  p.index = buildIndex(p);

  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(p));
  return p;
}

/**
 * Migración: legacy (basic-profile + seeker-worker-profile + worker_available + chamba_role) -> v2
 */
async function migrateLegacyToV2(): Promise<Profile | null> {
  const roleRaw = await AsyncStorage.getItem(KEY_ROLE);
  const role: Role = roleRaw === "seeker" ? "seeker" : "worker";

  const basic = safeParse<any>(await AsyncStorage.getItem(KEY_BASIC)) ?? {};
  const worker = safeParse<any>(await AsyncStorage.getItem(KEY_WORKER)) ?? {};

  const av = await AsyncStorage.getItem(KEY_AVAILABLE);
  const isAvailable = av === "0" ? false : true;

  const firstName = String(basic?.firstName ?? basic?.nombre ?? basic?.name ?? "");
  const lastName = String(basic?.lastName ?? basic?.apellido ?? basic?.lastname ?? "");
  const zone = String(basic?.zone ?? basic?.zona ?? basic?.area ?? "");
  const whatsapp = String(basic?.whatsapp ?? basic?.phone ?? basic?.telefono ?? "");

  const work = String(
    worker?.work ??
      worker?.oficio ??
      worker?.job ??
      worker?.occupation ??
      worker?.trabajo ??
      ""
  );

  const hasAnything = `${firstName}${lastName}${zone}${whatsapp}${work}`.trim().length > 0;
  if (!hasAnything) return null;

  const p = createEmptyProfile(role);
  p.basic.firstName = firstName;
  p.basic.lastName = lastName;
  p.basic.zone = zone;
  p.basic.whatsapp = whatsapp;

  p.worker.work = work;
  p.worker.isAvailable = isAvailable;

  // si era seeker, al menos guardamos lo que “busca”
  p.seeker.lookingFor = role === "seeker" ? work : "";

  p.index = buildIndex(p);

  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(p));
  return p;
}
