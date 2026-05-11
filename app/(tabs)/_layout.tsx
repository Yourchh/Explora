import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.blurWrapper}>
        <BlurView tint="light" intensity={85} style={StyleSheet.absoluteFill} />
        <View style={styles.tabBarContent}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented)
                navigation.navigate(route.name);
            };

            let iconName: any = "help";
            let label = "";
            // 💡 Agregamos la lógica para el nuevo botón de búsqueda
            if (route.name === "mapa") {
              iconName = "map";
              label = "Mapa";
            } else if (route.name === "buscar") {
              iconName = "search";
              label = "Explorar";
            } else if (route.name === "biblioteca") {
              iconName = "bookmark";
              label = "Guardados";
            } else if (route.name === "comunidad") {
              iconName = "people";
              label = "Social";
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
              >
                <View
                  style={[styles.tabItem, isFocused && styles.tabItemActive]}
                >
                  <Ionicons
                    name={isFocused ? iconName : `${iconName}-outline`}
                    size={18}
                    color={isFocused ? "#000" : "#8E8E93"}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? "#000" : "#8E8E93" },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="mapa" />
      <Tabs.Screen name="buscar" />
      <Tabs.Screen name="biblioteca" />
      <Tabs.Screen name="comunidad" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  blurWrapper: { flex: 1, borderRadius: 32, overflow: "hidden" },
  tabBarContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  tabButton: { flex: 1, alignItems: "center" },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    width: 65,
    borderRadius: 20,
  },
  tabItemActive: { backgroundColor: "rgba(0, 0, 0, 0.06)" },
  tabLabel: { fontSize: 9, fontWeight: "700", marginTop: 2 },
});
