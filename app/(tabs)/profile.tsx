// app/(tabs)/profile.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DEPARTMENTS, getMunicipalities, Option } from "../../data/gtLocations";
import { getProfile, getZoneLabel, upsertBasic } from "../../storage/profileStorage";

const { width } = Dimensions.get("window");
const MAX_W = Math.min(440, width - 28);

// base app
const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const PLACEHOLDER = "#9AA7BD";

// colors (como inicio)
const BLUE = "#2f49c6";
const ORANGE = "#ea691e";
const PURPLE = "#7c3aed";
const GREEN = "#16a34a";
const RED = "#dc2626";

// pills
const FIELD_BG = "#F1F4F9";

type Snapshot = {
  photoUri?: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  departmentId: string;
  departmentName: string;
  municipalityId: string;
  municipalityName: string;
  sector: string;
};

function normalizePhone(s: string) {
  return (s || "").replace(/[^\d]/g, "");
}

function same(a: Snapshot | null, b: Snapshot | null) {
  if (!a || !b) return false;
  return (
    (a.photoUri || "") === (b.photoUri || "") &&
    a.firstName.trim() === b.firstName.trim() &&
    a.lastName.trim() === b.lastName.trim() &&
    normalizePhone(a.whatsapp) === normalizePhone(b.whatsapp) &&
    a.departmentId === b.departmentId &&
    a.departmentName === b.departmentName &&
    a.municipalityId === b.municipalityId &&
    a.municipalityName === b.municipalityName &&
    a.sector.trim() === b.sector.trim()
  );
}

/**
 * ✅ Importante:
 * - allowsEditing: false  (evita crop bug sin botones en Android)
 */
async function pickImage(mode: "camera" | "gallery") {
  if (mode === "camera") {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error("NO_CAMERA");
    return ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
  }

  const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!p.granted) throw new Error("NO_GALLERY");

  return ImagePicker.launchImageLibraryAsync({
    quality: 0.85,
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });
}

function openPhotoMenu(opts: {
  hasPhoto: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: () => void;
}) {
  if (Platform.OS === "ios") {
    const options = opts.hasPhoto
      ? ["Tomar foto", "Elegir de galería", "Eliminar foto", "Cancelar"]
      : ["Tomar foto", "Elegir de galería", "Cancelar"];

    const cancelButtonIndex = opts.hasPhoto ? 3 : 2;
    const destructiveButtonIndex = opts.hasPhoto ? 2 : undefined;

    ActionSheetIOS.showActionSheetWithOptions(
      { title: "Foto de perfil", options, cancelButtonIndex, destructiveButtonIndex },
      (i) => {
        if (i === 0) opts.onCamera();
        if (i === 1) opts.onGallery();
        if (opts.hasPhoto && i === 2) opts.onRemove();
      }
    );
  } else {
    const actions: any[] = [
      { text: "Tomar foto", onPress: opts.onCamera },
      { text: "Elegir de galería", onPress: opts.onGallery },
    ];
    if (opts.hasPhoto) actions.push({ text: "Eliminar foto", style: "destructive", onPress: opts.onRemove });
    actions.push({ text: "Cancelar", style: "cancel" });

    Alert.alert("Foto de perfil", "Selecciona una opción", actions);
  }
}

