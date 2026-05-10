import { Ionicons } from "@expo/vector-icons";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { auth, db } from "../../firebaseConfig";

export default function Biblioteca() {
  const [misLugares, setMisLugares] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "ubicaciones"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("fecha", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMisLugares(data);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitulo}>
          {item.clasificacion || "📍 Lugar"}
        </Text>
        <Text style={styles.cardNota}>{item.nota}</Text>
      </View>
      {item.esPublico && (
        <Ionicons name="globe-outline" size={16} color="#8E8E93" />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={misLugares}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <Text style={styles.vacio}>Aún no has guardado lugares.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  card: {
    flexDirection: "row",
    backgroundColor: "#F2F2F7",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  cardTitulo: { fontSize: 17, fontWeight: "600", marginBottom: 4 },
  cardNota: { fontSize: 14, color: "#3A3A3C" },
  vacio: { textAlign: "center", marginTop: 50, color: "#8E8E93" },
});
