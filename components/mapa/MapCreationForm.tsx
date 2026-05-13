import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface MapCreationFormProps {
  titulo: string;
  setTitulo: (val: string) => void;
  descripcion: string;
  setDescripcion: (val: string) => void;
  hashtags: string;
  setHashtags: (val: string) => void;
  esPublico: boolean;
  setEsPublico: (val: boolean) => void;
  imagenes: string[];
  ubicacion: any;
  cargando: boolean;
  generandoIA: boolean;
  onClose: () => void;
  onManageCoords: () => void;
  onAddImage: (desdeCamara: boolean, indexReemplazo?: number) => void;
  onManageImage: (idx: number) => void;
  onAutoFill: () => void;
  onSubmit: () => void;
}

export default function MapCreationForm({
  titulo,
  setTitulo,
  descripcion,
  setDescripcion,
  hashtags,
  setHashtags,
  esPublico,
  setEsPublico,
  imagenes,
  ubicacion,
  cargando,
  generandoIA,
  onClose,
  onManageCoords,
  onAddImage,
  onManageImage,
  onAutoFill,
  onSubmit,
}: MapCreationFormProps) {
  const formatearHashtags = (texto: string) => {
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
  };

  return (
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
                onPress={onManageCoords}
                style={styles.coordsBadge}
              >
                <Ionicons name="location" size={12} color="#000" />
                <Text style={styles.coordsText}>
                  {ubicacion
                    ? `${ubicacion.latitude.toFixed(4)}, ${ubicacion.longitude.toFixed(4)}`
                    : "Ubicando..."}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBadge}>
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
              onPress={() => onAddImage(false)}
            >
              <Ionicons name="add" size={32} color="#000" />
            </TouchableOpacity>
            {imagenes.map((uri, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.imageWrapper}
                onPress={() => onManageImage(idx)}
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
            <TouchableOpacity
              style={styles.aiButton}
              onPress={onAutoFill}
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
              style={[styles.textInputApple, { height: 75, paddingTop: 14 }]}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              placeholderTextColor="#8E8E93"
            />
            <TextInput
              placeholder="#etiquetas"
              style={styles.textInputApple}
              value={hashtags}
              onChangeText={formatearHashtags}
              placeholderTextColor="#8E8E93"
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.controlsGroup}>
              <TouchableOpacity
                onPress={() => onAddImage(true)}
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
              onPress={onSubmit}
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
  );
}

const styles = StyleSheet.create({
  formPosition: {
    position: "absolute",
    bottom: 110,
    width: "92%",
    alignSelf: "center",
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 15,
    borderRadius: 38,
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
