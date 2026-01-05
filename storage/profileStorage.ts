// storage/profileStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Roles:
 * - worker: ofrece servicios (oficio, disponibilidad, mostrarme)
 * - seeker: busca trabajadores (preferencias/lo que busca)
 */
export type Role = "worker" | "seeker";

export type Availability = ("manana" | "tarde" | "noche" | "fin")[];

/**
 * ✅ BasicProfile ahora soporta ubicación ADMINISTRATIVA:
 * - department + municipality (obligatorio)
 * - sector/colonia (opcional)
 *
 * Nota: dejamos `zone` por compatibilidad (legacy), pero para el nuevo flujo
 * lo ideal es usar department/municipality + sector.
 */
export type BasicProfile = {
  firstName: string;
  lastName: string;

  // legacy / compat (antes era texto libre). Puedes usarlo como "zona vieja".
  zone: string;

  // ✅ nuevos (obligatorios)
  departmentId: string;
  departmentName: string;
  municipalityId: string;
  municipalityName: string;

  // ✅ opcional
  sector: string;

  // (por ahora opcional, luego lo vuelves obligatorio cuando verifiques teléfono)
  whatsapp: string;

  // ✅ Foto de perfil (confianza)
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
  preferredZones: string[]; // zonas donde busca (legacy/extra)
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

    // ✅ label listo para UI
    zoneLabel: string;
    zoneLabelNormalized: string;

    // legacy
    zoneNormalized: string;

    // ✅ nuevos
    departmentId: string;
    municipalityId: string;
    departmentNormalized: string;
    municipalityNormalized: string;

    workNormalized: string;
    lookingForNormalized: string;
  };

  // meta
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/** ===== Keys ===== */
const KEY_PROFILE = "chamba_profile_v2";

/**
 * ✅ Flag fuerte: perfil completado
 * - se auto-calcula al guardar (según rol)
 */
export const KEY_PROFILE_COMPLETED = "chamba_profile_completed"; // "1"

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
    return JSON.parse(raw) as T;
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

/** ✅ Texto oficial de ubicación para mostrar en UI */
export function getZoneLabel(b: BasicProfile) {
  const sector = String(b.sector ?? "").trim();
  const muni = String(b.municipalityName ?? "").trim();
  const dep = String(b.departmentName ?? "").trim();
  const legacy = String(b.zone ?? "").trim();

  // Nuevo formato recomendado
  if (muni && dep) {
    return sector ? `${sector} · ${muni}, ${dep}` : `${muni}, ${dep}`;
  }

  // Fallback a legacy
  return legacy;
}

function buildIndex(p: Profile) {
  const fullName = `${p.basic.firstName} ${p.basic.lastName}`.trim();
  const zoneLabel = getZoneLabel(p.basic);

  return {
    fullName,

    zoneLabel,
    zoneLabelNormalized: norm(zoneLabel),

    // legacy
    zoneNormalized: norm(p.basic.zone),

    // ✅ nuevos
    departmentId: p.basic.departmentId || "",
    municipalityId: p.basic.municipalityId || "",
    departmentNormalized: norm(p.basic.departmentName),
    municipalityNormalized: norm(p.basic.municipalityName),

    workNormalized: norm(p.worker.work),
    lookingForNormalized: norm(p.seeker.lookingFor),
  };
}

/** ===== Defaults ===== */
function defaultBasic(): BasicProfile {
  return {
    firstName: "",
    lastName: "",
    zone: "",
    departmentId: "",
    departmentName: "",
    municipalityId: "",
    municipalityName: "",
    sector: "",
    whatsapp: "",
    photoUri: undefined,
  };
}

function defaultWorker(): WorkerProfile {
  return { work: "", availability: [], isAvailable: true };
}

function defaultSeeker(): SeekerProfile {
  return { lookingFor: "", preferredZones: [], availabilityNeeded: [] };
}

function ensureBlocks(p: Profile): Profile {
  const fixed: Profile = {
    ...p,
    basic: p.basic ?? defaultBasic(),
    worker: p.worker ?? defaultWorker(),
    seeker: p.seeker ?? defaultSeeker(),
  };
  fixed.index = buildIndex(fixed);
  return fixed;
}

