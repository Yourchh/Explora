import { Link } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../../firebaseConfig";

export default function Registro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegistro = async () => {
    if (password.length < 6) {
      Alert.alert(
        "Atención",
        "La contraseña debe tener al menos 6 caracteres.",
      );
      return;
    }

    try {
      // Crea el usuario en Firebase
      await createUserWithEmailAndPassword(auth, email, password);
      // ¡Magia! El _layout detectará que iniciaste sesión y te mandará al mapa automático
    } catch (error: any) {
      console.log("🔥 Error real de Firebase:", error.message); // <-- Agrega esta línea
      Alert.alert(
        "Error",
        "No se pudo crear la cuenta. Intenta con otro correo.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crear Cuenta</Text>
      <TextInput
        placeholder="Correo electrónico"
        style={styles.input}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Contraseña"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.boton} onPress={handleRegistro}>
        <Text style={styles.botonTexto}>Registrarme</Text>
      </TouchableOpacity>

      <Link href="/login" asChild>
        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkTexto}>
            ¿Ya tienes cuenta? Inicia sesión aquí
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#ffffff",
  },
  titulo: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 40,
    letterSpacing: -1,
    color: "#000000",
  },
  input: {
    backgroundColor: "#F2F2F7",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    color: "#000000",
  },
  boton: {
    backgroundColor: "#000000",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  botonTexto: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
  link: { marginTop: 20, alignItems: "center" },
  linkTexto: { color: "#8E8E93", fontSize: 14 },
});
