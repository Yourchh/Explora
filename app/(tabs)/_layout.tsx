import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { TabItem } from "../../components/TabItem";

// Configuración centralizada de las pestañas
const TAB_CONFIG: Record<string, { icon: string; label: string }> = {
  mapa: { icon: "map", label: "Mapa" },
  buscar: { icon: "search", label: "Explorar" },
  biblioteca: { icon: "bookmark", label: "Guardados" },
  comunidad: { icon: "people", label: "Social" },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.blurWrapper}>
        <BlurView tint="light" intensity={85} style={StyleSheet.absoluteFill} />
        <View style={styles.tabBarContent}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const config = TAB_CONFIG[route.name] || {
              icon: "help",
              label: "",
            };

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabItem
                key={route.key}
                onPress={onPress}
                isFocused={isFocused}
                iconName={config.icon}
                label={config.label}
              />
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
});
