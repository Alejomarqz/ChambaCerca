import * as SecureStore from "expo-secure-store";

const KEY = "cc_session";

export async function setSession(value: string) {
  await SecureStore.setItemAsync(KEY, value);
}

export async function getSession() {
  return SecureStore.getItemAsync(KEY);
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEY);
}
