import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId, // 💡 IMPORTADO para la consulta de amigos
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { auth, db } from "../../firebaseConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_HEIGHT = Platform.OS === "ios" ? 210 : 190;

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
const modelIA = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export default function BibliotecaTab() {
  const [misPuntos, setMisPuntos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "favoritos" | "recientes" | "nombre" | "zona"
  >("recientes");

  // 💡 NUEVO: Estados para compartir al chat
  const [amigosList, setAmigosList] = useState<any[]>([]);
  const [modalSendToChat, setModalSendToChat] = useState(false);

  // Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [lugarSeleccionado, setLugarSeleccionado] = useState<any>(null);

  // Estados edición
  const [editTitulo, setEditTitulo] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editFotos, setEditFotos] = useState<string[]>([]);

  // Estados de comentarios
  const [comentario, setComentario] = useState("");
  const [rating, setRating] = useState(5);
  const [listaComentarios, setListaComentarios] = useState<any[]>([]);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Estados IA
  const [mejorandoIA, setMejorandoIA] = useState(false);
  const [resumenBiblioteca, setResumenBiblioteca] = useState("");
  const [cargandoResumen, setCargandoResumen] = useState(false);

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());

  // 💡 NUEVO: Cargar lista de amigos
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubProfile = onSnapshot(
      doc(db, "users", auth.currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
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
    if (!friendsUids || friendsUids.length === 0) return;
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
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "ubicaciones"),
      where("userId", "==", auth.currentUser.uid),
    );
    return onSnapshot(q, (snapshot) => {
      setMisPuntos(snapshot.docs.map((d) => ({ ...d.data(), idDoc: d.id })));
    });
  }, []);

  useEffect(() => {
    if (!lugarSeleccionado) return;
    const q = query(
      collection(db, "ubicaciones", lugarSeleccionado.idDoc, "comentarios"),
      orderBy("fecha", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setListaComentarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [lugarSeleccionado]);

  // 💡 NUEVO: Función para reenviar ubicación al chat de un amigo
  const reenviarAlChat = async (amigo: any) => {
    if (!lugarSeleccionado || !auth.currentUser) return;
    setModalSendToChat(false);

    const chatId = [auth.currentUser.uid, amigo.uid].sort().join("_");
    const titulo = lugarSeleccionado.titulo || lugarSeleccionado.nombre;

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: `📍 ¡Mira este lugar increíble: ${titulo}!`,
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
        `Ubicación compartida con ${amigo.username || "tu amigo"}.`,
      );
    } catch (e) {
      console.log("Error al enviar ubicación:", e);
      Alert.alert("Error", "No se pudo compartir la ubicación.");
    }
  };

  const generarResumenGeneral = async () => {
    if (misPuntos.length === 0)
      return Alert.alert("IA", "No tienes lugares guardados aún.");
    setCargandoResumen(true);
    try {
      const titulos = misPuntos.map((p) => p.titulo).join(", ");
      const prompt = `Analiza mis lugares guardados: "${titulos}". Haz un resumen muy breve y motivador (máximo 2 líneas) de mi perfil como explorador.`;
      const result = await modelIA.generateContent(prompt);
      setResumenBiblioteca(result.response.text());
    } catch (e) {
      console.log(e);
    } finally {
      setCargandoResumen(false);
    }
  };

  const mejorarResenaIA = async () => {
    setMejorandoIA(true);
    try {
      const prompt =
        comentario.trim().length > 0
          ? `Mejora y profesionaliza esta reseña para un lugar al que le di ${rating} estrellas: "${comentario}". Máximo 25 palabras.`
          : `Genera una reseña breve y natural de una sola oración para un lugar al que califiqué con ${rating} de 5 estrellas.`;
      const result = await modelIA.generateContent(prompt);
      setComentario(result.response.text().trim().replace(/"/g, ""));
    } catch (e) {
      console.log(e);
    } finally {
      setMejorandoIA(false);
    }
  };

  const asistenteEdicionIA = async () => {
    if (!editTitulo) return Alert.alert("IA", "Ingresa un título primero.");
    setMejorandoIA(true);
    try {
      const prompt = `Sugiere una descripción aventurera de 2 frases y 3 hashtags para un lugar llamado "${editTitulo}". Formato: Descripción | Hashtags`;
      const result = await modelIA.generateContent(prompt);
      const [descIA, tagsIA] = result.response.text().split("|");
      if (descIA) setEditDesc(descIA.trim());
      if (tagsIA) setEditTags(tagsIA.trim());
    } catch (e) {
      console.log(e);
    } finally {
      setMejorandoIA(false);
    }
  };

  const puntosFiltrados = useMemo(() => {
    let resultado = misPuntos.filter((p) => {
      const cumpleBuscador =
        p.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hashtags?.toLowerCase().includes(searchQuery.toLowerCase());
      const cumpleChipFavoritos =
        sortBy === "favoritos" ? p.destacado === true : true;
      return cumpleBuscador && cumpleChipFavoritos;
    });
    if (sortBy === "nombre")
      return resultado.sort((a, b) => a.titulo.localeCompare(b.titulo));
    if (sortBy === "zona")
      return resultado.sort((a, b) =>
        (a.clasificacion || "").localeCompare(b.clasificacion || ""),
      );
    return resultado.sort(
      (a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0),
    );
  }, [misPuntos, searchQuery, sortBy]);

  const trazarRuta = (item: any) => {
    const label = encodeURIComponent(item.titulo);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${item.lat},${item.lng}`,
      android: `geo:${item.lat},${item.lng}?q=${item.lat},${item.lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  const toggleDestacado = async (item: any) => {
    await updateDoc(doc(db, "ubicaciones", item.idDoc), {
      destacado: !item.destacado,
    });
  };

  const seleccionarImagenEdicion = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Permisos", "Se requiere acceso a la galería.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets) {
      setEditFotos([...editFotos, result.assets[0].uri]);
    }
  };

  const guardarCambios = async () => {
    if (!editTitulo.trim()) return Alert.alert("Error", "Falta título");
    setCargando(true);
    try {
      const fotosFinales = await Promise.all(
        editFotos.map(async (uri) => {
          if (uri.startsWith("http")) return uri;
          const res = await fetch(uri);
          const blob = await res.blob();
          const storageRef = ref(
            getStorage(),
            `puntos/${auth.currentUser?.uid}/${Date.now()}-${Math.random()}`,
          );
          await uploadBytes(storageRef, blob);
          return await getDownloadURL(storageRef);
        }),
      );
      await updateDoc(doc(db, "ubicaciones", lugarSeleccionado.idDoc), {
        titulo: editTitulo,
        descripcion: editDesc,
        hashtags: editTags,
        fotos: fotosFinales,
      });
      setModalVisible(false);
    } catch (e) {
      console.log(e);
    } finally {
      setCargando(false);
    }
  };

  const enviarComentario = async () => {
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await addDoc(
        collection(db, "ubicaciones", lugarSeleccionado.idDoc, "comentarios"),
        {
          usuario: auth.currentUser?.email || "Anónimo",
          texto: comentario,
          calificacion: rating,
          fecha: serverTimestamp(),
        },
      );
      setComentario("");
    } catch (e) {
      console.log(e);
    } finally {
      setEnviandoComentario(false);
    }
  };

  const renderRightActions = (item: any) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeBtn, { backgroundColor: "#007AFF" }]}
        onPress={() => {
          setLugarSeleccionado(item);
          setEditTitulo(item.titulo || "");
          setEditDesc(item.descripcion || "");
          setEditTags(item.hashtags || "");
          setEditFotos(item.fotos || []);
          setModalVisible(true);
        }}
      >
        <Ionicons name="pencil" size={20} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeBtn, { backgroundColor: "#FF3B30" }]}
        onPress={() => {
          Alert.alert("Borrar", "¿Eliminar permanentemente?", [
            {
              text: "Sí",
              onPress: () => deleteDoc(doc(db, "ubicaciones", item.idDoc)),
            },
            { text: "No" },
          ]);
        }}
      >
        <Ionicons name="trash" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <FlatList
          data={puntosFiltrados}
          keyExtractor={(item) => item.idDoc}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: HEADER_HEIGHT },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Swipeable
              ref={(ref) => {
                if (ref) swipeRefs.current.set(item.idDoc, ref);
              }}
              renderRightActions={() => renderRightActions(item)}
              onSwipeableOpen={() => {
                setTimeout(() => {
                  swipeRefs.current.get(item.idDoc)?.close();
                }, 1500);
              }}
            >
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  setLugarSeleccionado(item);
                  setDetalleVisible(true);
                }}
                onLongPress={() => {
                  Alert.alert(item.titulo, "Opciones rápidas", [
                    {
                      text: item.destacado
                        ? "⭐ Quitar destacado"
                        : "⭐ Destacar",
                      onPress: () => toggleDestacado(item),
                    },
                    {
                      text: item.esPublico ? "🔒 Privado" : "🌎 Público",
                      onPress: () =>
                        updateDoc(doc(db, "ubicaciones", item.idDoc), {
                          esPublico: !item.esPublico,
                        }),
                    },
                    // 💡 NUEVO: Opción de enviar a amigo desde el menú rápido
                    {
                      text: "💬 Enviar a amigo",
                      onPress: () => {
                        setLugarSeleccionado(item);
                        setModalSendToChat(true);
                      },
                    },
                    {
                      text: "📤 Compartir (Externo)",
                      onPress: () =>
                        Share.share({
                          message: `¡Mira este lugar: ${item.titulo}!`,
                        }),
                    },
                    { text: "Cancelar", style: "cancel" },
                  ]);
                }}
              >
                <View style={styles.thumbContainer}>
                  <Image
                    source={{ uri: item.fotos?.[0] }}
                    style={styles.thumb}
                  />
                  {item.destacado && (
                    <View style={styles.starBadge}>
                      <Ionicons name="star" size={12} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={styles.info}>
                  <View style={styles.metaRowHorizontal}>
                    <Ionicons
                      name={item.esPublico ? "earth" : "lock-closed"}
                      size={12}
                      color="#8E8E93"
                    />
                    <Text style={styles.metaTextSmall}>
                      {item.esPublico ? "Público" : "Privado"}
                    </Text>
                  </View>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.titulo}
                  </Text>
                  <Text style={styles.tags} numberOfLines={1}>
                    {item.hashtags}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
              </TouchableOpacity>
            </Swipeable>
          )}
        />

        <BlurView intensity={90} tint="light" style={styles.headerGlass}>
          <View style={styles.headerContent}>
            {resumenBiblioteca ? (
              <View style={styles.aiResumenBox}>
                <Text style={styles.aiResumenText} numberOfLines={2}>
                  {resumenBiblioteca}
                </Text>
                <TouchableOpacity onPress={() => setResumenBiblioteca("")}>
                  <Ionicons name="close-circle" size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search"
                  size={18}
                  color="#8E8E93"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  placeholder="Buscar en mis guardados..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#8E8E93"
                />
              </View>
              <TouchableOpacity
                onPress={generarResumenGeneral}
                style={styles.aiCircle}
              >
                {cargandoResumen ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="sparkles" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterBar}
            >
              {["favoritos", "recientes", "nombre", "zona"].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSortBy(s as any)}
                  style={[styles.chip, sortBy === s && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sortBy === s && styles.chipTextActive,
                    ]}
                  >
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </BlurView>

        {/* MODAL DETALLES DEL LUGAR */}
        <Modal visible={detalleVisible} animationType="slide" transparent>
          <View style={styles.modalOverlayFull}>
            <TouchableOpacity
              style={styles.closeFloatTransparent}
              onPress={() => setDetalleVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            {lugarSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                >
                  {lugarSeleccionado.fotos?.map((f: string, i: number) => (
                    <Image
                      key={i}
                      source={{ uri: f }}
                      style={styles.heroImage}
                    />
                  ))}
                </ScrollView>
                <View style={styles.detailSheetContainer}>
                  <Text style={styles.sheetTitle}>
                    {lugarSeleccionado.titulo}
                  </Text>
                  <Text style={styles.sheetDescription}>
                    {lugarSeleccionado.descripcion || "Sin descripción."}
                  </Text>

                  {/* 💡 AÑADIDO: Fila de Botones (Ir y Compartir) */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.routeBtn}
                      onPress={() => trazarRuta(lugarSeleccionado)}
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

                  <View style={styles.sheetDivider} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.sheetSectionTitle}>
                      Reseñas ({listaComentarios.length})
                    </Text>
                    <TouchableOpacity
                      onPress={mejorarResenaIA}
                      disabled={mejorandoIA}
                      style={styles.aiBadgeBtn}
                    >
                      {mejorandoIA ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <Ionicons name="sparkles" size={12} color="#007AFF" />
                      )}
                      <Text style={styles.aiBadgeText}>
                        {comentario.trim() ? "Mejorar con IA" : "Sugerir IA"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.starsRowInteractive}>
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
                  <View style={styles.commentInputWrapper}>
                    <TextInput
                      placeholder="Añade una nota personal..."
                      style={styles.inputComment}
                      value={comentario}
                      onChangeText={setComentario}
                    />
                    <TouchableOpacity onPress={enviarComentario}>
                      {enviandoComentario ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Ionicons name="send" size={22} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {listaComentarios.map((c) => (
                    <View key={c.id} style={styles.commentCardSmall}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={styles.commentUserText}>
                          {c.usuario?.split("@")[0]}
                        </Text>
                        <View style={styles.row}>
                          <Ionicons name="star" size={10} color="#FFCC00" />
                          <Text style={styles.commentRatingText}>
                            {c.calificacion}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.commentBodyText}>{c.texto}</Text>
                    </View>
                  ))}
                  <View style={{ height: 100 }} />
                </View>
              </ScrollView>
            )}

            {/* 💡 OVERLAY: MODAL PARA ENVIAR A CHAT */}
            {modalSendToChat && (
              <View style={styles.modalBackdropCenter}>
                <View style={styles.sendChatCard}>
                  <Text
                    style={[
                      styles.sheetSectionTitle,
                      { textAlign: "center", marginBottom: 5 },
                    ]}
                  >
                    Recomendar a un amigo
                  </Text>
                  {amigosList.length === 0 ? (
                    <Text style={styles.emptyText}>
                      Aún no tienes amigos. Ve a Comunidad para agregar
                      conexiones.
                    </Text>
                  ) : (
                    <ScrollView style={{ maxHeight: 300, marginTop: 15 }}>
                      {amigosList.map((amigo) => (
                        <TouchableOpacity
                          key={amigo.uid}
                          style={styles.friendCardMini}
                          onPress={() => reenviarAlChat(amigo)}
                        >
                          <Image
                            source={{
                              uri:
                                amigo.foto || "https://via.placeholder.com/150",
                            }}
                            style={styles.friendAvatarMini}
                          />
                          <Text style={styles.friendNameMini}>
                            {amigo.username}
                          </Text>
                          <View style={styles.sendIconMini}>
                            <Ionicons
                              name="paper-plane"
                              size={16}
                              color="#FFF"
                            />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    style={styles.cancelBtnFull}
                    onPress={() => setModalSendToChat(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>

        {/* MODAL EDICIÓN */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <BlurView
              intensity={30}
              tint="dark"
              style={styles.modalOverlayEdit}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalIndicator} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitleText}>Editar Detalles</Text>
                  <TouchableOpacity
                    onPress={asistenteEdicionIA}
                    style={styles.aiMagicBtn}
                  >
                    {mejorandoIA ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="sparkles" size={16} color="#FFF" />
                    )}
                    <Text style={styles.aiMagicText}>Auto-completar</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  <Text style={styles.sectionLabel}>Galería de Fotos</Text>
                  <View style={styles.photoGrid}>
                    <TouchableOpacity
                      style={styles.addBtnSmall}
                      onPress={seleccionarImagenEdicion}
                    >
                      <View style={styles.addIconCircle}>
                        <Ionicons name="camera" size={22} color="#007AFF" />
                      </View>
                      <Text style={styles.addPhotoText}>Añadir</Text>
                    </TouchableOpacity>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {editFotos.map((uri, idx) => (
                        <View key={idx} style={styles.editThumbContainer}>
                          <Image source={{ uri }} style={styles.editThumb} />
                          <TouchableOpacity
                            style={styles.deletePhotoBadge}
                            onPress={() =>
                              setEditFotos(
                                editFotos.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            <Ionicons name="trash" size={12} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.inputGroupContainer}>
                    <TextInput
                      placeholder="Título"
                      style={styles.inputModern}
                      value={editTitulo}
                      onChangeText={setEditTitulo}
                      placeholderTextColor="#A9A9AC"
                    />
                    <View style={styles.inputDivider} />
                    <TextInput
                      placeholder="#etiquetas"
                      style={styles.inputModern}
                      value={editTags}
                      onChangeText={setEditTags}
                      placeholderTextColor="#A9A9AC"
                    />
                  </View>
                  <TextInput
                    placeholder="Descripción..."
                    style={[styles.inputModern, styles.textAreaModern]}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    multiline
                    placeholderTextColor="#A9A9AC"
                  />
                  <TouchableOpacity
                    style={styles.saveBtnPremium}
                    onPress={guardarCambios}
                    disabled={cargando}
                  >
                    {cargando ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </BlurView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </GestureHandlerRootView>
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiCircle: {
    backgroundColor: "#E1F0FF",
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  aiResumenBox: {
    backgroundColor: "#E1F0FF",
    padding: 12,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiResumenText: {
    flex: 1,
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
    fontStyle: "italic",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterBar: { marginTop: 20, flexDirection: "row" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  chipActive: { backgroundColor: "#000" },
  chipText: { fontSize: 11, fontWeight: "800", color: "#8E8E93" },
  chipTextActive: { color: "#FFF" },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
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
    backgroundColor: "#F2F2F7",
  },
  starBadge: {
    position: "absolute",
    top: -8,
    left: -8,
    backgroundColor: "#FFCC00",
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  info: { flex: 1, marginRight: 15, marginLeft: 15, justifyContent: "center" },
  title: { fontWeight: "800", fontSize: 15, color: "#1C1C1E" },
  tags: { color: "#007AFF", fontSize: 11, marginVertical: 3 },
  metaRowHorizontal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  metaTextSmall: { fontSize: 10, color: "#8E8E93", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalOverlayFull: { flex: 1, backgroundColor: "#FFF" },
  heroImage: { width: SCREEN_WIDTH, height: 450, resizeMode: "cover" },
  closeFloatTransparent: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 110,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 8,
  },
  detailSheetContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -50,
    paddingHorizontal: 30,
    paddingTop: 35,
    minHeight: 600,
  },
  sheetTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
    marginBottom: 15,
    lineHeight: 34,
  },
  sheetDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 20,
  },

  // 💡 Nuevos estilos para botones de acción (Ir y Compartir)
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 25,
  },
  routeBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  routeBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
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

  sheetDivider: { height: 1, backgroundColor: "#F2F2F7", marginVertical: 15 },
  sheetSectionTitle: { fontSize: 20, fontWeight: "800", color: "#000" },
  aiBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E1F0FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700", color: "#007AFF" },
  starsRowInteractive: { flexDirection: "row", gap: 8, marginVertical: 20 },
  commentInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 25,
  },
  inputComment: { flex: 1, fontSize: 15, color: "#000" },
  commentCardSmall: {
    marginBottom: 15,
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 15,
  },
  commentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  commentUserText: { fontWeight: "700", fontSize: 14 },
  commentRatingText: { fontSize: 12, fontWeight: "600", color: "#666" },
  commentBodyText: { fontSize: 14, color: "#444" },
  swipeActions: { flexDirection: "row", width: 150, marginBottom: 14 },
  swipeBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    marginLeft: 10,
  },
  modalOverlayEdit: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFF",
    height: "85%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
  },
  modalIndicator: {
    width: 36,
    height: 5,
    backgroundColor: "#E2E2E7",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitleText: { fontSize: 24, fontWeight: "800", color: "#1C1C1E" },
  aiMagicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiMagicText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  closeCircle: { backgroundColor: "#F2F2F7", padding: 8, borderRadius: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  photoGrid: { flexDirection: "row", marginBottom: 28, alignItems: "center" },
  addBtnSmall: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  addPhotoText: { fontSize: 11, fontWeight: "700", color: "#007AFF" },
  editThumbContainer: { marginRight: 12, position: "relative" },
  editThumb: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
  },
  deletePhotoBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FF3B30",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    zIndex: 10,
  },
  inputGroupContainer: {
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  inputModern: {
    padding: 16,
    fontSize: 17,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  inputDivider: { height: 1, backgroundColor: "#E5E5EA", marginHorizontal: 16 },
  textAreaModern: {
    height: 120,
    textAlignVertical: "top",
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginBottom: 32,
  },
  saveBtnPremium: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 18 },

  // Estilos del Modal Overlay para Chat
  modalBackdropCenter: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },
  sendChatCard: { backgroundColor: "#FFF", borderRadius: 35, padding: 30 },
  emptyText: {
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },
  friendCardMini: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  friendAvatarMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 15,
    backgroundColor: "#E5E5EA",
  },
  friendNameMini: {
    flex: 1,
    fontWeight: "800",
    fontSize: 17,
    color: "#1C1C1E",
  },
  sendIconMini: {
    backgroundColor: "#007AFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnFull: {
    marginTop: 25,
    padding: 18,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    alignItems: "center",
  },
  cancelBtnText: { fontWeight: "800", color: "#8E8E93", fontSize: 16 },
});