/* -------- Picker Modal (Dept/Muni) -------- */
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
  onPick: (o: Option) => void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!visible) setQ("");
  }, [visible]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.name.toLowerCase().includes(s));
  }, [q, options]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={18} color={TEXT} />
            </Pressable>
          </View>

          <View style={styles.modalSearch}>
            <Ionicons name="search-outline" size={18} color={MUTED} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar…"
              placeholderTextColor={PLACEHOLDER}
              style={styles.modalSearchInput}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => onPick(o)}
                style={({ pressed }) => [styles.modalRow, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.modalRowTxt}>{o.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={PLACEHOLDER} />
              </Pressable>
            ))}

            {filtered.length === 0 && (
              <View style={{ paddingVertical: 12 }}>
                <Text style={styles.emptyTxt}>No se encontraron resultados.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* -------- Screen -------- */
export default function ProfileTab() {
  const [loading, setLoading] = useState(true);

  // ✅ Editar SOLO datos (no foto)
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Foto: siempre editable independiente
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [dept, setDept] = useState<Option | null>(null);
  const [muni, setMuni] = useState<Option | null>(null);
  const [sector, setSector] = useState("");

  const [deptOpen, setDeptOpen] = useState(false);
  const [muniOpen, setMuniOpen] = useState(false);

  // snapshot para Cancelar/dirty SOLO de datos (no foto)
  const originalDataRef = useRef<Omit<Snapshot, "photoUri"> | null>(null);

  const municipalities = useMemo(() => (dept?.id ? getMunicipalities(dept.id) : []), [dept?.id]);

  const zonePretty = useMemo(() => {
    return getZoneLabel({
      departmentName: dept?.name || "",
      municipalityName: muni?.name || "",
      sector: sector || "",
      zone: sector || "",
    } as any);
  }, [dept?.name, muni?.name, sector]);

  const currentDataSnapshot = useMemo(
    () => ({
      firstName,
      lastName,
      whatsapp,
      departmentId: dept?.id || "",
      departmentName: dept?.name || "",
      municipalityId: muni?.id || "",
      municipalityName: muni?.name || "",
      sector,
    }),
    [dept, firstName, lastName, muni, sector, whatsapp]
  );

  const dirtyData = useMemo(() => {
    const a = originalDataRef.current;
    if (!a) return false;
    return (
      a.firstName.trim() !== currentDataSnapshot.firstName.trim() ||
      a.lastName.trim() !== currentDataSnapshot.lastName.trim() ||
      normalizePhone(a.whatsapp) !== normalizePhone(currentDataSnapshot.whatsapp) ||
      a.departmentId !== currentDataSnapshot.departmentId ||
      a.departmentName !== currentDataSnapshot.departmentName ||
      a.municipalityId !== currentDataSnapshot.municipalityId ||
      a.municipalityName !== currentDataSnapshot.municipalityName ||
      a.sector.trim() !== currentDataSnapshot.sector.trim()
    );
  }, [currentDataSnapshot]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await getProfile();
        if (!p) return;

        setPhotoUri(p.basic.photoUri);

        const dataSnap = {
          firstName: String(p.basic.firstName || ""),
          lastName: String(p.basic.lastName || ""),
          whatsapp: String(p.basic.whatsapp || ""),
          departmentId: String(p.basic.departmentId || ""),
          departmentName: String(p.basic.departmentName || ""),
          municipalityId: String(p.basic.municipalityId || ""),
          municipalityName: String(p.basic.municipalityName || ""),
          sector: String(p.basic.sector || ""),
        };

        originalDataRef.current = dataSnap;

        setFirstName(dataSnap.firstName);
        setLastName(dataSnap.lastName);
        setWhatsapp(dataSnap.whatsapp);
        setSector(dataSnap.sector);

        setDept(dataSnap.departmentId ? { id: dataSnap.departmentId, name: dataSnap.departmentName } : null);
        setMuni(dataSnap.municipalityId ? { id: dataSnap.municipalityId, name: dataSnap.municipalityName } : null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onCancelEdit = useCallback(() => {
    const snap = originalDataRef.current;
    if (!snap) {
      setIsEditing(false);
      return;
    }
    setFirstName(snap.firstName);
    setLastName(snap.lastName);
    setWhatsapp(snap.whatsapp);
    setSector(snap.sector);
    setDept(snap.departmentId ? { id: snap.departmentId, name: snap.departmentName } : null);
    setMuni(snap.municipalityId ? { id: snap.municipalityId, name: snap.municipalityName } : null);
    setIsEditing(false);
  }, []);

  // ✅ guardar foto independiente (NO depende de isEditing)
  const savePhoto = useCallback(async (nextUri: string | undefined) => {
    await upsertBasic({ photoUri: nextUri });
    setPhotoUri(nextUri);
  }, []);

  const pickAndPreview = useCallback(async (mode: "camera" | "gallery") => {
    try {
      setSavingPhoto(true);
      const r = await pickImage(mode);
      if (r.canceled) return;
      const uri = r.assets?.[0]?.uri;
      if (!uri) return;
      setPendingPhoto(uri);
    } catch (e) {
      console.log("profile-photo-pick-error", e);
      Alert.alert("Error", "No se pudo seleccionar la foto.");
    } finally {
      setSavingPhoto(false);
    }
  }, []);

  const onChangePhoto = useCallback(() => {
    openPhotoMenu({
      hasPhoto: !!photoUri,
      onCamera: () => pickAndPreview("camera"),
      onGallery: () => pickAndPreview("gallery"),
      onRemove: () => {
        Alert.alert("Eliminar foto", "¿Quieres quitar tu foto de perfil?", [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                setSavingPhoto(true);
                await savePhoto(undefined);
              } catch (e) {
                console.log("profile-photo-remove-error", e);
                Alert.alert("Error", "No se pudo eliminar la foto.");
              } finally {
                setSavingPhoto(false);
              }
            },
          },
        ]);
      },
    });
  }, [photoUri, pickAndPreview, savePhoto]);

  const canSaveData = useMemo(() => {
    if (!isEditing) return false;
    if (!dirtyData) return false;

    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) return false;

    if (!dept?.id || !muni?.id) return false;

    const wa = normalizePhone(whatsapp);
    if (wa.length > 0 && wa.length < 8) return false;

    return true;
  }, [dept?.id, muni?.id, dirtyData, firstName, isEditing, lastName, whatsapp]);

  const onSaveData = useCallback(async () => {
    if (!canSaveData) return;

    try {
      setSaving(true);

      await upsertBasic({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        whatsapp: normalizePhone(whatsapp),
        departmentId: dept!.id,
        departmentName: dept!.name,
        municipalityId: muni!.id,
        municipalityName: muni!.name,
        sector: sector.trim(),
        zone: sector.trim(),
      });

      originalDataRef.current = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        whatsapp: normalizePhone(whatsapp),
        departmentId: dept!.id,
        departmentName: dept!.name,
        municipalityId: muni!.id,
        municipalityName: muni!.name,
        sector: sector.trim(),
      };

      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }, [canSaveData, dept, firstName, lastName, muni, sector, whatsapp]);

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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.topBar, { maxWidth: MAX_W }]}>
          <Text style={styles.pageTitle}>Perfil</Text>

          {!isEditing ? (
            <Pressable style={styles.topBtn} onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={18} color={BLUE} />
              <Text style={[styles.topBtnTxt, { color: BLUE }]}>Editar</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.topBtn} onPress={onCancelEdit}>
              <Ionicons name="close" size={18} color={TEXT} />
              <Text style={styles.topBtnTxt}>Cancelar</Text>
            </Pressable>
          )}
        </View>

        {/* ✅ UNA sola caja (sin sombras) */}
        <View style={[styles.card, { maxWidth: MAX_W }]}>
          {/* Info */}
          <Text style={styles.sectionTitle}>Información</Text>

          <Text style={styles.label}>Nombre</Text>
          <View style={styles.pill}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              editable={isEditing}
              placeholder="Ej: Mario"
              placeholderTextColor={PLACEHOLDER}
              style={styles.pillInput}
              selectionColor={BLUE}
              keyboardAppearance="light"
            />
          </View>

          <Text style={styles.label}>Apellido</Text>
          <View style={styles.pill}>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              editable={isEditing}
              placeholder="Ej: Ortiz"
              placeholderTextColor={PLACEHOLDER}
              style={styles.pillInput}
              selectionColor={BLUE}
              keyboardAppearance="light"
            />
          </View>

          <View style={styles.hr} />

          {/* Location */}
          <Text style={styles.sectionTitle}>Contacto y ubicación</Text>

          <Text style={styles.label}>WhatsApp / Teléfono (opcional)</Text>
          <View style={styles.pill}>
            <TextInput
              value={whatsapp}
              onChangeText={(t) => setWhatsapp(t.replace(/[^\d]/g, ""))}
              editable={isEditing}
              placeholder="Ej: 55551234"
              placeholderTextColor={PLACEHOLDER}
              style={styles.pillInput}
              selectionColor={BLUE}
              keyboardType="number-pad"
              keyboardAppearance="light"
            />
          </View>

          <Text style={styles.label}>Departamento</Text>
          <Pressable
            onPress={() => isEditing && setDeptOpen(true)}
            style={({ pressed }) => [
              styles.selectPill,
              !isEditing && { opacity: 0.85 },
              pressed && isEditing && { opacity: 0.9 },
            ]}
          >
            <View style={[styles.iconBubble, styles.bubbleOrange]}>
              <Ionicons name="map-outline" size={16} color={ORANGE} />
            </View>
            <Text style={[styles.selectTxt, !dept && { color: PLACEHOLDER }]}>
              {dept ? dept.name : "Selecciona tu departamento"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={PLACEHOLDER} />
          </Pressable>

          <Text style={styles.label}>Municipio</Text>
          <Pressable
            onPress={() => {
              if (!isEditing) return;
              if (!dept) return Alert.alert("Falta departamento", "Primero selecciona tu departamento.");
              setMuniOpen(true);
            }}
            style={({ pressed }) => [
              styles.selectPill,
              (!isEditing || !dept) && { opacity: 0.65 },
              pressed && isEditing && dept && { opacity: 0.9 },
            ]}
          >
            <View style={[styles.iconBubble, styles.bubbleBlue]}>
              <Ionicons name="location-outline" size={16} color={BLUE} />
            </View>
            <Text style={[styles.selectTxt, !muni && { color: PLACEHOLDER }]}>
              {muni ? muni.name : "Selecciona tu municipio"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={PLACEHOLDER} />
          </Pressable>

          <Text style={styles.label}>Sector / colonia (opcional)</Text>
          <View style={styles.pill}>
            <TextInput
              value={sector}
              onChangeText={setSector}
              editable={isEditing}
              placeholder="Ej: 4 Caminos"
              placeholderTextColor={PLACEHOLDER}
              style={styles.pillInput}
              selectionColor={BLUE}
              keyboardAppearance="light"
            />
          </View>

          {!!zonePretty && (
            <View style={styles.previewRow}>
              <View style={[styles.iconBubble, styles.bubblePurple]}>
                <Ionicons name="navigate-outline" size={16} color={PURPLE} />
              </View>
              <Text style={styles.previewTxt} numberOfLines={2}>
                {zonePretty}
              </Text>
            </View>
          )}

          <View style={styles.hr} />

          {/* ✅ Foto (SIEMPRE funcional, no depende de Editar) */}
          <Text style={styles.sectionTitle}>Foto de perfil</Text>

          <View style={styles.photoRow}>
            <View style={styles.avatar}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person-outline" size={28} color={MUTED} />
              )}
              {savingPhoto && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator />
                </View>
              )}
            </View>

            <Pressable
              onPress={onChangePhoto}
              disabled={savingPhoto}
              style={({ pressed }) => [styles.photoBtn, savingPhoto && { opacity: 0.6 }, pressed && !savingPhoto && { opacity: 0.92 }]}
            >
              <View style={[styles.iconBubble, styles.bubbleGreen]}>
                <Ionicons name="camera-outline" size={16} color={GREEN} />
              </View>
              <Text style={styles.photoBtnTxt}>{photoUri ? "Cambiar foto" : "Agregar foto"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Guardar SOLO datos */}
        {isEditing && (
          <Pressable
            onPress={onSaveData}
            disabled={!canSaveData || saving}
            style={({ pressed }) => [
              styles.saveBtn,
              (!canSaveData || saving) && { opacity: 0.6 },
              pressed && canSaveData && !saving && { opacity: 0.92 },
            ]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
            <Text style={styles.saveBtnTxt}>Guardar cambios</Text>
          </Pressable>
        )}

        <View style={{ height: 18 }} />
      </ScrollView>

      {/* Dept/Muni modals */}
      <PickerModal
        visible={deptOpen}
        title="Selecciona tu departamento"
        options={DEPARTMENTS}
        onClose={() => setDeptOpen(false)}
        onPick={(o) => {
          setDept(o);
          setMuni(null);
          setDeptOpen(false);
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

      {/* Confirmación de foto (Aceptar / Cancelar / Elegir otra) */}
      <Modal visible={!!pendingPhoto} transparent animationType="fade" onRequestClose={() => setPendingPhoto(null)}>
        <View style={styles.photoConfirmBackdrop}>
          <View style={styles.photoConfirmCard}>
            <Text style={styles.photoConfirmTitle}>¿Usar esta foto?</Text>

            <View style={styles.photoConfirmPreviewWrap}>
              {pendingPhoto ? <Image source={{ uri: pendingPhoto }} style={styles.photoConfirmPreview} /> : null}
            </View>

            <View style={styles.photoConfirmActions}>
              <Pressable
                onPress={() => setPendingPhoto(null)}
                style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.btnGhostTxt}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  const uri = pendingPhoto;
                  setPendingPhoto(null);
                  if (!uri) return;
                  try {
                    setSavingPhoto(true);
                    await savePhoto(uri);
                  } finally {
                    setSavingPhoto(false);
                  }
                }}
                style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.btnPrimaryTxt}>Usar foto</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                setPendingPhoto(null);
                setTimeout(() => {
                  openPhotoMenu({
                    hasPhoto: !!photoUri,
                    onCamera: () => pickAndPreview("camera"),
                    onGallery: () => pickAndPreview("gallery"),
                    onRemove: async () => {
                      try {
                        setSavingPhoto(true);
                        await savePhoto(undefined);
                      } finally {
                        setSavingPhoto(false);
                      }
                    },
                  });
                }, 120);
              }}
              style={({ pressed }) => [styles.btnLink, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.btnLinkTxt}>Elegir otra</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { marginTop: 10, fontFamily: "Poppins_500Medium", color: MUTED },

  container: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16, alignItems: "center" },

  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  pageTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18, color: TEXT },
  topBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  topBtnTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: TEXT },

  card: {
    width: "100%",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },

  sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14.5, color: TEXT, marginBottom: 10 },
  label: { marginTop: 10, marginBottom: 6, fontFamily: "Poppins_500Medium", fontSize: 12.5, color: TEXT },

  pill: {
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pillInput: { padding: 0, fontFamily: "Poppins_400Regular", fontSize: 13.5, color: TEXT },

  hr: { height: 1, backgroundColor: BORDER, marginVertical: 14 },

  selectPill: {
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectTxt: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 13.5, color: TEXT },

  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bubbleBlue: { backgroundColor: "rgba(47,73,198,0.10)", borderColor: "rgba(47,73,198,0.18)" },
  bubbleOrange: { backgroundColor: "rgba(234,105,30,0.10)", borderColor: "rgba(234,105,30,0.18)" },
  bubblePurple: { backgroundColor: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.18)" },
  bubbleGreen: { backgroundColor: "rgba(22,163,74,0.10)", borderColor: "rgba(22,163,74,0.18)" },

  previewRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: FIELD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  previewTxt: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 12.5, color: MUTED, lineHeight: 16 },

  photoRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: FIELD_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtn: {
    flex: 1,
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  photoBtnTxt: { fontFamily: "Poppins_500Medium", fontSize: 13.5, color: TEXT },

  saveBtn: {
    width: "100%",
    maxWidth: MAX_W,
    marginTop: 12,
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  saveBtnTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 14, justifyContent: "center" },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 12, maxHeight: "78%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10 },
  modalTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: TEXT },
  modalClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  modalSearch: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  modalSearchInput: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 13.5, color: TEXT, padding: 0 },
  modalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 8, backgroundColor: "#fff" },
  modalRowTxt: { flex: 1, paddingRight: 10, fontFamily: "Poppins_400Regular", fontSize: 13.5, color: TEXT },
  emptyTxt: { fontFamily: "Poppins_400Regular", color: MUTED, textAlign: "center" },

  photoConfirmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", padding: 16, justifyContent: "center" },
  photoConfirmCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14 },
  photoConfirmTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: TEXT, marginBottom: 10 },
  photoConfirmPreviewWrap: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  photoConfirmPreview: { width: "100%", height: 320 },
  photoConfirmActions: { marginTop: 12, flexDirection: "row", gap: 10 },

  btnGhost: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 13.5, color: TEXT },

  btnPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: BLUE,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnPrimaryTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 13.5, color: "#fff" },

  btnLink: { marginTop: 10, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 10 },
  btnLinkTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: RED },
});
