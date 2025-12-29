// storage/profileStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Role = "worker" | "seeker";

export type Profile = {
  role: Role;
  firstName: string;
  lastName: string;
  zone: string;
  whatsapp: string;
  work: string; // oficio (worker)
  photoUri?: string;
  isAvailable: boolean; // Mostrarme
  updatedAt: string; // ISO
};

const KEY_PROFILE = "chamba_v1_profile";

// Legacy keys (por si ya guardaste algo con el sistema anterior)
const KEY_BASIC = "basic-profile";
const KEY_WORKER = "seeker-worker-profile";
const KEY_AVAILABLE = "worker_available";
const KEY_ROLE = "chamba_role";

function safeParse<T = any>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function nowISO() {
  return new Date().toISOString();
}

export function isProfileComplete(p: Profile | null) {
  if (!p) return false;
  const fullName = `${p.firstName} ${p.lastName}`.trim();
  const zone = (p.zone || "").trim();
  const work = (p.work || "").trim();
  return !!fullName && !!zone && !!work;
}

export function createEmptyProfile(role: Role): Profile {
  return {
    role,
    firstName: "",
    lastName: "",
    zone: "",
    whatsapp: "",
    work: "",
    photoUri: undefined,
    isAvailable: true,
    updatedAt: nowISO(),
  };
}

export async function getProfile(): Promise<Profile | null> {
  // 1) Si ya existe el nuevo perfil único
  const raw = await AsyncStorage.getItem(KEY_PROFILE);
  const parsed = safeParse<Profile>(raw);
  if (parsed && typeof parsed === "object") return parsed;

  // 2) Si no existe, intentamos migrar desde legacy
  const migrated = await migrateLegacyToUnified();
  return migrated;
}

export async function saveProfile(partial: Partial<Profile>): Promise<Profile> {
  const current = (await getProfile()) ?? createEmptyProfile(partial.role ?? "worker");

  const next: Profile = {
    ...current,
    ...partial,
    updatedAt: nowISO(),
  };

  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(next));
  return next;
}

export async function setAvailability(isAvailable: boolean) {
  await saveProfile({ isAvailable });
}

export async function setRole(role: Role) {
  await saveProfile({ role });
}

export async function resetProfile() {
  await AsyncStorage.multiRemove([KEY_PROFILE, KEY_BASIC, KEY_WORKER, KEY_AVAILABLE, KEY_ROLE]);
}

/**
 * Migra desde tu sistema viejo (basic-profile + seeker-worker-profile + worker_available + chamba_role)
 * para que el HomeTab pueda “jalar” datos aunque todavía no hayas actualizado las pantallas de onboarding.
 */
export async function migrateLegacyToUnified(): Promise<Profile | null> {
  const roleRaw = (await AsyncStorage.getItem(KEY_ROLE)) as Role | null;
  const role: Role = roleRaw === "seeker" ? "seeker" : "worker";

  const basic = safeParse<any>(await AsyncStorage.getItem(KEY_BASIC)) ?? {};
  const worker = safeParse<any>(await AsyncStorage.getItem(KEY_WORKER)) ?? {};

  const av = await AsyncStorage.getItem(KEY_AVAILABLE);
  const isAvailable = av === "0" ? false : true;

  const firstName = (basic?.firstName ?? basic?.nombre ?? basic?.name ?? "").toString();
  const lastName = (basic?.lastName ?? basic?.apellido ?? basic?.lastname ?? "").toString();
  const zone = (basic?.zone ?? basic?.zona ?? basic?.area ?? "").toString();
  const whatsapp = (basic?.whatsapp ?? basic?.phone ?? basic?.telefono ?? "").toString();

  const work = (
    worker?.work ??
    worker?.oficio ??
    worker?.job ??
    worker?.occupation ??
    worker?.trabajo ??
    ""
  ).toString();

  const hasAnything =
    `${firstName}${lastName}${zone}${whatsapp}${work}`.trim().length > 0;

  // Si no hay nada que migrar, devolvemos null
  if (!hasAnything) return null;

  const profile: Profile = {
    role,
    firstName,
    lastName,
    zone,
    whatsapp,
    work,
    photoUri: undefined,
    isAvailable,
    updatedAt: nowISO(),
  };

  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  return profile;
}
