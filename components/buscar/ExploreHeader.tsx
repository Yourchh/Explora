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

interface ExploreHeaderProps {
  search: string;
  setSearch: (text: string) => void;
  cargando: boolean;
  cargarLugares: () => void;
  filtroActivo: string;
  setFiltroActivo: (filtro: string) => void;
}

export default function ExploreHeader({
  search,
  setSearch,
  cargando,
  cargarLugares,
  filtroActivo,
  setFiltroActivo,
}: ExploreHeaderProps) {
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
    <View style={styles.headerContainer}>
      {/* 1. CAPA AL FONDO: Color sólido para ocultar el scroll detrás del notch/buscador */}
      <View style={styles.solidBackground} />

      {/* 2. CAPA EN MEDIO: BlurView que cubre todo el header */}
      <BlurView intensity={90} tint="light" style={styles.blurLayer}>
        {/* SECCIÓN SUPERIOR: Buscador y botón de recarga */}
        <View style={styles.topSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={18}
                color="#8E8E93"
                style={{ marginRight: 8 }}
              />
              <TextInput
                placeholder="Buscar por nombre, etiquetas..."
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
        </View>

        {/* SECCIÓN INFERIOR: Chips (Filtros) */}
        <View style={styles.chipsContainer}>
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
    zIndex: 100,
  },
  solidBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // Altura fija para cubrir el buscador y la zona del notch
    height: Platform.OS === "ios" ? 130 : 90,
    backgroundColor: "#F4F4F6", // Fondo sólido
  },
  blurLayer: {
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500" },
  reloadBtnInline: {
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  filterScroll: { gap: 0, alignItems: "center" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)", // Mejor contraste con el Blur
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  chipActive: { backgroundColor: "#000" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#8E8E93" },
  chipTextActive: { color: "#FFF" },
});
