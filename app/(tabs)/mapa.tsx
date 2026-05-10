import * as Location from "expo-location";
import {
    addDoc,
    collection,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
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
import MapView, { Marker } from "react-native-maps";
import { auth, db } from "../../firebaseConfig";

export default function MapaTab() {
  const [ubicacion, setUbicacion] = useState<any>(null);
  const [nota, setNota] = useState("");
  const [esPublico, setEsPublico] = useState(false);
  // 💡 LA PIEZA QUE FALTABA: Estado para almacenar los puntos
  const [puntosGuardados, setPuntosGuardados] = useState<any[]>([]);

  // 1. Obtener ubicación actual al cargar
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let loc = await Location.getCurrentPositionAsync({});
        setUbicacion(loc.coords);
      }
    })();
  }, []);

  // 2. 🛰️ ESCUCHAR FIREBASE: Traer los puntos en tiempo real
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "ubicaciones"),
      where("userId", "==", auth.currentUser.uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPuntosGuardados(docs);
    });

    return () => unsubscribe();
  }, []);

  const registrarLugar = async () => {
    if (!nota || !ubicacion) {
      Alert.alert("Error", "Falta la nota o la ubicación");
      return;
    }

    try {
      // 1. Llamar a la API (IA)
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota }),
      });
      const { clasificacion } = await res.json();

      // 2. Guardar en Firestore
      await addDoc(collection(db, "ubicaciones"), {
        userId: auth.currentUser?.uid,
        lat: ubicacion.latitude,
        lng: ubicacion.longitude,
        nota,
        clasificacion: clasificacion || "📍 Punto",
        esPublico,
        fecha: new Date(),
      });

      setNota(""); // Limpiar el input
      Alert.alert("¡Éxito!", "Pin guardado correctamente");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo guardar en la base de datos");
    }
  }; // <-- Asegúrate de que esta llave cierre la función

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={true}
        followsUserLocation={true}
        initialRegion={{
          latitude: ubicacion?.latitude || 20.65,
          longitude: ubicacion?.longitude || -103.34,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {/* 📍 RENDERIZAR MARCADORES */}
        {puntosGuardados.map((punto) => (
          <Marker
            key={punto.id}
            coordinate={{ latitude: punto.lat, longitude: punto.lng }}
            title={punto.clasificacion}
            description={punto.nota}
          />
        ))}
      </MapView>

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
