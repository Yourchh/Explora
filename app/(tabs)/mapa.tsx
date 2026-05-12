import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BlurView } from "expo-blur";
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { auth, db } from "../../firebaseConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.92;

export default function MapaTab() {
  const [ubicacion, setUbicacion] = useState<any>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [esPublico, setEsPublico] = useState(false);
  const [imagenes, setImagenes] = useState<string[]>([]);

  // Separación de estados para combinar puntos propios y de terceros
  const [misUbicaciones, setMisUbicaciones] = useState<any[]>([]);
  const [ubicacionesPublicas, setUbicacionesPublicas] = useState<any[]>([]);

  const [cargando, setCargando] = useState(false);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<any>(null);

  // Guardará el perfil del usuario actual (para obtener el apodo)
  const [miPerfil, setMiPerfil] = useState<any>(null);

  // ESTADOS PARA DETALLES DE COMUNIDAD
  const [listaResenas, setListaResenas] = useState<any[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<any>(null);

  // Lógica para calcular el promedio de estrellas
  const promedioCalificacion = useMemo(() => {
    if (listaResenas.length === 0) return "Nuevo";
    const suma = listaResenas.reduce(
      (acc, curr) => acc + (curr.calificacion || 0),
      0,
    );
    return (suma / listaResenas.length).toFixed(1);
  }, [listaResenas]);

  // Escucha el perfil del usuario para tener su apodo siempre a la mano
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

  // ESCUCHA 1: Mis Ubicaciones
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

  // ESCUCHA 2: Ubicaciones Públicas (Comunidad)
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

  // Combinador de puntos para mostrar en el mapa sin duplicados
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

  // ESCUCHA DE RESEÑAS EN TIEMPO REAL
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

  // AUTO-CARRUSEL
  useEffect(() => {
    if (puntoSeleccionado?.fotos?.length > 1) {
      timerRef.current = setInterval(() => {
        const nextIndex =
          (activeImageIndex + 1) % puntoSeleccionado.fotos.length;
        scrollRef.current?.scrollTo({
          x: nextIndex * CARD_WIDTH,
          animated: true,
        });
        setActiveImageIndex(nextIndex);
      }, 3000);
    }
    return () => clearInterval(timerRef.current);
  }, [puntoSeleccionado, activeImageIndex]);

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

  // 💡 ACTUALIZADO: IA MÁS INTELIGENTE (Funciona con o sin imagen para ayudar al usuario)
  const autocompletarConIA = async () => {
    setGenerandoIA(true);
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.EXPO_PUBLIC_GEMINI_API_KEY!,
      );
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let result;

      // Si hay imagen, la analizamos
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
        // Si no hay imagen, inventamos textos genéricos geniales
        const prompt = `Genera un JSON con datos de relleno para un lugar increíble a explorar: {"titulo": "...", "descripcion": "...", "hashtags": "#tag1 #tag2"}`;
        result = await model.generateContent(prompt);
      }

      const data = JSON.parse(
        result.response
          .text()
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      // Solo sobreescribimos si el campo estaba vacío, para no borrar lo que el usuario ya escribió
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
    // 💡 NUEVO: VALIDACIÓN ESTRICTA DE TODOS LOS CAMPOS
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
                setActiveImageIndex(0);
              }}
            />
          );
        })}
      </MapView>

      {/* TARJETA DE DETALLE MEJORADA CON OPACIDAD SÓLIDA */}
      {puntoSeleccionado && !mostrarFormulario && (
        <View style={styles.detailPosition}>
          <BlurView intensity={100} tint="light" style={styles.detailCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.heroContainer}>
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setActiveImageIndex(
                      Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH),
                    )
                  }
                >
                  {puntoSeleccionado.fotos?.length > 0 ? (
                    puntoSeleccionado.fotos.map((uri: string, idx: number) => (
                      <Image
                        key={idx}
                        source={{ uri }}
                        style={styles.heroImage}
                      />
                    ))
                  ) : (
                    <View style={[styles.heroImage, styles.imgPlaceholder]}>
                      <Ionicons name="image-outline" size={50} color="#ccc" />
                    </View>
                  )}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setPuntoSeleccionado(null)}
                  style={styles.closeOnHero}
                >
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.paginationDots}>
                  {puntoSeleccionado.fotos?.map((_: any, i: number) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { opacity: activeImageIndex === i ? 1 : 0.4 },
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.detailBody}>
                <View style={styles.authorBadge}>
                  <Ionicons name="person-circle" size={16} color="#8E8E93" />
                  <Text style={styles.authorText}>
                    Por{" "}
                    {puntoSeleccionado.userId === auth.currentUser?.uid
                      ? "Mí (Tú)"
                      : puntoSeleccionado.usuario || "Explorador"}
                  </Text>
                </View>

                <View style={styles.titleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailTitle}>
                      {puntoSeleccionado.titulo}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={16} color="#FFCC00" />
                      <Text style={styles.ratingValue}>
                        {promedioCalificacion}
                      </Text>
                      <Text style={styles.ratingCount}>
                        ({listaResenas.length} reseñas)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>PUNTO</Text>
                  </View>
                </View>

                <Text style={styles.detailTags}>
                  {puntoSeleccionado.hashtags}
                </Text>
                <Text style={styles.detailDesc}>
                  {puntoSeleccionado.descripcion}
                </Text>

                <TouchableOpacity
                  style={styles.routeBtn}
                  onPress={() =>
                    Linking.openURL(
                      Platform.OS === "ios"
                        ? `maps:0,0?q=${puntoSeleccionado.titulo}@${puntoSeleccionado.lat},${puntoSeleccionado.lng}`
                        : `geo:0,0?q=${puntoSeleccionado.lat},${puntoSeleccionado.lng}(${puntoSeleccionado.titulo})`,
                    )
                  }
                >
                  <Ionicons name="navigate" size={20} color="#FFF" />
                  <Text style={styles.routeBtnText}>Trazar Ruta</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Reseñas de la comunidad</Text>
                {listaResenas.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Aún no hay reseñas. ¡Sé el primero!
                  </Text>
                ) : (
                  listaResenas.map((r) => (
                    <View key={r.id} style={styles.resenaCard}>
                      <View style={styles.resenaHeader}>
                        <Text style={styles.resenaUser}>
                          {r.usuario?.split("@")[0]}
                        </Text>
                        <View style={styles.resenaStars}>
                          <Ionicons name="star" size={10} color="#FFCC00" />
                          <Text style={styles.resenaValue}>
                            {r.calificacion}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.resenaText}>{r.texto}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </BlurView>
        </View>
      )}

      {/* 🔵 FORMULARIO DE CREACIÓN */}
      {mostrarFormulario ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={90}
          style={styles.formPosition}
          pointerEvents="box-none"
        >
          <View style={styles.cardShadow}>
            <BlurView intensity={85} tint="light" style={styles.cardBlur}>
              <View style={styles.header}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Nueva Entrada
                </Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={gestionarCoordenadas}
                    style={styles.coordsBadge}
                  >
                    <Ionicons name="location" size={12} color="#000" />
                    <Text style={styles.coordsText}>
                      {ubicacion
                        ? `${ubicacion.latitude.toFixed(4)}, ${ubicacion.longitude.toFixed(4)}`
                        : "Ubicando..."}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMostrarFormulario(false)}
                    style={styles.closeBadge}
                  >
                    <Ionicons name="close" size={18} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryScroll}
              >
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => seleccionarImagen(false)}
                >
                  <Ionicons name="add" size={32} color="#000" />
                </TouchableOpacity>
                {imagenes.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.imageWrapper}
                    onPress={() => gestionarFoto(idx)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.galleryImg} />
                    {idx === 0 && (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>Principal</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.inputsWrapper}>
                {/* 💡 BOTÓN IA AHORA SIEMPRE VISIBLE */}
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={autocompletarConIA}
                  disabled={generandoIA}
                >
                  {generandoIA ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="sparkles" size={16} color="#FFF" />
                  )}
                  <Text style={styles.aiButtonText}>
                    {generandoIA ? "Analizando..." : "Autocompletar con IA"}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  placeholder="Nombre del lugar"
                  style={styles.textInputApple}
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholderTextColor="#8E8E93"
                />
                <TextInput
                  placeholder="Descripción..."
                  style={[
                    styles.textInputApple,
                    { height: 75, paddingTop: 14 },
                  ]}
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  placeholderTextColor="#8E8E93"
                />
                <TextInput
                  placeholder="#etiquetas"
                  style={styles.textInputApple}
                  value={hashtags}
                  onChangeText={(texto) => {
                    const formateado = texto
                      .split(" ")
                      .map((word) => {
                        if (word.length > 0 && !word.startsWith("#")) {
                          return "#" + word;
                        }
                        return word;
                      })
                      .join(" ");
                    setHashtags(formateado);
                  }}
                  placeholderTextColor="#8E8E93"
                />
              </View>
              <View style={styles.footer}>
                <View style={styles.controlsGroup}>
                  <TouchableOpacity
                    onPress={() => seleccionarImagen(true)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="camera" size={24} color="#000" />
                  </TouchableOpacity>
                  <View style={styles.vDivider} />
                  <View style={styles.switchBox}>
                    <Text style={styles.switchLabel}>Público</Text>
                    <Switch
                      value={esPublico}
                      onValueChange={setEsPublico}
                      trackColor={{ false: "rgba(0,0,0,0.1)", true: "#34C759" }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.btnSend, cargando && { opacity: 0.6 }]}
                  onPress={registrarLugar}
                  disabled={cargando}
                >
                  {cargando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="arrow-up" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
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
  cardShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 15,
    borderRadius: 38,
  },

  detailPosition: {
    position: "absolute",
    bottom: 110,
    width: CARD_WIDTH,
    alignSelf: "center",
    maxHeight: "75%",
  },
  detailCard: {
    borderRadius: 36,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: "#FFFFFF",
  },
  heroContainer: { width: "100%", height: 260, position: "relative" },
  heroImage: { width: CARD_WIDTH, height: 260, resizeMode: "cover" },
  closeOnHero: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDots: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFF" },
  detailBody: { padding: 22 },
  authorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  authorText: { fontSize: 12, fontWeight: "700", color: "#8E8E93" },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  detailTitle: { fontSize: 24, fontWeight: "900", color: "#1c1e1e" },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  ratingValue: { fontSize: 16, fontWeight: "800" },
  ratingCount: { fontSize: 14, color: "#8E8E93" },
  categoryBadge: {
    backgroundColor: "#000",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailTags: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 10,
  },
  detailDesc: { fontSize: 15, color: "#444", lineHeight: 22, marginBottom: 20 },
  routeBtn: {
    flexDirection: "row",
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  routeBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 15 },
  resenaCard: {
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  resenaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  resenaUser: { fontWeight: "700", fontSize: 14 },
  resenaStars: { flexDirection: "row", alignItems: "center", gap: 3 },
  resenaValue: { fontSize: 12, fontWeight: "800" },
  resenaText: { fontSize: 14, color: "#555" },
  emptyText: { fontSize: 13, color: "#999", textAlign: "center" },
  imgPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },

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
  formPosition: {
    position: "absolute",
    bottom: 110,
    width: "92%",
    alignSelf: "center",
  },
  cardBlur: {
    borderRadius: 38,
    padding: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#000", flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  coordsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  coordsText: { fontSize: 11, color: "#000", fontWeight: "600", marginLeft: 4 },
  closeBadge: {
    backgroundColor: "rgba(0,0,0,0.08)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryScroll: { paddingRight: 20, paddingBottom: 20 },
  addBtn: {
    width: 90,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  imageWrapper: { position: "relative", marginRight: 12 },
  galleryImg: { width: 90, height: 90, borderRadius: 24 },
  mainBadge: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    backgroundColor: "#000",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  mainBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  inputsWrapper: { marginBottom: 20, gap: 12 },
  aiButton: {
    flexDirection: "row",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  aiButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  textInputApple: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlsGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 56,
    flex: 1,
    marginRight: 15,
  },
  actionBtn: { padding: 6 },
  vDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: 15,
  },
  switchBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginRight: 10,
  },
  btnSend: {
    backgroundColor: "#000",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
