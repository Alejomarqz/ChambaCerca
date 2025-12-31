// storage/bootStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_FLOW_CHECKPOINT = "chamba_flow_checkpoint";

/**
 * checkpoint values (orden lógico):
 * - basic_done: cuenta creada
 * - pin_done: pin creado
 * - role_done: rol elegido
 * - worker_done: worker-form completo
 * - seeker_done: seeker-form completo
 */
export type FlowCheckpoint =
  | "basic_done"
  | "pin_done"
  | "role_done"
  | "worker_done"
  | "seeker_done";

const VALID: FlowCheckpoint[] = [
  "basic_done",
  "pin_done",
  "role_done",
  "worker_done",
  "seeker_done",
];

function isValid(v: any): v is FlowCheckpoint {
  return VALID.includes(v);
}

export async function setCheckpoint(v: FlowCheckpoint) {
  await AsyncStorage.setItem(KEY_FLOW_CHECKPOINT, v);
}

export async function getCheckpoint(): Promise<FlowCheckpoint | null> {
  const v = await AsyncStorage.getItem(KEY_FLOW_CHECKPOINT);
  if (!v) return null;
  return isValid(v) ? v : null;
}

export async function clearCheckpoint() {
  await AsyncStorage.removeItem(KEY_FLOW_CHECKPOINT);
}
