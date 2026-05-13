import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ExploreListItemProps {
  item: any;
  currentUserId: string | undefined;
  onPress: () => void;
}

export default function ExploreListItem({
  item,
  currentUserId,
  onPress,
}: ExploreListItemProps) {
  const autor =
    item.userId === currentUserId ? "Mí (Tú)" : item.usuario || "Explorador";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
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
}

const styles = StyleSheet.create({
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
});
