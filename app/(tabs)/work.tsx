// app/(tabs)/work.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getProfile, upsertWorker } from "../../storage/profileStorage";

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
const PINK = "#db2777";
const AMBER = "#d97706";

// ✅ SOLO 4
const MAX_TAGS = 4;

function capWords(s: string) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return t
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeTag(s: string) {
  return capWords(String(s ?? "").replace(/\s+/g, " ").trim());
}

function splitWorkToTags(work: string) {
  const raw = String(work ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => normalizeTag(x))
    .filter(Boolean)
    .slice(0, MAX_TAGS); // ✅ límite 4
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_TAGS) break; // ✅ no pasar de 4
  }
  return out;
}

function paletteForIndex(i: number) {
  const palettes = [
    { fg: BLUE, bg: "rgba(47,73,198,0.10)", bd: "rgba(47,73,198,0.18)" },
    { fg: GREEN, bg: "rgba(22,163,74,0.10)", bd: "rgba(22,163,74,0.18)" },
    { fg: ORANGE, bg: "rgba(234,105,30,0.10)", bd: "rgba(234,105,30,0.18)" },
    { fg: PURPLE, bg: "rgba(124,58,237,0.10)", bd: "rgba(124,58,237,0.18)" },
    { fg: SKY, bg: "rgba(2,132,199,0.10)", bd: "rgba(2,132,199,0.18)" },
    { fg: PINK, bg: "rgba(219,39,119,0.10)", bd: "rgba(219,39,119,0.18)" },
    { fg: AMBER, bg: "rgba(217,119,6,0.10)", bd: "rgba(217,119,6,0.18)" },
  ];
  return palettes[i % palettes.length];
}

/** Toast simple */
function useToast(top: number) {
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const show = useCallback(
    (m: string, t: "ok" | "warn" | "err" = "ok") => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(m);
      setTone(t);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          setMsg(null);
        });
      }, 1600);
    },
    [opacity]
  );

  const Toast = useMemo(() => {
    if (!msg) return null;

    const bg =
      tone === "ok"
        ? "rgba(47,73,198,0.12)"
        : tone === "warn"
        ? "rgba(234,105,30,0.12)"
        : "rgba(220,38,38,0.12)";
    const bd =
      tone === "ok"
        ? "rgba(47,73,198,0.20)"
        : tone === "warn"
        ? "rgba(234,105,30,0.22)"
        : "rgba(220,38,38,0.22)";
    const ic = tone === "ok" ? BLUE : tone === "warn" ? ORANGE : "#dc2626";
    const icon =
      tone === "ok"
        ? "checkmark-circle-outline"
        : tone === "warn"
        ? "alert-circle-outline"
        : "close-circle-outline";

    return (
      <Animated.View
        style={[
          styles.toast,
          { top, opacity, backgroundColor: bg, borderColor: bd },
        ]}
      >
        <Ionicons name={icon as any} size={18} color={ic} />
        <Text style={styles.toastTxt}>{msg}</Text>
      </Animated.View>
    );
  }, [msg, opacity, tone, top]);

  return { Toast, showToast: show };
}

