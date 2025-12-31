// storage/pinStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const KEY_SESSION = "chamba_session";
const KEY_PIN_ENABLED = "chamba_pin_enabled";
const KEY_APP_LOCKED = "chamba_app_locked";

const KEY_PIN_SALT = "chamba_pin_salt";
const KEY_PIN_HASH = "chamba_pin_hash";

// ✅ Para lock por tiempo
const KEY_LAST_ACTIVE_AT = "chamba_last_active_at"; // ms timestamp
const LOCK_AFTER_SECONDS = 60; // ⬅️ ajusta: 60s / 120s / 300s etc.

const PIN_LEN = 6;

function isValidPin(pin: string) {
  return new RegExp(`^\\d{${PIN_LEN}}$`).test(pin);
}

async function sha256(input: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

async function nowMs() {
  return Date.now();
}

export async function isPinEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_PIN_ENABLED)) === "1";
}

export async function isAppLocked(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_APP_LOCKED)) === "1";
}

export async function setAppLocked(v: boolean) {
  await AsyncStorage.setItem(KEY_APP_LOCKED, v ? "1" : "0");
}

export async function enablePin(pin: string) {
  if (!isValidPin(pin)) throw new Error("PIN inválido");

  const salt = Crypto.randomUUID();
  const hash = await sha256(`${salt}:${pin}`);

  await SecureStore.setItemAsync(KEY_PIN_SALT, salt);
  await SecureStore.setItemAsync(KEY_PIN_HASH, hash);

  await AsyncStorage.setItem(KEY_PIN_ENABLED, "1");
  await setAppLocked(false);

  // ✅ marca actividad
  await AsyncStorage.setItem(KEY_LAST_ACTIVE_AT, String(await nowMs()));
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;

  const salt = await SecureStore.getItemAsync(KEY_PIN_SALT);
  const storedHash = await SecureStore.getItemAsync(KEY_PIN_HASH);
  if (!salt || !storedHash) return false;

  const hash = await sha256(`${salt}:${pin}`);
  return hash === storedHash;
}

/**
 * ✅ Re-auth para Settings:
 * - exige que exista PIN activo
 * - verifica PIN actual
 */
export async function checkCurrentPin(pin: string): Promise<boolean> {
  const enabled = await isPinEnabled();
  if (!enabled) return false;
  return verifyPin(pin);
}

export async function disablePin() {
  await SecureStore.deleteItemAsync(KEY_PIN_SALT);
  await SecureStore.deleteItemAsync(KEY_PIN_HASH);
  await AsyncStorage.removeItem(KEY_PIN_ENABLED);
  await setAppLocked(false);
  await AsyncStorage.removeItem(KEY_LAST_ACTIVE_AT);
}

/**
 * ✅ Llamar cuando la app pasa a background / se minimiza
 * (No bloquea de una vez: solo marca el tiempo)
 */
export async function markBackgrounded() {
  // solo si hay sesión + pin activo tiene sentido
  const boot = await getBootFlags();
  if (!boot.session) return;
  if (!boot.pinEnabled) return;

  await AsyncStorage.setItem(KEY_LAST_ACTIVE_AT, String(await nowMs()));
}

/**
 * ✅ Llamar cuando la app vuelve a foreground
 * Si estuvo fuera más de LOCK_AFTER_SECONDS -> bloquear
 */
export async function lockIfTimedOut() {
  const boot = await getBootFlags();
  if (!boot.session) return;
  if (!boot.pinEnabled) return;

  const raw = await AsyncStorage.getItem(KEY_LAST_ACTIVE_AT);
  const last = raw ? Number(raw) : 0;

  // Si no hay timestamp, por seguridad lo tratamos como “timeout”
  const elapsedMs = last > 0 ? (await nowMs()) - last : Number.MAX_SAFE_INTEGER;

  if (elapsedMs >= LOCK_AFTER_SECONDS * 1000) {
    await setAppLocked(true);
  }

  // refresca marca de actividad
  await AsyncStorage.setItem(KEY_LAST_ACTIVE_AT, String(await nowMs()));
}

/**
 * ✅ Bloqueo manual (por si querés forzar lock desde Settings)
 */
export async function lockAppIfNeeded() {
  const boot = await getBootFlags();
  if (!boot.session) return;
  if (!boot.pinEnabled) return;

  await setAppLocked(true);
}

export async function logoutAndUnlock() {
  await AsyncStorage.removeItem(KEY_SESSION);
  await setAppLocked(false);
  await AsyncStorage.removeItem(KEY_LAST_ACTIVE_AT);
}

export async function getBootFlags() {
  const [session, pinEnabled, locked] = await Promise.all([
    AsyncStorage.getItem(KEY_SESSION),
    AsyncStorage.getItem(KEY_PIN_ENABLED),
    AsyncStorage.getItem(KEY_APP_LOCKED),
  ]);

  // ✅ Si existe algo en session, lo consideramos sesión activa.
  const hasSession = !!session && session !== "0" && session !== "false";

  const flags = {
    session: hasSession,
    pinEnabled: pinEnabled === "1",
    locked: locked === "1",
  };

  // 🔁 Alias opcional por compatibilidad si en algún lado usaste appLocked
  return { ...flags, appLocked: flags.locked };
}

export const PIN_LENGTH = PIN_LEN;
export const PIN_LOCK_AFTER_SECONDS = LOCK_AFTER_SECONDS;
