// app/(tabs)/profile.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const BLUE = "#2f49c6";
const ORANGE = "#ea691e";

// ✅ Legacy keys (compat)
const KEY_BASIC = "basic-profile";
const KEY_WORKER = "seeker-worker-profile";
const KEY_ROLE = "chamba_role";
const KEY_USER = "chamba_user";

// ✅ Perfil PRO (vamos a intentar ambos por compat)
const KEY_PROFILE_V2 = "chamba_profile_v2";
const KEY_PROFILE_V1 = "chamba_v1_profile";

type AvailabilityKey = "manana" | "tarde" | "noche" | "fin";
type Role = "worker" | "seeker";

type ProProfile = {
  role?: Role;
  firstName?: string;
  lastName?: string;
  zone?: string;
  whatsapp?: string;
  work?: string;
  availability?: AvailabilityKey[];
  isAvailable?: boolean;
  updatedAt?: string;

  // ✅ flags de verificación (lo dejamos listo)
  verifiedPhone?: boolean;
  verifiedAt?: string;
};

function safeParse<T>(raw: string | null): T | null {
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

export default function ProfileTab() {
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<Role>("worker");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [whatsapp, setWhatsapp] = useState("");
  const [zone, setZone] = useState("");

  const [work, setWork] = useState("");

  const [verifiedPhone, setVerifiedPhone] = useState(false);

  const canSave = useMemo(() => {
    // permitimos guardar aunque whatsapp esté vacío (porque se verificará después)
    return firstName.trim().length >= 2 && lastName.trim().length >= 2;
  }, [firstName, lastName]);

  useEffect(() => {
    (async () => {
      try {
        // 1) Intentar PRO primero
        const proRaw =
          (await AsyncStorage.getItem(KEY_PROFILE_V2)) ??
          (await AsyncStorage.getItem(KEY_PROFILE_V1));

        const pro = safeParse<ProProfile>(proRaw) ?? {};

        if (proRaw && Object.keys(pro).length > 0) {
          setRole((pro.role as Role) || "worker");
          setFirstName(pro.firstName || "");
          setLastName(pro.lastName || "");
          setWhatsapp(pro.whatsapp || "");
          setZone(pro.zone || "");
          setWork(pro.work || "");
          setVerifiedPhone(!!pro.verifiedPhone);
          return;
        }

        // 2) Fallback a Legacy
        const basicRaw = await AsyncStorage.getItem(KEY_BASIC);
        const workerRaw = await AsyncStorage.getItem(KEY_WORKER);
        const roleRaw = (await AsyncStorage.getItem(KEY_ROLE)) as Role | null;

        const basic = safeParse<any>(basicRaw) ?? {};
        const worker = safeParse<any>(workerRaw) ?? {};

        setRole(roleRaw === "seeker" ? "seeker" : "worker");
        setFirstName(basic.firstName || "");
        setLastName(basic.lastName || "");
        setWhatsapp(basic.whatsapp || "");
        setZone(basic.zone || "");
        setWork(worker.work || worker.oficio || worker.job || "");
        setVerifiedPhone(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!canSave) {
      Alert.alert("Revisa tus datos", "Completa tu nombre y apellido.");
      return;
    }

    try {
      // Leer pro actual si existe para no pisar cosas
      const proRaw =
        (await AsyncStorage.getItem(KEY_PROFILE_V2)) ??
        (await AsyncStorage.getItem(KEY_PROFILE_V1));
      const currentPro = safeParse<ProProfile>(proRaw) ?? {};

      // ✅ Perfil PRO actualizado
      const nextPro: ProProfile = {
        ...currentPro,
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        zone: zone.trim(),
        work: work.trim(),
        // whatsapp se guarda aquí, pero verificado queda false hasta que implementemos el código
        whatsapp: whatsapp.trim(),
        verifiedPhone: whatsapp.trim().length ? currentPro.verifiedPhone ?? false : false,
        updatedAt: nowISO(),
      };

      // Guardar en V2 (preferido)
      await AsyncStorage.setItem(KEY_PROFILE_V2, JSON.stringify(nextPro));

      // ✅ Legacy (para que cualquier screen vieja siga jalando)
      await AsyncStorage.setItem(
        KEY_BASIC,
        JSON.stringify({
          firstName: nextPro.firstName || "",
          lastName: nextPro.lastName || "",
          whatsapp: nextPro.whatsapp || "",
          zone: nextPro.zone || "",
        })
      );

      await AsyncStorage.setItem(
        KEY_WORKER,
        JSON.stringify({
          work: nextPro.work || "",
        })
      );

      await AsyncStorage.setItem(KEY_ROLE, role);

      // ✅ opcional: reflejar verifiedPhone en chamba_user (si existe)
      const userRaw = await AsyncStorage.getItem(KEY_USER);
      const user = safeParse<any>(userRaw);
      if (user) {
        await AsyncStorage.setItem(
          KEY_USER,
          JSON.stringify({
            ...user,
            // se queda false hasta verificación real
            verifiedPhone: !!nextPro.verifiedPhone,
          })
        );
      }

      setVerifiedPhone(!!nextPro.verifiedPhone);

      Alert.alert(
        "Listo",
        whatsapp.trim().length && !nextPro.verifiedPhone
          ? "Guardado. Tu número está pendiente de verificación."
          : "Tu perfil fue actualizado."
      );
    } catch {
      Alert.alert("Error", "No se pudo guardar. Intenta de nuevo.");
    }
  };

  const verifyHint = verifiedPhone ? "Verificado" : "No verificado";

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={{ color: MUTED }}>Cargando perfil…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Mi perfil</Text>
        <Text style={styles.sub}>
          Edita tus datos. El WhatsApp se verifica con código antes de “mostrarte”.
        </Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>Rol: {role === "worker" ? "Busco trabajo" : "Busco trabajador"}</Text>
          </View>
          <View style={[styles.badge, !verifiedPhone && { borderColor: "rgba(234,105,30,0.35)" }]}>
            <Text style={[styles.badgeTxt, !verifiedPhone && { color: ORANGE }]}>
              {verifyHint}
            </Text>
          </View>
        </View>

        <Field label="Nombre" value={firstName} onChangeText={setFirstName} />
        <Field label="Apellido" value={lastName} onChangeText={setLastName} />

        <Field
          label="WhatsApp (pendiente de verificación)"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          placeholder="Ej: 5555-5555"
        />

        <Field
          label="Zona / Aldea"
          value={zone}
          onChangeText={setZone}
          placeholder="Ej: San Lucas"
        />

        <View style={styles.sep} />

        {/* Oficio solo aplica si es worker, pero lo dejamos editable por ahora */}
        <Field
          label="Oficio"
          value={work}
          onChangeText={setWork}
          placeholder="Ej: Albañil, Electricista..."
        />

        {!verifiedPhone && whatsapp.trim().length > 0 && (
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Siguiente paso</Text>
            <Text style={styles.noteTxt}>
              Implementaremos “Verificar número” con código. Por ahora se guarda, pero no cuenta como verificado.
            </Text>
          </View>
        )}

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.btn,
            !canSave && { opacity: 0.6 },
            pressed && canSave ? styles.pressed : null,
          ]}
        >
          <Text style={styles.btnText}>Guardar cambios</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9AA7BD"
        keyboardType={props.keyboardType}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: {
    padding: 16,
    paddingTop: Platform.OS === "android" ? 12 : 18,
    paddingBottom: 28,
    backgroundColor: BG,
  },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "900", color: TEXT },
  sub: { color: MUTED, lineHeight: 18 },

  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeTxt: { color: TEXT, fontWeight: "800", fontSize: 12 },

  label: { fontSize: 12.5, fontWeight: "900", color: TEXT },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 10 : 12,
    color: TEXT,
  },

  sep: { height: 1, backgroundColor: BORDER, marginVertical: 6 },

  note: {
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.25)",
    backgroundColor: "rgba(234,105,30,0.08)",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  noteTitle: { fontWeight: "900", color: TEXT },
  noteTxt: { color: MUTED, lineHeight: 18 },

  btn: {
    marginTop: 6,
    backgroundColor: BLUE,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