export default function WorkTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Toast, showToast } = useToast(insets.top + 8);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const canAdd = useMemo(() => normalizeTag(input).length >= 2, [input]);
  const remaining = Math.max(0, MAX_TAGS - tags.length);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const p = await getProfile();
      const initial = splitWorkToTags(p?.worker?.work ?? "");
      setTags(uniqueTags(initial));
    } catch (e) {
      console.log("work-load-error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTag = useCallback(() => {
    const t = normalizeTag(input);
    if (!t) return;

    if (tags.length >= MAX_TAGS) {
      showToast(`Máximo ${MAX_TAGS} oficios`, "warn");
      return;
    }

    const next = uniqueTags([t, ...tags]);
    setTags(next);
    setInput("");
    Keyboard.dismiss();
  }, [input, showToast, tags]);

  const removeTag = useCallback((t: string) => {
    setTags((prev) => prev.filter((x) => x.toLowerCase() !== t.toLowerCase()));
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;

    if (tags.length === 0) {
      showToast("Agrega al menos un oficio", "warn");
      return;
    }

    try {
      setSaving(true);
      const work = tags.join(", ");
      await upsertWorker({ work });
      showToast("Oficios guardados", "ok");
      router.back();
    } catch (e) {
      console.log("work-save-error", e);
      showToast("No se pudo guardar", "err");
    } finally {
      setSaving(false);
    }
  }, [router, saving, showToast, tags]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingTxt}>Cargando…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {Toast}

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Editar oficios</Text>
          <Text style={styles.sub}>
            Agrega lo que sabes hacer. Se mostrará como etiquetas en tu perfil.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Input */}
        <View style={styles.card}>
          <Text style={styles.label}>Nuevo oficio</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <Ionicons name="briefcase-outline" size={18} color={ORANGE} />
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ej: Albañil"
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={() => (canAdd ? addTag() : null)}
              />
            </View>

            <Pressable
              onPress={addTag}
              disabled={!canAdd || remaining === 0}
              style={({ pressed }) => [
                styles.addBtn,
                (!canAdd || remaining === 0) && { opacity: 0.55 },
                pressed && canAdd && remaining > 0 && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnTxt}>Agregar</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Máximo {MAX_TAGS}. Restantes:{" "}
            <Text style={styles.hintStrong}>{remaining}</Text>
          </Text>
        </View>

        {/* Tags */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Tus oficios</Text>
            <Text style={styles.countTxt}>
              {tags.length} / {MAX_TAGS}
            </Text>
          </View>

          {tags.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={20} color={MUTED} />
              <Text style={styles.emptyTxt}>
                Agrega tus oficios para que te encuentren más rápido.
              </Text>
            </View>
          ) : (
            <View style={styles.tagsWrap}>
              {tags.map((t, i) => {
                const pal = paletteForIndex(i);
                return (
                  <View
                    key={t}
                    style={[
                      styles.tag,
                      { backgroundColor: pal.bg, borderColor: pal.bd },
                    ]}
                  >
                    <Text
                      style={[styles.tagTxt, { color: pal.fg }]}
                      numberOfLines={1}
                    >
                      {t}
                    </Text>
                    <Pressable
                      onPress={() => removeTag(t)}
                      style={({ pressed }) => [
                        styles.tagX,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Ionicons name="close" size={14} color={pal.fg} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.tip}>
            Tip: elige oficios reales (ej: “Electricista”, “Plomero”). Evita
            frases largas.
          </Text>
        </View>

        {/* Save */}
        <Pressable
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            saving && { opacity: 0.65 },
            pressed && !saving && { opacity: 0.9 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="save-outline" size={18} color="#fff" />
          )}
          <Text style={styles.saveBtnTxt}>
            {saving ? "Guardando…" : "Guardar"}
          </Text>
        </Pressable>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { marginTop: 10, fontFamily: "Poppins_500Medium", color: MUTED },

  header: {
    paddingTop: Platform.OS === "android" ? 10 : 6,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  h1: { fontFamily: "Poppins_700Bold", fontSize: 18, color: TEXT },
  sub: {
    marginTop: 3,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 16,
  },

  container: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16 },

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },

  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: TEXT,
    marginBottom: 8,
  },

  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: TEXT,
    padding: 0,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  addBtnTxt: { fontFamily: "Poppins_700Bold", fontSize: 12.5, color: "#fff" },

  hint: { marginTop: 10, fontFamily: "Poppins_400Regular", fontSize: 12, color: MUTED },
  hintStrong: { fontFamily: "Poppins_700Bold", color: TEXT },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Poppins_700Bold", fontSize: 14.5, color: TEXT },
  countTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: MUTED },

  emptyBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    backgroundColor: "rgba(11,18,32,0.03)",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  emptyTxt: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 16,
  },

  tagsWrap: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: "100%",
  },
  tagTxt: { fontFamily: "Poppins_700Bold", fontSize: 12.5, maxWidth: 180 },
  tagX: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
  },

  tip: { marginTop: 12, fontFamily: "Poppins_400Regular", fontSize: 12, color: MUTED, lineHeight: 16 },

  saveBtn: {
    marginTop: 12,
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  saveBtnTxt: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#fff" },

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
  toastTxt: { flex: 1, fontFamily: "Poppins_600SemiBold", fontSize: 13, color: TEXT },
});
