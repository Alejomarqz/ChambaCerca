// app/contacts/[id].tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getMessages,
  getThread,
  markThreadReadByWorker,
  workerSendMessage,
  type ChatMessage,
} from "../../storage/chatStorage";

const BG = "#F6F8FC";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const BLUE = "#2f49c6";
const ORANGE = "#ea691e";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ✅ Si tu mensaje usa otro campo para fecha, AJÚSTALO AQUÍ.
function getMsgDate(m: any): Date {
  const raw = m?.createdAt || m?.updatedAt || m?.timestamp || m?.time || m?.date;
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") return new Date(raw);
  // string ISO
  const d = new Date(raw);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${pad2(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ContactThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const threadId = String(id || "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState("Cliente");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  // autoscroll inteligente
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const th = await getThread(threadId);
      setTitle(th?.seekerName || "Cliente");

      const m = await getMessages(threadId);
      setMsgs(m);

      await markThreadReadByWorker(threadId);

      setTimeout(() => {
        if (isNearBottom) scrollToBottom(false);
      }, 50);
    } catch (e) {
      console.log("thread-load-error", e);
    } finally {
      setLoading(false);
    }
  }, [isNearBottom, scrollToBottom, threadId]);

  useFocusEffect(
    useCallback(() => {
      if (!threadId) return;
      load();
    }, [load, threadId])
  );

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [sending, text]);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || sending) return;

    try {
      setSending(true);
      Keyboard.dismiss();
      setText("");

      await workerSendMessage(threadId, t);

      const m = await getMessages(threadId);
      setMsgs(m);

      setTimeout(() => {
        if (isNearBottom) scrollToBottom(true);
        else setShowJump(true);
      }, 60);
    } catch (e) {
      console.log("send-error", e);
    } finally {
      setSending(false);
    }
  }, [isNearBottom, scrollToBottom, sending, text, threadId]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;

    const paddingToBottom = 80;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    const near = distanceFromBottom <= paddingToBottom;

    setIsNearBottom(near);

    if (near) setShowJump(false);
    else setShowJump(true);
  }, []);

  const keyboardOffset = Platform.OS === "ios" ? 8 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Chat interno (WhatsApp solo si el usuario lo comparte aquí)
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingTxt}>Cargando…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={keyboardOffset}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.chat}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={onScroll}
                scrollEventThrottle={16}
                onContentSizeChange={() => {
                  if (isNearBottom) scrollToBottom(false);
                  else setShowJump(true);
                }}
              >
                {msgs.map((m, idx) => {
                  const mine = (m as any).from === "worker";
                  const author = mine ? "Tú" : title;

                  const d = getMsgDate(m);
                  const time = formatTime(d);

                  const prev = idx > 0 ? msgs[idx - 1] : null;
                  const prevDate = prev ? getMsgDate(prev) : null;
                  const showDay = !prevDate || !isSameDay(prevDate, d);

                  return (
                    <View key={(m as any).id || `${idx}-${time}`}>
                      {/* ✅ Separador por día */}
                      {showDay && (
                        <View style={styles.dayWrap}>
                          <View style={styles.dayPill}>
                            <Text style={styles.dayTxt}>{dayLabel(d)}</Text>
                          </View>
                        </View>
                      )}

                      <View
                        style={[
                          styles.bubbleRow,
                          mine ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" },
                        ]}
                      >
                        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                          {/* Nombre */}
                          <Text
                            style={[
                              styles.author,
                              mine ? { color: "rgba(255,255,255,0.85)" } : { color: MUTED },
                            ]}
                            numberOfLines={1}
                          >
                            {author}
                          </Text>

                          {/* Texto */}
                          <Text style={[styles.bubbleTxt, mine ? { color: "#fff" } : { color: TEXT }]}>
                            {(m as any).text}
                          </Text>

                          {/* Hora + estado */}
                          <View style={styles.metaRow}>
                            <Text style={[styles.metaTxt, mine ? styles.metaMine : styles.metaOther]}>{time}</Text>

                            {mine && (
                              <View style={styles.sentWrap}>
                                <Text style={styles.sentTxt}>Enviado</Text>
                                <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.9)" />
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {msgs.length === 0 && (
                  <View style={styles.emptyChat}>
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={ORANGE} />
                    <Text style={styles.emptyTxt}>Cuando te escriban, verás los mensajes aquí.</Text>
                  </View>
                )}

                <View style={{ height: 8 }} />
              </ScrollView>

              {/* Ir al final */}
              {showJump && msgs.length > 0 && (
                <Pressable
                  onPress={() => {
                    scrollToBottom(true);
                    setShowJump(false);
                    setIsNearBottom(true);
                  }}
                  style={({ pressed }) => [styles.jumpBtn, pressed && { opacity: 0.92 }]}
                >
                  <Ionicons name="arrow-down" size={16} color="#fff" />
                  <Text style={styles.jumpTxt}>Ir al final</Text>
                </Pressable>
              )}

              <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Escribe tu respuesta…"
                    placeholderTextColor="#9AA7BD"
                    style={styles.input}
                    multiline
                    returnKeyType="send"
                    onSubmitEditing={onSend}
                    blurOnSubmit
                  />
                </View>

                <Pressable
                  onPress={onSend}
                  disabled={!canSend}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    !canSend && { opacity: 0.55 },
                    pressed && canSend && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { marginTop: 10, fontFamily: "Poppins_500Medium", color: MUTED },

  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
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
  sub: { marginTop: 3, fontFamily: "Poppins_400Regular", fontSize: 12.5, color: MUTED },

  chat: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12 },

  // separador día
  dayWrap: { alignItems: "center", marginVertical: 8 },
  dayPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(11,18,32,0.06)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
  },
  dayTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: MUTED },

  bubbleRow: { flexDirection: "row", marginBottom: 10 },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  bubbleMine: { backgroundColor: BLUE, borderColor: "rgba(0,0,0,0.06)" },
  bubbleOther: { backgroundColor: "#fff", borderColor: "rgba(11,18,32,0.08)" },

  author: { fontFamily: "Poppins_600SemiBold", fontSize: 11.5, marginBottom: 4 },
  bubbleTxt: { fontFamily: "Poppins_500Medium", fontSize: 13.5, lineHeight: 18 },

  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  metaTxt: { fontFamily: "Poppins_500Medium", fontSize: 11.5 },
  metaMine: { color: "rgba(255,255,255,0.85)" },
  metaOther: { color: MUTED },

  sentWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  sentTxt: { fontFamily: "Poppins_500Medium", fontSize: 11.5, color: "rgba(255,255,255,0.85)" },

  emptyChat: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    backgroundColor: "rgba(11,18,32,0.03)",
  },
  emptyTxt: { fontFamily: "Poppins_500Medium", color: MUTED, textAlign: "center" },

  composer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { fontFamily: "Poppins_500Medium", fontSize: 13.5, color: TEXT, padding: 0, maxHeight: 90 },
  sendBtn: { width: 46, height: 46, borderRadius: 16, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },

  jumpBtn: {
    position: "absolute",
    right: 18,
    bottom: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: BLUE,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  jumpTxt: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 12.5 },
});
