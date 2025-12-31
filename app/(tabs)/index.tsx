// app/(tabs)/index.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getProfile,
  isSeekerComplete,
  isWorkerComplete,
  setAvailability,
  type Profile,
} from "../../storage/profileStorage";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const BLUE = "#2f49c6";
const ORANGE = "#ea691e";
const GREEN = "#16a34a";

export default function HomeScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyToggle, setBusyToggle] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const p = await getProfile();
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const displayName = useMemo(() => {
    const fn = profile?.basic?.firstName?.trim() ?? "";
    const ln = profile?.basic?.lastName?.trim() ?? "";
    const full = `${fn} ${ln}`.trim();
    return full || "Tu perfil";
  }, [profile]);

  const workLabel = useMemo(() => {
    const w = profile?.worker?.work?.trim();
    if (!w) return "Oficio no definido";
    return w;
  }, [profile]);

  const zoneLabel = useMemo(() => {
    const z = profile?.basic?.zone?.trim();
    if (!z) return "Zona no definida";
    return z;
  }, [profile]);

  const whatsappLabel = useMemo(() => {
    const w = profile?.basic?.whatsapp?.trim();
    return w || "";
  }, [profile]);

  const isWorker = profile?.role === "worker";
  const isSeeker = profile?.role === "seeker";

  const complete = useMemo(() => {
    if (!profile) return false;
    if (isWorker) return isWorkerComplete(profile);
    if (isSeeker) return isSeekerComplete(profile);
    return false;
  }, [profile, isWorker, isSeeker]);

  const goCompleteProfile = useCallback(() => {
    // Si no hay rol aún, mandar a role
    if (!profile?.role) {
      router.push("/onboarding/role");
      return;
    }
    // Si hay rol, mandar a su form
    router.push(profile.role === "worker" ? "/onboarding/worker-form" : "/onboarding/seeker-form");
  }, [router, profile]);

  const onToggleAvailable = useCallback(
    async (next: boolean) => {
      if (!profile) return;
      if (profile.role !== "worker") return; // solo aplica a worker

      try {
        setBusyToggle(true);
        // ✅ guarda en v2
        const updated = await setAvailability(next);
        setProfile(updated);
      } finally {
        setBusyToggle(false);
      }
    },
    [profile]
  );

  // ===== UI =====

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.hTitle}>Inicio</Text>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="settings-outline" size={20} color={TEXT} />
          </Pressable>
        </View>

        {/* Card Perfil */}
        <View style={styles.card}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingTxt}>Cargando perfil...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.kicker}>TU PERFIL</Text>

              <View style={styles.avatarRow}>
                <View style={styles.avatar} />
                <Pressable style={styles.photoBtn} onPress={() => {}}>
                  <Ionicons name="camera-outline" size={16} color={TEXT} />
                  <Text style={styles.photoTxt}>Agregar foto</Text>
                </Pressable>
              </View>

              <Text style={styles.name}>{displayName.toLowerCase()}</Text>

              <View style={styles.pill}>
                <Text style={styles.pillTxt}>{workLabel}</Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color="#8A97AD" />
                <Text style={styles.metaTxt}>{zoneLabel}</Text>
              </View>

              {whatsappLabel ? (
                <View style={styles.metaRow}>
                  <Ionicons name="call-outline" size={16} color="#8A97AD" />
                  <Text style={styles.metaTxt}>{whatsappLabel}</Text>
                </View>
              ) : null}

              {/* Disponible + Mostrarme (solo worker) */}
              <View style={styles.toggleRow}>
                <View style={styles.badgeGreen}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.badgeGreenTxt}>Disponible</Text>
                </View>

                <View style={styles.toggleRight}>
                  <Text style={styles.toggleLabel}>Mostrarme</Text>
                  <Switch
                    value={!!profile?.worker?.isAvailable}
                    onValueChange={onToggleAvailable}
                    disabled={!isWorker || busyToggle}
                  />
                </View>
              </View>

              {/* Completar perfil si falta algo */}
              {!complete ? (
                <Pressable
                  onPress={goCompleteProfile}
                  style={({ pressed }) => [
                    styles.completeBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={ORANGE} />
                  <Text style={styles.completeTxt}>Completar mi perfil</Text>
                </Pressable>
              ) : null}

              {/* Reset solo pruebas */}
              <Pressable
                onPress={() => setShowReset(true)}
                style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="refresh-outline" size={16} color={TEXT} />
                <Text style={styles.resetTxt}>Reset (solo pruebas)</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* CTA compartir */}
        <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.92 }]}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.shareTxt}>Compartir mi perfil</Text>
        </Pressable>

        {/* Vista previa */}
        <View style={styles.card}>
          <View style={styles.previewHeader}>
            <Text style={styles.sectionTitle}>Así te verán</Text>
            <Pressable onPress={goCompleteProfile} hitSlop={10}>
              <Text style={styles.editLink}>Editar</Text>
            </Pressable>
          </View>

          <View style={styles.previewRow}>
            <View style={styles.avatarSmall} />
            <View style={{ flex: 1 }}>
              <Text style={styles.previewName}>{displayName.toLowerCase()}</Text>
              <Text style={styles.previewSub}>
                {workLabel}
              </Text>
              <Text style={styles.previewSub}>{zoneLabel}</Text>
            </View>

            <Pressable style={styles.chatBtn}>
              <Ionicons name="chatbubble-outline" size={16} color={BLUE} />
              <Text style={styles.chatTxt}>Chat</Text>
            </Pressable>
          </View>
        </View>

        {/* Contactos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contactos recientes</Text>
          <Text style={styles.smallMuted}>Cuando alguien te escriba, aparecerá aquí.</Text>

          <View style={styles.emptyBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#9AA7BD" />
            <Text style={styles.emptyTxt}>Aún no tenés contactos</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal reset */}
      <Modal visible={showReset} transparent animationType="fade" onRequestClose={() => setShowReset(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset</Text>
            <Text style={styles.modalSub}>
              Esto es solo para pruebas. Si lo haces, tendrás que crear el perfil otra vez.
            </Text>

            <View style={styles.modalRow}>
              <Pressable onPress={() => setShowReset(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnTxt}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  setShowReset(false);
                  // si tu app ya tiene resetAll o resetProfile, conectalo aquí
                  // por ahora solo recarga:
                  await load();
                }}
                style={[styles.modalBtn, { backgroundColor: ORANGE, borderColor: ORANGE }]}
              >
                <Text style={[styles.modalBtnTxt, { color: "#fff" }]}>Entendido</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 22 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  hTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  loadingTxt: { color: MUTED },

  kicker: { fontSize: 11, fontWeight: "700", color: "#8A97AD", textAlign: "center" },

  avatarRow: { alignItems: "center", marginTop: 10 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: BORDER,
  },
  photoBtn: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F3F5FA",
  },
  photoTxt: { fontWeight: "700", color: TEXT },

  name: { marginTop: 10, fontSize: 22, fontWeight: "900", color: TEXT, textAlign: "center" },

  pill: {
    marginTop: 10,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#DDE3FF",
  },
  pillTxt: { fontWeight: "800", color: BLUE },

  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  metaTxt: { color: "#8A97AD", fontWeight: "700" },

  toggleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  badgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAF7EF",
    borderWidth: 1,
    borderColor: "#CDEFD7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dotGreen: { width: 8, height: 8, borderRadius: 99, backgroundColor: GREEN },
  badgeGreenTxt: { fontWeight: "800", color: GREEN },

  toggleRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontWeight: "800", color: MUTED },

  completeBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.35)",
    backgroundColor: "rgba(234,105,30,0.10)",
  },
  completeTxt: { fontWeight: "900", color: ORANGE },

  resetBtn: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F3F5FA",
  },
  resetTxt: { fontWeight: "800", color: TEXT },

  shareBtn: {
    backgroundColor: BLUE,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  shareTxt: { color: "#fff", fontWeight: "900" },

  previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontWeight: "900", color: TEXT, fontSize: 14 },
  editLink: { fontWeight: "900", color: BLUE },

  previewRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: BORDER,
  },
  previewName: { fontWeight: "900", color: TEXT },
  previewSub: { color: MUTED, fontWeight: "700", marginTop: 2 },

  chatBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDE3FF",
    backgroundColor: "#EEF2FF",
  },
  chatTxt: { fontWeight: "900", color: BLUE },

  smallMuted: { color: MUTED, marginTop: 6, fontWeight: "600" },
  emptyBox: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  emptyTxt: { fontWeight: "800", color: "#7C879B" },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 18, padding: 14 },
  modalTitle: { fontWeight: "900", color: TEXT, fontSize: 16 },
  modalSub: { marginTop: 6, color: MUTED, fontWeight: "600", lineHeight: 18 },
  modalRow: { marginTop: 14, flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  modalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F3F5FA",
  },
  modalBtnTxt: { fontWeight: "900", color: TEXT },
});
