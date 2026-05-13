import { Link } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CustomInput } from "../../components/loginRegister/CustomInput"; // Importación del componente optimizado
import { PrimaryButton } from "../../components/loginRegister/PrimaryButton"; // Importación del componente optimizado
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
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.log("🔥 Error real de Firebase:", error.message);
      Alert.alert(
        "Error",
        "No se pudo crear la cuenta. Intenta con otro correo.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crear Cuenta</Text>

      <CustomInput
        placeholder="Correo electrónico"
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <CustomInput
        placeholder="Contraseña"
        secureTextEntry
        onChangeText={setPassword}
      />

      <PrimaryButton title="Registrarme" onPress={handleRegistro} />

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
  link: {
    marginTop: 20,
    alignItems: "center",
  },
  linkTexto: {
    color: "#8E8E93",
    fontSize: 14,
  },
});
