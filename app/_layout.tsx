import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { auth } from "../firebaseConfig";

LogBox.ignoreAllLogs();

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false); // Nuevo estado para evitar parpadeos

  const router = useRouter();
  const segments = useSegments();

  // 1. Escuchar el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    const timer = setTimeout(() => {
      setInitializing(false);
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // 2. Lógica de redirección (EL MOTOR DE LA APP)
  useEffect(() => {
    const checkRouting = async () => {
      if (initializing) return;

      // SOLUCIÓN: Leemos AsyncStorage aquí adentro.
      // Así garantizamos que, al terminar el Onboarding, lea "true"
      // y te deje pasar al mapa sin reiniciarte.
      const onboardingValue = await AsyncStorage.getItem(
        "@has_seen_onboarding",
      );
      const hasSeenOnboarding = onboardingValue === "true";

      const inAuthGroup = segments[0] === "(auth)";
      const inOnboarding = (segments[0] as string) === "onboarding";

      if (!user && !inAuthGroup) {
        router.replace("/(auth)/login");
      } else if (user) {
        if (!hasSeenOnboarding && !inOnboarding) {
          router.replace("/onboarding" as any);
        } else if (hasSeenOnboarding && (inAuthGroup || inOnboarding)) {
          router.replace("/(tabs)/mapa");
        }
      }

      // Indicamos que ya evaluó la ruta y podemos renderizar
      setLayoutReady(true);
    };

    checkRouting();
  }, [user, initializing, segments]);

  // 3. Pantalla de carga
  if (initializing || !layoutReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // 4. Definición de rutas
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