export function createEmptyProfile(role: Role = "worker"): Profile {
  const t = nowISO();

  const profile: Profile = {
    schemaVersion: 2,
    role,

    basic: defaultBasic(),
    worker: defaultWorker(),
    seeker: defaultSeeker(),

    index: {
      fullName: "",
      zoneLabel: "",
      zoneLabelNormalized: "",
      zoneNormalized: "",
      departmentId: "",
      municipalityId: "",
      departmentNormalized: "",
      municipalityNormalized: "",
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

  // ✅ obligatorios
  const dep = p.basic.departmentId.trim();
  const mun = p.basic.municipalityId.trim();

  // ✅ WhatsApp por ahora NO es obligatorio
  return !!fn && !!ln && !!dep && !!mun;
}

/** ✅ helper: foto de perfil */
export function hasProfilePhoto(p: Profile | null) {
  return !!p?.basic?.photoUri?.trim();
}

/**
 * ✅ Worker completo ahora EXIGE foto real de perfil
 */
export function isWorkerComplete(p: Profile | null) {
  if (!p) return false;
  if (!isBasicComplete(p)) return false;

  const work = p.worker.work.trim();
  if (!work) return false;

  // ✅ Foto obligatoria para confianza
  if (!hasProfilePhoto(p)) return false;

  return true;
}

export function isSeekerComplete(p: Profile | null) {
  if (!p) return false;
  if (!isBasicComplete(p)) return false;

  const lookingFor = p.seeker.lookingFor.trim();
  return !!lookingFor;
}

/** ✅ Perfil completo según rol */
export function isProfileComplete(p: Profile | null) {
  if (!p) return false;
  return p.role === "worker" ? isWorkerComplete(p) : isSeekerComplete(p);
}

/** ===== Flag de completado (para BOOT) ===== */
export async function setProfileCompleted(value: boolean) {
  if (value) {
    await AsyncStorage.setItem(KEY_PROFILE_COMPLETED, "1");
  } else {
    await AsyncStorage.removeItem(KEY_PROFILE_COMPLETED);
  }
}

export async function getProfileCompleted(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_PROFILE_COMPLETED);
  return v === "1";
}

/**
 * ✅ Mantiene KEY_PROFILE_COMPLETED consistente con el estado real del perfil.
 */
export async function refreshProfileCompleted(p: Profile | null) {
  await setProfileCompleted(isProfileComplete(p));
}

/** ===== Public API ===== */
export async function getProfile(): Promise<Profile | null> {
  // 1) v2
  const rawV2 = await AsyncStorage.getItem(KEY_PROFILE);
  const parsedV2 = safeParse<Profile>(rawV2);
  if (parsedV2 && parsedV2.schemaVersion === 2) return ensureBlocks(parsedV2);

  // 2) migrar desde v1 unificado
  const migratedFromV1 = await migrateV1ToV2();
  if (migratedFromV1) return ensureBlocks(migratedFromV1);

  // 3) migrar desde legacy keys viejas
  const migratedLegacy = await migrateLegacyToV2();
  if (migratedLegacy) return ensureBlocks(migratedLegacy);

  return null;
}

/** ✅ NUEVO: leer rol rápido para Tabs/Boot */
export async function getRole(): Promise<Role> {
  const p = await getProfile();
  return p?.role === "seeker" ? "seeker" : "worker";
}

/** ✅ NUEVO: same pero nunca truena */
export async function getRoleSafe(): Promise<Role> {
  try {
    return await getRole();
  } catch {
    return "worker";
  }
}

async function saveProfileInternal(next: Profile): Promise<Profile> {
  const ensured = ensureBlocks(next);

  const fixed: Profile = {
    ...ensured,
    updatedAt: nowISO(),
  };

  // ✅ index basado en el perfil ya fixed
  fixed.index = buildIndex(fixed);

  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(fixed));

  // ✅ actualiza flag fuerte automáticamente
  await refreshProfileCompleted(fixed);

  return fixed;
}

/**
 * Upsert por bloques (pro)
 */
export async function upsertBasic(partial: Partial<BasicProfile>) {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const next: Profile = ensureBlocks({
    ...current,
    basic: { ...current.basic, ...partial },
  });
  return saveProfileInternal(next);
}

export async function upsertWorker(partial: Partial<WorkerProfile>) {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const next: Profile = ensureBlocks({
    ...current,
    worker: { ...current.worker, ...partial },
  });
  return saveProfileInternal(next);
}

export async function upsertSeeker(partial: Partial<SeekerProfile>) {
  const current = (await getProfile()) ?? createEmptyProfile("seeker");
  const next: Profile = ensureBlocks({
    ...current,
    seeker: { ...current.seeker, ...partial },
  });
  return saveProfileInternal(next);
}

