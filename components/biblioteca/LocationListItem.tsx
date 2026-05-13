import { Ionicons } from "@expo/vector-icons";
import React, { forwardRef } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

interface LocationListItemProps {
  item: any;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeableOpen: () => void;
}

const LocationListItem = forwardRef<Swipeable, LocationListItemProps>(
  ({ item, onPress, onLongPress, onEdit, onDelete, onSwipeableOpen }, ref) => {
    const renderRightActions = () => (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeBtn, { backgroundColor: "#007AFF" }]}
          onPress={onEdit}
        >
          <Ionicons name="pencil" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeBtn, { backgroundColor: "#FF3B30" }]}
          onPress={onDelete}
        >
          <Ionicons name="trash" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable
        ref={ref}
        renderRightActions={renderRightActions}
        onSwipeableOpen={onSwipeableOpen}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={onPress}
          onLongPress={onLongPress}
        >
          <View style={styles.thumbContainer}>
            <Image source={{ uri: item.fotos?.[0] }} style={styles.thumb} />
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
    );
  },
);

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
  swipeActions: { flexDirection: "row", width: 150, marginBottom: 14 },
  swipeBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    marginLeft: 10,
  },
});

LocationListItem.displayName = "LocationListItem";

export default LocationListItem;
