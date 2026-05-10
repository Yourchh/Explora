import { Redirect } from "expo-router";

export default function Index() {
  // Simplemente manda al flujo de autenticación.
  // El layout principal decidirá si te deja en login o te manda al mapa.
  return <Redirect href="/(auth)/login" />;
}
