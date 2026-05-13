import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { auth, db } from "../../firebaseConfig";

// Asegúrate de que las rutas relativas sean correctas para tu estructura de carpetas
import MapCreationForm from "../../components/mapa/MapCreationForm";
import MapDetailCard from "../../components/mapa/MapDetailCard";

export default function MapaTab() {
  const [ubicacion, setUbicacion] = useState<any>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [esPublico, setEsPublico] = useState(false);
  const [imagenes, setImagenes] = useState<string[]>([]);

  const [misUbicaciones, setMisUbicaciones] = useState<any[]>([]);
  const [ubicacionesPublicas, setUbicacionesPublicas] = useState<any[]>([]);

  const [cargando, setCargando] = useState(false);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<any>(null);

  const [miPerfil, setMiPerfil] = useState<any>(null);
  const [listaResenas, setListaResenas] = useState<any[]>([]);

  const promedioCalificacion = useMemo(() => {
    if (listaResenas.length === 0) return "Nuevo";
    const suma = listaResenas.reduce(
      (acc, curr) => acc + (curr.calificacion || 0),
      0,
    );
    return (suma / listaResenas.length).toFixed(1);
  }, [listaResenas]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubProfile = onSnapshot(
      doc(db, "users", auth.currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setMiPerfil(docSnap.data());
        }
      },
    );
    return () => unsubProfile();
  }, []);

  const actualizarGPS = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      let current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUbicacion(current.coords);
    }
  };

  useEffect(() => {
    actualizarGPS();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "ubicaciones"),
      where("userId", "==", auth.currentUser.uid),
    );
    return onSnapshot(q, (snapshot) => {
      setMisUbicaciones(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "ubicaciones"),
      where("esPublico", "==", true),
    );
    return onSnapshot(q, (snapshot) => {
      setUbicacionesPublicas(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
  }, []);

  const puntosGuardados = useMemo(() => {
    const map = new Map();
    ubicacionesPublicas.forEach((p) => {
      if (p.userId !== auth.currentUser?.uid) {
        map.set(p.id, p);
      }
    });
    misUbicaciones.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [misUbicaciones, ubicacionesPublicas]);

  useEffect(() => {
    if (!puntoSeleccionado) return;
    const q = query(
      collection(db, "ubicaciones", puntoSeleccionado.id, "comentarios"),
      orderBy("fecha", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setListaResenas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [puntoSeleccionado]);

  const gestionarCoordenadas = () => {
    Alert.alert("Coordenadas", "¿Qué deseas hacer?", [
      { text: "📍 Actualizar GPS", onPress: actualizarGPS },
      {
        text: "📋 Pegar",
        onPress: () => {
          Alert.prompt("Ingresar", "latitud, longitud", (texto) => {
            if (texto) {
              const partes = texto.split(",");
              if (partes.length === 2)
                setUbicacion({
                  latitude: parseFloat(partes[0]),
                  longitude: parseFloat(partes[1]),
                });
            }
          });
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const seleccionarImagen = async (
    desdeCamara: boolean,
    indexReemplazo?: number,
  ) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      };
      const result = desdeCamara
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets) {
        if (indexReemplazo !== undefined) {
          const nuevas = [...imagenes];
          nuevas[indexReemplazo] = result.assets[0].uri;
          setImagenes(nuevas);
        } else {
          setImagenes([...imagenes, result.assets[0].uri]);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const gestionarFoto = (index: number) => {
    Alert.alert("Gestionar Foto", "¿Qué deseas hacer?", [
      { text: "🔄 Cambiar", onPress: () => seleccionarImagen(false, index) },
      {
        text: "🗑️ Eliminar",
        style: "destructive",
        onPress: () => setImagenes(imagenes.filter((_, i) => i !== index)),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const autocompletarConIA = async () => {
    setGenerandoIA(true);
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.EXPO_PUBLIC_GEMINI_API_KEY!,
      );
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      let result;

      if (imagenes.length > 0) {
        const base64 = await FileSystem.readAsStringAsync(imagenes[0], {
          encoding: "base64",
        });
        const prompt = `Analiza la imagen y devuelve un JSON: {"titulo": "...", "descripcion": "...", "hashtags": "#tag1 #tag2"}`;
        result = await model.generateContent([
          prompt,
          { inlineData: { data: base64, mimeType: "image/jpeg" } },
        ]);
      } else {
        const prompt = `Genera un JSON con datos de relleno para un lugar increíble a explorar: {"titulo": "...", "descripcion": "...", "hashtags": "#tag1 #tag2"}`;
        result = await model.generateContent(prompt);
      }

      const data = JSON.parse(
        result.response
          .text()
          .replace(/`{3}json/g, "")
          .replace(/`{3}/g, "")
          .trim(),
      );

      if (!titulo && data.titulo) setTitulo(data.titulo);
      if (!descripcion && data.descripcion) setDescripcion(data.descripcion);
      if (!hashtags && data.hashtags) setHashtags(data.hashtags);

      if (imagenes.length === 0) {
        Alert.alert(
          "Textos generados",
          "La IA ha rellenado los textos, pero aún necesitas añadir una imagen antes de registrar la ubicación.",
        );
      }
    } catch (error: any) {
      console.log(error);
      Alert.alert("Error IA", "Hubo un problema al generar los datos.");
    } finally {
      setGenerandoIA(false);
    }
  };

  const registrarLugar = async () => {
    if (
      !titulo.trim() ||
      !descripcion.trim() ||
      !hashtags.trim() ||
      imagenes.length === 0
    ) {
      Alert.alert(
        "Campos incompletos",
        "Por favor rellene todos los campos (título, descripción, hashtags e imagen).",
        [
          { text: "Rellenar con IA", onPress: autocompletarConIA },
          { text: "Seguir editando", style: "cancel" },
        ],
      );
      return;
    }

    setCargando(true);
    try {
      let urlsFinales: string[] = [];
      for (let img of imagenes) {
        const res = await fetch(img);
        const blob = await res.blob();
        const storageRef = ref(
          getStorage(),
          `puntos/${auth.currentUser?.uid}/${Date.now()}-${Math.random()}`,
        );
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        urlsFinales.push(url);
      }

      const nombreUsuario =
        miPerfil?.username ||
        auth.currentUser?.displayName ||
        (auth.currentUser?.email
          ? auth.currentUser.email.split("@")[0]
          : "Explorador");

      await addDoc(collection(db, "ubicaciones"), {
        userId: auth.currentUser?.uid,
        usuario: nombreUsuario,
        titulo,
        descripcion,
        hashtags,
        lat: ubicacion.latitude,
        lng: ubicacion.longitude,
        clasificacion: "📍 Punto",
        fotos: urlsFinales,
        esPublico,
        fecha: serverTimestamp(),
      });

      setTitulo("");
      setDescripcion("");
      setHashtags("");
      setImagenes([]);
      setMostrarFormulario(false);
      Alert.alert("Éxito", "Ubicación registrada.");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo registrar la ubicación.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation
        region={
          ubicacion
            ? { ...ubicacion, latitudeDelta: 0.005, longitudeDelta: 0.005 }
            : undefined
        }
        onPress={() => {
          Keyboard.dismiss();
          setMostrarFormulario(false);
          setPuntoSeleccionado(null);
        }}
      >
        {puntosGuardados.map((p) => {
          const esMio = p.userId === auth.currentUser?.uid;
          const colorPin = esMio
            ? p.esPublico
              ? "#34C759"
              : "#FF3B30"
            : "#007AFF";

          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              pinColor={colorPin}
              onPress={(e) => {
                e.stopPropagation();
                setPuntoSeleccionado(p);
                setMostrarFormulario(false);
              }}
            />
          );
        })}
      </MapView>

      {/* COMPONENTE: DETALLES DEL LUGAR */}
      {puntoSeleccionado && !mostrarFormulario && (
        <MapDetailCard
          puntoSeleccionado={puntoSeleccionado}
          listaResenas={listaResenas}
          promedioCalificacion={promedioCalificacion}
          currentUserId={auth.currentUser?.uid}
          onClose={() => setPuntoSeleccionado(null)}
        />
      )}

      {/* COMPONENTE: FORMULARIO DE CREACIÓN */}
      {mostrarFormulario ? (
        <MapCreationForm
          titulo={titulo}
          setTitulo={setTitulo}
          descripcion={descripcion}
          setDescripcion={setDescripcion}
          hashtags={hashtags}
          setHashtags={setHashtags}
          esPublico={esPublico}
          setEsPublico={setEsPublico}
          imagenes={imagenes}
          ubicacion={ubicacion}
          cargando={cargando}
          generandoIA={generandoIA}
          onClose={() => setMostrarFormulario(false)}
          onManageCoords={gestionarCoordenadas}
          onAddImage={seleccionarImagen}
          onManageImage={gestionarFoto}
          onAutoFill={autocompletarConIA}
          onSubmit={registrarLugar}
        />
      ) : (
        !puntoSeleccionado && (
          <TouchableOpacity
            style={styles.fabContainer}
            activeOpacity={0.8}
            onPress={() => setMostrarFormulario(true)}
          >
            <View style={styles.fabButton}>
              <Ionicons name="location" size={20} color="#FFF" />
              <Text style={styles.fabText}>Registrar Ubicación</Text>
            </View>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  fabContainer: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    elevation: 10,
  },
  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  fabText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
