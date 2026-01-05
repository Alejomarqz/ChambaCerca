// app/(tabs)/settings.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  checkCurrentPin,
  disablePin,
  getBootFlags,
  PIN_LENGTH,
} from "../../storage/pinStorage";

import { getProfile, switchRole, type Role } from "../../storage/profileStorage";

const { width } = Dimensions.get("window");
const MAX_W = Math.min(420, width - 36);

// ✅ Estilo igual a Home/Profile
const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const BORDER = "#E7ECF5";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";

const BLUE = "#2f49c6";
const ORANGE = "#ea691e";
const GREEN = "#16a34a";
const DANGER = "#e53935";

type GateMode = null | "change" | "disable";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pinEnabled, setPinEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Rol (worker / seeker)
  const [role, setRole] = useState<Role>("worker");

  // gate modal (confirmar PIN)
  const [gateMode, setGateMode] = useState<GateMode>(null);
  const [gatePin, setGatePin] = useState("");
  const [gateErr, setGateErr] = useState("");
  const [gateBusy, setGateBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const boot = await getBootFlags();
      setPinEnabled(!!boot.pinEnabled);
      setLocked(!!boot.locked);

      const p = await getProfile();
      setRole(p?.role === "seeker" ? "seeker" : "worker");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pinStatus = useMemo(() => {
    if (loading) return { txt: "Cargando…", tone: "neutral" as const };
    if (!pinEnabled) return { txt: "Desactivado", tone: "off" as const };
    if (locked) return { txt: "Activado (bloqueado)", tone: "warn" as const };
    return { txt: "Activado", tone: "on" as const };
  }, [loading, pinEnabled, locked]);

  const roleStatus = useMemo(() => {
    return role === "worker"
      ? {
          txt: "Busco trabajo",
          sub: "Soy trabajador y ofrezco mis servicios.",
          icon: "briefcase-outline" as const,
          color: BLUE,
          bg: "rgba(47,73,198,0.10)",
          bd: "rgba(47,73,198,0.18)",
        }
      : {
          txt: "Busco trabajador",
          sub: "Quiero encontrar personas que me ayuden.",
          icon: "search-outline" as const,
          color: ORANGE,
          bg: "rgba(234,105,30,0.10)",
          bd: "rgba(234,105,30,0.18)",
        };
  }, [role]);

  const openGate = (mode: Exclude<GateMode, null>) => {
    setGateMode(mode);
    setGatePin("");
    setGateErr("");
    setGateBusy(false);
  };

  const closeGate = () => {
    setGateMode(null);
    setGatePin("");
    setGateErr("");
    setGateBusy(false);
  };

  const onEnablePin = () => {
    router.push("/onboarding/set-pin");
  };

  const onPinRowPress = () => {
    if (!pinEnabled) {
      onEnablePin();
      return;
    }

    Alert.alert("PIN de ingreso", "¿Qué deseas hacer?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cambiar PIN", onPress: () => openGate("change") },
      {
        text: "Desactivar PIN",
        style: "destructive",
        onPress: () => openGate("disable"),
      },
    ]);
  };

  const onConfirmGate = async () => {
    if (gateBusy) return;

    const re = new RegExp(`^\\d{${PIN_LENGTH}}$`);
    if (!re.test(gatePin)) {
      setGateErr(`Debe tener ${PIN_LENGTH} dígitos.`);
      return;
    }

    setGateBusy(true);
    setGateErr("");

    const ok = await checkCurrentPin(gatePin);
    if (!ok) {
      setGateBusy(false);
      setGateErr("PIN incorrecto.");
      setGatePin("");
      return;
    }

    if (gateMode === "change") {
      closeGate();
      router.push("/onboarding/set-pin");
      return;
    }

    if (gateMode === "disable") {
      closeGate();
      Alert.alert("Desactivar PIN", "¿Seguro que quieres desactivar el PIN?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: async () => {
            await disablePin();
            await load();
            Alert.alert("Listo", "PIN desactivado.");
          },
        },
      ]);
      return;
    }

    setGateBusy(false);
  };

  const onChangeRole = useCallback(
    (nextRole: Role) => {
      if (nextRole === role) return;

      const title = "Cambiar tipo de cuenta";
      const msg =
        nextRole === "worker"
          ? "Pasarás a “Busco trabajo”. Podrás mostrar tus oficios, fotos y recibir chats."
          : "Pasarás a “Busco trabajador”. Solo buscarás personas, y se ocultarán oficios/fotos/contactos.";

      Alert.alert(title, msg, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cambiar",
          onPress: async () => {
            try {
              await switchRole(nextRole);
              setRole(nextRole);

              // ✅ FIX: index.tsx se navega como "/(tabs)" (NO "/(tabs)/index")
              router.replace("/(tabs)");
            } catch (e) {
              console.log("switchRole-error", e);
              Alert.alert("Error", "No se pudo cambiar el tipo de cuenta.");
            }
          },
        },
      ]);
    },
    [role, router]
  );

  const Row = useCallback(
    ({
      icon,
      iconBg,
      iconBd,
      iconColor,
      title,
      desc,
      right,
      onPress,
      disabled,
    }: {
      icon: any;
      iconBg: string;
      iconBd: string;
      iconColor: string;
      title: string;
      desc?: string;
      right?: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
    }) => {
      return (
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.row,
            pressed && !disabled && { opacity: 0.92 },
            disabled && { opacity: 0.6 },
          ]}
        >
          <View style={[styles.rowIcon, { backgroundColor: iconBg, borderColor: iconBd }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{title}</Text>
            {!!desc && <Text style={styles.rowDesc}>{desc}</Text>}
          </View>

          {right ?? <Ionicons name="chevron-forward" size={18} color="#9AA7BD" />}
        </Pressable>
      );
    },
    []
  );

  const Badge = useMemo(() => {
    const bg =
      pinStatus.tone === "on"
        ? "rgba(22,163,74,0.10)"
        : pinStatus.tone === "warn"
        ? "rgba(234,105,30,0.10)"
        : pinStatus.tone === "off"
        ? "rgba(229,57,53,0.08)"
        : "rgba(11,18,32,0.06)";

    const bd =
      pinStatus.tone === "on"
        ? "rgba(22,163,74,0.18)"
        : pinStatus.tone === "warn"
        ? "rgba(234,105,30,0.18)"
        : pinStatus.tone === "off"
        ? "rgba(229,57,53,0.14)"
        : "rgba(11,18,32,0.10)";

    const fg =
      pinStatus.tone === "on"
        ? GREEN
        : pinStatus.tone === "warn"
        ? ORANGE
        : pinStatus.tone === "off"
        ? DANGER
        : MUTED;

    return (
      <View style={[styles.badge, { backgroundColor: bg, borderColor: bd }]}>
        <Text style={[styles.badgeTxt, { color: fg }]} numberOfLines={1}>
          {pinStatus.txt}
        </Text>
      </View>
    );
  }, [pinStatus]);

  const RoleBadge = useMemo(() => {
    return (
      <View style={[styles.badge, { backgroundColor: roleStatus.bg, borderColor: roleStatus.bd }]}>
        <Text style={[styles.badgeTxt, { color: roleStatus.color }]} numberOfLines={1}>
          {roleStatus.txt}
        </Text>
      </View>
    );
  }, [roleStatus]);

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: Math.max(0, insets.top) }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.wrap, { maxWidth: MAX_W }]}>
          <View style={styles.header}>
            <Text style={styles.h1}>Ajustes</Text>
            <Text style={styles.sub}>Tu cuenta, seguridad y preferencias.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Cuenta</Text>

            <Row
              icon="person-outline"
              iconBg="rgba(124,58,237,0.12)"
              iconBd="rgba(124,58,237,0.18)"
              iconColor="#7c3aed"
              title="Editar perfil"
              desc="Tu nombre, foto y ubicación."
              onPress={() => router.push("/(tabs)/profile")}
            />

            <Row
              icon={roleStatus.icon}
              iconBg={roleStatus.bg}
              iconBd={roleStatus.bd}
              iconColor={roleStatus.color}
              title="Tipo de cuenta"
              desc={roleStatus.sub}
              right={RoleBadge}
              onPress={() => {
                Alert.alert("Tipo de cuenta", "Elige una opción:", [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Busco trabajo", onPress: () => onChangeRole("worker") },
                  { text: "Busco trabajador", onPress: () => onChangeRole("seeker") },
                ]);
              }}
            />

            <View style={styles.sep} />

            <Text style={[styles.section, { marginTop: 2 }]}>Seguridad</Text>

            <Row
              icon="lock-closed-outline"
              iconBg="rgba(234,105,30,0.12)"
              iconBd="rgba(234,105,30,0.20)"
              iconColor={ORANGE}
              title="PIN de ingreso"
              desc="Protege tu cuenta al abrir la app."
              right={Badge}
              onPress={onPinRowPress}
              disabled={loading}
            />

            <View style={styles.sep} />

            <Text style={[styles.section, { marginTop: 2 }]}>Preferencias</Text>

            <Row
              icon="notifications-outline"
              iconBg="rgba(2,132,199,0.12)"
              iconBd="rgba(2,132,199,0.18)"
              iconColor="#0284c7"
              title="Notificaciones"
              desc="Avisos y recordatorios."
              onPress={() => Alert.alert("Próximamente", "Aquí configuraremos notificaciones.")}
            />

            <Row
              icon="shield-checkmark-outline"
              iconBg="rgba(47,73,198,0.12)"
              iconBd="rgba(47,73,198,0.18)"
              iconColor={BLUE}
              title="Privacidad"
              desc="Visibilidad y datos."
              onPress={() => Alert.alert("Próximamente", "Aquí configuraremos privacidad.")}
            />

            <Row
              icon="help-circle-outline"
              iconBg="rgba(11,18,32,0.05)"
              iconBd="rgba(11,18,32,0.08)"
              iconColor={MUTED}
              title="Ayuda"
              desc="Soporte y preguntas frecuentes."
              onPress={() => Alert.alert("Ayuda", "Próximamente agregaremos soporte.")}
            />
          </View>

          <View style={{ height: 18 }} />
        </View>
      </ScrollView>

      {/* ====== MODAL: pedir PIN actual ====== */}
      <Modal visible={gateMode !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar PIN</Text>
            <Text style={styles.modalSub}>Ingresa tu PIN actual ({PIN_LENGTH} dígitos) para continuar.</Text>

            <View style={styles.modalInputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={ORANGE} />
              <TextInput
                value={gatePin}
                onChangeText={(t) => {
                  setGateErr("");
                  setGatePin(t.replace(/[^\d]/g, "").slice(0, PIN_LENGTH));
                }}
                placeholder={"•".repeat(PIN_LENGTH)}
                placeholderTextColor="#9AA7BD"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={PIN_LENGTH}
                style={styles.modalInput}
                editable={!gateBusy}
                onSubmitEditing={onConfirmGate}
              />
            </View>

            {!!gateErr && <Text style={styles.modalErr}>{gateErr}</Text>}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeGate}
                style={({ pressed }) => [
                  styles.modalBtnGhost,
                  pressed && { opacity: 0.9 },
                  gateBusy && { opacity: 0.7 },
                ]}
                disabled={gateBusy}
              >
                <Text style={styles.modalBtnGhostTxt}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={onConfirmGate}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  pressed && { opacity: 0.9 },
                  gateBusy && { opacity: 0.7 },
                ]}
                disabled={gateBusy}
              >
                <Text style={styles.modalBtnPrimaryTxt}>{gateBusy ? "Verificando…" : "Continuar"}</Text>
              </Pressable>
            </View>

            <Text style={styles.modalHint}>(Más adelante podrás usar código por teléfono)</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    alignItems: "center",
  },
  wrap: { width: "100%" },

  header: { marginBottom: 12 },
  h1: { fontFamily: "Poppins_700Bold", fontSize: 20, color: TEXT },
  sub: {
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 16,
  },

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },

  section: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: "#7C879B",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(11,18,32,0.02)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
    marginBottom: 10,
  },

  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  rowTitle: { fontFamily: "Poppins_700Bold", fontSize: 13.5, color: TEXT },
  rowDesc: {
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.2,
    color: MUTED,
    lineHeight: 16,
  },

  sep: { height: 4 },

  badge: {
    maxWidth: 170,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },

  // ===== modal =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  modalTitle: { fontFamily: "Poppins_700Bold", fontSize: 18, color: TEXT },
  modalSub: {
    marginTop: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 17,
  },
  modalInputWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(11,18,32,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalInput: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: TEXT,
    letterSpacing: 10,
    padding: 0,
  },
  modalErr: {
    marginTop: 8,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: DANGER,
  },
  modalActions: { marginTop: 12, flexDirection: "row", gap: 10 },
  modalBtnGhost: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
  },
  modalBtnGhostTxt: { fontFamily: "Poppins_700Bold", color: TEXT },
  modalBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
  },
  modalBtnPrimaryTxt: { fontFamily: "Poppins_700Bold", color: "#fff" },
  modalHint: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: MUTED,
    textAlign: "center",
  },
});
