// app/(tabs)/index.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getProfile, setAvailability } from "../../storage/profileStorage";

const { width } = Dimensions.get("window");
const MAX_W = Math.min(420, width - 36);

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";

const BLUE = "#2f49c6";
const ORANGE = "#ea691e";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";
const SKY = "#0284c7";

const WORK_PHOTOS_KEY = "chamba_work_photos_v1";

/** ---------- Helpers ---------- */
function firstWord(s: string) {
  return String(s ?? "").trim().split(" ").filter(Boolean)[0] ?? "";
}
function shortFullName(firstName: string, lastName: string) {
  const fn = firstWord(firstName);
  const ln = firstWord(lastName);
  return `${fn} ${ln}`.trim();
}
function oneLineLocation({
  sector,
  municipalityName,
  departmentName,
  zone,
}: {
  sector?: string;
  municipalityName?: string;
  departmentName?: string;
  zone?: string;
}) {
  const sec = String(sector ?? "").trim();
  const muni = String(municipalityName ?? "").trim();
  const dep = String(departmentName ?? "").trim();
  const legacy = String(zone ?? "").trim();

  if (sec && muni) return `${sec} · ${muni}`;
  if (muni && dep) return `${muni} · ${dep}`;
  if (muni) return muni;
  if (dep) return dep;
  return legacy;
}
function splitWorkToTags(work: string) {
  const raw = String(work ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 8);
}
function paletteForIndex(i: number) {
  const palettes = [
    { fg: BLUE, bg: "rgba(47,73,198,0.10)", bd: "rgba(47,73,198,0.18)" },
    { fg: GREEN, bg: "rgba(22,163,74,0.10)", bd: "rgba(22,163,74,0.18)" },
    { fg: ORANGE, bg: "rgba(234,105,30,0.10)", bd: "rgba(234,105,30,0.18)" },
    { fg: PURPLE, bg: "rgba(124,58,237,0.10)", bd: "rgba(124,58,237,0.18)" },
    { fg: SKY, bg: "rgba(2,132,199,0.10)", bd: "rgba(2,132,199,0.18)" },
  ];
  return palettes[i % palettes.length];
}

