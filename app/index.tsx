// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

import { getCheckpoint } from "../storage/bootStorage";
import { getBootFlags, lockIfTimedOut } from "../storage/pinStorage";
import {
  getProfile,
  getProfileCompleted,
  isBasicComplete,
  isSeekerComplete,
  isWorkerComplete,
} from "../storage/profileStorage";

const { width } = Dimensions.get("window");
const LOGO_SIZE = Math.min(width * 0.7, 280);

const KEY_ONBOARDED = "chamba_onboarded";
const KEY_SESSION = "chamba_session";
const KEY_PIN_RETURN_TO = "chamba_pin_return_to";

function isTruthySession(raw: string | null) {
  return (
    !!raw &&
    raw !== "0" &&
    raw !== "false" &&
    raw !== "null" &&
    raw !== "undefined"
  );
}

async function decideNextRoute(): Promise<string> {
  const [p, completed, checkpoint] = await Promise.all([
    getProfile(),
    getProfileCompleted(),
    getCheckpoint(),
  ]);

  // ✅ Si ya está completado, Tabs siempre gana
  if (completed) return "/(tabs)";

  // ✅ Si no hay perfil o basic incompleto -> basic-profile
  if (!p || !isBasicComplete(p)) return "/onboarding/basic-profile";

  // ✅ Si el checkpoint está en basic_done, toca sugerir pin (si aún no)
  // (El PIN real se decide por pinEnabled + lock)
  if (checkpoint === "basic_done") return "/onboarding/pin-suggest";

  // ✅ Si no hay rol, toca elegir rol
  if (!p.role) return "/onboarding/role";

  // ✅ Si hay rol pero falta su form
  if (p.role === "worker") {
    return isWorkerComplete(p) ? "/(tabs)" : "/onboarding/worker-form";
  }

  if (p.role === "seeker") {
    return isSeekerComplete(p) ? "/(tabs)" : "/onboarding/seeker-form";
  }

  return "/onboarding/role";
}

export default function SplashScreen() {
  const router = useRouter();

  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.03,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.97,
            duration: 850,
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    anim.start();

    const t = setTimeout(async () => {
      try {
        const [onboarded, sessionRaw] = await Promise.all([
          AsyncStorage.getItem(KEY_ONBOARDED),
          AsyncStorage.getItem(KEY_SESSION),
        ]);

        const hasSession = isTruthySession(sessionRaw);

        // ✅ Sin sesión: onboarding o login
        if (!hasSession) {
          if (onboarded !== "1") {
            router.replace("/onboarding");
            return;
          }
          router.replace("/onboarding/login");
          return;
        }

        // ✅ Con sesión: asegurar onboarded
        if (onboarded !== "1") {
          await AsyncStorage.setItem(KEY_ONBOARDED, "1");
        }

        // ✅ 1) aplica regla timeout -> puede setear locked=true
        await lockIfTimedOut();

        // ✅ 2) leer flags ya con locked actualizado
        const boot = await getBootFlags();

        // ✅ 3) decidir ruta destino real (tabs / onboarding steps)
        const next = await decideNextRoute();

        // ✅ 4) si PIN activo y está locked -> /pin
        if (boot.pinEnabled && boot.locked) {
          await AsyncStorage.setItem(KEY_PIN_RETURN_TO, next);
          router.replace("/pin");
          return;
        }

        // ✅ 5) si no está locked -> entra directo
        router.replace(next);
      } catch (e) {
        router.replace("/onboarding/login");
      }
    }, 900);

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
