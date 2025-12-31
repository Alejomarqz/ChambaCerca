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

import { getCheckpoint, setCheckpoint } from "../storage/bootStorage";
import { getBootFlags, setAppLocked } from "../storage/pinStorage";
import {
  getProfile,
  isSeekerComplete,
  isWorkerComplete,
} from "../storage/profileStorage";

const { width } = Dimensions.get("window");
const LOGO_SIZE = Math.min(width * 0.7, 280);

const KEY_ONBOARDED = "chamba_onboarded";
const KEY_SESSION = "chamba_session";
const KEY_PIN_RETURN_TO = "chamba_pin_return_to";

function isTruthySession(raw: string | null) {
  return !!raw && raw !== "0" && raw !== "false" && raw !== "null" && raw !== "undefined";
}

async function computeNextAfterAuth(): Promise<string> {
  const [p, checkpoint] = await Promise.all([getProfile(), getCheckpoint()]);

  // ✅ PRIMER FLUJO (la primera vez) manda:
  // basic_done -> pin-suggest
  // pin_done   -> role
  if (checkpoint === "basic_done") return "/onboarding/pin-suggest";
  if (checkpoint === "pin_done") return "/onboarding/role";

  // ✅ Si ya eligió rol y está completado -> tabs
  if (p?.role === "worker") {
    return isWorkerComplete(p) ? "/(tabs)" : "/onboarding/worker-form";
  }
  if (p?.role === "seeker") {
    return isSeekerComplete(p) ? "/(tabs)" : "/onboarding/seeker-form";
  }

  // ✅ Sin role aún
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
        const [onboarded, sessionRaw, boot, checkpoint] = await Promise.all([
          AsyncStorage.getItem(KEY_ONBOARDED),
          AsyncStorage.getItem(KEY_SESSION),
          getBootFlags(),
          getCheckpoint(),
        ]);

        const hasSession = isTruthySession(sessionRaw);

        if (!hasSession) {
          if (onboarded !== "1") {
            router.replace("/onboarding");
            return;
          }
          router.replace("/onboarding/login");
          return;
        }

        if (onboarded !== "1") {
          await AsyncStorage.setItem(KEY_ONBOARDED, "1");
        }

        if (!checkpoint) {
          await setCheckpoint("basic_done");
        }

        let next = await computeNextAfterAuth();

        // ✅ Si dice pin-suggest pero ya tiene pin, entonces le toca ROLE
        if (next === "/onboarding/pin-suggest" && boot.pinEnabled) {
          next = "/onboarding/role";
          await setCheckpoint("pin_done");
        }

        if (boot.pinEnabled) {
          await AsyncStorage.setItem(KEY_PIN_RETURN_TO, next);
          await setAppLocked(true);
          router.replace("/pin");
          return;
        }

        router.replace("/onboarding/pin-suggest");
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
