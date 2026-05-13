import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.92;

interface MapDetailCardProps {
  puntoSeleccionado: any;
  listaResenas: any[];
  promedioCalificacion: string | number;
  currentUserId: string | undefined;
  onClose: () => void;
}

export default function MapDetailCard({
  puntoSeleccionado,
  listaResenas,
  promedioCalificacion,
  currentUserId,
  onClose,
}: MapDetailCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<any>(null);

  // AUTO-CARRUSEL
  useEffect(() => {
    if (puntoSeleccionado?.fotos?.length > 1) {
      timerRef.current = setInterval(() => {
        setActiveImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % puntoSeleccionado.fotos.length;
          scrollRef.current?.scrollTo({
            x: nextIndex * CARD_WIDTH,
            animated: true,
          });
          return nextIndex;
        });
      }, 3000);
    }
    return () => clearInterval(timerRef.current);
  }, [puntoSeleccionado]);

  if (!puntoSeleccionado) return null;

  return (
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
                  <Image key={idx} source={{ uri }} style={styles.heroImage} />
                ))
              ) : (
                <View style={[styles.heroImage, styles.imgPlaceholder]}>
                  <Ionicons name="image-outline" size={50} color="#ccc" />
                </View>
              )}
            </ScrollView>
            <TouchableOpacity onPress={onClose} style={styles.closeOnHero}>
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
                {puntoSeleccionado.userId === currentUserId
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
                  <Text style={styles.ratingValue}>{promedioCalificacion}</Text>
                  <Text style={styles.ratingCount}>
                    ({listaResenas.length} reseñas)
                  </Text>
                </View>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>PUNTO</Text>
              </View>
            </View>

            <Text style={styles.detailTags}>{puntoSeleccionado.hashtags}</Text>
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
                      <Text style={styles.resenaValue}>{r.calificacion}</Text>
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
  );
}

const styles = StyleSheet.create({
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
});
