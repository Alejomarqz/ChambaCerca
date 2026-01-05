// app/onboarding/basic-profile.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Storage PRO (v2)
import { setAvailability, upsertBasic } from "../../storage/profileStorage";

// ✅ Boot checkpoint
import { setCheckpoint } from "../../storage/bootStorage";

// ✅ PIN flags
import { getBootFlags } from "../../storage/pinStorage";

const { width } = Dimensions.get("window");

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";
const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

const MAX_W = Math.min(420, width - 44);

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  secureTextEntry?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  textContentType?: TextInputProps["textContentType"];
  autoComplete?: TextInputProps["autoComplete"];
  onFocus?: () => void;
};

// ✅ Legacy KEYS (para no romper tu Home actual)
const KEY_BASIC = "basic-profile";
const KEY_AVAILABLE = "worker_available";

export default function BasicProfile() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [password2, setPassword2] = useState<string>("");

  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const canSubmit = useMemo(() => {
    const firstOk = firstName.trim().length >= 2;
    const lastOk = lastName.trim().length >= 2;

    const u = username.trim();
    const userOk = u.length >= 3 && !/\s/.test(u);

    const passOk = password.length >= 6;
    const matchOk = password.length > 0 && password === password2;

    return firstOk && lastOk && userOk && passOk && matchOk;
  }, [firstName, lastName, username, password, password2]);

  const normalizeUsername = (s: string) => s.replace(/\s/g, "");

  const scrollToEndSoon = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Revisa tus datos",
        "Asegúrate de completar todo y que las contraseñas coincidan."
      );
      return;
    }

    const createdAt = new Date().toISOString();

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: normalizeUsername(username.trim()),
      password,
      verifiedPhone: false,
      createdAt,
    };

    try {
      // ✅ 1) Sesión iniciada
      await AsyncStorage.setItem("chamba_session", "1");

      // ❌ NO marcar chamba_onboarded aquí.
      // Se marca al finalizar onboarding (rol + datos de perfil)
      // await AsyncStorage.setItem("chamba_onboarded", "1");

      // ✅ 2) Guardar usuario (local por ahora)
      await AsyncStorage.setItem("chamba_user", JSON.stringify(payload));

      // ✅ 3) PERFIL PRO (v2): guardar básico
      await upsertBasic({
        firstName: payload.firstName,
        lastName: payload.lastName,
      });

      // ✅ 4) Default: Mostrarme ON (worker)
      await setAvailability(true);

      // ✅ 5) Legacy (tu Home lee esto)
      await AsyncStorage.setItem(
        KEY_BASIC,
        JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          zone: "", // se llena en “Datos para encontrarte”
          whatsapp: "", // se llena cuando verifiquen / perfil
          createdAt: payload.createdAt,
        })
      );

      const prevAv = await AsyncStorage.getItem(KEY_AVAILABLE);
      if (prevAv === null) {
        await AsyncStorage.setItem(KEY_AVAILABLE, "1");
      }

      // ✅ 6) checkpoint
      await setCheckpoint("basic_done");

      // ✅ 7) Ir a PIN si no está activo
      const boot = await getBootFlags();
      if (!boot.pinEnabled) {
        router.replace("/onboarding/pin-suggest");
        return;
      }

      // ✅ 8) Luego elegir rol
      router.replace("/onboarding/role");
    } catch (e) {
      console.log("[create-account-error]", e);
      Alert.alert("Error", "No se pudo crear la cuenta. Intenta de nuevo.");
    }
  };

  const primaryLabel = canSubmit
    ? "Crear cuenta"
    : "Completa los datos para continuar";

  const passHelper =
    password.length > 0 && password.length < 6
      ? "La contraseña debe tener al menos 6 caracteres."
      : password.length >= 6 && password2.length > 0 && password !== password2
      ? "Las contraseñas no coinciden."
      : "";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 12}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { flexGrow: 1, justifyContent: "center" },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>CREAR CUENTA</Text>
            <Text style={styles.title}>Datos de tu cuenta</Text>
            <Text style={styles.sub}>
              Crea tu cuenta en segundos. Luego podrás completar tu perfil para
              aparecer en la app.
            </Text>
          </View>

          <View style={[styles.card, { maxWidth: MAX_W }]}>
            <Field
              label="Nombre"
              placeholder="Ej: Juan"
              value={firstName}
              onChangeText={setFirstName}
              icon="person-outline"
              autoCapitalize="words"
              textContentType="givenName"
              autoComplete="name"
            />

            <Spacer />

            <Field
              label="Apellido"
              placeholder="Ej: Pérez"
              value={lastName}
              onChangeText={setLastName}
              icon="person-outline"
              autoCapitalize="words"
              textContentType="familyName"
              autoComplete="name"
            />

            <Spacer />

            <Field
              label="Usuario"
              placeholder="Ej: juanperez"
              value={username}
              onChangeText={(t) => setUsername(normalizeUsername(t))}
              icon="at-outline"
              autoCapitalize="none"
              keyboardType="default"
              textContentType="username"
              autoComplete="username"
            />

            <Spacer />

            <Field
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              autoCapitalize="none"
              secureTextEntry={!showPass}
              rightIcon={showPass ? "eye-off-outline" : "eye-outline"}
              onRightPress={() => setShowPass((v) => !v)}
              textContentType="newPassword"
              autoComplete="password-new"
              onFocus={scrollToEndSoon}
            />

            <Spacer />

            <Field
              label="Repetir contraseña"
              placeholder="Repite tu contraseña"
              value={password2}
              onChangeText={setPassword2}
              icon="lock-closed-outline"
              autoCapitalize="none"
              secureTextEntry={!showPass2}
              rightIcon={showPass2 ? "eye-off-outline" : "eye-outline"}
              onRightPress={() => setShowPass2((v) => !v)}
              textContentType="newPassword"
              autoComplete="password-new"
              onFocus={scrollToEndSoon}
            />

            {!!passHelper && (
              <View style={styles.helperRow}>
                <Ionicons name="alert-circle-outline" size={16} color={MUTED} />
                <Text style={styles.helperTxt}>{passHelper}</Text>
              </View>
            )}

            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>
                Podrás completar tu zona y WhatsApp en el siguiente paso según tu rol.
              </Text>
            </View>
          </View>

          <View style={[styles.ctaWrap, { maxWidth: MAX_W }]}>
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSubmit && styles.primaryDisabled,
                pressed && canSubmit ? styles.primaryPressed : null,
              ]}
            >
              <Text style={styles.primaryTxt}>{primaryLabel}</Text>
            </Pressable>

            <Text style={styles.micro}>Podrás editar esto después.</Text>

            <View style={styles.loginHint}>
              <Text style={styles.loginHintTxt}>¿Ya tienes cuenta?</Text>
              <Pressable
                onPress={() => router.push("/onboarding/login")}
                hitSlop={10}
                style={({ pressed }) => pressed && { opacity: 0.85 }}
              >
                <Text style={styles.loginHintLink}>Inicia sesión</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Spacer() {
  return <View style={{ height: 10 }} />;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  rightIcon,
  onRightPress,
  textContentType,
  autoComplete,
  onFocus,
}: FieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputWrap}>
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={18} color={ORANGE} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA7BD"
          style={styles.input}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType="done"
          secureTextEntry={secureTextEntry}
          textContentType={textContentType}
          autoComplete={autoComplete}
          onFocus={onFocus}
        />

        {!!rightIcon && !!onRightPress && (
          <Pressable
            onPress={onRightPress}
            hitSlop={10}
            style={({ pressed }) => [styles.rightBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={rightIcon} size={18} color="#7C879B" />
          </Pressable>
        )}
      </View>
    </View>
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

  header: {
    width: "100%",
    maxWidth: MAX_W,
    marginBottom: 12,
  },

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
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#0B1220",
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 0 },
    }),
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
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  inputIcon: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: TEXT,
    padding: 0,
  },

  rightBtn: {
    paddingLeft: 10,
    paddingRight: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  helperRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(11,18,32,0.04)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
  },

  helperTxt: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
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

  ctaWrap: {
    width: "100%",
    marginTop: 14,
    alignItems: "center",
  },

  primaryBtn: {
    width: "100%",
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.992 }],
  },

  primaryDisabled: {
    backgroundColor: "rgba(234,105,30,0.45)",
  },

  primaryTxt: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    fontSize: 14.5,
  },

  micro: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#7C879B",
    textAlign: "center",
  },

  loginHint: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  loginHintTxt: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  loginHintLink: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: ORANGE,
  },
});
