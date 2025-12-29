// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const LOGO_SIZE = Math.min(width * 0.7, 280);

export default function SplashScreen() {
  const router = useRouter();

  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.03,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.97,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    anim.start();

    const t = setTimeout(async () => {
      try {
        const session = await AsyncStorage.getItem("chamba_session"); // ✅ NUEVO
        const onboarded = await AsyncStorage.getItem("chamba_onboarded");
        const role = await AsyncStorage.getItem("chamba_role");

        // ✅ 1) Si NO hay sesión -> Login (primero siempre)
        if (session !== "1") {
          router.replace("/onboarding/login");
          return;
        }

        // ✅ 2) Si hay sesión pero NO terminó onboarding -> onboarding
        if (onboarded !== "1") {
          router.replace("/onboarding");
          return;
        }

        // ✅ 3) Si hay sesión + onboarding + rol -> Tabs
        if (role === "worker" || role === "seeker") {
          router.replace("/(tabs)");
          return;
        }

        // ✅ 4) fallback
        router.replace("/onboarding");
      } catch {
        router.replace("/onboarding/login");
      }
    }, 1400);

    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [router, opacity, scale]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Animated.View
        style={[
          styles.logoWrap,
          {
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={{ opacity, marginTop: 18 }}>
        <ActivityIndicator size="small" color="#2f49c6" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
});
