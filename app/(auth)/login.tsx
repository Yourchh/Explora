import { Link } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CustomInput } from "../../components/loginRegister/CustomInput";
import { PrimaryButton } from "../../components/loginRegister/PrimaryButton";
import { auth } from "../../firebaseConfig";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      Alert.alert("Error de acceso", "Verifica tus credenciales.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Bienvenido</Text>

      <CustomInput
        placeholder="Email"
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <CustomInput
        placeholder="Contraseña"
        secureTextEntry
        onChangeText={setPassword}
      />

      <PrimaryButton title="Iniciar Sesión" onPress={handleLogin} />

      <Link href="/registro" asChild>
        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkTexto}>¿No tienes cuenta? Regístrate</Text>
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
    backgroundColor: "#fff",
  },
  titulo: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 40,
    letterSpacing: -1,
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
