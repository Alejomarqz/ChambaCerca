// app/onboarding/worker-form.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DEPARTMENTS, getMunicipalities, Option } from "../../data/gtLocations";
import { setCheckpoint } from "../../storage/bootStorage";
import { upsertBasic, upsertWorker } from "../../storage/profileStorage";

const { width } = Dimensions.get("window");
const MAX_W = Math.min(420, width - 44);

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";
const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

type AvKey = "manana" | "tarde" | "noche" | "fin";
const AVAIL: { key: AvKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "manana", label: "Mañana", icon: "sunny-outline" },
  { key: "tarde", label: "Tarde", icon: "partly-sunny-outline" },
  { key: "noche", label: "Noche", icon: "moon-outline" },
  { key: "fin", label: "Fin de semana", icon: "calendar-outline" },
];

function PickerModal({
  visible,
  title,
  options,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  onClose: () => void;
  onPick: (opt: Option) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.name.toLowerCase().includes(s));
  }, [q, options]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}>
              <Ionicons name="close" size={20} color={TEXT} />
            </Pressable>
          </View>

          <View style={styles.modalSearchWrap}>
            <Ionicons name="search-outline" size={18} color={MUTED} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar…"
              placeholderTextColor="#9AA7BD"
              style={styles.modalSearchInput}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  onPick(o);
                  setQ("");
                }}
                style={({ pressed }) => [styles.modalRow, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.modalRowTxt}>{o.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9AA7BD" />
              </Pressable>
            ))}

            {filtered.length === 0 && (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ fontFamily: "Poppins_400Regular", color: MUTED, textAlign: "center" }}>
                  No se encontraron resultados.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function WorkerForm() {
  const router = useRouter();

  // ✅ ahora “zona” lo usamos como sector/colonia (opcional)
  const [zone, setZone] = useState("");

  const [whatsapp, setWhatsapp] = useState("");
  const [work, setWork] = useState("");
  const [availability, setAvailability] = useState<AvKey[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ depto/muni (obligatorios)
  const [dept, setDept] = useState<Option | null>(null);
  const [muni, setMuni] = useState<Option | null>(null);

  const [deptOpen, setDeptOpen] = useState(false);
  const [muniOpen, setMuniOpen] = useState(false);

  const municipalities = useMemo(() => {
    if (!dept?.id) return [];
    return getMunicipalities(dept.id);
  }, [dept?.id]);

  const canSave = useMemo(() => {
    return (
      !!dept &&
      !!muni &&
      whatsapp.trim().length >= 6 &&
      work.trim().length >= 2 &&
      !saving
    );
  }, [dept, muni, whatsapp, work, saving]);

  const toggle = (k: AvKey) => {
    setAvailability((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const onSave = async () => {
    if (!canSave) {
      Alert.alert("Revisa tus datos", "Completa departamento, municipio, WhatsApp y tu oficio.");
      return;
    }

    try {
      setSaving(true);

      await upsertBasic({
        // ✅ nuevo
        departmentId: dept!.id,
        departmentName: dept!.name,
        municipalityId: muni!.id,
        municipalityName: muni!.name,

        // ✅ opcional (sector/colonia)
        zone: zone.trim(),

        // ✅ whatsapp
        whatsapp: whatsapp.trim(),
      });

      await upsertWorker({
        work: work.trim(),
        availability,
        isAvailable: true,
      });

      await setCheckpoint("worker_done");

      router.replace("/(tabs)");
    } catch (e) {
      console.log("[worker-form-save-error]", e);
      Alert.alert("Error", "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <PickerModal
        visible={deptOpen}
        title="Selecciona tu departamento"
        options={DEPARTMENTS}
        onClose={() => setDeptOpen(false)}
        onPick={(o) => {
          setDept(o);
          setDeptOpen(false);
          // ✅ si cambia depto, reinicia municipio
          setMuni(null);
        }}
      />

      <PickerModal
        visible={muniOpen}
        title="Selecciona tu municipio"
        options={municipalities}
        onClose={() => setMuniOpen(false)}
        onPick={(o) => {
          setMuni(o);
          setMuniOpen(false);
        }}
      />

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 12}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: "center" }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>TU PERFIL</Text>
            <Text style={styles.title}>Datos para encontrarte</Text>
            <Text style={styles.sub}>
              Esto ayuda a que te contacten personas cerca y por tu oficio.
            </Text>
          </View>

          <View style={[styles.card, { maxWidth: MAX_W }]}>
            {/* ✅ Departamento */}
            <Text style={styles.label}>Departamento</Text>
            <Pressable
              onPress={() => setDeptOpen(true)}
              style={({ pressed }) => [styles.selectWrap, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.inputIcon}>
                <Ionicons name="map-outline" size={18} color={ORANGE} />
              </View>
              <Text style={[styles.selectTxt, !dept && { color: "#9AA7BD" }]}>
                {dept ? dept.name : "Selecciona tu departamento"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#9AA7BD" />
            </Pressable>

            {/* ✅ Municipio */}
            <Text style={[styles.label, { marginTop: 12 }]}>Municipio</Text>
            <Pressable
              onPress={() => {
                if (!dept) {
                  Alert.alert("Primero elige tu departamento", "Para mostrarte los municipios correctos.");
                  return;
                }
                if (municipalities.length === 0) {
                  Alert.alert(
                    "Municipios no cargados",
                    "Aún no están cargados los municipios de este departamento. Por ahora usa Sacatepéquez (piloto) o agrega el listado en gtLocations.ts."
                  );
                  return;
                }
                setMuniOpen(true);
              }}
              style={({ pressed }) => [
                styles.selectWrap,
                !dept && { opacity: 0.6 },
                pressed && dept && { opacity: 0.92 },
              ]}
            >
              <View style={styles.inputIcon}>
                <Ionicons name="location-outline" size={18} color={ORANGE} />
              </View>
              <Text style={[styles.selectTxt, !muni && { color: "#9AA7BD" }]}>
                {muni ? muni.name : "Selecciona tu municipio"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#9AA7BD" />
            </Pressable>

            {/* ✅ Sector/Colonia (opcional) */}
            <Text style={[styles.label, { marginTop: 12 }]}>Sector / colonia (opcional)</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="pin-outline" size={18} color={ORANGE} />
              </View>
              <TextInput
                value={zone}
                onChangeText={setZone}
                placeholder="Ej: Choacorral, El Manzanal, Los Aposentos…"
                placeholderTextColor="#9AA7BD"
                style={styles.input}
              />
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>WhatsApp</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="call-outline" size={18} color={ORANGE} />
              </View>
              <TextInput
                value={whatsapp}
                onChangeText={(t) => setWhatsapp(t.replace(/[^\d]/g, ""))}
                placeholder="Ej: 55551234"
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Oficio</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="briefcase-outline" size={18} color={ORANGE} />
              </View>
              <TextInput
                value={work}
                onChangeText={setWork}
                placeholder="Ej: Albañil, Electricista, Plomero…"
                placeholderTextColor="#9AA7BD"
                style={styles.input}
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Disponibilidad (opcional)</Text>
            <View style={styles.pillsWrap}>
              {AVAIL.map((a) => {
                const on = availability.includes(a.key);
                return (
                  <Pressable
                    key={a.key}
                    onPress={() => toggle(a.key)}
                    style={({ pressed }) => [
                      styles.pill,
                      on && styles.pillOn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Ionicons name={a.icon} size={16} color={on ? "#fff" : ORANGE} />
                    <Text style={[styles.pillTxt, on && styles.pillTxtOn]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={onSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSave && { opacity: 0.5 },
                pressed && canSave && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.primaryTxt}>{saving ? "Guardando..." : "Guardar y continuar"}</Text>
            </Pressable>

            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>Podrás editar esto después desde tu perfil.</Text>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  content: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 10 : 18,
    paddingBottom: 34,
    alignItems: "center",
  },

  header: { width: "100%", maxWidth: MAX_W, marginBottom: 12 },

  kicker: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#7C879B",
    letterSpacing: 1.1,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: TEXT,
    marginBottom: 6,
  },

  sub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },

  card: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 14,
  },

  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: TEXT,
    marginBottom: 6,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba سد(11,18,32,0.10)".replace("سد", ""), // deja igual el color final
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },

  selectWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 10,
  },

  selectTxt: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: TEXT,
  },

  inputIcon: { width: 28, alignItems: "center", justifyContent: "center" },

  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: TEXT,
    padding: 0,
  },

  pillsWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.25)",
    backgroundColor: "#fff",
  },

  pillOn: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },

  pillTxt: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: TEXT,
  },

  pillTxtOn: {
    color: "#fff",
  },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryTxt: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  note: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(11,18,32,0.04)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
  },

  noteTxt: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 18,
    justifyContent: "center",
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    padding: 12,
    maxHeight: "78%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },

  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,18,32,0.04)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
  },

  modalSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(11,18,32,0.04)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  modalSearchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: TEXT,
    padding: 0,
  },

  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
    marginBottom: 8,
    backgroundColor: "#fff",
  },

  modalRowTxt: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: TEXT,
    flex: 1,
    paddingRight: 10,
  },
});
