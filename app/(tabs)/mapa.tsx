import * as Location from "expo-location";
import { addDoc, collection } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView from "react-native-maps";
import { auth, db } from "../../firebaseConfig";

export default function MapaTab() {
  const [ubicacion, setUbicacion] = useState<any>(null);
  const [nota, setNota] = useState("");
  const [esPublico, setEsPublico] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let loc = await Location.getCurrentPositionAsync({});
        setUbicacion(loc.coords);
      }
    })();
  }, []);

  const registrarLugar = async () => {
    if (!nota || !ubicacion) return;

    try {
      // Llamada a la API de backend para análisis IA
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota }),
      });
      const { clasificacion } = await res.json();

      await addDoc(collection(db, "ubicaciones"), {
        userId: auth.currentUser?.uid,
        lat: ubicacion.latitude,
        lng: ubicacion.longitude,
        nota,
        clasificacion,
        esPublico,
        favorito: false,
        fecha: new Date(),
      });

      setNota("");
      Alert.alert("Guardado", `Clasificado como: ${clasificacion}`);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar");
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation
        initialRegion={{
          latitude: ubicacion?.latitude || 20.65,
          longitude: ubicacion?.longitude || -103.34,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="¿Qué encontraste?"
          style={styles.input}
          value={nota}
          onChangeText={setNota}
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>¿Hacerlo público?</Text>
          <Switch value={esPublico} onValueChange={setEsPublico} />
        </View>
        <TouchableOpacity style={styles.button} onPress={registrarLugar}>
          <Text style={styles.buttonText}>Dejar Pin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  inputContainer: {
    position: "absolute",
    bottom: 20,
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    shadowOpacity: 0.1,
  },
  input: {
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  label: { fontSize: 14, color: "#3A3A3C" },
  button: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
