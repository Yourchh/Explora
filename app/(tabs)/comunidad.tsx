import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { updateEmail, updatePassword } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AlertButton, // 💡 IMPORTACIÓN CLAVE PARA ARREGLAR EL ERROR DE TIPADO
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
  Switch,
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

type TabType = "feed" | "grupos" | "chat" | "perfil";

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
const modelIA = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export default function SocialTab() {
  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [posts, setPosts] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [misLugares, setMisLugares] = useState<any[]>([]);

  const [userData, setUserData] = useState({
    username: "",
    bio: "",
    frase: "", // 💡 Asegúrate que esté aquí
    intereses: [] as string[],
    foto: "https://via.placeholder.com/150",
    portada: "https://via.placeholder.com/800x400", // 💡 Asegúrate que esté aquí
    friendCode: "",
    friends: [] as string[],
    email: "",
    password: "",
  });

  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [nuevoInteres, setNuevoInteres] = useState("");

  // --- ESTADOS AMIGOS Y CHAT PRIVADO ---
  const [codigoAmigo, setCodigoAmigo] = useState("");
  const [amigosList, setAmigosList] = useState<any[]>([]);
  const [chatActivo, setChatActivo] = useState<any>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [msgEditando, setMsgEditando] = useState<any>(null);
  const [unreadChats, setUnreadChats] = useState<{ [key: string]: number }>({});
  const [detalleAmigo, setDetalleAmigo] = useState<any>(null);

  // --- ESTADOS GRUPOS Y CHAT GRUPAL ---
  const [showGroupSearch, setShowGroupSearch] = useState(false);
  const [searchGroupQuery, setSearchGroupQuery] = useState("");
  const [modalJoinGroup, setModalJoinGroup] = useState(false);
  const [joinGroupCode, setJoinGroupCode] = useState("");
  const [grupoEncontrado, setGrupoEncontrado] = useState<any>(null);

  const [grupoFotoUri, setGrupoFotoUri] = useState<string | null>(null);
  const [grupoActivo, setGrupoActivo] = useState<any>(null);
  const [mensajesGrupo, setMensajesGrupo] = useState<any[]>([]);
  const [nuevoMensajeGrupo, setNuevoMensajeGrupo] = useState("");
  const [modalAdminGrupo, setModalAdminGrupo] = useState(false);

  const [nuevoGrupo, setNuevoGrupo] = useState({
    nombre: "",
    descripcion: "",
    esPrivado: false,
  });

  // --- ESTADOS COMPARTIR Y MODALES ---
  const [modalShare, setModalShare] = useState(false);
  const [modalGroup, setModalGroup] = useState(false);
  const [modalComentarios, setModalComentarios] = useState(false);
  const [modalSendToChat, setModalSendToChat] = useState(false);
  const [modalSendGroupToChat, setModalSendGroupToChat] = useState(false);
  const [grupoACompartir, setGrupoACompartir] = useState<any>(null);

  const [lugarACompartir, setLugarACompartir] = useState<any>(null);
  const [comentarioInicial, setComentarioInicial] = useState("");
  const [postSeleccionado, setPostSeleccionado] = useState<any>(null);
  const [comentarioFeed, setComentarioFeed] = useState("");
  const [listaComentariosFeed, setListaComentariosFeed] = useState<any[]>([]);

  // 💡 CORRECCIÓN 1: ESTADOS FALTANTES RESTAURADOS PARA EVITAR ERROR DE "Cannot find name"
  const [modalEditPost, setModalEditPost] = useState(false);
  const [postAEditar, setPostAEditar] = useState<any>(null);
  const [textoEditPost, setTextoEditPost] = useState("");

  // --- ESTADOS IA ---
  const [postSummaries, setPostSummaries] = useState<{ [key: string]: string }>(
    {},
  );
  const [loadingSummaries, setLoadingSummaries] = useState<{
    [key: string]: boolean;
  }>({});
  const [chatSummary, setChatSummary] = useState("");
  const [loadingChatSummary, setLoadingChatSummary] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);

    const unsubUser = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          username: data.username || "Explorador",
          bio: data.bio || "",
          frase: data.frase || "", // 💡 Agregado para arreglar el error
          intereses: data.intereses || [],
          foto: data.foto || "https://via.placeholder.com/150",
          portada: data.portada || "https://via.placeholder.com/800x400", // 💡 Agregado
          friendCode: data.friendCode || "",
          friends: data.friends || [],
          email: data.email || "",
          password: data.password || "",
        });

        if (data.friends && data.friends.length > 0) {
          cargarAmigos(data.friends);
          const unreads: any = {};
          data.friends.forEach((f: string, i: number) => {
            if (i % 3 === 0) unreads[f] = true;
          });
          setUnreadChats(unreads);
        } else {
          setAmigosList([]);
        }
      } else {
        const newCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        const initialData = {
          username:
            auth.currentUser?.displayName ||
            auth.currentUser?.email?.split("@")[0] ||
            "Explorador",
          bio: "Viajero incansable buscando nuevas rutas.",
          intereses: [],
          foto: auth.currentUser?.photoURL || "https://via.placeholder.com/150",
          friendCode: newCode,
          friends: [],
        };
        await setDoc(userRef, initialData);
      }
    });

    return () => unsubUser();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            username: data.username || "Explorador",
            bio: data.bio || "",
            frase: data.frase || "",
            intereses: data.intereses || [],
            foto: data.foto || "https://via.placeholder.com/150",
            portada: data.portada || "https://via.placeholder.com/800x400",
            friendCode: data.friendCode || "",
            friends: data.friends || [],
            email: data.email || "",
            password: data.password || "",
          });
        }
      },
      (error) => {
        // 💡 Solución definitiva: Interceptamos el error de permisos
        if (error.code === "permission-denied") {
          console.log("Sesión finalizada: El listener se cerró correctamente.");
        } else {
          console.error("Error inesperado en Firestore:", error);
        }
      },
    );

    return () => unsubscribe();
  }, []);

  const cargarAmigos = async (friendsUids: string[]) => {
    if (friendsUids.length === 0) {
      setAmigosList([]);
      return;
    }

    // 💡 Usamos onSnapshot para escuchar cambios en los perfiles de los amigos
    const q = query(
      collection(db, "users"),
      where(documentId(), "in", friendsUids.slice(0, 10)),
    );

    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setAmigosList(lista);
    });

    return unsub; // Devuelve la función para limpiar el listener si fuera necesario
  };

  useEffect(() => {
    if (!auth.currentUser || amigosList.length === 0) return;

    const unsubscribers = amigosList.map((amigo) => {
      const chatId = [auth.currentUser!.uid, amigo.uid].sort().join("_");
      const q = query(
        collection(db, "chats", chatId, "messages"),
        where("senderId", "==", amigo.uid), // Solo mensajes que recibo
        where("read", "==", false), // Que no he leído
      );

      return onSnapshot(q, (snap) => {
        setUnreadChats((prev) => ({
          ...prev,
          [amigo.uid]: snap.docs.length, // Guardamos el número de mensajes nuevos
        }));
      });
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [amigosList]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Extraemos el correo directamente de Firebase Auth
    setUserData((prev) => ({
      ...prev,
      email: auth.currentUser?.email || "", // El correo viene de la sesión activa
    }));
  }, []);

  useEffect(() => {
    const qPosts = query(
      collection(db, "social_posts"),
      orderBy("fecha", "desc"),
    );
    const unsubPosts = onSnapshot(qPosts, (snap) =>
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    const qGrupos = query(
      collection(db, "social_groups"),
      orderBy("fechaCreacion", "desc"),
    );
    const unsubGrupos = onSnapshot(qGrupos, (snap) =>
      setGrupos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, []);

  useEffect(() => {
    const cargarMisLugaresPublicos = async () => {
      // 1. Verificamos que el usuario exista
      if (!auth.currentUser) return;

      console.log("Cargando lugares públicos para:", auth.currentUser.uid);

      const q = query(
        collection(db, "ubicaciones"),
        where("userId", "==", auth.currentUser.uid),
        where("esPublico", "==", true),
      );

      try {
        const snap = await getDocs(q);
        const lugares = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMisLugares(lugares);
      } catch (error) {
        console.log("Error al obtener lugares:", error);
      }
    };

    // 2. Ejecutamos la función si el usuario está logueado Y el modal de compartir está abierto
    if (auth.currentUser && modalShare) {
      cargarMisLugaresPublicos();
    }
  }, [auth.currentUser, modalShare]); // 💡 Escuchamos estos dos cambios

  // Escucha mensajes de Chat Privado
  useEffect(() => {
    if (!chatActivo || !auth.currentUser) return;
    const chatId = [auth.currentUser.uid, chatActivo.uid].sort().join("_");
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
    );
    const unsubChat = onSnapshot(q, (snap) =>
      setMensajes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => unsubChat();
  }, [chatActivo]);

  // Escucha mensajes de Chat de Grupo
  useEffect(() => {
    if (!grupoActivo) return;
    const q = query(
      collection(db, "social_groups", grupoActivo.id, "messages"),
      orderBy("timestamp", "asc"),
    );
    const unsub = onSnapshot(q, (snap) =>
      setMensajesGrupo(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => unsub();
  }, [grupoActivo]);

  useEffect(() => {
    if (!postSeleccionado) return;
    const q = query(
      collection(db, "social_posts", postSeleccionado.id, "comentarios"),
      orderBy("fecha", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setListaComentariosFeed(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
    });
    return () => unsub();
  }, [postSeleccionado]);

  useEffect(() => {
    if (!auth.currentUser || amigosList.length === 0) return;

    // Creamos un escuchador por cada amigo
    const unsubscribers = amigosList.map((amigo) => {
      const chatId = [auth.currentUser!.uid, amigo.uid].sort().join("_");
      const q = query(
        collection(db, "chats", chatId, "messages"),
        where("senderId", "==", amigo.uid), // Mensajes que él me envió
        where("read", "==", false), // Que yo no he leído
      );

      return onSnapshot(q, (snap) => {
        setUnreadChats((prev) => ({
          ...prev,
          [amigo.uid]: snap.docs.length, // Guardamos la cantidad numérica
        }));
      });
    });

    return () => unsubscribers.forEach((unsub) => unsub && unsub());
  }, [amigosList]);

  const [unreadGroups, setUnreadGroups] = useState<{ [key: string]: number }>(
    {},
  );

  useEffect(() => {
    if (!auth.currentUser || grupos.length === 0) return;

    // Filtramos solo los grupos a los que perteneces
    const misGrupos = grupos.filter((g) =>
      g.miembrosList?.includes(auth.currentUser?.uid),
    );

    const unsubscribers = misGrupos.map((grupo) => {
      const q = query(
        collection(db, "social_groups", grupo.id, "messages"),
        // 💡 Buscamos mensajes donde NO estemos en la lista de lectura
        where("readBy", "not-in", [[auth.currentUser!.uid]]),
      );

      return onSnapshot(
        collection(db, "social_groups", grupo.id, "messages"),
        (snap) => {
          const nuevos = snap.docs.filter(
            (d) => !d.data().readBy?.includes(auth.currentUser?.uid),
          );
          setUnreadGroups((prev) => ({ ...prev, [grupo.id]: nuevos.length }));
        },
      );
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [grupos]);

  // --- FUNCIONES IA ---
  const resumirPublicacionIA = async (post: any) => {
    setLoadingSummaries((prev) => ({ ...prev, [post.id]: true }));
    try {
      const q = query(
        collection(db, "social_posts", post.id, "comentarios"),
        orderBy("fecha", "desc"),
      );
      const snap = await getDocs(q);
      const comentarios = snap.docs.map((d) => d.data().texto).join(" | ");

      if (!comentarios) {
        Alert.alert(
          "IA",
          "Esta publicación no tiene comentarios para resumir aún.",
        );
        return;
      }
      const prompt = `Analiza estas reseñas de una publicación compartida: "${comentarios}". Dame un resumen muy corto (1 o 2 oraciones) de lo que opina la gente.`;
      const result = await modelIA.generateContent(prompt);
      setPostSummaries((prev) => ({
        ...prev,
        [post.id]: result.response.text(),
      }));
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingSummaries((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  const resumirChatIA = async (esGrupo = false) => {
    const msgs = esGrupo ? mensajesGrupo : mensajes;
    if (msgs.length === 0) return Alert.alert("IA", "El chat está vacío.");
    setLoadingChatSummary(true);
    try {
      const chatLog = msgs
        .map(
          (m) =>
            `${m.senderId === auth.currentUser?.uid ? "Yo" : m.senderName || "Alguien"}: ${m.text}`,
        )
        .join("\n");
      const prompt = `Resume brevemente de qué trata esta conversación reciente en un par de líneas:\n${chatLog}`;
      const result = await modelIA.generateContent(prompt);
      setChatSummary(result.response.text());
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingChatSummary(false);
    }
  };

  const guardarPerfil = async () => {
    if (!auth.currentUser) return;
    setGuardandoPerfil(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        username: userData.username,
        bio: userData.bio,
        intereses: userData.intereses,
      });
      Alert.alert("Éxito", "Perfil actualizado correctamente.");
    } catch {
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // --- SEGURIDAD Y CUENTA ---
  const actualizarCuentaSeguridad = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!userData.email.trim()) {
      return Alert.alert("Error", "El correo no puede estar vacío.");
    }

    Alert.alert(
      "Confirmar Cambios",
      "¿Estás seguro de que deseas actualizar tus credenciales de acceso?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Actualizar",
          onPress: async () => {
            setGuardandoPerfil(true);
            try {
              // 1. Cambio de Email si es distinto
              if (userData.email !== user.email) {
                await updateEmail(user, userData.email);
              }
              // 2. Cambio de Password si se ingresó algo
              if (userData.password && userData.password.length >= 6) {
                await updatePassword(user, userData.password);
                setUserData((prev) => ({ ...prev, password: "" })); // Limpiar por seguridad
              }
              Alert.alert(
                "Éxito",
                "Tus datos de seguridad han sido actualizados.",
              );
            } catch (error: any) {
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Re-autenticación necesaria",
                  "Por seguridad, debes cerrar sesión e ingresar de nuevo para realizar estos cambios.",
                );
              } else {
                Alert.alert("Error", error.message);
              }
            } finally {
              setGuardandoPerfil(false);
            }
          },
        },
      ],
    );
  };

  const eliminarCuentaDefinitiva = () => {
    Alert.alert(
      "⚠️ ELIMINAR CUENTA",
      "¿Estás completamente seguro? Esta acción es irreversible y perderás todos tus datos, amigos y grupos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "ELIMINAR MI CUENTA",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
              // Opcional: Aquí podrías borrar el documento de Firestore antes del Auth
              await deleteDoc(doc(db, "users", user.uid));
              await user.delete();
              // El listener de Auth cerrará la sesión automáticamente
            } catch (error: any) {
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Aviso",
                  "Cierra sesión e ingresa de nuevo para confirmar esta acción.",
                );
              }
            }
          },
        },
      ],
    );
  };

  const seleccionarFotoPerfil = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && auth.currentUser) {
      setGuardandoPerfil(true);
      try {
        const res = await fetch(result.assets[0].uri);
        const blob = await res.blob();
        const storageRef = ref(
          getStorage(),
          `perfiles/${auth.currentUser.uid}`,
        );
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", auth.currentUser.uid), { foto: url });
      } catch {
      } finally {
        setGuardandoPerfil(false);
      }
    }
  };

  const handleCodeOptions = () => {
    Alert.alert("Tu Código de Amigo", userData.friendCode, [
      {
        text: "Copiar al portapapeles",
        onPress: () => {
          // En una app real usarías Clipboard.setString
          Alert.alert("Copiado", "Código copiado correctamente.");
        },
      },
      {
        text: "Compartir código",
        onPress: () => Share.share({ message: userData.friendCode }),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const seleccionarPortada = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && auth.currentUser) {
      setGuardandoPerfil(true);
      try {
        const res = await fetch(result.assets[0].uri);
        const blob = await res.blob();
        const storageRef = ref(
          getStorage(),
          `portadas/${auth.currentUser.uid}`,
        );
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        setUserData({ ...userData, portada: url });
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          portada: url,
        });
      } catch (e) {
        console.log(e);
      } finally {
        setGuardandoPerfil(false);
      }
    }
  };

  // --- FUNCIONES CHAT PRIVADO ---
  const agregarAmigo = async () => {
    if (!codigoAmigo.trim()) return;
    try {
      const q = query(
        collection(db, "users"),
        where("friendCode", "==", codigoAmigo.toUpperCase().trim()),
      );
      const snap = await getDocs(q);
      if (snap.empty) return Alert.alert("No encontrado", "Código inválido.");
      const amigoDoc = snap.docs[0];
      if (amigoDoc.id === auth.currentUser?.uid)
        return Alert.alert("Error", "No puedes agregarte a ti mismo.");
      if (userData.friends.includes(amigoDoc.id))
        return Alert.alert("Ya son amigos", "Ya tienes a este usuario.");

      await updateDoc(doc(db, "users", auth.currentUser!.uid), {
        friends: arrayUnion(amigoDoc.id),
      });
      await updateDoc(doc(db, "users", amigoDoc.id), {
        friends: arrayUnion(auth.currentUser!.uid),
      });
      setCodigoAmigo("");
      Alert.alert("¡Hecho!", "Amigo agregado.");
    } catch {}
  };

  const enviarMensaje = async (texto: string = nuevoMensaje) => {
    if (!texto.trim() || !chatActivo || !auth.currentUser) return;
    const chatId = [auth.currentUser.uid, chatActivo.uid].sort().join("_");
    try {
      if (msgEditando) {
        await updateDoc(doc(db, "chats", chatId, "messages", msgEditando.id), {
          text: texto,
          editado: true,
        });
        setMsgEditando(null);
      } else {
        await addDoc(collection(db, "chats", chatId, "messages"), {
          text: texto,
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          isLocationShare: false,
          read: false, // 💡 CAMBIO: Marcamos como no leído por defecto
        });
      }
      setNuevoMensaje("");
    } catch {}
  };

  const eliminarMensaje = async (msgId: string) => {
    if (!chatActivo || !auth.currentUser) return;
    const chatId = [auth.currentUser.uid, chatActivo.uid].sort().join("_");
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
    } catch {}
  };

  const eliminarChat = async (amigo: any) => {
    Alert.alert(
      "Eliminar Conexión",
      `¿Estás seguro de eliminar a ${amigo.username}? Se perderá el historial.`,
      [
        {
          text: "Sí, Eliminar",
          style: "destructive",
          onPress: async () => {
            if (!auth.currentUser) return;
            try {
              await updateDoc(doc(db, "users", auth.currentUser.uid), {
                friends: arrayRemove(amigo.uid),
              });
              await updateDoc(doc(db, "users", amigo.uid), {
                friends: arrayRemove(auth.currentUser.uid),
              });
              Alert.alert("Eliminado", "La conexión ha sido borrada.");
            } catch {}
          },
        },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  };

  // --- FUNCIONES DE GRUPOS ---
  const seleccionarFotoGrupo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets) {
      setGrupoFotoUri(result.assets[0].uri);
    }
  };

  const crearGrupo = async () => {
    if (!nuevoGrupo.nombre || !auth.currentUser)
      return Alert.alert("Aviso", "El nombre del grupo es obligatorio.");
    setGuardandoPerfil(true);
    try {
      let fotoUrl = "https://via.placeholder.com/150";
      if (grupoFotoUri) {
        const res = await fetch(grupoFotoUri);
        const blob = await res.blob();
        const storageRef = ref(getStorage(), `grupos/${Date.now()}`);
        await uploadBytes(storageRef, blob);
        fotoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "social_groups"), {
        ...nuevoGrupo,
        foto: fotoUrl,
        creador: auth.currentUser.uid,
        miembrosList: [auth.currentUser.uid],
        fechaCreacion: serverTimestamp(),
      });
      setModalGroup(false);
      setNuevoGrupo({ nombre: "", descripcion: "", esPrivado: false });
      setGrupoFotoUri(null);
      Alert.alert("¡Éxito!", "Grupo creado correctamente.");
    } catch (e) {
      console.log(e);
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const buscarGrupoPorCodigo = async () => {
    if (!joinGroupCode.trim()) return;
    try {
      const docRef = doc(db, "social_groups", joinGroupCode.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGrupoEncontrado({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert("Error", "No se encontró ningún grupo con ese código.");
      }
    } catch {
      Alert.alert("Error", "Hubo un problema al buscar el grupo.");
    }
  };

  const confirmarUnirseGrupo = async () => {
    if (!grupoEncontrado || !auth.currentUser) return;
    try {
      if (grupoEncontrado.miembrosList?.includes(auth.currentUser.uid)) {
        return Alert.alert("Aviso", "Ya eres miembro de este grupo.");
      }
      await updateDoc(doc(db, "social_groups", grupoEncontrado.id), {
        miembrosList: arrayUnion(auth.currentUser.uid),
      });
      Alert.alert("¡Éxito!", `Te has unido al grupo ${grupoEncontrado.nombre}`);
      setModalJoinGroup(false);
      setJoinGroupCode("");
      setGrupoEncontrado(null);
    } catch {}
  };

  const unirseAlGrupoDirecto = async (grupo: any) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "social_groups", grupo.id), {
        miembrosList: arrayUnion(auth.currentUser.uid),
      });
      Alert.alert("¡Éxito!", `Te has unido al grupo ${grupo.nombre}`);
    } catch {}
  };

  const enviarMensajeGrupo = async (texto: string = nuevoMensajeGrupo) => {
    if (!texto.trim() || !grupoActivo || !auth.currentUser) return;
    try {
      await addDoc(
        collection(db, "social_groups", grupoActivo.id, "messages"),
        {
          text: texto,
          senderId: auth.currentUser.uid,
          senderName: userData.username,
          senderFoto: userData.foto,
          timestamp: serverTimestamp(),
          // 💡 Agregamos un array de quiénes han leído el mensaje
          readBy: [auth.currentUser.uid],
        },
      );
      setNuevoMensajeGrupo("");
    } catch {}
  };

  const actualizarGrupoAdmin = async () => {
    if (!auth.currentUser) return;
    setGuardandoPerfil(true);
    try {
      let fotoUrl = grupoActivo.foto;
      if (grupoFotoUri && !grupoFotoUri.startsWith("http")) {
        const res = await fetch(grupoFotoUri);
        const blob = await res.blob();
        const storageRef = ref(getStorage(), `grupos/${grupoActivo.id}`);
        await uploadBytes(storageRef, blob);
        fotoUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "social_groups", grupoActivo.id), {
        nombre: grupoActivo.nombre,
        descripcion: grupoActivo.descripcion,
        esPrivado: grupoActivo.esPrivado,
        foto: fotoUrl,
      });
      setModalAdminGrupo(false);
      Alert.alert("Éxito", "Grupo actualizado.");
    } catch {
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const eliminarGrupoConfirm = (grupoId: string) => {
    Alert.alert(
      "Cuidado",
      "¿Estás seguro de que deseas eliminar este grupo para todos los miembros?",
      [
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "social_groups", grupoId));
              if (grupoActivo?.id === grupoId) setGrupoActivo(null);
              setModalAdminGrupo(false);
              Alert.alert("Eliminado", "El grupo dejó de existir.");
            } catch {}
          },
        },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  };

  const abandonarGrupoConfirm = (grupoId: string) => {
    Alert.alert("Salir", "¿Deseas salir de este grupo?", [
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          if (!auth.currentUser) return;
          await updateDoc(doc(db, "social_groups", grupoId), {
            miembrosList: arrayRemove(auth.currentUser.uid),
          });
          if (grupoActivo?.id === grupoId) setGrupoActivo(null);
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  // 💡 CORRECCIÓN 2: Tipado estricto AlertButton para las opciones de Alert
  const handleGroupLongPress = (g: any) => {
    const esCreador = g.creador === auth.currentUser?.uid;
    const esMiembro = g.miembrosList?.includes(auth.currentUser?.uid);

    const options: AlertButton[] = [];

    options.push({
      text: "Compartir a un amigo",
      onPress: () => {
        setGrupoACompartir(g);
        setModalSendGroupToChat(true);
      },
    });

    options.push({
      text: "Copiar código de grupo",
      onPress: () => {
        Share.share({
          message: `¡Únete a mi grupo en la app! Código: ${g.id}`,
        });
      },
    });

    if (esMiembro) {
      options.push({
        text: "Salir del grupo",
        style: "destructive",
        onPress: () => abandonarGrupoConfirm(g.id),
      });
    }

    if (esCreador) {
      options.push({
        text: "Eliminar grupo",
        style: "destructive",
        onPress: () => eliminarGrupoConfirm(g.id),
      });
    }

    options.push({ text: "Cancelar", style: "cancel" });

    Alert.alert("Opciones de Grupo", g.nombre, options);
  };

  const reenviarGrupoAlChat = async (amigo: any) => {
    if (!grupoACompartir || !auth.currentUser) return;
    setModalSendGroupToChat(false);
    const chatId = [auth.currentUser.uid, amigo.uid].sort().join("_");

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: `👋 ¡Te invito a unirte a este grupo!\nComunidad: ${grupoACompartir.nombre}\nCódigo: ${grupoACompartir.id}`,
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        isLocationShare: false,
      });
      Alert.alert("¡Enviado!", `Invitación compartida con ${amigo.username}`);
      setGrupoACompartir(null);
    } catch {}
  };

  // --- FILTROS DE LISTAS ---
  const misGruposConectados = grupos.filter((g) =>
    g.miembrosList?.includes(auth.currentUser?.uid),
  );

  const gruposFiltradosFeed = grupos.filter((g) => {
    const coincideBusqueda =
      g.nombre.toLowerCase().includes(searchGroupQuery.toLowerCase()) ||
      g.descripcion.toLowerCase().includes(searchGroupQuery.toLowerCase());
    return coincideBusqueda;
  });

  const abrirMapa = (lat: number, lng: number, title: string) => {
    if (!lat || !lng)
      return Alert.alert(
        "Aviso",
        "Esta ubicación no tiene coordenadas válidas.",
      );
    const label = encodeURIComponent(title || "Ubicación");
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  // --- FUNCIONES DEL FEED ---
  const compartirLugarFeed = async () => {
    if (!lugarACompartir) return;
    try {
      await addDoc(collection(db, "social_posts"), {
        autor: userData.username,
        fotoPerfil: userData.foto,
        uid: auth.currentUser?.uid,
        texto: comentarioInicial,
        lugarDetails: lugarACompartir,
        fecha: serverTimestamp(),
        likes: 0,
        likesUsers: [],
        comentariosCount: 0,
      });
      setModalShare(false);
      setLugarACompartir(null);
      setComentarioInicial("");
    } catch {
      Alert.alert("Error", "No se pudo publicar.");
    }
  };

  const toggleLike = async (postId: string, likesUsers: string[]) => {
    if (!auth.currentUser) return;
    const postRef = doc(db, "social_posts", postId);
    const hasLiked = likesUsers?.includes(auth.currentUser.uid);
    try {
      if (hasLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likesUsers: arrayRemove(auth.currentUser.uid),
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likesUsers: arrayUnion(auth.currentUser.uid),
        });
      }
    } catch {}
  };

  const enviarComentarioFeed = async () => {
    if (!comentarioFeed.trim() || !postSeleccionado || !auth.currentUser)
      return;
    try {
      await addDoc(
        collection(db, "social_posts", postSeleccionado.id, "comentarios"),
        {
          usuario: userData.username,
          texto: comentarioFeed,
          fecha: serverTimestamp(),
        },
      );
      await updateDoc(doc(db, "social_posts", postSeleccionado.id), {
        comentariosCount: increment(1),
      });
      setComentarioFeed("");
    } catch {}
  };

  const eliminarPost = (postId: string) => {
    Alert.alert("Eliminar", "¿Seguro que deseas eliminar esta publicación?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "social_posts", postId));
            Alert.alert("Eliminada", "Tu publicación ha sido borrada.");
          } catch {}
        },
      },
    ]);
  };

  const guardarEdicionPost = async () => {
    if (!postAEditar) return;
    try {
      await updateDoc(doc(db, "social_posts", postAEditar.id), {
        texto: textoEditPost,
      });
      setModalEditPost(false);
      setPostAEditar(null);
      setTextoEditPost("");
    } catch {}
  };

  const reenviarPostAlChat = async (amigo: any) => {
    if (!postSeleccionado || !auth.currentUser) return;
    setModalSendToChat(false);
    const chatId = [auth.currentUser.uid, amigo.uid].sort().join("_");
    const titulo =
      postSeleccionado.lugarDetails?.titulo ||
      postSeleccionado.lugarDetails?.nombre ||
      "Una publicación";

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: `📍 Mira esta recomendación de la comunidad: ${titulo}`,
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        isLocationShare: true,
        lugarDetails: postSeleccionado.lugarDetails || null,
        lat: postSeleccionado.lugarDetails?.lat || null,
        lng: postSeleccionado.lugarDetails?.lng || null,
      });
      Alert.alert("¡Enviado!", `Compartido con ${amigo.username}`);
    } catch {}
  };

  const reenviarPostAlGrupo = async (grupo: any) => {
    if (!postSeleccionado || !auth.currentUser) return;
    setModalSendToChat(false);
    const titulo =
      postSeleccionado.lugarDetails?.titulo ||
      postSeleccionado.lugarDetails?.nombre ||
      "Una publicación";

    try {
      await addDoc(collection(db, "social_groups", grupo.id, "messages"), {
        text: `📍 Mira esta recomendación de la comunidad: ${titulo}`,
        senderId: auth.currentUser.uid,
        senderName: userData.username,
        senderFoto: userData.foto,
        timestamp: serverTimestamp(),
        isLocationShare: true,
        lugarDetails: postSeleccionado.lugarDetails || null,
        lat: postSeleccionado.lugarDetails?.lat || null,
        lng: postSeleccionado.lugarDetails?.lng || null,
      });
      Alert.alert("¡Enviado!", `Compartido con el grupo ${grupo.nombre}`);
    } catch {}
  };

  const renderPost = ({ item }: any) => {
    const hasLiked = item.likesUsers?.includes(auth.currentUser?.uid);
    const summary = postSummaries[item.id];
    const isSumLoading = loadingSummaries[item.id];
    const isMyPost = item.uid === auth.currentUser?.uid;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image
            source={{
              uri: item.fotoPerfil || "https://via.placeholder.com/150",
            }}
            style={styles.avatarPost}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.postUser}>{item.autor}</Text>
            <Text style={styles.postTime}>Recomendación de Comunidad</Text>
          </View>

          {isMyPost && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Opciones",
                  "¿Qué deseas hacer con tu publicación?",
                  [
                    {
                      text: "Editar texto",
                      onPress: () => {
                        setPostAEditar(item);
                        setTextoEditPost(item.texto || "");
                        setModalEditPost(true);
                      },
                    },
                    {
                      text: "Eliminar",
                      style: "destructive",
                      onPress: () => eliminarPost(item.id),
                    },
                    { text: "Cancelar", style: "cancel" },
                  ],
                );
              }}
              style={{ padding: 5 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {item.texto ? (
          <Text style={styles.postComment}>{item.texto}</Text>
        ) : null}

        {item.lugarDetails && (
          <View style={styles.sharedLocationCard}>
            {item.lugarDetails.fotos && item.lugarDetails.fotos.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ width: "100%", height: 200 }}
              >
                {item.lugarDetails.fotos.map((foto: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: foto }}
                    style={{
                      width: SCREEN_WIDTH - 80,
                      height: 200,
                      resizeMode: "cover",
                    }}
                  />
                ))}
              </ScrollView>
            ) : (
              <Image
                source={{
                  uri:
                    item.lugarDetails.imagen ||
                    "https://via.placeholder.com/400",
                }}
                style={{ width: "100%", height: 200 }}
              />
            )}

            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>
                {item.lugarDetails.titulo || item.lugarDetails.nombre}
              </Text>
              <Text style={styles.locationDesc} numberOfLines={2}>
                {item.lugarDetails.descripcion}
              </Text>

              <TouchableOpacity
                style={styles.goBtn}
                onPress={() =>
                  abrirMapa(
                    item.lugarDetails.lat,
                    item.lugarDetails.lng,
                    item.lugarDetails.titulo || item.lugarDetails.nombre,
                  )
                }
              >
                <Ionicons name="navigate" size={16} color="#FFF" />
                <Text style={styles.goBtnText}>Ir a ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {summary && (
          <View style={styles.aiSummaryCard}>
            <Ionicons name="sparkles" size={14} color="#007AFF" />
            <Text style={styles.aiSummaryText}>{summary}</Text>
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => toggleLike(item.id, item.likesUsers)}
          >
            <Ionicons
              name={hasLiked ? "heart" : "heart-outline"}
              size={26}
              color={hasLiked ? "#FF3B30" : "#8E8E93"}
            />
            <Text
              style={[styles.actionLabel, hasLiked && { color: "#FF3B30" }]}
            >
              {item.likes || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              setPostSeleccionado(item);
              setModalComentarios(true);
            }}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#8E8E93" />
            <Text style={styles.actionLabel}>
              Comentar{" "}
              {item.comentariosCount > 0 ? `(${item.comentariosCount})` : ""}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => resumirPublicacionIA(item)}
            disabled={isSumLoading}
          >
            {isSumLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="sparkles" size={22} color="#007AFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              setPostSeleccionado(item);
              setModalSendToChat(true);
            }}
          >
            <Ionicons name="paper-plane-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFriendRightActions = (amigo: any) => (
    <View style={styles.swipeActionsRow}>
      <TouchableOpacity
        style={styles.swipeInfoBtn}
        onPress={() => setDetalleAmigo(amigo)}
      >
        <Ionicons name="information-circle" size={24} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.swipeDeleteBtn}
        onPress={() => eliminarChat(amigo)}
      >
        <Ionicons name="trash" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const agregarInteres = () => {
    if (!nuevoInteres.trim()) return;
    if (userData.intereses.includes(nuevoInteres.trim())) {
      return Alert.alert("Aviso", "Este interés ya existe.");
    }
    setUserData({
      ...userData,
      intereses: [...userData.intereses, nuevoInteres.trim()],
    });
    setNuevoInteres("");
  };

  const eliminarInteres = (interes: string) => {
    setUserData({
      ...userData,
      intereses: userData.intereses.filter((i) => i !== interes),
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <BlurView intensity={60} tint="light" style={styles.header}>
          <View style={styles.dynamicHeaderArea}>
            {activeTab === "feed" && (
              <TouchableOpacity
                style={styles.headerActionMainBtn}
                onPress={() => setModalShare(true)}
              >
                <View style={styles.headerActionIcon}>
                  <Ionicons name="share-social" size={18} color="#FFF" />
                </View>
                <Text style={styles.headerActionText}>
                  Comparte una ubicación...
                </Text>
              </TouchableOpacity>
            )}

            {activeTab === "grupos" && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, alignItems: "center" }}
              >
                <TouchableOpacity
                  style={styles.headerActionMainBtn}
                  onPress={() => {
                    setGrupoFotoUri(null);
                    setModalGroup(true);
                  }}
                >
                  <View
                    style={[
                      styles.headerActionIcon,
                      { backgroundColor: "#000" },
                    ]}
                  >
                    <Ionicons name="add" size={20} color="#FFF" />
                  </View>
                  <Text
                    style={[
                      styles.headerActionText,
                      { color: "#000", fontWeight: "800" },
                    ]}
                  >
                    Crear nuevo grupo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerSecondaryBtn}
                  onPress={() => setShowGroupSearch(!showGroupSearch)}
                >
                  <Text style={styles.headerSecondaryBtnText}>
                    {showGroupSearch ? "Cerrar búsqueda" : "Buscar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerSecondaryBtn}
                  onPress={() => {
                    setJoinGroupCode("");
                    setGrupoEncontrado(null);
                    setModalJoinGroup(true);
                  }}
                >
                  <Text style={styles.headerSecondaryBtnText}>
                    Unirse con código
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {activeTab === "chat" && (
              <View style={styles.headerChatContainer}>
                <TextInput
                  placeholder="Código de amigo (Ej. X7B9A2)"
                  style={styles.headerChatInput}
                  value={codigoAmigo}
                  onChangeText={setCodigoAmigo}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={styles.headerChatBtn}
                  onPress={agregarAmigo}
                >
                  <Ionicons name="person-add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "perfil" && (
              <View style={styles.headerChatContainer}>
                <TextInput
                  placeholder="Código de amigo (Ej. X7B9A2)"
                  style={styles.headerChatInput}
                  value={codigoAmigo}
                  onChangeText={setCodigoAmigo}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={styles.headerChatBtn}
                  onPress={agregarAmigo}
                >
                  <Ionicons name="person-add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {(["feed", "grupos", "chat", "perfil"] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.chip, activeTab === tab && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    activeTab === tab && styles.chipTextActive,
                  ]}
                >
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </BlurView>

        <View
          style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 140 : 130 }}
        >
          {activeTab === "feed" && (
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
              {posts.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="earth" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyStateText}>
                    El feed está tranquilo hoy.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={posts}
                  renderItem={renderPost}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 80, paddingTop: 70 }}
                />
              )}
            </View>
          )}

          {activeTab === "grupos" && (
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20 }}
              contentContainerStyle={{ paddingBottom: 80, paddingTop: 70 }}
              showsVerticalScrollIndicator={false}
            >
              {showGroupSearch && (
                <TextInput
                  style={[
                    styles.headerChatInput,
                    { marginBottom: 15, height: 46 },
                  ]}
                  placeholder="Escribe para filtrar grupos..."
                  value={searchGroupQuery}
                  onChangeText={setSearchGroupQuery}
                />
              )}
              {gruposFiltradosFeed.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay grupos disponibles o que coincidan con la búsqueda.
                </Text>
              ) : (
                gruposFiltradosFeed.map((g: any) => {
                  const esMiembro =
                    auth.currentUser?.uid && Array.isArray(g.miembrosList)
                      ? g.miembrosList.includes(auth.currentUser.uid)
                      : false;

                  // 💡 1. Variable para el conteo de este grupo específico
                  const groupCount = unreadGroups[g.id] || 0;

                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.groupCard}
                      activeOpacity={0.8}
                      onLongPress={() => handleGroupLongPress(g)}
                      // 💡 2. También permitimos abrir el grupo tocando la tarjeta si es miembro
                      onPress={async () => {
                        if (esMiembro) {
                          setGrupoActivo(g);
                          // Lógica de limpieza de notificaciones (la misma del botón)
                          try {
                            const q = query(
                              collection(db, "social_groups", g.id, "messages"),
                            );
                            const snap = await getDocs(q);
                            snap.forEach((docMsg) => {
                              if (
                                !docMsg
                                  .data()
                                  .readBy?.includes(auth.currentUser?.uid)
                              ) {
                                updateDoc(
                                  doc(
                                    db,
                                    "social_groups",
                                    g.id,
                                    "messages",
                                    docMsg.id,
                                  ),
                                  {
                                    readBy: arrayUnion(auth.currentUser!.uid),
                                  },
                                );
                              }
                            });
                            setUnreadGroups((prev) => ({ ...prev, [g.id]: 0 }));
                          } catch (e) {
                            console.log(e);
                          }
                        }
                      }}
                    >
                      <Image
                        source={{
                          uri: g.foto || "https://via.placeholder.com/150",
                        }}
                        style={styles.friendAvatar}
                      />

                      <View
                        style={{ flex: 1, paddingRight: 10, paddingLeft: 10 }}
                      >
                        <Text style={styles.groupTitle}>{g.nombre}</Text>
                        <Text style={styles.groupDesc} numberOfLines={2}>
                          {g.descripcion}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#8E8E93",
                            marginTop: 5,
                          }}
                          selectable={true}
                        >
                          Cód: {g.id}
                        </Text>
                      </View>

                      {/* 💡 3. INTEGRACIÓN DEL BADGE DE NOTIFICACIÓN */}
                      {esMiembro && groupCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {groupCount > 9 ? "9+" : groupCount}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.joinBtn,
                          esMiembro && { backgroundColor: "#000" },
                        ]}
                        onPress={async () => {
                          if (esMiembro) {
                            setGrupoActivo(g);
                            try {
                              const q = query(
                                collection(
                                  db,
                                  "social_groups",
                                  g.id,
                                  "messages",
                                ),
                              );
                              const snap = await getDocs(q);
                              snap.forEach((docMsg) => {
                                const data = docMsg.data();
                                if (
                                  !data.readBy?.includes(auth.currentUser?.uid)
                                ) {
                                  updateDoc(
                                    doc(
                                      db,
                                      "social_groups",
                                      g.id,
                                      "messages",
                                      docMsg.id,
                                    ),
                                    {
                                      readBy: arrayUnion(auth.currentUser!.uid),
                                    },
                                  );
                                }
                              });
                              setUnreadGroups((prev) => ({
                                ...prev,
                                [g.id]: 0,
                              }));
                            } catch (error) {
                              console.log(
                                "Error al actualizar lectura de grupo:",
                                error,
                              );
                            }
                          } else {
                            unirseAlGrupoDirecto(g);
                          }
                        }}
                      >
                        <Text style={styles.joinBtnText}>
                          {esMiembro ? "Abrir" : "Unirse"}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {activeTab === "chat" && (
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20 }}
              contentContainerStyle={{ paddingBottom: 80, paddingTop: 70 }}
              showsVerticalScrollIndicator={false}
            >
              {misGruposConectados.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
                    Tus Grupos
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 25 }}
                  >
                    {misGruposConectados.map((g) => {
                      // 💡 1. Obtenemos el conteo de mensajes no leídos de este grupo
                      const groupCount = unreadGroups[g.id] || 0;

                      return (
                        <TouchableOpacity
                          key={g.id}
                          style={styles.miniGroupCard}
                          onPress={async () => {
                            setGrupoActivo(g);

                            // Lógica para marcar mensajes como leídos
                            const q = query(
                              collection(db, "social_groups", g.id, "messages"),
                            );
                            const snap = await getDocs(q);
                            snap.forEach((docMsg) => {
                              const data = docMsg.data();
                              if (
                                !data.readBy?.includes(auth.currentUser?.uid)
                              ) {
                                updateDoc(
                                  doc(
                                    db,
                                    "social_groups",
                                    g.id,
                                    "messages",
                                    docMsg.id,
                                  ),
                                  {
                                    readBy: arrayUnion(auth.currentUser!.uid),
                                  },
                                );
                              }
                            });
                            setUnreadGroups((prev) => ({ ...prev, [g.id]: 0 }));
                          }}
                        >
                          <View style={{ position: "relative" }}>
                            <Image
                              source={{
                                uri:
                                  g.foto || "https://via.placeholder.com/150",
                              }}
                              style={styles.miniGroupImg}
                            />

                            {/* 💡 2. Badge de notificación flotante */}
                            {groupCount > 0 && (
                              <View style={styles.miniUnreadBadge}>
                                <Text style={styles.miniUnreadText}>
                                  {groupCount > 9 ? "9+" : groupCount}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.miniGroupText} numberOfLines={1}>
                            {g.nombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
                Tus Conexiones
              </Text>
              {amigosList.map((amigo) => {
                // 1. Obtenemos el número de mensajes no leídos para este amigo
                const count = unreadChats[amigo.uid] || 0;

                return (
                  <Swipeable
                    key={amigo.uid}
                    renderRightActions={() => renderFriendRightActions(amigo)}
                  >
                    <TouchableOpacity
                      style={styles.friendCard}
                      onPress={async () => {
                        // Abrimos el chat
                        setChatActivo(amigo);

                        // 2. Lógica para limpiar notificaciones en Firebase al abrir el chat
                        if (count > 0) {
                          const chatId = [auth.currentUser!.uid, amigo.uid]
                            .sort()
                            .join("_");
                          const q = query(
                            collection(db, "chats", chatId, "messages"),
                            where("senderId", "==", amigo.uid),
                            where("read", "==", false),
                          );

                          const snap = await getDocs(q);
                          snap.forEach((docMsg) => {
                            updateDoc(
                              doc(db, "chats", chatId, "messages", docMsg.id),
                              {
                                read: true,
                              },
                            );
                          });
                        }
                      }}
                    >
                      <Image
                        source={{
                          uri: amigo.foto || "https://via.placeholder.com/150",
                        }}
                        style={styles.friendAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendName}>{amigo.username}</Text>
                        <Text style={styles.friendBio} numberOfLines={1}>
                          {amigo.bio}
                        </Text>
                      </View>

                      {/* 3. RECUENTO DE NOTIFICACIONES MEJORADO (Estilo iOS) */}
                      {typeof count === "number" && count > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {count > 9 ? "9+" : count}
                          </Text>
                        </View>
                      )}

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#C7C7CC"
                      />
                    </TouchableOpacity>
                  </Swipeable>
                );
              })}
            </ScrollView>
          )}

          {activeTab === "perfil" && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 150 }}
              showsVerticalScrollIndicator={false}
            >
              {/* SECCIÓN PORTADA Y FOTO */}
              <View style={{ height: 260, marginBottom: 20, marginTop: 30 }}>
                <TouchableOpacity
                  onPress={seleccionarPortada}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: userData.portada }}
                    style={styles.portadaImg}
                  />
                  <View style={styles.editPortadaBadge}>
                    <Ionicons name="image" size={18} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <View style={styles.profileAvatarWrapper}>
                  <Image
                    source={{ uri: userData.foto }}
                    style={styles.profileLargeAvatar}
                  />
                  <TouchableOpacity
                    style={styles.editAvatarIcon}
                    onPress={seleccionarFotoPerfil}
                  >
                    <Ionicons name="image" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* NOMBRE, FRASE Y CÓDIGO */}
              <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
                <Text style={styles.heroName}>{userData.username}</Text>
                <Text style={styles.userFrase}>
                  {`"${userData.frase || "Sin frase de estado"}"`}
                </Text>

                <TouchableOpacity
                  style={styles.friendCodeBadge}
                  onLongPress={handleCodeOptions}
                  onPress={() => Share.share({ message: userData.friendCode })}
                >
                  <Text style={styles.friendCodeLabel}>CÓDIGO:</Text>
                  <Text style={styles.friendCodeText}>
                    {userData.friendCode}
                  </Text>
                  <Ionicons
                    name="copy-outline"
                    size={14}
                    color="#007AFF"
                    style={{ marginLeft: 5 }}
                  />
                </TouchableOpacity>
              </View>

              {/* FORMULARIO DE AJUSTES */}
              <View style={{ paddingHorizontal: 20, marginTop: 25 }}>
                <Text style={styles.formLabel}>Ajustes de Perfil</Text>
                <View style={styles.formContainer}>
                  {/* CAMPO: NOMBRE */}
                  <View style={styles.formRow}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#8E8E93"
                      style={styles.formIcon}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Nombre completo"
                      value={userData.username} // Asegúrate de que 'nombre' exista en tu estado inicial
                      onChangeText={(t) =>
                        setUserData({ ...userData, username: t })
                      }
                    />
                  </View>

                  <View style={styles.formDivider} />

                  {/* CAMPO: FRASE (Existente) */}
                  <View style={styles.formRow}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={20}
                      color="#8E8E93"
                      style={styles.formIcon}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Tu frase corta..."
                      value={userData.frase}
                      onChangeText={(t) =>
                        setUserData({ ...userData, frase: t })
                      }
                    />
                  </View>

                  <View style={styles.formDivider} />

                  {/* CAMPO: BIO (Existente) */}
                  <View style={[styles.formRow, { alignItems: "flex-start" }]}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#8E8E93"
                      style={[styles.formIcon, { marginTop: 18 }]}
                    />
                    <TextInput
                      style={[styles.formInput, { height: 80, paddingTop: 18 }]}
                      multiline
                      placeholder="Biografía..."
                      value={userData.bio}
                      onChangeText={(t) => setUserData({ ...userData, bio: t })}
                    />
                  </View>
                </View>

                {/* SECCIÓN INTERESES */}
                <Text style={[styles.formLabel, { marginTop: 25 }]}>
                  Mis Intereses
                </Text>
                <View style={[styles.formContainer, { padding: 15 }]}>
                  <View
                    style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}
                  >
                    <TextInput
                      style={styles.interesInput}
                      placeholder="Añadir..."
                      value={nuevoInteres}
                      onChangeText={setNuevoInteres}
                    />
                    <TouchableOpacity
                      style={styles.addInteresBtn}
                      onPress={agregarInteres}
                    >
                      <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {userData.intereses.map((it, idx) => (
                      <View key={idx} style={styles.interesChip}>
                        <Text style={styles.interesText}>{it}</Text>
                        <TouchableOpacity onPress={() => eliminarInteres(it)}>
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color="#007AFF"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveProfileBtn, { marginTop: 20 }]}
                  onPress={guardarPerfil}
                >
                  <Text style={styles.saveProfileText}>Guardar Perfil</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.logoutBtn, { marginTop: 20 }]}
                  onPress={() => auth.signOut()}
                >
                  <Text style={styles.logoutBtnText}>Cerrar Sesión Segura</Text>
                </TouchableOpacity>

                {/* SECCIÓN: CUENTA Y SEGURIDAD */}
                <Text style={[styles.formLabel, { marginTop: 25 }]}>
                  Cuenta y Seguridad
                </Text>

                <View style={styles.formContainer}>
                  {/* CORREO ELECTRÓNICO */}
                  <View style={styles.formRow}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#8E8E93"
                      style={styles.formIcon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#007AFF",
                          fontWeight: "700",
                          marginTop: 8,
                        }}
                      >
                        CORREO ACTUAL
                      </Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { paddingTop: 2, paddingBottom: 12 },
                        ]}
                        placeholder="nuevo@correo.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={userData.email}
                        onChangeText={(t) =>
                          setUserData({ ...userData, email: t })
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.formDivider} />

                  {/* CONTRASEÑA */}
                  <View style={styles.formRow}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#8E8E93"
                      style={styles.formIcon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#8E8E93",
                          fontWeight: "700",
                          marginTop: 8,
                        }}
                      >
                        NUEVA CONTRASEÑA
                      </Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { paddingTop: 2, paddingBottom: 12 },
                        ]}
                        placeholder="••••••••"
                        secureTextEntry
                        value={userData.password}
                        onChangeText={(t) =>
                          setUserData({ ...userData, password: t })
                        }
                      />
                    </View>
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#8E8E93",
                    marginHorizontal: 20,
                    marginTop: 10,
                  }}
                >
                  {
                    'Para cambiar el correo o la clave, edita los campos arriba y presiona "Actualizar Seguridad".'
                  }
                </Text>

                {/* BOTÓN ACTUALIZAR */}
                <TouchableOpacity
                  style={[
                    styles.saveProfileBtn,
                    { marginTop: 15, backgroundColor: "#007AFF" },
                  ]}
                  onPress={actualizarCuentaSeguridad}
                  disabled={guardandoPerfil}
                >
                  {guardandoPerfil ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveProfileText}>
                      Actualizar Seguridad
                    </Text>
                  )}
                </TouchableOpacity>

                {/* BOTÓN ELIMINAR CUENTA */}
                <TouchableOpacity
                  style={[styles.deleteBtn, { marginTop: 15 }]}
                  onPress={eliminarCuentaDefinitiva}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFF" />
                    <Text style={styles.deleteBtnText}>
                      Eliminar mi cuenta definitivamente
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>

        {/* 💡 MODAL EDITAR POST */}
        <Modal visible={modalEditPost} animationType="fade" transparent>
          <View style={styles.modalBackdropCenter}>
            <View style={styles.sendChatCard}>
              <Text
                style={[
                  styles.modalTitle,
                  { textAlign: "center", marginBottom: 15 },
                ]}
              >
                Editar Publicación
              </Text>
              <TextInput
                style={[styles.postTextInput, { height: 100 }]}
                multiline
                value={textoEditPost}
                onChangeText={setTextoEditPost}
              />
              <TouchableOpacity
                style={[styles.confirmBtn, { width: "100%", marginTop: 15 }]}
                onPress={guardarEdicionPost}
              >
                <Text style={styles.confirmBtnText}>Guardar Cambios</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtnFull, { width: "100%", marginTop: 10 }]}
                onPress={() => {
                  setModalEditPost(false);
                  setPostAEditar(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL CREAR GRUPO CON FOTO */}
        <Modal visible={modalGroup} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <View style={styles.modalIndicator} />
                <Text style={styles.modalTitle}>Crear Grupo</Text>

                <TouchableOpacity
                  style={[styles.profileAvatarContainer, { marginTop: 20 }]}
                  onPress={seleccionarFotoGrupo}
                >
                  <Image
                    source={{
                      uri: grupoFotoUri || "https://via.placeholder.com/150",
                    }}
                    style={styles.profileLargeAvatar}
                  />
                  <View style={styles.editAvatarIcon}>
                    <Ionicons name="camera" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <View style={[styles.formContainerModal, { marginTop: 10 }]}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nombre del grupo"
                    value={nuevoGrupo.nombre}
                    onChangeText={(t) =>
                      setNuevoGrupo({ ...nuevoGrupo, nombre: t })
                    }
                  />
                  <View style={styles.formDivider} />
                  <TextInput
                    style={[styles.modalInput, { height: 80, paddingTop: 15 }]}
                    placeholder="Descripción del grupo"
                    multiline
                    value={nuevoGrupo.descripcion}
                    onChangeText={(t) =>
                      setNuevoGrupo({ ...nuevoGrupo, descripcion: t })
                    }
                  />
                </View>
                <View style={styles.privacyRow}>
                  <View>
                    <Text style={styles.privacyLabel}>Grupo Privado</Text>
                    <Text
                      style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}
                    >
                      Oculto en búsquedas
                    </Text>
                  </View>
                  <Switch
                    value={nuevoGrupo.esPrivado}
                    onValueChange={(val: boolean) =>
                      setNuevoGrupo({ ...nuevoGrupo, esPrivado: val })
                    }
                    trackColor={{ false: "#D1D1D6", true: "#34C759" }}
                  />
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalGroup(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={crearGrupo}
                  >
                    {guardandoPerfil ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.confirmBtnText}>Crear Grupo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* 💡 MODAL UNIRSE A GRUPO RENOVADO */}
        <Modal visible={modalJoinGroup} animationType="fade" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalBackdropCenter}>
              <View style={styles.sendChatCard}>
                <Text
                  style={[
                    styles.modalTitle,
                    { textAlign: "center", marginBottom: 15 },
                  ]}
                >
                  Unirse a un Grupo
                </Text>
                {!grupoEncontrado ? (
                  <>
                    <TextInput
                      style={{
                        backgroundColor: "#F2F2F7", // Fondo gris claro para contraste 💡
                        paddingHorizontal: 20,
                        paddingVertical: 15,
                        borderRadius: 15,
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#1C1C1E", // Texto negro para que se vea 💡
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: "#E5E5EA",
                        textAlign: "center", // Centrado para estilo de "código"
                        letterSpacing: 1,
                      }}
                      placeholder="Ingresa el código (Ej. X7B9A2)"
                      placeholderTextColor="#8E8E93" // Color del texto de ayuda
                      value={joinGroupCode}
                      onChangeText={setJoinGroupCode}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        {
                          width: "100%",
                          marginBottom: 10,
                          justifyContent: "center",
                        },
                      ]}
                      onPress={buscarGrupoPorCodigo}
                    >
                      <Text style={styles.confirmBtnText}>Buscar Grupo</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={{ alignItems: "center", marginBottom: 20 }}>
                      <Image
                        source={{
                          uri:
                            grupoEncontrado.foto ||
                            "https://via.placeholder.com/150",
                        }}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          marginBottom: 10,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "900",
                          color: "#1C1C1E",
                        }}
                      >
                        {grupoEncontrado.nombre}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#8E8E93",
                          textAlign: "center",
                          marginTop: 5,
                        }}
                      >
                        {grupoEncontrado.descripcion}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        {
                          width: "100%",
                          marginBottom: 10,
                          justifyContent: "center",
                        },
                      ]}
                      onPress={confirmarUnirseGrupo}
                    >
                      <Text style={styles.confirmBtnText}>Unirme ahora</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[
                    styles.cancelBtnFull,
                    { width: "100%", marginTop: 5 },
                  ]}
                  onPress={() => {
                    setModalJoinGroup(false);
                    setGrupoEncontrado(null);
                    setJoinGroupCode("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL COMPARTIR LUGAR AL FEED */}
        <Modal visible={modalShare} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <View style={styles.modalIndicator} />
                <Text style={styles.modalTitle}>Compartir en la Comunidad</Text>

                {misLugares.length === 0 ? (
                  <View
                    style={[
                      styles.emptyStateBox,
                      { backgroundColor: "#F9F9F9", borderWidth: 0 },
                    ]}
                  >
                    <Text style={styles.emptyStateText}>
                      No tienes lugares públicos.
                    </Text>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.postTextInput}
                      placeholder="¿Por qué recomiendas este lugar?"
                      multiline
                      value={comentarioInicial}
                      onChangeText={setComentarioInicial}
                    />
                    <Text style={styles.subLabel}>
                      Elige tu ubicación pública:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 15, maxHeight: 120 }}
                    >
                      {misLugares.map((lugar) => (
                        <TouchableOpacity
                          key={lugar.id}
                          style={[
                            styles.miniLugar,
                            lugarACompartir?.id === lugar.id &&
                              styles.miniLugarActive,
                          ]}
                          onPress={() => setLugarACompartir(lugar)}
                        >
                          <Image
                            source={{
                              uri:
                                lugar.fotos?.[0] ||
                                lugar.imagen ||
                                "https://via.placeholder.com/100",
                            }}
                            style={styles.miniLugarImg}
                          />
                          <Text style={styles.miniLugarTitle} numberOfLines={1}>
                            {lugar.titulo || lugar.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setModalShare(false);
                      setLugarACompartir(null);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      !lugarACompartir && { opacity: 0.5 },
                    ]}
                    onPress={compartirLugarFeed}
                    disabled={!lugarACompartir}
                  >
                    <Text style={styles.confirmBtnText}>Publicar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL COMENTARIOS DEL FEED */}
        <Modal visible={modalComentarios} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalContent, { height: "85%" }]}>
                <View style={styles.modalIndicator} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Comentarios</Text>
                  <TouchableOpacity
                    onPress={() => setModalComentarios(false)}
                    style={styles.closeBtnCircle}
                  >
                    <Ionicons name="close" size={24} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={listaComentariosFeed}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.comentarioFeedCard}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 5,
                        }}
                      >
                        <Text style={styles.comentarioFeedUser}>
                          {item.usuario}
                        </Text>
                      </View>
                      <Text style={styles.comentarioFeedText}>
                        {item.texto}
                      </Text>
                    </View>
                  )}
                />
                <View style={styles.chatInputContainerModal}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Escribe un comentario..."
                    value={comentarioFeed}
                    onChangeText={setComentarioFeed}
                  />
                  <TouchableOpacity
                    style={styles.chatSendBtn}
                    onPress={enviarComentarioFeed}
                  >
                    <Ionicons name="arrow-up" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* 💡 MODAL DE CHAT DE GRUPO (SALA) */}
        <Modal visible={!!grupoActivo} animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: "#F2F2F7" }}
          >
            {/* MODAL ADMIN DE GRUPO */}
            <Modal visible={modalAdminGrupo} animationType="slide" transparent>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalIndicator} />
                    <Text style={styles.modalTitle}>Administrar Grupo</Text>

                    <TouchableOpacity
                      style={styles.profileAvatarContainer}
                      onPress={seleccionarFotoGrupo}
                    >
                      <Image
                        source={{
                          uri:
                            grupoFotoUri ||
                            grupoActivo?.foto ||
                            "https://via.placeholder.com/150",
                        }}
                        style={styles.profileLargeAvatar}
                      />
                      <View style={styles.editAvatarIcon}>
                        <Ionicons name="camera" size={20} color="#FFF" />
                      </View>
                    </TouchableOpacity>

                    <View
                      style={[styles.formContainerModal, { marginTop: 10 }]}
                    >
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Nombre"
                        value={grupoActivo?.nombre}
                        onChangeText={(t) =>
                          setGrupoActivo({ ...grupoActivo, nombre: t })
                        }
                      />
                      <View style={styles.formDivider} />
                      <TextInput
                        style={[
                          styles.modalInput,
                          { height: 80, paddingTop: 15 },
                        ]}
                        placeholder="Descripción"
                        multiline
                        value={grupoActivo?.descripcion}
                        onChangeText={(t) =>
                          setGrupoActivo({ ...grupoActivo, descripcion: t })
                        }
                      />
                    </View>
                    <View style={styles.privacyRow}>
                      <View>
                        <Text style={styles.privacyLabel}>Grupo Privado</Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#8E8E93",
                            marginTop: 2,
                          }}
                        >
                          Oculto en búsquedas
                        </Text>
                      </View>
                      <Switch
                        value={grupoActivo?.esPrivado}
                        onValueChange={(val: boolean) =>
                          setGrupoActivo({ ...grupoActivo, esPrivado: val })
                        }
                        trackColor={{ false: "#D1D1D6", true: "#34C759" }}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.cancelBtnFull,
                        { backgroundColor: "#FF3B3015", marginTop: 10 },
                      ]}
                      onPress={() => eliminarGrupoConfirm(grupoActivo?.id)}
                    >
                      <Text
                        style={[styles.cancelBtnText, { color: "#FF3B30" }]}
                      >
                        Eliminar Grupo Definitivamente
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setModalAdminGrupo(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cerrar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={actualizarGrupoAdmin}
                      >
                        {guardandoPerfil ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.confirmBtnText}>Guardar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
            <View style={styles.chatHeader}>
              <TouchableOpacity
                onPress={() => {
                  setGrupoActivo(null);
                  setChatSummary("");
                }}
                style={{ padding: 10 }}
              >
                <Ionicons name="chevron-back" size={28} color="#000" />
              </TouchableOpacity>
              <Image
                source={{
                  uri: grupoActivo?.foto || "https://via.placeholder.com/150",
                }}
                style={styles.chatAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{grupoActivo?.nombre}</Text>
                <Text style={{ fontSize: 12, color: "#8E8E93" }}>
                  {grupoActivo?.miembrosList?.length || 1} miembros
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (grupoActivo?.creador === auth.currentUser?.uid) {
                    // 1. Cargamos los datos actuales en los estados del formulario
                    setGrupoFotoUri(grupoActivo.foto);
                    // 2. Abrimos el modal de administración
                    setModalAdminGrupo(true);
                  } else {
                    abandonarGrupoConfirm(grupoActivo.id);
                  }
                }}
                style={{ padding: 10 }}
              >
                <Ionicons
                  name={
                    grupoActivo?.creador === auth.currentUser?.uid
                      ? "settings"
                      : "log-out"
                  }
                  size={24}
                  color={
                    grupoActivo?.creador === auth.currentUser?.uid
                      ? "#000"
                      : "#FF3B30"
                  }
                />
              </TouchableOpacity>
            </View>

            {chatSummary ? (
              <View style={styles.aiSummaryCard}>
                <Text style={styles.aiSummaryText}>{chatSummary}</Text>
                <TouchableOpacity onPress={() => setChatSummary("")}>
                  <Ionicons name="close-circle" size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            ) : null}

            <FlatList
              data={mensajesGrupo}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
              renderItem={({ item }) => {
                const isMe = item.senderId === auth.currentUser?.uid;

                // 💡 Si es una ubicación compartida, usa la vista de tarjeta azul (igual que chat privado)
                if (item.isLocationShare && item.lugarDetails) {
                  return (
                    <View
                      style={[
                        styles.messageBubble,
                        isMe ? styles.messageMe : styles.messageThem,
                        {
                          padding: 0,
                          width: 280,
                          overflow: "hidden",
                          backgroundColor: isMe ? "#007AFF" : "#FFF",
                        },
                      ]}
                    >
                      {!isMe && (
                        <View
                          style={{
                            paddingHorizontal: 16,
                            paddingTop: 12,
                            paddingBottom: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "800",
                              color: "#007AFF",
                            }}
                          >
                            {item.senderName}
                          </Text>
                        </View>
                      )}
                      <Image
                        source={{
                          uri:
                            item.lugarDetails.fotos?.[0] ||
                            item.lugarDetails.imagen ||
                            "https://via.placeholder.com/400",
                        }}
                        style={{
                          width: "100%",
                          height: 140,
                          backgroundColor: "#E5E5EA",
                        }}
                      />
                      <View style={{ padding: 16 }}>
                        <Text
                          style={{
                            fontWeight: "900",
                            fontSize: 17,
                            color: isMe ? "#FFF" : "#1C1C1E",
                            marginBottom: 5,
                          }}
                          numberOfLines={1}
                        >
                          {item.lugarDetails.titulo || item.lugarDetails.nombre}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: isMe ? "rgba(255,255,255,0.9)" : "#8E8E93",
                            marginBottom: 15,
                          }}
                          numberOfLines={2}
                        >
                          {item.lugarDetails.descripcion}
                        </Text>
                        <TouchableOpacity
                          style={{
                            backgroundColor: isMe ? "#FFF" : "#000",
                            paddingVertical: 12,
                            borderRadius: 14,
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onPress={() =>
                            abrirMapa(
                              item.lugarDetails.lat,
                              item.lugarDetails.lng,
                              item.lugarDetails.titulo,
                            )
                          }
                        >
                          <Ionicons
                            name="navigate"
                            size={16}
                            color={isMe ? "#007AFF" : "#FFF"}
                          />
                          <Text
                            style={{
                              color: isMe ? "#007AFF" : "#FFF",
                              fontWeight: "900",
                              fontSize: 14,
                            }}
                          >
                            Ir a Ubicación
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                // Burbuja normal si es solo texto
                return (
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.messageMe : styles.messageThem,
                    ]}
                  >
                    {!isMe && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: "#007AFF",
                          marginBottom: 4,
                        }}
                      >
                        {item.senderName}
                      </Text>
                    )}
                    <Text
                      style={{
                        color: isMe ? "#FFF" : "#1C1C1E",
                        fontSize: 16,
                        lineHeight: 22,
                      }}
                    >
                      {item.text}
                    </Text>
                  </View>
                );
              }}
            />

            <View style={styles.chatInputContainer}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <TextInput
                  style={styles.chatInput}
                  placeholder="Escribe al grupo..."
                  value={nuevoMensajeGrupo}
                  onChangeText={setNuevoMensajeGrupo}
                  multiline
                />
                <TouchableOpacity
                  style={styles.chatSendBtn}
                  onPress={() => enviarMensajeGrupo()}
                >
                  <Ionicons name="arrow-up" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL DE CHAT EN VIVO PRIVADO */}
        <Modal visible={!!chatActivo && !grupoActivo} animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: "#F2F2F7" }}
          >
            <View style={styles.chatHeader}>
              <TouchableOpacity
                onPress={() => {
                  setChatActivo(null);
                  setChatSummary("");
                  setMsgEditando(null);
                }}
                style={{ padding: 10 }}
              >
                <Ionicons name="chevron-back" size={28} color="#000" />
              </TouchableOpacity>
              <Image
                source={{
                  uri: chatActivo?.foto || "https://via.placeholder.com/150",
                }}
                style={styles.chatAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{chatActivo?.username}</Text>
                <Text
                  style={{ fontSize: 12, color: "#34C759", fontWeight: "600" }}
                >
                  Explorador Conectado
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => resumirChatIA(false)}
                style={{ padding: 10 }}
              >
                {loadingChatSummary ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="sparkles" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            {chatSummary ? (
              <View style={styles.aiSummaryCard}>
                <Text style={styles.aiSummaryText}>{chatSummary}</Text>
                <TouchableOpacity onPress={() => setChatSummary("")}>
                  <Ionicons name="close-circle" size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            ) : null}

            <FlatList
              data={mensajes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
              renderItem={({ item }) => {
                const isMe = item.senderId === auth.currentUser?.uid;

                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onLongPress={() => {
                      if (!isMe) return;
                      Alert.alert("Mensaje", "¿Qué deseas hacer?", [
                        {
                          text: "Editar",
                          onPress: () => {
                            setMsgEditando(item);
                            setNuevoMensaje(item.text);
                          },
                        },
                        {
                          text: "Eliminar",
                          onPress: () => eliminarMensaje(item.id),
                          style: "destructive",
                        },
                        { text: "Cancelar", style: "cancel" },
                      ]);
                    }}
                  >
                    {item.isLocationShare && item.lugarDetails ? (
                      <View
                        style={[
                          styles.messageBubble,
                          isMe ? styles.messageMe : styles.messageThem,
                          {
                            padding: 0,
                            width: 280,
                            overflow: "hidden",
                            backgroundColor: isMe ? "#007AFF" : "#FFF",
                          },
                        ]}
                      >
                        <Image
                          source={{
                            uri:
                              item.lugarDetails.fotos?.[0] ||
                              item.lugarDetails.imagen ||
                              "https://via.placeholder.com/400",
                          }}
                          style={{
                            width: "100%",
                            height: 140,
                            backgroundColor: "#E5E5EA",
                          }}
                        />
                        <View style={{ padding: 16 }}>
                          <Text
                            style={{
                              fontWeight: "900",
                              fontSize: 17,
                              color: isMe ? "#FFF" : "#1C1C1E",
                              marginBottom: 5,
                            }}
                            numberOfLines={1}
                          >
                            {item.lugarDetails.titulo ||
                              item.lugarDetails.nombre}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: isMe ? "rgba(255,255,255,0.9)" : "#8E8E93",
                              marginBottom: 15,
                            }}
                            numberOfLines={2}
                          >
                            {item.lugarDetails.descripcion}
                          </Text>
                          <TouchableOpacity
                            style={{
                              backgroundColor: isMe ? "#FFF" : "#000",
                              paddingVertical: 12,
                              borderRadius: 14,
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: 8,
                            }}
                            onPress={() =>
                              abrirMapa(
                                item.lugarDetails.lat,
                                item.lugarDetails.lng,
                                item.lugarDetails.titulo,
                              )
                            }
                          >
                            <Ionicons
                              name="navigate"
                              size={16}
                              color={isMe ? "#007AFF" : "#FFF"}
                            />
                            <Text
                              style={{
                                color: isMe ? "#007AFF" : "#FFF",
                                fontWeight: "900",
                                fontSize: 14,
                              }}
                            >
                              Ir a Ubicación
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.messageBubble,
                          isMe ? styles.messageMe : styles.messageThem,
                        ]}
                      >
                        <Text
                          style={{
                            color: isMe ? "#FFF" : "#1C1C1E",
                            fontSize: 16,
                            lineHeight: 22,
                          }}
                        >
                          {item.text}
                        </Text>
                        {item.editado && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: isMe ? "rgba(255,255,255,0.6)" : "#8E8E93",
                              alignSelf: "flex-end",
                              marginTop: 4,
                            }}
                          >
                            Editado
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.chatInputContainer}>
              {msgEditando && (
                <View style={styles.editWarning}>
                  <Text style={styles.editWarningText}>
                    Editando mensaje...
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setMsgEditando(null);
                      setNuevoMensaje("");
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <TextInput
                  style={styles.chatInput}
                  placeholder={
                    msgEditando ? "Edita tu mensaje..." : "Mensaje..."
                  }
                  value={nuevoMensaje}
                  onChangeText={setNuevoMensaje}
                  multiline
                />
                <TouchableOpacity
                  style={styles.chatSendBtn}
                  onPress={() => enviarMensaje()}
                >
                  <Ionicons
                    name={msgEditando ? "checkmark" : "arrow-up"}
                    size={22}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={!!detalleAmigo} animationType="fade" transparent>
          <View style={styles.modalBackdropCenter}>
            <View style={styles.sendChatCard}>
              <Image
                source={{ uri: detalleAmigo?.foto }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignSelf: "center",
                  marginBottom: 15,
                }}
              />
              <Text style={[styles.modalTitle, { textAlign: "center" }]}>
                {detalleAmigo?.username}
              </Text>
              <Text
                style={{
                  textAlign: "center",
                  color: "#8E8E93",
                  marginBottom: 20,
                }}
              >
                {detalleAmigo?.bio}
              </Text>
              <TouchableOpacity
                style={styles.cancelBtnFull}
                onPress={() => setDetalleAmigo(null)}
              >
                <Text style={styles.cancelBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 💡 MODAL ENVIAR POST AL CHAT (TUS GRUPOS Y AMIGOS) */}
        <Modal visible={modalSendToChat} animationType="fade" transparent>
          <View style={styles.modalBackdropCenter}>
            <View style={styles.sendChatCard}>
              <Text
                style={[
                  styles.modalTitle,
                  { textAlign: "center", marginBottom: 15 },
                ]}
              >
                Recomendar
              </Text>

              {amigosList.length === 0 && misGruposConectados.length === 0 ? (
                <Text style={styles.emptyText}>
                  Ve a Comunidad para agregar conexiones o grupos.
                </Text>
              ) : (
                <ScrollView
                  style={{ maxHeight: 300 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Lista de Grupos */}
                  {misGruposConectados.length > 0 && (
                    <Text style={styles.subLabelMenu}>Tus Grupos</Text>
                  )}
                  {misGruposConectados.map((grupo) => (
                    <TouchableOpacity
                      key={grupo.id}
                      style={styles.friendCardMini}
                      onPress={() => reenviarPostAlGrupo(grupo)}
                    >
                      <Image
                        source={{
                          uri: grupo.foto || "https://via.placeholder.com/150",
                        }}
                        style={styles.friendAvatarMini}
                      />
                      <Text style={styles.friendNameMini}>{grupo.nombre}</Text>
                      <View style={styles.sendIconMini}>
                        <Ionicons name="people" size={16} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* Lista de Amigos */}
                  {amigosList.length > 0 && (
                    <Text style={styles.subLabelMenu}>Tus Amigos</Text>
                  )}
                  {amigosList.map((amigo) => (
                    <TouchableOpacity
                      key={amigo.uid}
                      style={styles.friendCardMini}
                      onPress={() => reenviarPostAlChat(amigo)}
                    >
                      <Image
                        source={{
                          uri: amigo.foto || "https://via.placeholder.com/150",
                        }}
                        style={styles.friendAvatarMini}
                      />
                      <Text style={styles.friendNameMini}>
                        {amigo.username}
                      </Text>
                      <View style={styles.sendIconMini}>
                        <Ionicons name="paper-plane" size={16} color="#FFF" />
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
        </Modal>

        {/* 💡 MODAL COMPARTIR GRUPO AL CHAT */}
        <Modal visible={modalSendGroupToChat} animationType="fade" transparent>
          <View style={styles.modalBackdropCenter}>
            <View style={styles.sendChatCard}>
              <Text
                style={[
                  styles.modalTitle,
                  { textAlign: "center", marginBottom: 15 },
                ]}
              >
                Enviar invitación
              </Text>
              {amigosList.length === 0 ? (
                <Text style={styles.emptyText}>
                  Ve a Comunidad para agregar conexiones.
                </Text>
              ) : (
                <ScrollView style={{ maxHeight: 300 }}>
                  {amigosList.map((amigo) => (
                    <TouchableOpacity
                      key={amigo.uid}
                      style={styles.friendCardMini}
                      onPress={() => reenviarGrupoAlChat(amigo)}
                    >
                      <Image
                        source={{
                          uri: amigo.foto || "https://via.placeholder.com/150",
                        }}
                        style={styles.friendAvatarMini}
                      />
                      <Text style={styles.friendNameMini}>
                        {amigo.username}
                      </Text>
                      <View style={styles.sendIconMini}>
                        <Ionicons name="paper-plane" size={16} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.cancelBtnFull}
                onPress={() => setModalSendGroupToChat(false)}
              >
                <Text style={styles.cancelBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F6" },
  header: {
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 10,
    paddingBottom: 15,
    paddingTop: Platform.OS === "ios" ? 75 : 45,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },

  tabBar: { flexDirection: "row", paddingLeft: 20 },

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

  dynamicHeaderArea: {
    paddingHorizontal: 20,
    height: 54,
    justifyContent: "center",
    marginBottom: 15,
  },
  headerActionMainBtn: {
    backgroundColor: "#FFF",
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerActionIcon: {
    backgroundColor: "#007AFF",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActionText: {
    color: "#8E8E93",
    fontWeight: "600",
    fontSize: 15,
    flex: 1,
    paddingRight: 10,
  },
  headerSecondaryBtn: {
    backgroundColor: "rgba(0,0,0,0.04)",
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSecondaryBtnText: { color: "#8E8E93", fontWeight: "700", fontSize: 14 },
  headerChatContainer: { flexDirection: "row", gap: 10, height: 44 },
  headerChatInput: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    borderRadius: 22,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerChatBtn: {
    backgroundColor: "#000",
    width: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  emptyStateBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#FFF",
    borderRadius: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1C1C1E",
    marginTop: 15,
    textAlign: "center",
  },
  emptyText: {
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },

  // Feed
  postCard: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 15,
  },
  avatarPost: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E5EA",
  },
  postUser: { fontWeight: "900", fontSize: 17, color: "#1C1C1E" },
  postTime: { fontSize: 12, color: "#8E8E93", marginTop: 2, fontWeight: "500" },
  postComment: {
    fontSize: 16,
    color: "#3A3A3C",
    marginBottom: 15,
    lineHeight: 24,
  },
  sharedLocationCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 20,
    overflow: "hidden",
  },
  locationInfo: { padding: 18 },
  locationTitle: {
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 6,
    color: "#1C1C1E",
  },
  locationDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  goBtn: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    gap: 8,
  },
  goBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  postActions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C6C6C8",
    paddingTop: 15,
  },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionLabel: { fontSize: 14, fontWeight: "800", color: "#8E8E93" },

  aiSummaryCard: {
    backgroundColor: "#E1F0FF",
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiSummaryText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
    fontStyle: "italic",
    flex: 1,
  },

  // Grupos
  groupCard: {
    backgroundColor: "#FFF",
    padding: 22,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  groupTitle: { fontSize: 16, fontWeight: "900", color: "#1C1C1E" },
  groupDesc: { fontSize: 12, color: "#8E8E93", marginTop: 4, lineHeight: 20 },
  joinBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  joinBtnText: { fontWeight: "800", color: "#FFF", fontSize: 14 },
  miniGroupCard: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 15,
    width: 80,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  miniGroupImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    backgroundColor: "#E5E5EA",
  },
  miniGroupText: { fontSize: 11, fontWeight: "700", color: "#1C1C1E" },

  // Perfil
  profileHeroCard: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 15,
    marginTop: 10,
  },
  profileAvatarContainer: {
    width: 120, // 💡 Debe ser igual al ancho de la imagen
    height: 120, // 💡 Debe ser igual al alto de la imagen
    alignSelf: "center", // Centra el bloque completo en el modal
    position: "relative", // Contenedor de referencia para el icono
    marginTop: 20,
  },
  profileLargeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E5EA",
  },
  editAvatarIcon: {
    position: "absolute",
    bottom: 0, // Lo pega abajo
    right: 0, // Lo pega a la derecha del contenedor de 120px 💡
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF", // Añade un borde blanco para que resalte
  },
  heroName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1C1C1E",
    marginBottom: 15,
  },
  friendCodeBadge: {
    backgroundColor: "#F2F2F7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  friendCodeLabel: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "800",
    marginRight: 10,
  },
  friendCodeText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#007AFF",
    letterSpacing: 2,
  },
  formGroup: { marginBottom: 25 },
  formLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginLeft: 15,
    marginBottom: 8,
  },
  formContainer: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  formIcon: { marginRight: 15 },
  formInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  formDivider: { height: 1, backgroundColor: "#E5E5EA", marginLeft: 55 },
  saveProfileBtn: {
    backgroundColor: "#000",
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 10,
  },
  saveProfileText: { color: "#FFF", fontWeight: "900", fontSize: 17 },
  logoutBtn: {
    alignItems: "center",
    marginTop: 10,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF3B30",
    backgroundColor: "#FFF",
  },
  logoutBtnText: { color: "#FF3B30", fontWeight: "800", fontSize: 16 },
  deleteBtn: {
    alignItems: "center",
    marginTop: 10,
    padding: 15,
    borderRadius: 20,
    borderColor: "#FF3B30",
    borderWidth: 1,
    backgroundColor: "#FF3B30",
  },
  deleteBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 15,
    marginTop: 10,
    color: "#1C1C1E",
  },

  // Amigos y Swipe
  friendCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: "#E5E5EA",
    borderWidth: 2,
    backgroundColor: "#E5E5EA",
  },
  friendName: { fontSize: 17, fontWeight: "900", color: "#1C1C1E" },
  friendBio: { fontSize: 14, color: "#8E8E93", marginTop: 4 },
  unreadBadge: {
    backgroundColor: "#007AFF",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    marginRight: 10,
  },
  unreadText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  miniUnreadBadge: {
    position: "absolute", // 💡 Permite que flote sobre la imagen
    top: -2, // Ajusta la posición vertical
    right: -2, // Ajusta la posición horizontal
    backgroundColor: "#007AFF", // Color rojo para destacar en miniaturas
    minWidth: 18,
    height: 18,
    borderRadius: 9, // Hace que sea circular
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2, // Añade un borde blanco para separarlo de la foto
    borderColor: "#FFF",
    paddingHorizontal: 2,
    zIndex: 1, // Asegura que esté por encima de la foto
  },
  miniUnreadText: {
    color: "#FFF",
    fontSize: 9, // Fuente pequeña para el espacio reducido
    fontWeight: "900",
  },
  swipeActionsRow: { flexDirection: "row", width: 130, marginBottom: 12 },
  swipeInfoBtn: {
    flex: 1,
    backgroundColor: "#E5E5EA",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    marginLeft: 10,
  },
  swipeDeleteBtn: {
    flex: 1,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    marginLeft: 10,
  },

  // Chat
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#E5E5EA",
  },
  chatName: { fontSize: 18, fontWeight: "900", color: "#1C1C1E" },
  messageBubble: {
    maxWidth: "80%",
    padding: 16,
    borderRadius: 24,
    marginBottom: 15,
  },
  messageMe: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 6,
  },
  messageThem: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  chatInputContainer: {
    padding: 15,
    backgroundColor: "#FFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C6C6C8",
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 16,
    borderRadius: 24,
    fontSize: 16,
    marginRight: 12,
    paddingTop: 16,
    maxHeight: 100,
  },
  chatSendBtn: {
    backgroundColor: "#007AFF",
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  editWarning: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E5E5EA",
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  editWarningText: { fontSize: 12, color: "#8E8E93", fontWeight: "700" },

  // Modales
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    maxHeight: "90%",
  },
  modalIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E5EA",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 15,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtnCircle: { backgroundColor: "#F2F2F7", padding: 8, borderRadius: 20 },
  modalTitle: { fontSize: 26, fontWeight: "900", color: "#1C1C1E" },
  postTextInput: {
    backgroundColor: "#F2F2F7",
    padding: 20,
    borderRadius: 24,
    height: 120,
    textAlignVertical: "top",
    fontSize: 17,
    color: "#1C1C1E",
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 25,
    color: "#8E8E93",
    textTransform: "uppercase",
  },
  subLabelMenu: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginTop: 15,
    marginBottom: 5,
    paddingLeft: 5,
  },
  miniLugar: { width: 120, marginRight: 15, alignItems: "center" },
  miniLugarActive: { opacity: 0.6, transform: [{ scale: 0.95 }] },
  miniLugarImg: {
    width: 120,
    height: 90,
    borderRadius: 20,
    backgroundColor: "#E5E5EA",
    borderWidth: 1,
    borderColor: "#C6C6C8",
  },
  miniLugarTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
    color: "#1C1C1E",
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    gap: 15,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    padding: 18,
    backgroundColor: "#F2F2F7",
    borderRadius: 22,
  },
  cancelBtnText: { fontWeight: "800", color: "#8E8E93", fontSize: 16 },
  confirmBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 22,
    alignItems: "center", // Centra horizontalmente
    justifyContent: "center", // Centra verticalmente 💡
    padding: 18,
  },
  confirmBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  formContainerModal: {
    backgroundColor: "#F2F2F7",
    borderRadius: 24,
    overflow: "hidden",
  },
  modalInput: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  privacyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#F2F2F7",
    padding: 20,
    borderRadius: 24,
  },
  privacyLabel: { fontWeight: "900", fontSize: 16, color: "#1C1C1E" },
  comentarioFeedCard: {
    backgroundColor: "#F9F9F9",
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  comentarioFeedUser: { fontWeight: "800", fontSize: 15, color: "#1C1C1E" },
  comentarioFeedText: { fontSize: 15, color: "#444", lineHeight: 22 },
  chatInputContainerModal: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#FFF",
    paddingTop: 10,
  },

  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },
  sendChatCard: { backgroundColor: "#FFF", borderRadius: 35, padding: 30 },
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
  portadaImg: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    backgroundColor: "#E5E5EA",
  },
  editPortadaBadge: {
    position: "absolute",
    top: 150,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  profileAvatarWrapper: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    borderWidth: 5,
    borderColor: "#F4F4F6",
    borderRadius: 65,
  },
  userFrase: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
    marginBottom: 10,
    textAlign: "center",
  },
  interesInput: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
  },
  addInteresBtn: {
    backgroundColor: "#000",
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  interesChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#007AFF30",
    gap: 5,
  },
  interesText: {
    color: "#007AFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
