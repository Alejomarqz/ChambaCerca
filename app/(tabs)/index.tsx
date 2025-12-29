// app/(tabs)/index.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const BLUE = "#2f49c6";
const ORANGE = "#ea691e";
const GREEN = "#16a34a";
const RED = "#dc2626";

type Role = "worker" | "seeker" | null;

// ✅ KEYS OFICIALES (mismas que profile.tsx)
const KEY_BASIC = "basic-profile";
const KEY_WORKER = "seeker-worker-profile";
const KEY_AVAILABLE = "worker_available";
const KEY_ROLE = "chamba_role";

// ✅ Modal: flag para no molestar siempre
const KEY_NUDGE_DISMISSED = "home_profile_nudge_dismissed_v1";

// ✅ Solo para testing (crear datos demo si no existe nada)
const KEY_BOOTSTRAP_DONE = "demo_bootstrap_done_v1";

function safeParse<T = any>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function HomeTab() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);

  // ✅ Si no hay nada guardado todavía, creamos datos demo para probar que todo jale
  const ensureDemoBootstrap = useCallback(async () => {
    const done = await AsyncStorage.getItem(KEY_BOOTSTRAP_DONE);
    if (done === "1") return;

    const currentRole = (await AsyncStorage.getItem(KEY_ROLE)) as Role;
    const hasRole = currentRole === "worker" || currentRole === "seeker";

    const basic = safeParse(await AsyncStorage.getItem(KEY_BASIC));
    const worker = safeParse(await AsyncStorage.getItem(KEY_WORKER));

    const hasAnyData = !!basic || !!worker || hasRole;

    // Si NO hay nada, creamos demo (solo para pruebas visuales)
    if (!hasAnyData) {
      await AsyncStorage.setItem(KEY_ROLE, "worker");

      await AsyncStorage.setItem(
        KEY_BASIC,
        JSON.stringify({
          firstName: "Armando",
          lastName: "Torre",
          zone: "San Lucas",
          whatsapp: "50200000000",
        })
      );

      await AsyncStorage.setItem(
        KEY_WORKER,
        JSON.stringify({
          work: "Albañil",
        })
      );

      await AsyncStorage.setItem(KEY_AVAILABLE, "1");
    }

    await AsyncStorage.setItem(KEY_BOOTSTRAP_DONE, "1");
  }, []);

  useEffect(() => {
    (async () => {
      await ensureDemoBootstrap();

      const r = (await AsyncStorage.getItem(KEY_ROLE)) as Role;
      setRole(r ?? null);
    })();
  }, [ensureDemoBootstrap]);

  useEffect(() => {
    if (role === null) return; // cargando
    if (!role) router.replace("/onboarding/role");
  }, [role, router]);

  if (!role) return null;

  return role === "worker" ? <WorkerHome /> : <SeekerPlaceholder />;
}

