import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: { borderTopWidth: 0, elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="mapa"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => (
            <Ionicons name="map-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="biblioteca"
        options={{
          title: "Mis Lugares",
          tabBarIcon: ({ color }) => (
            <Ionicons name="bookmark-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="comunidad"
        options={{
          title: "Comunidad",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
