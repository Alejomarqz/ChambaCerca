// app/(tabs)/work-photos.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";

const ORANGE = "#ea691e";
const RED = "#dc2626";

const WORK_PHOTOS_KEY = "chamba_work_photos_v1";
const MAX_PHOTOS = 12;

const G = 10;
const COLS = 3;

async function pickFromCameraOrGallery(mode: "camera" | "gallery") {
  if (mode === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("NO_CAMERA_PERMISSION");
    return ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.85 });
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error("NO_GALLERY_PERMISSION");
    return ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.85,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
  }
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
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setMsg(null));
      }, 1600);
    },
    [opacity]
  );

  const Toast = useMemo(() => {
    if (!msg) return null;

    const bg =
      tone === "ok"
        ? "rgba(234,105,30,0.12)"
        : tone === "warn"
        ? "rgba(234,105,30,0.12)"
        : "rgba(220,38,38,0.12)";

    const bd =
      tone === "ok"
        ? "rgba(234,105,30,0.22)"
        : tone === "warn"
        ? "rgba(234,105,30,0.22)"
        : "rgba(220,38,38,0.22)";

    const ic = tone === "err" ? RED : ORANGE;
    const icon =
      tone === "ok" ? "checkmark-circle-outline" : tone === "warn" ? "alert-circle-outline" : "close-circle-outline";

    return (
      <Animated.View style={[styles.toast, { top, opacity, backgroundColor: bg, borderColor: bd }]}>
        <Ionicons name={icon as any} size={18} color={ic} />
        <Text style={styles.toastTxt}>{msg}</Text>
      </Animated.View>
    );
  }, [msg, opacity, tone, top]);

  return { Toast, showToast: show };
}

export default function WorkPhotosTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { Toast, showToast } = useToast(insets.top + 8);

  const TILE = useMemo(() => {
    const sidePadding = 18 * 2;
    return Math.floor((width - sidePadding - G * (COLS - 1)) / COLS);
  }, [width]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(WORK_PHOTOS_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setPhotos(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.log("work-photos-load-error", e);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(async (next: string[]) => {
    setPhotos(next);
    await AsyncStorage.setItem(WORK_PHOTOS_KEY, JSON.stringify(next));
  }, []);

  const addPhotoDirect = useCallback(
    async (mode: "camera" | "gallery") => {
      if (saving) return;
      if (photos.length >= MAX_PHOTOS) {
        showToast(`Máximo ${MAX_PHOTOS} fotos`, "warn");
        return;
      }

      try {
        setSaving(true);
        const r = await pickFromCameraOrGallery(mode);
        if (r.canceled) return;

        const uri = r.assets?.[0]?.uri;
        if (!uri) return;

        const next = [uri, ...photos].slice(0, MAX_PHOTOS);
        await persist(next);
        showToast("Foto agregada", "ok");
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg === "NO_CAMERA_PERMISSION") showToast("Permiso de cámara requerido", "warn");
        else if (msg === "NO_GALLERY_PERMISSION") showToast("Permiso de galería requerido", "warn");
        else showToast("No se pudo agregar", "err");
        console.log("work-photos-add-error", e);
      } finally {
        setSaving(false);
      }
    },
    [persist, photos, saving, showToast]
  );

  const onAdd = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: "Agregar foto", options: ["Tomar foto", "Elegir de galería", "Cancelar"], cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) addPhotoDirect("camera");
          if (idx === 1) addPhotoDirect("gallery");
        }
      );
    } else {
      Alert.alert("Agregar foto", "Selecciona una opción", [
        { text: "Tomar foto", onPress: () => addPhotoDirect("camera") },
        { text: "Elegir de galería", onPress: () => addPhotoDirect("gallery") },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  }, [addPhotoDirect]);

  const onRemove = useCallback(
    (uri: string) => {
      Alert.alert("Eliminar foto", "¿Quieres eliminar esta foto?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const next = photos.filter((x) => x !== uri);
            await persist(next);
            showToast("Foto eliminada", "ok");
          },
        },
      ]);
    },
    [persist, photos, showToast]
  );

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
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Fotos de trabajo</Text>
          <Text style={styles.sub}>Sube fotos reales. Esto aumenta la confianza y tu visibilidad.</Text>
        </View>

        <Pressable
          onPress={onAdd}
          disabled={saving || photos.length >= MAX_PHOTOS}
          style={({ pressed }) => [
            styles.addBtn,
            (saving || photos.length >= MAX_PHOTOS) && { opacity: 0.55 },
            pressed && !saving && photos.length < MAX_PHOTOS && { opacity: 0.9 },
          ]}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Tus fotos</Text>
            <Text style={styles.countTxt}>
              {photos.length} / {MAX_PHOTOS}
            </Text>
          </View>

          {photos.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={22} color={MUTED} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>Aún no tienes fotos</Text>
                <Text style={styles.emptyTxt}>Presiona “+” para subir tu primer trabajo.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.grid}>
              {photos.map((uri) => (
                <Pressable
                  key={uri}
                  onPress={() => setPreview(uri)}
                  onLongPress={() => onRemove(uri)}
                  style={({ pressed }) => [
                    styles.tile,
                    { width: TILE, height: TILE },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Image source={{ uri }} style={styles.img} />
                  <View style={styles.badge}>
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.hint}>Tip: Mantén presionada una foto para eliminarla.</Text>
        </View>

        <View style={styles.note}>
          <Ionicons name="sparkles-outline" size={18} color={ORANGE} />
          <Text style={styles.noteTxt}>Entre más fotos reales tengas, más confianza generas y más te contactan.</Text>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Preview */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)}>
          <View style={styles.previewCard}>
            <Pressable style={styles.previewClose} onPress={() => setPreview(null)}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>

            {preview ? <Image source={{ uri: preview }} style={styles.previewImg} /> : null}

            <View style={styles.previewActions}>
              <Pressable
                onPress={() => {
                  const uri = preview;
                  setPreview(null);
                  if (uri) setTimeout(() => onRemove(uri), 150);
                }}
                style={({ pressed }) => [styles.previewDelete, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.previewDeleteTxt}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  sub: { marginTop: 3, fontFamily: "Poppins_400Regular", fontSize: 12.5, color: MUTED, lineHeight: 16 },

  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  container: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16 },

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },

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
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontFamily: "Poppins_700Bold", fontSize: 13, color: TEXT },
  emptyTxt: { marginTop: 2, fontFamily: "Poppins_400Regular", fontSize: 12.5, color: MUTED, lineHeight: 16 },

  grid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: G },

  tile: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    backgroundColor: "rgba(11,18,32,0.03)",
  },
  img: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  hint: { marginTop: 10, fontFamily: "Poppins_400Regular", fontSize: 12, color: "#7C879B" },

  note: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.18)",
    backgroundColor: "rgba(234,105,30,0.10)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  noteTxt: { flex: 1, fontFamily: "Poppins_500Medium", fontSize: 12.8, color: TEXT, lineHeight: 17 },

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

  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 18,
    justifyContent: "center",
  },
  previewCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  previewClose: {
    position: "absolute",
    zIndex: 2,
    right: 10,
    top: 10,
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImg: { width: "100%", height: 420, backgroundColor: "rgba(0,0,0,0.15)" },
  previewActions: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  previewDelete: {
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  previewDeleteTxt: { fontFamily: "Poppins_700Bold", fontSize: 13.5, color: "#fff" },
});