function WorkerHome() {
  const router = useRouter();

  const [available, setAvailable] = useState(true);
  const [profile, setProfile] = useState<{
    firstName?: string;
    lastName?: string;
    zone?: string;
    whatsapp?: string;
    work?: string;
  } | null>(null);

  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const basic = safeParse(await AsyncStorage.getItem(KEY_BASIC)) || {};
      const worker = safeParse(await AsyncStorage.getItem(KEY_WORKER)) || {};

      setProfile({
        firstName: basic?.firstName || "",
        lastName: basic?.lastName || "",
        zone: basic?.zone || "",
        whatsapp: basic?.whatsapp || "",
        work: worker?.work || worker?.oficio || worker?.job || "",
      });

      const av = await AsyncStorage.getItem(KEY_AVAILABLE);
      if (av === "0") setAvailable(false);
      if (av === "1") setAvailable(true);

      const dismissed = await AsyncStorage.getItem(KEY_NUDGE_DISMISSED);
      setNudgeDismissed(dismissed === "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const fullName = useMemo(() => {
    const a = (profile?.firstName || "").trim();
    const b = (profile?.lastName || "").trim();
    const n = `${a} ${b}`.trim();
    return n || "Tu nombre";
  }, [profile]);

  const zone = (profile?.zone || "").trim() || "Zona no definida";
  const oficio = (profile?.work || "").trim() || "Oficio no definido";

  const profileComplete =
    fullName !== "Tu nombre" &&
    zone !== "Zona no definida" &&
    oficio !== "Oficio no definido";

  useEffect(() => {
    if (nudgeDismissed) return;
    if (!profile) return;
    if (!profileComplete) {
      const t = setTimeout(() => setShowNudge(true), 250);
      return () => clearTimeout(t);
    } else {
      setShowNudge(false);
    }
  }, [profile, profileComplete, nudgeDismissed]);

  const statusText = available ? "Disponible" : "No disponible";
  const statusColor = available ? GREEN : RED;

  const toggleAvailable = async (v: boolean) => {
    setAvailable(v);
    await AsyncStorage.setItem(KEY_AVAILABLE, v ? "1" : "0");
  };

  const shareProfile = () => {
    setShowNudge(true);
  };

  const addPhoto = () => {
    setShowNudge(true);
  };

  const closeNudge = async () => {
    setShowNudge(false);
    setNudgeDismissed(true);
    await AsyncStorage.setItem(KEY_NUDGE_DISMISSED, "1");
  };

  const goCompleteProfile = async () => {
    setShowNudge(false);
    router.push("/(tabs)/profile");
  };

  // ✅ Botón RESET para pruebas (borrar todo y volver a ver onboarding)
  const resetAll = async () => {
    await AsyncStorage.multiRemove([
      KEY_BASIC,
      KEY_WORKER,
      KEY_AVAILABLE,
      KEY_ROLE,
      KEY_NUDGE_DISMISSED,
      KEY_BOOTSTRAP_DONE,
    ]);
    router.replace("/onboarding/role");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      {/* ✅ MODAL EMERGENTE */}
      <Modal
        visible={showNudge && !profileComplete}
        transparent
        animationType="fade"
        onRequestClose={closeNudge}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Pressable onPress={closeNudge} hitSlop={12} style={styles.modalClose}>
              <Ionicons name="close" size={18} color="#64748B" />
            </Pressable>

            <View style={styles.modalIcon}>
              <Ionicons name="alert-circle" size={22} color={ORANGE} />
            </View>

            <Text style={styles.modalTitle}>Completá tu perfil</Text>
            <Text style={styles.modalText}>
              Si no completás tu perfil, es posible que no aparezcas para las personas
              que buscan un trabajador.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeNudge}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnGhost,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalBtnGhostText}>Luego</Text>
              </Pressable>

              <Pressable
                onPress={goCompleteProfile}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalBtnPrimaryText}>Completar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.stack}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>TU PERFIL PUBLICADO</Text>

            <View style={styles.photoWrap}>
              <View style={styles.photoCircle}>
                <Ionicons name="person" size={26} color="#94A3B8" />
              </View>
              <Pressable onPress={addPhoto} style={({ pressed }) => [styles.photoBtn, pressed && styles.pressed]}>
                <Ionicons name="camera-outline" size={16} color={TEXT} />
                <Text style={styles.photoBtnText}>Agregar foto</Text>
              </Pressable>
            </View>

            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.job}>{oficio}</Text>
            <Text style={styles.zone}>{zone}</Text>

            <View style={styles.rowCenter}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: `${statusColor}15`,
                    borderColor: `${statusColor}35`,
                  },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={[styles.badgeText, { color: statusColor }]}>{statusText}</Text>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Mostrarme</Text>
                <Switch
                  value={available}
                  onValueChange={toggleAvailable}
                  thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                  trackColor={{ false: "#CBD5E1", true: `${GREEN}` }}
                />
              </View>
            </View>

            {!profileComplete && (
              <Pressable onPress={() => router.push("/(tabs)/profile")} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
                <Ionicons name="alert-circle-outline" size={18} color={ORANGE} />
                <Text style={styles.ctaText}>Completar mi perfil</Text>
              </Pressable>
            )}

            {/* ✅ Solo para pruebas: reset */}
            <Pressable onPress={resetAll} style={({ pressed }) => [styles.debugReset, pressed && styles.pressed]}>
              <Ionicons name="refresh-outline" size={16} color={TEXT} />
              <Text style={styles.debugResetText}>Reset (solo pruebas)</Text>
            </Pressable>
          </View>

          <Pressable onPress={shareProfile} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.primaryText}>Compartir mi perfil</Text>
          </Pressable>

          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>Así te verán</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/profile")}
                style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
                hitSlop={10}
              >
                <Text style={styles.link}>Editar</Text>
                <Ionicons name="chevron-forward" size={16} color={BLUE} />
              </Pressable>
            </View>

            <View style={styles.preview}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color="#94A3B8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName}>{fullName}</Text>
                <Text style={styles.previewSub}>{oficio}</Text>
                <Text style={styles.previewMeta}>{zone}</Text>
              </View>

              <View style={styles.pill}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={BLUE} />
                <Text style={[styles.pillText, { color: BLUE }]}>Chat</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contactos recientes</Text>
            <Text style={styles.muted}>
              Aquí aparecerán las personas que te escriban por el chat interno.
            </Text>

            <View style={styles.emptyBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#94A3B8" />
              <Text style={styles.emptyText}>Aún no tenés contactos</Text>
            </View>

            <Pressable onPress={() => router.push("/(tabs)/contacts")} style={({ pressed }) => [styles.goContacts, pressed && styles.pressed]}>
              <Ionicons name="chatbubbles-outline" size={18} color={TEXT} />
              <Text style={styles.goContactsText}>Ver Contactos</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SeekerPlaceholder() {
  return (
    <View style={[styles.center, { flex: 1, backgroundColor: BG }]}>
      <Text style={{ color: MUTED }}>Home del contratante lo armamos después.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "android" ? 12 : 18,
    backgroundColor: BG,
  },
  stack: { gap: 12 },
  center: { alignItems: "center", justifyContent: "center" },

  hero: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  kicker: { fontSize: 11, color: "#7C879B", letterSpacing: 1.1, fontWeight: "900" },

  photoWrap: { marginTop: 6, alignItems: "center", gap: 8 },
  photoCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    backgroundColor: "rgba(11,18,32,0.04)",
  },
  photoBtnText: { color: TEXT, fontWeight: "900", fontSize: 12.5 },

  name: { marginTop: 4, fontSize: 20, fontWeight: "900", color: TEXT, textAlign: "center" },
  job: { fontSize: 13.5, fontWeight: "900", color: BLUE, textAlign: "center" },
  zone: { fontSize: 12.5, color: MUTED, textAlign: "center" },

  rowCenter: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  badgeText: { fontSize: 12.5, fontWeight: "900" },

  switchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { fontSize: 12.5, color: MUTED, fontWeight: "900" },

  cta: {
    marginTop: 10,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.28)",
    backgroundColor: "rgba(234,105,30,0.10)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: { fontWeight: "900", color: ORANGE },

  primary: {
    backgroundColor: BLUE,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "900" },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  link: { color: BLUE, fontWeight: "900", fontSize: 13 },

  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  previewName: { fontSize: 13.5, fontWeight: "900", color: TEXT },
  previewSub: { marginTop: 2, fontSize: 12.5, color: MUTED, fontWeight: "900" },
  previewMeta: { marginTop: 2, fontSize: 12, color: "#7C879B" },

  pill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(47,73,198,0.25)",
    backgroundColor: "rgba(47,73,198,0.08)",
  },
  pillText: { fontSize: 12.5, fontWeight: "900" },

  muted: { fontSize: 12.5, color: MUTED, lineHeight: 18 },

  emptyBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
  },
  emptyText: { color: "#64748B", fontWeight: "900" },

  goContacts: {
    marginTop: 6,
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  goContactsText: { color: TEXT, fontSize: 13.5, fontWeight: "900" },

  debugReset: {
    marginTop: 12,
    backgroundColor: "rgba(11,18,32,0.04)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  debugResetText: { color: TEXT, fontSize: 12.5, fontWeight: "900" },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11,18,32,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  modalClose: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
  },
  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(234,105,30,0.10)",
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.25)",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: TEXT, marginBottom: 6 },
  modalText: { fontSize: 12.8, color: MUTED, lineHeight: 18, marginBottom: 14 },
  modalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  modalBtnGhost: {
    backgroundColor: "rgba(11,18,32,0.04)",
    borderColor: "rgba(11,18,32,0.10)",
  },
  modalBtnGhostText: { color: TEXT, fontWeight: "900" },
  modalBtnPrimary: { backgroundColor: BLUE, borderColor: "rgba(47,73,198,0.35)" },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "900" },
});
