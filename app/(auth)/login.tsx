import { Link } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("Error de acceso", "Verifica tus credenciales.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Bienvenido</Text>
      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Contraseña"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.boton} onPress={handleLogin}>
        <Text style={styles.botonTexto}>Iniciar Sesión</Text>
      </TouchableOpacity>

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
  input: {
    backgroundColor: "#F2F2F7",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  boton: {
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  botonTexto: { color: "#fff", fontWeight: "600", fontSize: 16 },
  link: { marginTop: 20, alignItems: "center" },
  linkTexto: { color: "#8E8E93", fontSize: 14 },
});
