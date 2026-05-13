import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface LibraryHeaderProps {
  resumenBiblioteca: string;
  cargandoResumen: boolean;
  searchQuery: string;
  sortBy: "todos" | "favoritos" | "recientes" | "nombre" | "zona";
  onClearResumen: () => void;
  onGenerateResumen: () => void;
  setSearchQuery: (text: string) => void;
  setSortBy: (
    sort: "todos" | "favoritos" | "recientes" | "nombre" | "zona",
  ) => void;
}

export default function LibraryHeader({
  resumenBiblioteca,
  cargandoResumen,
  searchQuery,
  sortBy,
  onClearResumen,
  onGenerateResumen,
  setSearchQuery,
  setSortBy,
}: LibraryHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      {/* 1. CAPA AL FONDO: Color sólido.
          Solo baja hasta cierta altura (ej. 130px) para tapar las imágenes 
          que hacen scroll por la zona del notch y el buscador. */}
      <View style={styles.solidBackground} />

      {/* 2. CAPA EN MEDIO: BlurView. 
          Al estar escrita después, se coloca encima de la capa sólida y cubre todo el header. */}
      <BlurView intensity={90} tint="light" style={styles.blurLayer}>
        {/* 3. CONTENIDO: Todo lo visual (buscador, chips) va adentro del BlurView */}

        <View style={styles.topSection}>
          {resumenBiblioteca ? (
            <View style={styles.aiResumenBox}>
              <Text style={styles.aiResumenText} numberOfLines={2}>
                {resumenBiblioteca}
              </Text>
              <TouchableOpacity onPress={onClearResumen}>
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
              />
            </View>
            <TouchableOpacity
              onPress={onGenerateResumen}
              style={styles.aiCircle}
            >
              {cargandoResumen ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="sparkles" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Zona de los Chips */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterBar}
          >
            {["todos", "favoritos", "recientes", "nombre", "zona"].map((s) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100, // Asegura que todo el header flote sobre la lista
  },
  solidBackground: {
    // Al ser absolute, se queda pegado al fondo del headerContainer
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // Define hasta dónde quieres que llegue el color sólido.
    // 130px suele cubrir la Dynamic Island y la barra de búsqueda en iOS.
    height: Platform.OS === "ios" ? 130 : 90,
    backgroundColor: "#F4F4F6", // Fondo sólido (puedes cambiarlo a #FFFFFF)
  },
  blurLayer: {
    // Esto hace que el BlurView ocupe todo el espacio de su contenedor y dibuje el cristal
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  topSection: {
    paddingTop: Platform.OS === "ios" ? 80 : 45,
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  chipsContainer: {
    paddingTop: 10,
    marginLeft: 10,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500" },
  filterBar: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  chipActive: { backgroundColor: "#000" },
  chipText: { fontSize: 11, fontWeight: "800", color: "#8E8E93" },
  chipTextActive: { color: "#FFF" },
});
