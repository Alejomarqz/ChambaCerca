// app/(tabs)/contacts.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const PLACEHOLDER = "#9AA7BD";

const BLUE = "#2f49c6";
const ORANGE = "#ea691e";
const DANGER = "#dc2626";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";

const KEY_THREADS = "chamba_chat_threads_v1";

type ChatThread = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string; // ISO
  unreadCount: number;

  pinned?: boolean;
  blocked?: boolean;
  reported?: boolean;
};

function nowISO() {
  return new Date().toISOString();
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

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
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setMsg(null));
      }, 1600);
    },
    [opacity]
  );

  const Toast = useMemo(() => {
    if (!msg) return null;

    const bg =
      tone === "ok" ? "rgba(47,73,198,0.12)" : tone === "warn" ? "rgba(234,105,30,0.12)" : "rgba(220,38,38,0.12)";
    const bd =
      tone === "ok" ? "rgba(47,73,198,0.20)" : tone === "warn" ? "rgba(234,105,30,0.22)" : "rgba(220,38,38,0.22)";
    const ic = tone === "ok" ? BLUE : tone === "warn" ? ORANGE : DANGER;
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

export default function ContactsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Toast, showToast } = useToast(insets.top + 8);

  const [threads, setThreads] = useState<ChatThread[]>([]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetThread, setSheetThread] = useState<ChatThread | null>(null);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setSheetThread(null), 120);
  }, []);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(KEY_THREADS);
    const arr = safeParse<ChatThread[]>(raw, []);
    setThreads(Array.isArray(arr) ? arr : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...threads];
    copy.sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (bp !== ap) return bp - ap;

      const at = new Date(a.updatedAt || 0).getTime();
      const bt = new Date(b.updatedAt || 0).getTime();
      return bt - at;
    });
    return copy;
  }, [threads]);

  const persist = useCallback(async (next: ChatThread[]) => {
    setThreads(next);
    await AsyncStorage.setItem(KEY_THREADS, JSON.stringify(next));
  }, []);

  const upsertThread = useCallback(
    async (patch: Partial<ChatThread> & { id: string }) => {
      const next = threads.map((t) => (t.id === patch.id ? { ...t, ...patch } : t));
      await persist(next);
    },
    [persist, threads]
  );

  const removeThread = useCallback(
    async (id: string) => {
      const next = threads.filter((t) => t.id !== id);
      await persist(next);
    },
    [persist, threads]
  );

  const doPinToggle = useCallback(
    async (t: ChatThread) => {
      const isPinned = !!t.pinned;
      await upsertThread({ id: t.id, pinned: !isPinned, updatedAt: nowISO() });
      showToast(!isPinned ? "Fijado arriba" : "Quitado de fijo", "ok");
    },
    [showToast, upsertThread]
  );

  const doBlockToggle = useCallback(
    async (t: ChatThread) => {
      const isBlocked = !!t.blocked;
      await upsertThread({ id: t.id, blocked: !isBlocked });
      showToast(!isBlocked ? "Contacto bloqueado" : "Contacto desbloqueado", "warn");
    },
    [showToast, upsertThread]
  );

  const doReport = useCallback(
    async (t: ChatThread) => {
      await upsertThread({ id: t.id, reported: true });
      showToast("Reporte enviado", "ok");
    },
    [showToast, upsertThread]
  );

  const doDelete = useCallback(
    (t: ChatThread) => {
      Alert.alert("Eliminar chat", "¿Seguro que deseas eliminar este chat?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await removeThread(t.id);
            showToast("Chat eliminado", "ok");
          },
        },
      ]);
    },
    [removeThread, showToast]
  );

  const openActions = useCallback(
    (t: ChatThread) => {
      if (Platform.OS === "ios") {
        const isPinned = !!t.pinned;
        const isBlocked = !!t.blocked;

        const actions = [
          isPinned ? "Quitar fijo" : "Fijar arriba",
          isBlocked ? "Desbloquear" : "Bloquear",
          "Reportar",
          "Eliminar",
          "Cancelar",
        ];
        const cancelIndex = actions.length - 1;
        const destructiveIndex = 3;

        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: t.title,
            options: actions,
            cancelButtonIndex: cancelIndex,
            destructiveButtonIndex: destructiveIndex,
          },
          async (idx) => {
            if (idx === 0) await doPinToggle(t);
            if (idx === 1) await doBlockToggle(t);
            if (idx === 2) await doReport(t);
            if (idx === 3) doDelete(t);
          }
        );
        return;
      }

      setSheetThread(t);
      setSheetVisible(true);
    },
    [doBlockToggle, doDelete, doPinToggle, doReport]
  );

  const onOpenThread = useCallback(
    async (t: ChatThread) => {
      if (t.blocked) {
        showToast("Este chat está bloqueado", "warn");
        return;
      }
      await upsertThread({ id: t.id, unreadCount: 0 });
      router.push(`/contacts/${t.id}`);
    },
    [router, showToast, upsertThread]
  );

  return (
    <SafeAreaView style={styles.safe}>
      {Toast}

      {/* Android sheet */}
      <Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Pressable style={[styles.sheetPanel, { paddingBottom: Math.max(insets.bottom, 14) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle} numberOfLines={1}>
              {sheetThread?.title || "Acciones"}
            </Text>
            <Text style={styles.sheetSub}>Acciones del chat</Text>

            <View style={{ height: 10 }} />

            <SheetButton
              icon="pin"
              label={sheetThread?.pinned ? "Quitar fijo" : "Fijar arriba"}
              color={ORANGE}
              onPress={async () => {
                if (!sheetThread) return;
                closeSheet();
                await doPinToggle(sheetThread);
              }}
            />

            <SheetButton
              icon="ban-outline"
              label={sheetThread?.blocked ? "Desbloquear" : "Bloquear"}
              color={DANGER}
              onPress={async () => {
                if (!sheetThread) return;
                closeSheet();
                await doBlockToggle(sheetThread);
              }}
            />

            <SheetButton
              icon="flag-outline"
              label="Reportar"
              color={BLUE}
              onPress={async () => {
                if (!sheetThread) return;
                closeSheet();
                await doReport(sheetThread);
              }}
            />

            <SheetButton
              icon="trash-outline"
              label="Eliminar"
              color={DANGER}
              destructive
              onPress={() => {
                if (!sheetThread) return;
                closeSheet();
                doDelete(sheetThread);
              }}
            />

            <Pressable onPress={closeSheet} style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.9 }]}>
              <Text style={styles.sheetCancelTxt}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>Contactos</Text>
            <Text style={styles.hSub}>Aquí se acumulan tus chats. Solo te escribirán primero (tú recibes).</Text>
          </View>

          {/* (Si querés, este botón lo quitamos luego) */}
          <View style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={18} color={PURPLE} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chats</Text>

          {sorted.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>Aún no tienes chats</Text>
                <Text style={styles.emptySub}>Cuando alguien te escriba, aparecerá aquí automáticamente.</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {sorted.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => onOpenThread(t)}
                  onLongPress={() => openActions(t)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person-outline" size={18} color={PURPLE} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {t.title}
                      </Text>

                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        {!!t.pinned && <Ionicons name="pin" size={14} color={ORANGE} />}
                        {!!t.blocked && <Ionicons name="ban-outline" size={16} color={DANGER} />}

                        {/* hora si querés, se la agregamos aquí luego */}
                      </View>
                    </View>

                    <Text style={styles.rowSub} numberOfLines={1}>
                      {t.lastMessage || "—"}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={PLACEHOLDER} />
                </Pressable>
              ))}
            </View>
          )}

          {/* ✅ Banner info (YA NO PARECE MENSAJE) */}
          <View style={styles.banner}>
            <View style={styles.bannerBar} />
            <View style={styles.bannerBody}>
              <View style={styles.bannerIcon}>
                <Ionicons name="shield-checkmark-outline" size={16} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Aviso de seguridad</Text>
                <Text style={styles.bannerText}>
                  Primero hablen aquí. Comparte tu WhatsApp solo si tú quieres.
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.smallHint}>
            Tip: mantén presionado un chat para Fijar / Bloquear / Reportar / Eliminar.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SheetButton({
  icon,
  label,
  color,
  destructive,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.sheetBtn, pressed && { opacity: 0.9 }]}>
      <View style={[styles.sheetBtnIcon, { backgroundColor: `${color}14`, borderColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.sheetBtnTxt, destructive && { color: DANGER }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={PLACEHOLDER} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 10 : 14, paddingBottom: 24 },

  header: { marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  hTitle: { fontSize: 18, color: TEXT, fontFamily: "Poppins_600SemiBold" },
  hSub: { marginTop: 4, color: MUTED, fontFamily: "Poppins_400Regular", lineHeight: 18 },

  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(124,58,237,0.10)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  card: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, gap: 12 },
  sectionTitle: { color: TEXT, fontFamily: "Poppins_600SemiBold", fontSize: 13 },

  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(47,73,198,0.10)",
    borderWidth: 1,
    borderColor: "rgba(47,73,198,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: TEXT, fontFamily: "Poppins_600SemiBold" },
  emptySub: { marginTop: 2, color: MUTED, fontFamily: "Poppins_400Regular", lineHeight: 17 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(124,58,237,0.10)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowTitle: { flex: 1, color: TEXT, fontFamily: "Poppins_600SemiBold" },
  rowSub: { marginTop: 2, color: MUTED, fontFamily: "Poppins_400Regular" },

  // ✅ banner distinto a "mensaje"
  banner: {
    marginTop: 2,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.18)",
    backgroundColor: "rgba(22,163,74,0.08)",
  },
  bannerBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: "rgba(22,163,74,0.35)",
  },
  bannerBody: { flexDirection: "row", gap: 10, paddingVertical: 12, paddingHorizontal: 12, paddingLeft: 14 },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { color: TEXT, fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  bannerText: { marginTop: 2, color: MUTED, fontFamily: "Poppins_400Regular", lineHeight: 17 },

  smallHint: { marginTop: 2, color: "#7C879B", fontFamily: "Poppins_400Regular", fontSize: 12 },

  toast: {
    position: "absolute",
    alignSelf: "center",
    left: 16,
    right: 16,
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

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(11,18,32,0.35)", justifyContent: "flex-end" },
  sheetPanel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: "rgba(11,18,32,0.14)", marginBottom: 10 },
  sheetTitle: { color: TEXT, fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  sheetSub: { marginTop: 2, color: MUTED, fontFamily: "Poppins_400Regular", lineHeight: 18 },

  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  sheetBtnIcon: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sheetBtnTxt: { flex: 1, color: TEXT, fontFamily: "Poppins_500Medium" },

  sheetCancel: {
    marginTop: 2,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
  },
  sheetCancelTxt: { color: MUTED, fontFamily: "Poppins_500Medium" },
});
