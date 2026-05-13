import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    addDoc,
    collection,
    doc,
    documentId,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { auth, db } from "../firebaseConfig";

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
const modelIA = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const useBiblioteca = () => {
  const [misPuntos, setMisPuntos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "todos" | "favoritos" | "recientes" | "nombre" | "zona"
  >("todos");

  // Amigos e IA
  const [amigosList, setAmigosList] = useState<any[]>([]);
  const [resumenBiblioteca, setResumenBiblioteca] = useState("");
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [mejorandoIA, setMejorandoIA] = useState(false);

  // 1. Carga de lugares en tiempo real
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "ubicaciones"),
      where("userId", "==", auth.currentUser.uid),
    );
    return onSnapshot(q, (snap) => {
      setMisPuntos(snap.docs.map((d) => ({ ...d.data(), idDoc: d.id })));
    });
  }, []);

  // 2. Carga de amigos (Funcionalidad Social)
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(
      doc(db, "users", auth.currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const friends = docSnap.data().friends || [];
          if (friends.length > 0) {
            const q = query(
              collection(db, "users"),
              where(documentId(), "in", friends.slice(0, 10)),
            );
            getDocs(q).then((snap) =>
              setAmigosList(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
            );
          } else setAmigosList([]);
        }
      },
    );
    return () => unsub();
  }, []);

  // 3. Filtrado y Ordenamiento Optimizado
  const puntosFiltrados = useMemo(() => {
    let res = misPuntos.filter(
      (p) =>
        (p.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.hashtags?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (sortBy === "favoritos" ? p.destacado : true),
    );
    if (sortBy === "nombre")
      return res.sort((a, b) => a.titulo.localeCompare(b.titulo));
    if (sortBy === "zona")
      return res.sort((a, b) =>
        (a.clasificacion || "").localeCompare(b.clasificacion || ""),
      );
    return res.sort(
      (a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0),
    );
  }, [misPuntos, searchQuery, sortBy]);

  // 4. Lógica de IA (Gemini)
  const generarResumenGeneral = async () => {
    if (misPuntos.length === 0)
      return Alert.alert("IA", "No tienes lugares guardados.");
    setCargandoResumen(true);
    try {
      const titulos = misPuntos.map((p) => p.titulo).join(", ");
      const result = await modelIA.generateContent(
        `Analiza mis lugares: "${titulos}". Resumen breve de explorador (2 líneas).`,
      );
      setResumenBiblioteca(result.response.text());
    } finally {
      setCargandoResumen(false);
    }
  };

  // 5. Compartir al Chat (Lógica chatId)
  const reenviarAlChat = async (amigo: any, lugar: any) => {
    if (!lugar || !auth.currentUser) return;
    const chatId = [auth.currentUser.uid, amigo.uid].sort().join("_");
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: `📍 ¡Mira este lugar increíble: ${lugar.titulo}!`,
        senderId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        isLocationShare: true,
        lugarDetails: lugar,
      });
      Alert.alert("¡Enviado!", `Ubicación compartida con ${amigo.username}.`);
    } catch {
      Alert.alert("Error", "No se pudo compartir.");
    }
  };

  // 6. Navegación GPS
  const trazarRuta = (item: any) => {
    const label = encodeURIComponent(item.titulo);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${item.lat},${item.lng}`,
      android: `geo:${item.lat},${item.lng}?q=${item.lat},${item.lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  return {
    puntosFiltrados,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    amigosList,
    resumenBiblioteca,
    setResumenBiblioteca,
    cargandoResumen,
    generarResumenGeneral,
    reenviarAlChat,
    trazarRuta,
    mejorandoIA,
    setMejorandoIA,
    cargando,
    setCargando,
    modelIA,
  };
};
