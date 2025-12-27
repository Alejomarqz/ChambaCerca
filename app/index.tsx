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
    Animated.parallel([
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
    ]).start();

    const t = setTimeout(() => {
      router.replace("/onboarding");
    }, 2600);

    return () => clearTimeout(t);
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
