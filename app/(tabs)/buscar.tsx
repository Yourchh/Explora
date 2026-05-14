import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import {
  addDoc,
  collection,
  doc,
  documentId,
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
  Dimensions,
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

// Importa tus componentes extraídos
import ShareFriendModal from "../../components/ShareFriendModal";
import ExploreHeader from "../../components/buscar/ExploreHeader";
import ExploreListItem from "../../components/buscar/ExploreListItem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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

  const [miPerfil, setMiPerfil] = useState<any>(null);
  const [amigosList, setAmigosList] = useState<any[]>([]);

  // Estados de comentarios
  const [comentario, setComentario] = useState("");
  const [rating, setRating] = useState(5);
  const [listaComentarios, setListaComentarios] = useState<any[]>([]);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Estados Compartir al Chat
  const [modalSendToChat, setModalSendToChat] = useState(false);

  // Estados de IA
  const [resumenIA, setResumenIA] = useState("");
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const [mejorandoResena, setMejorandoResena] = useState(false);

  // OBTENER PERFIL Y AMIGOS
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubProfile = onSnapshot(
      doc(db, "users", auth.currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMiPerfil(data);

          if (data.friends && data.friends.length > 0) {
            cargarAmigos(data.friends);
          } else {
            setAmigosList([]);
          }
        }
      },
    );
    return () => unsubProfile();
  }, []);

  const cargarAmigos = async (friendsUids: string[]) => {
    if (friendsUids.length === 0) return;
    try {
      const uidsSeguros = friendsUids.slice(0, 10);
      const q = query(
        collection(db, "users"),
        where(documentId(), "in", uidsSeguros),
      );
      const snap = await getDocs(q);
      setAmigosList(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch (e) {
      console.log("Error al cargar amigos:", e);
    }
  };

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

  // 💡 COMPARTIR LUGAR AL CHAT
  const reenviarAlChat = async (amigo: any) => {
    if (!lugarSeleccionado || !auth.currentUser) return;
    setModalSendToChat(false);

    const chatId = [auth.currentUser.uid, amigo.uid].sort().join("_");
    const titulo = lugarSeleccionado.titulo || lugarSeleccionado.nombre;
    const linkTexto = `📍 ¡Mira este lugar increíble: ${titulo}!\n${lugarSeleccionado.descripcion || ""}`;

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: linkTexto,
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        isLocationShare: true,
        lugarDetails: lugarSeleccionado,
        lat: lugarSeleccionado.lat || null,
        lng: lugarSeleccionado.lng || null,
        locationTitle: titulo || null,
      });

      Alert.alert(
        "¡Enviado!",
        `La ubicación fue compartida con ${amigo.username || "tu amigo"}.`,
      );
    } catch (e) {
      console.log("Error al enviar ubicación al chat:", e);
      Alert.alert("Error", "No se pudo compartir la ubicación.");
    }
  };

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

  const mejorarResenaIA = async () => {
    setMejorandoResena(true);
    try {
      let prompt = "";
      if (comentario.trim().length > 0) {
        prompt = `Actúa como un editor experto. Mejora la siguiente reseña para un lugar de ${rating} estrellas: "${comentario}". Devuelve solo el texto sin comillas.`;
      } else {
        prompt = `Genera una reseña breve de una oración para un lugar de ${rating} estrellas. Devuelve solo el texto sin comillas.`;
      }
      const result = await modelIA.generateContent(prompt);
      setComentario(result.response.text().trim().replace(/"/g, ""));
    } catch (error) {
      console.log("Error IA Mejorar:", error);
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
        item.hashtags?.toLowerCase().includes(searchLower);
      if (filtroActivo === "Todo") return cumpleBusqueda;
      const tagLimpio = filtroActivo.replace("# ", "").toLowerCase();
      return cumpleBusqueda && item.hashtags?.toLowerCase().includes(tagLimpio);
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

  return (
    <View style={styles.container}>
      {/* 💡 COMPONENTE: CABECERA Y FILTROS */}
      <ExploreHeader
        search={search}
        setSearch={setSearch}
        cargando={cargando}
        cargarLugares={cargarLugares}
        filtroActivo={filtroActivo}
        setFiltroActivo={setFiltroActivo}
      />

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
        renderItem={({ item }) => (
          <ExploreListItem
            item={item}
            currentUserId={auth.currentUser?.uid}
            onPress={() => setLugarSeleccionado(item)}
          />
        )}
      />

      {/* 💡 OVERLAY: ENVIAR AL CHAT (Capa Superior en la Raíz) */}
      <ShareFriendModal
        visible={modalSendToChat}
        amigosList={amigosList}
        onReenviar={reenviarAlChat}
        onClose={() => setModalSendToChat(false)}
      />

      {/* DETALLE DEL LUGAR */}
      <Modal
        visible={!!lugarSeleccionado}
        animationType="slide"
        transparent={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <BlurView intensity={60} tint="light" style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setLugarSeleccionado(null);
                setModalSendToChat(false);
              }}
            >
              <Ionicons name="close-circle" size={34} color="#000" />
            </TouchableOpacity>

            {lugarSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {lugarSeleccionado.fotos &&
                lugarSeleccionado.fotos.length > 0 ? (
                  <View>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                    >
                      {lugarSeleccionado.fotos.map(
                        (foto: string, index: number) => (
                          <Image
                            key={index}
                            source={{ uri: foto }}
                            style={{
                              width: SCREEN_WIDTH,
                              height: 350,
                              resizeMode: "cover",
                            }}
                          />
                        ),
                      )}
                    </ScrollView>
                    {lugarSeleccionado.fotos.length > 1 && (
                      <View style={styles.carouselBadge}>
                        <Text style={styles.carouselBadgeText}>
                          Desliza ({lugarSeleccionado.fotos.length} fotos)
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.modalImg,
                      {
                        backgroundColor: "rgba(255,255,255,0.9)",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Ionicons name="image-outline" size={40} color="#CCC" />
                  </View>
                )}

                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>
                    {lugarSeleccionado.titulo}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 15,
                    }}
                  >
                    <Ionicons name="person-circle" size={18} color="#8E8E93" />
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#8E8E93",
                        marginLeft: 4,
                        fontWeight: "600",
                      }}
                    >
                      Registrado por:{" "}
                      {lugarSeleccionado.userId === auth.currentUser?.uid
                        ? "Mí (Tú)"
                        : lugarSeleccionado.usuario || "Explorador"}
                    </Text>
                  </View>

                  <Text style={styles.modalDesc}>
                    {lugarSeleccionado.descripcion}
                  </Text>

                  <View style={styles.actionButtonsRow}>
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
                      <Ionicons name="navigate" size={18} color="#FFF" />
                      <Text style={styles.routeBtnText}>Ir</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sendToChatBtn}
                      onPress={() => setModalSendToChat(true)}
                    >
                      <Ionicons name="paper-plane" size={18} color="#007AFF" />
                      <Text style={styles.sendToChatBtnText}>
                        Compartir a Amigo
                      </Text>
                    </TouchableOpacity>
                  </View>

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

                  <View style={styles.divider} />
                  <View style={styles.headerResenas}>
                    <Text style={styles.sectionTitle}>
                      Reseñas ({listaComentarios.length})
                    </Text>

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

                        const nombreUsuario =
                          miPerfil?.username ||
                          auth.currentUser?.displayName ||
                          (auth.currentUser?.email
                            ? auth.currentUser.email.split("@")[0]
                            : "Explorador");

                        await addDoc(
                          collection(
                            db,
                            "ubicaciones",
                            lugarSeleccionado.id,
                            "comentarios",
                          ),
                          {
                            usuario: nombreUsuario,
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
                        <Text style={styles.commentUser}>{c.usuario}</Text>
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
                  <View style={{ height: 40 }} />
                </View>
              </ScrollView>
            )}
            <ShareFriendModal
              visible={modalSendToChat}
              amigosList={amigosList}
              onReenviar={reenviarAlChat}
              onClose={() => setModalSendToChat(false)}
            />
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Se removieron los estilos que ahora pertenecen a ExploreHeader, ExploreListItem y ShareFriendModal
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  listContainer: { padding: 16, paddingBottom: 120 },
  modalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
  },
  modalImg: { width: "100%", height: 350 },
  carouselBadge: {
    position: "absolute",
    bottom: 15,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  carouselBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  modalBody: { padding: 25 },
  modalTitle: { fontSize: 26, fontWeight: "900", marginBottom: 6 },
  modalDesc: { fontSize: 15, color: "#444", lineHeight: 22, marginBottom: 20 },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  routeBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  routeBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  sendToChatBtn: {
    flex: 1.5,
    flexDirection: "row",
    backgroundColor: "#E1F0FF",
    padding: 16,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sendToChatBtnText: { color: "#007AFF", fontWeight: "800", fontSize: 14 },
  aiContainer: {
    backgroundColor: "rgba(0,122,255,0.05)",
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
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
    backgroundColor: "#e8f2ff",
    padding: 8,
    borderRadius: 12,
  },
  aiHelperText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 20 },
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
