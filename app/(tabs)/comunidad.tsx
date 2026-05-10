import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { db } from "../../firebaseConfig";

export default function Comunidad() {
  const [lugaresPublicos, setLugaresPublicos] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "ubicaciones"),
      where("esPublico", "==", true),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLugaresPublicos(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={lugaresPublicos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardSocial}>
            <Text style={styles.usuario}>Explorador anónimo</Text>
            <Text style={styles.emoji}>{item.clasificacion.split(" ")[0]}</Text>
            <Text style={styles.notaSocial}>{item.nota}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  cardSocial: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  usuario: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 10,
  },
  emoji: { fontSize: 24, marginBottom: 10 },
  notaSocial: { fontSize: 16, color: "#1C1C1E" },
});
