// app/onboarding/login.tsx
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

type LocalUser = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  verifiedPhone?: boolean;
  createdAt?: string;
};

export default function Login() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const idOk = identifier.trim().length >= 3;
    const passOk = password.length >= 6;
    return idOk && passOk;
  }, [identifier, password]);

  const scrollToEndSoon = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const normalize = (s: string) => s.trim().toLowerCase();

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert("Revisa tus datos", "Ingresa tu usuario/teléfono y tu contraseña.");
      return;
    }

    try {
      setLoading(true);

      // ✅ 1) Cargar usuario local (creado en basic-profile)
      const raw = await AsyncStorage.getItem("chamba_user");
      const saved: LocalUser | null = raw ? JSON.parse(raw) : null;

      if (!saved?.username || !saved?.password) {
        Alert.alert(
          "No hay cuenta creada",
          "Primero crea una cuenta para poder iniciar sesión."
        );
        return;
      }

      // ✅ 2) Validar usuario (por ahora solo username)
      // (más adelante aquí soportamos teléfono también)
      const inputId = normalize(identifier);
      const savedUser = normalize(saved.username);

      if (inputId !== savedUser) {
        Alert.alert("Usuario no encontrado", "Revisa tu usuario e intenta de nuevo.");
        return;
      }

      // ✅ 3) Validar contraseña
      if (password !== saved.password) {
        Alert.alert("Contraseña incorrecta", "Revisa tu contraseña e intenta de nuevo.");
        return;
      }

      // ✅ 4) Si todo bien -> iniciar sesión
      await AsyncStorage.setItem("chamba_session", "1");

      // ✅ 5) A dónde entrar
      const role = await AsyncStorage.getItem("chamba_role");

      if (role === "worker" || role === "seeker") {
        router.replace("/(tabs)");
        return;
      }

      // si no eligió rol aún
      router.replace("/onboarding/role");
    } catch (e) {
      console.log("[login-error]", e);
      Alert.alert("Error", "No se pudo iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

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
          contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: "center" }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>INICIAR SESIÓN</Text>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.sub}>
              Ingresa con tu <Text style={styles.bold}>usuario o teléfono</Text> y tu contraseña.
            </Text>
          </View>

          <View style={[styles.card, { maxWidth: MAX_W }]}>
            <Field
              label="Usuario o teléfono"
              placeholder="Ej: alejomarqz o 50255555555"
              value={identifier}
              onChangeText={setIdentifier}
              icon="person-outline"
              autoCapitalize="none"
              keyboardType="default"
            />

            <Spacer />

            <Field
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              autoCapitalize="none"
              secureTextEntry={!showPass}
              rightIcon={showPass ? "eye-off-outline" : "eye-outline"}
              onRightPress={() => setShowPass((v) => !v)}
              onFocus={scrollToEndSoon}
            />

            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>
                Si aún no verificas tu número, podrás entrar pero no aparecerás en la app hasta
                verificarlo.
              </Text>
            </View>
          </View>

          <View style={[styles.ctaWrap, { maxWidth: MAX_W }]}>
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit || loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!canSubmit || loading) && styles.primaryDisabled,
                pressed && canSubmit && !loading ? styles.primaryPressed : null,
              ]}
            >
              <Text style={styles.primaryTxt}>
                {loading ? "Entrando..." : "Iniciar sesión"}
              </Text>
            </Pressable>

            <View style={styles.altRow}>
              <Text style={styles.altTxt}>¿Aún no tienes cuenta?</Text>
              <Pressable
                onPress={() => router.replace("/onboarding/basic-profile")}
                hitSlop={10}
                style={({ pressed }) => pressed && { opacity: 0.85 }}
              >
                <Text style={styles.altLink}>Crea una</Text>
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

  bold: {
    fontFamily: "Poppins_600SemiBold",
    color: TEXT,
  },

  card: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 14,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
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

  altRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  altTxt: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  altLink: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: ORANGE,
  },
});
