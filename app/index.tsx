import { ActivityIndicator, View } from "react-native";

export default function Index() {
  // Esta pantalla solo se verá una fracción de segundo al abrir la app.
  // El _layout la interceptará y te redirigirá a tu destino correcto.
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
      }}
    >
      <ActivityIndicator size="large" color="#000000" />
    </View>
  );
}
