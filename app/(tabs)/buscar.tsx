import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import {
    addDoc,
    collection,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

const HEADER_HEIGHT = Platform.OS === "ios" ? 200 : 180;

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
const modelIA = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export default function BuscarTab() {
  const [search, setSearch] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("Todo");
  const [lugares, setLugares] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [miUbicacion, setMiUbicacion] = useState<any>(null);
  const [lugarSeleccionado, setLugarSeleccionado] = useState<any>(null);

  // Estados de comentarios
  const [comentario, setComentario] = useState("");
  const [rating, setRating] = useState(5);
  const [listaComentarios, setListaComentarios] = useState<any[]>([]);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Estados de IA
  const [resumenIA, setResumenIA] = useState("");
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const [mejorandoResena, setMejorandoResena] = useState(false);

  useEffect(() => {
    actualizarGPS();
    cargarLugares();
  }, []);

  const actualizarGPS = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      let loc = await Location.getCurrentPositionAsync({});
      setMiUbicacion(loc.coords);
    }
  };

  const cargarLugares = async () => {
    setCargando(true);
    try {
      const q = query(
        collection(db, "ubicaciones"),
        where("esPublico", "==", true),
        orderBy("fecha", "desc"),
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item: any) => item.titulo);
      setLugares(data);
    } catch (error) {
      console.log("Error al cargar:", error);
    } finally {
      setCargando(false);
    }
  };

  // 💡 IA: Generar resumen de todos los comentarios
  const generarResumenComentarios = async () => {
    if (listaComentarios.length === 0) return;
    setGenerandoResumen(true);
    try {
      const textoComentarios = listaComentarios.map((c) => c.texto).join(" | ");
      const prompt = `Analiza los siguientes comentarios sobre un lugar y genera un resumen muy corto (máximo 2 líneas) que destaque lo mejor y lo peor: "${textoComentarios}"`;
      const result = await modelIA.generateContent(prompt);
      setResumenIA(result.response.text());
    } catch (error) {
      console.log("Error IA Resumen:", error);
    } finally {
      setGenerandoResumen(false);
    }
  };

  // 💡 IA: MEJORAR LA RESEÑA (Lógica corregida)
  const mejorarResenaIA = async () => {
    setMejorandoResena(true);
    try {
      let prompt = "";
      // Si el usuario ya escribió algo, el prompt pide mejorar el texto existente
      if (comentario.trim().length > 0) {
        prompt = `Actúa como un editor experto. Mejora, profesionaliza y haz más atractiva la siguiente reseña para un lugar al que califiqué con ${rating} estrellas, manteniendo mi idea original pero con mejor redacción: "${comentario}". Devuelve solo el texto mejorado sin comillas.`;
      } else {
        // Si el campo está vacío, sugiere una reseña desde cero basada en el rating
        prompt = `Genera una reseña breve, natural y entusiasta de una sola oración para un lugar al que califiqué con ${rating} de 5 estrellas. Devuelve solo el texto sin comillas.`;
      }

      const result = await modelIA.generateContent(prompt);
      const textoFinal = result.response.text().trim().replace(/"/g, "");
      setComentario(textoFinal);
    } catch (error) {
      console.log("Error IA Mejorar:", error);
      Alert.alert("Error", "No se pudo mejorar la reseña en este momento.");
    } finally {
      setMejorandoResena(false);
    }
  };

  const lugaresFiltrados = useMemo(() => {
    return lugares.filter((item) => {
      const searchLower = search.toLowerCase().trim();
      const cumpleBusqueda =
        searchLower === "" ||
        item.titulo?.toLowerCase().includes(searchLower) ||
        item.hashtags?.toLowerCase().includes(searchLower) ||
        item.clasificacion?.toLowerCase().includes(searchLower);
      if (filtroActivo === "Todo") return cumpleBusqueda;
      const tagLimpio = filtroActivo.replace("# ", "").toLowerCase();
      return (
        cumpleBusqueda &&
        (item.hashtags?.toLowerCase().includes(tagLimpio) ||
          item.clasificacion?.toLowerCase().includes(tagLimpio))
      );
    });
  }, [search, filtroActivo, lugares]);

  useEffect(() => {
    if (!lugarSeleccionado) {
      setResumenIA("");
      setComentario("");
      return;
    }
    const q = query(
      collection(db, "ubicaciones", lugarSeleccionado.id, "comentarios"),
      orderBy("fecha", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setListaComentarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [lugarSeleccionado]);

  const FiltroChip = ({ title }: { title: string }) => (
    <TouchableOpacity
      style={[styles.chip, filtroActivo === title && styles.chipActive]}
      onPress={() => setFiltroActivo(title)}
    >
      <Text
        style={[
          styles.chipText,
          filtroActivo === title && styles.chipTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={lugaresFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          { paddingTop: HEADER_HEIGHT + 10 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={cargarLugares}
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        renderItem={({ item }) => {
          const autor =
            item.usuario === auth.currentUser?.email
              ? "Mí (Tú)"
              : item.usuario
                ? item.usuario.split("@")[0]
                : "Explorador";
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setLugarSeleccionado(item)}
              activeOpacity={0.8}
            >
              <View style={styles.thumbContainer}>
                {item.fotos && item.fotos[0] ? (
                  <Image source={{ uri: item.fotos[0] }} style={styles.thumb} />
                ) : (
                  <View style={styles.placeholderThumb}>
                    <Ionicons name="image-outline" size={24} color="#CCC" />
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <View style={styles.authorBadge}>
                  <Ionicons name="person-circle" size={12} color="#8E8E93" />
                  <Text style={styles.authorText}>Por {autor}</Text>
                </View>
                <Text style={styles.placeTitle} numberOfLines={1}>
                  {item.titulo}
                </Text>
                <Text style={styles.tags} numberOfLines={1}>
                  {item.hashtags}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
            </TouchableOpacity>
          );
        }}
      />

      <BlurView intensity={90} tint="light" style={styles.headerGlass}>
        <View style={styles.headerContent}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={18}
                color="#8E8E93"
                style={{ marginRight: 8 }}
              />
              <TextInput
                placeholder="Buscar por nombre, zona..."
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              onPress={cargarLugares}
              style={styles.reloadBtnInline}
            >
              {cargando ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="refresh" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <FiltroChip title="Todo" />
              <FiltroChip title="Cerca de mí" />
              <FiltroChip title="# Naturaleza" />
              <FiltroChip title="# Cascada" />
              <FiltroChip title="# Ciudad" />
            </ScrollView>
          </View>
        </View>
      </BlurView>

      <Modal visible={!!lugarSeleccionado} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <BlurView intensity={100} tint="light" style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setLugarSeleccionado(null)}
            >
              <Ionicons name="close-circle" size={34} color="#000" />
            </TouchableOpacity>
            {lugarSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: lugarSeleccionado.fotos?.[0] }}
                  style={styles.modalImg}
                />
                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>
                    {lugarSeleccionado.titulo}
                  </Text>
                  <Text style={styles.modalDesc}>
                    {lugarSeleccionado.descripcion}
                  </Text>

                  {/* 💡 SECCIÓN IA: RESUMEN DE COMENTARIOS */}
                  {listaComentarios.length > 0 && (
                    <View style={styles.aiContainer}>
                      <TouchableOpacity
                        style={styles.aiButton}
                        onPress={generarResumenComentarios}
                        disabled={generandoResumen}
                      >
                        {generandoResumen ? (
                          <ActivityIndicator size="small" color="#007AFF" />
                        ) : (
                          <Ionicons name="sparkles" size={16} color="#007AFF" />
                        )}
                        <Text style={styles.aiButtonText}>
                          ¿Qué dice la comunidad? (IA)
                        </Text>
                      </TouchableOpacity>
                      {resumenIA ? (
                        <Text style={styles.resumenIAtext}>{resumenIA}</Text>
                      ) : null}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.routeBtn}
                    onPress={() =>
                      Linking.openURL(
                        Platform.OS === "ios"
                          ? `maps:0,0?q=${lugarSeleccionado.titulo}@${lugarSeleccionado.lat},${lugarSeleccionado.lng}`
                          : `geo:${lugarSeleccionado.lat},${lugarSeleccionado.lng}?q=${lugarSeleccionado.lat},${lugarSeleccionado.lng}(${lugarSeleccionado.titulo})`,
                      )
                    }
                  >
                    <Ionicons name="navigate" size={20} color="#FFF" />
                    <Text style={styles.routeBtnText}>Trazar Ruta</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <View style={styles.headerResenas}>
                    <Text style={styles.sectionTitle}>
                      Reseñas ({listaComentarios.length})
                    </Text>

                    {/* 💡 BOTÓN IA ACTUALIZADO: MEJORAR RESEÑA */}
                    <TouchableOpacity
                      style={styles.aiHelper}
                      onPress={mejorarResenaIA}
                      disabled={mejorandoResena}
                    >
                      {mejorandoResena ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <Ionicons name="sparkles" size={14} color="#007AFF" />
                      )}
                      <Text style={[styles.aiHelperText, { color: "#007AFF" }]}>
                        {comentario.trim().length > 0
                          ? "Mejorar con IA"
                          : "Sugerir con IA"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity key={s} onPress={() => setRating(s)}>
                        <Ionicons
                          name={s <= rating ? "star" : "star-outline"}
                          size={28}
                          color="#FFCC00"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.commentInputContainer}>
                    <TextInput
                      placeholder="Escribe tu opinión aquí..."
                      style={styles.commentInput}
                      value={comentario}
                      onChangeText={setComentario}
                      multiline={true}
                    />
                    <TouchableOpacity
                      onPress={async () => {
                        if (!comentario.trim()) return;
                        setEnviandoComentario(true);
                        await addDoc(
                          collection(
                            db,
                            "ubicaciones",
                            lugarSeleccionado.id,
                            "comentarios",
                          ),
                          {
                            usuario: auth.currentUser?.email || "Anónimo",
                            texto: comentario,
                            calificacion: rating,
                            fecha: serverTimestamp(),
                          },
                        );
                        setComentario("");
                        setEnviandoComentario(false);
                      }}
                    >
                      {enviandoComentario ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Ionicons name="send" size={24} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {listaComentarios.map((c) => (
                    <View key={c.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>
                          {c.usuario?.split("@")[0]}
                        </Text>
                        <View style={styles.commentStarRow}>
                          <Ionicons name="star" size={10} color="#FFCC00" />
                          <Text style={styles.commentRatingText}>
                            {c.calificacion}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.commentText}>{c.texto}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  headerGlass: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerContent: {
    paddingTop: Platform.OS === "ios" ? 80 : 45,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500" },
  reloadBtnInline: {
    backgroundColor: "rgba(255,255,255,0.7)",
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  filterContainer: { marginTop: 5 },
  filterScroll: { gap: 8, alignItems: "center" },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  chipActive: { backgroundColor: "#000" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#8E8E93" },
  chipTextActive: { color: "#FFF" },
  listContainer: { padding: 16, paddingBottom: 120 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  thumbContainer: { position: "relative" },
  thumb: {
    width: 85,
    height: 85,
    borderRadius: 14,
    backgroundColor: "#F1F3F5",
  },
  placeholderThumb: {
    width: 85,
    height: 85,
    borderRadius: 14,
    backgroundColor: "#F1F3F5",
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1, marginLeft: 15, marginRight: 15, justifyContent: "center" },
  authorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  authorText: { fontSize: 10, color: "#8E8E93", fontWeight: "600" },
  placeTitle: {
    fontWeight: "800",
    fontSize: 14,
    color: "#1C1C1E",
    marginBottom: 2,
  },
  tags: { color: "#007AFF", fontSize: 11, marginBottom: 6 },
  modalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  closeBtn: { position: "absolute", right: 20, top: 20, zIndex: 10 },
  modalImg: { width: "100%", height: 300 },
  modalBody: { padding: 25 },
  modalTitle: { fontSize: 26, fontWeight: "900", marginBottom: 8 },
  modalDesc: { fontSize: 15, color: "#444", lineHeight: 22, marginBottom: 20 },

  aiContainer: {
    backgroundColor: "rgba(0,122,255,0.05)",
    padding: 15,
    borderRadius: 20,
    marginBottom: 20,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  aiButtonText: { fontSize: 14, fontWeight: "700", color: "#007AFF" },
  resumenIAtext: {
    fontSize: 13,
    color: "#444",
    fontStyle: "italic",
    lineHeight: 18,
  },
  headerResenas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  aiHelper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#e8f2ff", // Azul muy claro para resaltar la IA
    padding: 8,
    borderRadius: 12,
  },
  aiHelperText: { fontSize: 12, fontWeight: "700" },

  routeBtn: {
    flexDirection: "row",
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  routeBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 25 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginBottom: 25,
  },
  commentInput: { flex: 1, marginRight: 10, minHeight: 40 },
  commentCard: {
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentUser: { fontWeight: "800", fontSize: 14 },
  commentStarRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  commentRatingText: { fontSize: 12, fontWeight: "700" },
  commentText: { fontSize: 14, color: "#333", lineHeight: 20 },
});
