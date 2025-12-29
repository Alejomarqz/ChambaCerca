// app/onboarding/role.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";

const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

const FOX_W = Math.min(width * 0.62, 280);

type Role = "worker" | "seeker";

type RoleCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "default";
  onPress: () => void;
};

function RoleCard({
  title,
  subtitle,
  icon,
  variant = "default",
  onPress,
}: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(234,105,30,0.10)" }}
      style={({ pressed }) => [
        styles.card,
        variant === "primary" && styles.cardPrimary,
        pressed && Platform.OS === "ios" ? styles.cardPressedIOS : null,
      ]}
    >
      <View
        style={[
          styles.accent,
          variant === "primary" ? styles.accentOn : styles.accentOff,
        ]}
      />

      <View style={styles.cardInner}>
        <View
          style={[
            styles.iconWrap,
            variant === "primary" && styles.iconWrapPrimary,
          ]}
        >
          <Ionicons name={icon} size={22} color={ORANGE} />
        </View>

        <View style={styles.textCol}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9AA7BD" />
      </View>
    </Pressable>
  );
}

export default function RoleScreen() {
  const router = useRouter();

  const pickRole = async (role: Role) => {
    try {
      // ✅ Sesión + rol + onboarding
      await AsyncStorage.setItem("chamba_session", "1");
      await AsyncStorage.setItem("chamba_role", role);
      await AsyncStorage.setItem("chamba_onboarded", "1");

      router.replace("/(tabs)");
    } catch (e) {
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        <View style={styles.center}>
          <Image
            source={require("../../assets/images/fox2.png")}
            style={styles.fox}
            resizeMode="contain"
          />

          <Text style={styles.kicker}>ELIGE TU PERFIL</Text>
          <Text style={styles.title}>Chamba Cerca</Text>
          <Text style={styles.subtitle}>
            Aquí no se publican ofertas. Las personas crean su perfil y quienes
            necesitan ayuda las contactan directo.
          </Text>

          <View style={styles.cardsWrap}>
            <RoleCard
              variant="primary"
              icon="person-outline"
              title="Busco trabajo"
              subtitle="Crea tu perfil para que personas cerca puedan encontrarte y contactarte."
              onPress={() => pickRole("worker")}
            />

            <RoleCard
              icon="search-outline"
              title="Necesito un trabajador"
              subtitle="Busca personas por oficio y comunícate directo con ellas."
              onPress={() => pickRole("seeker")}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={18} color={TEXT} />
            <Text style={styles.backText}>Regresar</Text>
          </Pressable>

          <Text style={styles.microcopy}>Personas reales · Trato directo · Local</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 6 : 10,
    paddingBottom: 14,
    backgroundColor: BG,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  fox: {
    width: FOX_W,
    height: Math.min(height * 0.28, 280),
    marginBottom: 10,
  },

  kicker: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#7C879B",
    letterSpacing: 1.1,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 25,
    color: TEXT,
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
    maxWidth: 350,
    marginBottom: 18,
  },

  cardsWrap: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },

  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#0B1220",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 0 },
    }),
  },

  cardPrimary: {
    borderColor: "rgba(234,105,30,0.22)",
  },

  cardPressedIOS: {
    transform: [{ scale: 0.992 }],
    opacity: 0.98,
  },

  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },

  accent: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  accentOn: { backgroundColor: ORANGE },
  accentOff: { backgroundColor: "rgba(234,105,30,0.35)" },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(234,105,30,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapPrimary: {
    backgroundColor: "rgba(234,105,30,0.14)",
  },

  textCol: { flex: 1 },

  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: TEXT,
    marginBottom: 2,
  },

  cardSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 17,
  },

  footer: {
    alignItems: "center",
    paddingTop: 8,
  },

  backBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },

  backText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: TEXT,
  },

  microcopy: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#7C879B",
  },
});