/** ---------- Toast ---------- */
function useToast(topOffset: number) {
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err">("ok");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const show = useCallback(
    (m: string, t: "ok" | "err" = "ok") => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(m);
      setTone(t);

      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
          setMsg(null)
        );
      }, 1600);
    },
    [opacity]
  );

  const Toast = useMemo(() => {
    if (!msg) return null;
    const bg = tone === "ok" ? "rgba(47,73,198,0.12)" : "rgba(220,38,38,0.12)";
    const bd = tone === "ok" ? "rgba(47,73,198,0.20)" : "rgba(220,38,38,0.22)";
    const ic = tone === "ok" ? BLUE : "#dc2626";
    const icon = tone === "ok" ? "checkmark-circle-outline" : "close-circle-outline";

    return (
      <Animated.View style={[styles.toast, { opacity, top: topOffset, backgroundColor: bg, borderColor: bd }]}>
        <Ionicons name={icon as any} size={18} color={ic} />
        <Text style={styles.toastTxt}>{msg}</Text>
      </Animated.View>
    );
  }, [msg, opacity, topOffset, tone]);

  return { Toast, showToast: show };
}

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Toast, showToast } = useToast(insets.top + 8);

  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [locationLine, setLocationLine] = useState("");

  const [work, setWork] = useState(""); // ✅ siempre traer oficios del perfil worker si existen
  const [available, setAvailable] = useState(false);
  const [workPhotosCount, setWorkPhotosCount] = useState(0);

  const tags = useMemo(() => splitWorkToTags(work), [work]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const p = await getProfile();

      if (!p) {
        setFullName("");
        setPhotoUri(undefined);
        setLocationLine("");
        setWork("");
        setAvailable(false);
        setWorkPhotosCount(0);
        return;
      }

      setFullName(shortFullName(p.basic.firstName ?? "", p.basic.lastName ?? ""));
      setPhotoUri(p.basic.photoUri || undefined);

      setLocationLine(
        oneLineLocation({
          sector: p.basic.sector,
          municipalityName: p.basic.municipalityName,
          departmentName: p.basic.departmentName,
          zone: p.basic.zone,
        })
      );

      // ✅ IMPORTANTE: siempre preferimos los oficios guardados del worker (aunque no esté disponible)
      setWork(String(p.worker?.work ?? ""));

      setAvailable(!!p.worker?.isAvailable);

      const raw = await AsyncStorage.getItem(WORK_PHOTOS_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setWorkPhotosCount(Array.isArray(arr) ? arr.length : 0);
    } catch (e) {
      console.log("home-load-error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const onGoProfile = useCallback(() => router.push("/(tabs)/profile"), [router]);
  const onGoContacts = useCallback(() => router.push("/(tabs)/contacts"), [router]);
  const onGoWork = useCallback(() => router.push("/(tabs)/work"), [router]);
  const onGoWorkPhotos = useCallback(() => router.push("/(tabs)/work-photos"), [router]);

  const onToggleAvailable = useCallback(
    async (v: boolean) => {
      setAvailable(v);
      try {
        await setAvailability(v);
        showToast(v ? "Listo: apareces en búsqueda" : "Listo: estás oculto", "ok");
      } catch (e) {
        console.log("setAvailability-error", e);
        setAvailable(!v);
        showToast("No se pudo actualizar", "err");
      }
    },
    [showToast]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingTxt}>Cargando…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {Toast}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(12, insets.top + 8),
            paddingBottom: Math.max(16, insets.bottom + 16),
          },
        ]}
      >
        <View style={[styles.wrap, { maxWidth: MAX_W }]}>
          {/* HEADER */}
          <View style={styles.topCenter}>
            <Text style={styles.kicker}>INICIO</Text>

            <Pressable onPress={onGoProfile} style={({ pressed }) => [styles.bigAvatarWrap, pressed && { opacity: 0.92 }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.bigAvatarImg} />
              ) : (
                <View style={styles.bigAvatarPlaceholder}>
                  <Ionicons name="person-outline" size={34} color="#7C879B" />
                </View>
              )}
            </Pressable>

            <Text style={styles.hello} numberOfLines={1}>
              {fullName ? `Hola, ${fullName}` : "Hola"}
            </Text>

            {!!locationLine && (
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={16} color={MUTED} />
                <Text style={styles.locationTxt} numberOfLines={1}>
                  {locationLine}
                </Text>
              </View>
            )}

            {/* ✅ TAGS debajo de la dirección */}
            {tags.length > 0 && (
              <View style={styles.tagsBlock}>
                <View style={styles.tagsHeader}>
                  <Ionicons name="grid-outline" size={14} color={MUTED} />
                  <Text style={styles.tagsTitle}>OFICIOS</Text>
                </View>

                <View style={styles.tagsWrap}>
                  {tags.map((t, i) => {
                    const pal = paletteForIndex(i);
                    return (
                      <View key={`${t}-${i}`} style={[styles.tag, { backgroundColor: pal.bg, borderColor: pal.bd }]}>
                        <Text style={[styles.tagTxt, { color: pal.fg }]} numberOfLines={1}>
                          {t}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* ✅ DISPONIBLE (sin repetir textos en otra tarjeta) */}
          <View style={styles.statusCard}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: available ? "rgba(22,163,74,0.14)" : "rgba(11,18,32,0.06)" },
                ]}
              >
                <Ionicons name={available ? "checkmark" : "remove"} size={18} color={available ? GREEN : "#9AA7BD"} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>{available ? "Disponible" : "No disponible"}</Text>
                <Text style={styles.statusSub} numberOfLines={2}>
                  {available ? "Apareces en las búsquedas." : "Actívalo cuando estés listo para aparecer en la búsqueda."}
                </Text>
              </View>
            </View>

            <Switch
              value={available}
              onValueChange={onToggleAvailable}
              thumbColor="#fff"
              trackColor={{ false: "rgba(11,18,32,0.18)", true: "rgba(22,163,74,0.35)" }}
            />
          </View>

          {/* ✅ CARDS centrados */}
          <View style={styles.grid2}>
            <Pressable onPress={onGoProfile} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.92 }]}>
              <View style={[styles.actionIcon, { backgroundColor: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.18)" }]}>
                <Ionicons name="person-outline" size={20} color={PURPLE} />
              </View>
              <Text style={styles.actionTitle}>Mi perfil</Text>
              <Text style={styles.actionDesc}>Editar datos.</Text>
            </Pressable>

            <Pressable onPress={onGoContacts} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.92 }]}>
              <View style={[styles.actionIcon, { backgroundColor: "rgba(2,132,199,0.12)", borderColor: "rgba(2,132,199,0.18)" }]}>
                <Ionicons name="chatbubbles-outline" size={20} color={SKY} />
              </View>
              <Text style={styles.actionTitle}>Contactos</Text>
              <Text style={styles.actionDesc}>Mensajes y personas.</Text>
            </Pressable>

            <Pressable onPress={onGoWorkPhotos} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.92 }]}>
              <View style={[styles.actionIcon, { backgroundColor: "rgba(234,105,30,0.12)", borderColor: "rgba(234,105,30,0.18)" }]}>
                <Ionicons name="images-outline" size={20} color={ORANGE} />
              </View>
              <Text style={styles.actionTitle}>Fotos de trabajo</Text>
              <Text style={styles.actionDesc}>{workPhotosCount} subidas</Text>
            </Pressable>

            <Pressable onPress={onGoWork} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.92 }]}>
              <View style={[styles.actionIcon, { backgroundColor: "rgba(47,73,198,0.12)", borderColor: "rgba(47,73,198,0.18)" }]}>
                <Ionicons name="briefcase-outline" size={20} color={BLUE} />
              </View>
              <Text style={styles.actionTitle}>Editar oficios</Text>
              <Text style={styles.actionDesc}>{tags.length} etiqueta{tags.length === 1 ? "" : "s"}</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { marginTop: 10, fontFamily: "Poppins_500Medium", color: MUTED },

  container: { paddingHorizontal: 18, flexGrow: 1, justifyContent: "center", alignItems: "center" },
  wrap: { width: "100%" },
  topCenter: { alignItems: "center", marginBottom: 12 },

  kicker: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#7C879B",
    letterSpacing: 1.1,
    marginBottom: 20,
    textTransform: "uppercase",
  },

  bigAvatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(11,18,32,0.10)",
    backgroundColor: "#EEF2FF",
  },
  bigAvatarImg: { width: "100%", height: "100%" },
  bigAvatarPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ✅ menos grueso
  hello: { marginTop: 10, fontFamily: "Poppins_600SemiBold", fontSize: 21, color: TEXT },

  locationPill: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(11,18,32,0.04)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
    maxWidth: "100%",
  },
  locationTxt: { fontFamily: "Poppins_500Medium", fontSize: 12.8, color: MUTED, flexShrink: 1 },

  tagsBlock: { width: "100%", marginTop: 10, alignItems: "center" },
  tagsHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  tagsTitle: { fontFamily: "Poppins_500Medium", fontSize: 12.2, color: MUTED },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },

  tag: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, maxWidth: "100%" },
  tagTxt: { fontFamily: "Poppins_500Medium", fontSize: 12.5, maxWidth: 180 },

  statusCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 10 },
  statusDot: { width: 34, height: 34, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontFamily: "Poppins_500Medium", fontSize: 14, color: TEXT },
  statusSub: { marginTop: 1, fontFamily: "Poppins_400Regular", fontSize: 12.2, color: MUTED },

  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  // ✅ centrado
  actionCard: {
    width: "48.6%",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 12,
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 10,
  },
  actionTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.6,
    color: TEXT,
    textAlign: "center",
  },
  actionDesc: {
    marginTop: 3,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.1,
    color: MUTED,
    textAlign: "center",
  },

  toast: {
    position: "absolute",
    alignSelf: "center",
    left: 18,
    right: 18,
    zIndex: 999,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toastTxt: { flex: 1, fontFamily: "Poppins_500Medium", fontSize: 13, color: TEXT },
});
