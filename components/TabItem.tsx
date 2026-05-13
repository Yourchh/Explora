import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TabItemProps {
  isFocused: boolean;
  onPress: () => void;
  iconName: any;
  label: string;
}

export const TabItem = ({
  isFocused,
  onPress,
  iconName,
  label,
}: TabItemProps) => {
  // Colores nativos de iOS
  const color = isFocused ? "#007AFF" : "#8E8E93";
  const name = isFocused ? iconName : `${iconName}-outline`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={1} // Evita el parpadeo gris de Android/iOS
      style={styles.tabButton}
    >
      <View style={styles.tabItem}>
        <Ionicons name={name} size={24} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabItem: { alignItems: "center", justifyContent: "center", paddingTop: 5 },
  tabLabel: { fontSize: 10, fontWeight: "500", marginTop: 3 },
});
