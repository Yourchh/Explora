import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { auth } from "../firebaseConfig";

LogBox.ignoreAllLogs();

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // 1. Escuchar el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("👤 Estado de Auth:", user ? "Conectado" : "Desconectado");
      setUser(user);
      if (initializing) setInitializing(false);
    });

    // 💡 PLAN DE RESCATE: Si en 3 segundos Firebase no responde,
    // quitamos el círculo de carga de todos modos.
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
    if (initializing) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Si no hay usuario y no está en login, lo mandamos allá
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Si hay usuario y está en login, lo mandamos al mapa
      router.replace("/(tabs)/mapa");
    }
  }, [user, initializing, segments]);

  // 3. Pantalla de carga
  if (initializing) {
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

  // 4. Definición de rutas (QUITAMOS 'index' PARA EVITAR DUPLICADOS)
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