/**
 * ✅ Set role simple (no UI fancy)
 */
export async function setRole(role: Role) {
  const current = (await getProfile()) ?? createEmptyProfile(role);
  const next: Profile = ensureBlocks({ ...current, role });
  return saveProfileInternal(next);
}

/**
 * ✅ Switch role PRO:
 * - no borra nada
 * - asegura que existan worker/seeker
 * - si cambia a seeker y está vacío lookingFor, le ponemos suggestion desde worker.work (solo si existe)
 */
export async function switchRole(nextRole: Role) {
  const current = (await getProfile()) ?? createEmptyProfile(nextRole);
  const ensured = ensureBlocks(current);

  const next: Profile = {
    ...ensured,
    role: nextRole,
    updatedAt: nowISO(),
  };

  // UX: si pasa a seeker y no tiene lookingFor, sugerimos con work (si hay)
  if (nextRole === "seeker") {
    const lf = next.seeker.lookingFor.trim();
    if (!lf) {
      const maybe = next.worker.work.trim();
      if (maybe) next.seeker.lookingFor = maybe;
    }
  }

  // UX: si pasa a worker y no tiene work, sugerimos con lookingFor (si hay)
  if (nextRole === "worker") {
    const w = next.worker.work.trim();
    if (!w) {
      const maybe = next.seeker.lookingFor.trim();
      if (maybe) next.worker.work = maybe;
    }
  }

  return saveProfileInternal(next);
}

/** ✅ NUEVO: toggle helper (por si lo quieres en UI) */
export async function toggleRole() {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const nextRole: Role = current.role === "worker" ? "seeker" : "worker";
  return switchRole(nextRole);
}

export async function setAvailability(isAvailable: boolean) {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const ensured = ensureBlocks(current);

  const next: Profile = {
    ...ensured,
    worker: { ...ensured.worker, isAvailable },
  };
  return saveProfileInternal(next);
}

/** ✅ Foto: set / remove */
export async function setProfilePhoto(photoUri: string) {
  const uri = String(photoUri ?? "").trim();
  if (!uri) throw new Error("photoUri vacío");

  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const ensured = ensureBlocks(current);

  const next: Profile = {
    ...ensured,
    basic: { ...ensured.basic, photoUri: uri },
  };
  return saveProfileInternal(next);
}

export async function removeProfilePhoto() {
  const current = (await getProfile()) ?? createEmptyProfile("worker");
  const ensured = ensureBlocks(current);

  const next: Profile = {
    ...ensured,
    basic: { ...ensured.basic, photoUri: undefined },
  };
  return saveProfileInternal(next);
}

export async function resetProfile() {
  await AsyncStorage.multiRemove([
    KEY_PROFILE,
    KEY_PROFILE_COMPLETED,
    KEY_PROFILE_V1,
    KEY_BASIC,
    KEY_WORKER,
    KEY_AVAILABLE,
    KEY_ROLE,
  ]);
}

/** ====== MIGRATIONS ====== */
async function migrateV1ToV2(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(KEY_PROFILE_V1);
  const v1 = safeParse<any>(raw);
  if (!v1 || typeof v1 !== "object") return null;

  const role: Role = v1.role === "seeker" ? "seeker" : "worker";
  const p = createEmptyProfile(role);

  p.basic.firstName = String(v1.firstName ?? "");
  p.basic.lastName = String(v1.lastName ?? "");

  // legacy (texto libre)
  p.basic.zone = String(v1.zone ?? "");

  // ✅ nuevos quedan vacíos (deben completarse en UI)
  p.basic.departmentId = "";
  p.basic.departmentName = "";
  p.basic.municipalityId = "";
  p.basic.municipalityName = "";
  p.basic.sector = "";

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
  await refreshProfileCompleted(p);
  return p;
}

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

  // legacy
  p.basic.zone = zone;

  // ✅ nuevos vacíos
  p.basic.departmentId = "";
  p.basic.departmentName = "";
  p.basic.municipalityId = "";
  p.basic.municipalityName = "";
  p.basic.sector = "";

  p.basic.whatsapp = whatsapp;

  p.worker.work = work;
  p.worker.isAvailable = isAvailable;

  // si era seeker, al menos guardamos lo que “busca”
  p.seeker.lookingFor = role === "seeker" ? work : "";

  p.index = buildIndex(p);

  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(p));
  await refreshProfileCompleted(p);
  return p;
}
