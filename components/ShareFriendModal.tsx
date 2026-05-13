import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ShareFriendModalProps {
  visible: boolean;
  amigosList: any[];
  onReenviar: (amigo: any) => void;
  onClose: () => void;
}

export default function ShareFriendModal({
  visible,
  amigosList,
  onReenviar,
  onClose,
}: ShareFriendModalProps) {
  // 💡 Si no es visible, no renderizamos nada
  if (!visible) return null;

  return (
    <View style={styles.modalBackdropCenter}>
      <View style={styles.sendChatCard}>
        <Text
          style={[
            styles.sheetSectionTitle,
            { textAlign: "center", marginBottom: 5 },
          ]}
        >
          Recomendar a un amigo
        </Text>
        {amigosList.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no tienes amigos. Ve a Comunidad para agregar conexiones.
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 300, marginTop: 15 }}>
            {amigosList.map((amigo) => (
              <TouchableOpacity
                key={amigo.uid}
                style={styles.friendCardMini}
                onPress={() => onReenviar(amigo)}
              >
                <Image
                  source={{
                    uri: amigo.foto || "https://via.placeholder.com/150",
                  }}
                  style={styles.friendAvatarMini}
                />
                <Text style={styles.friendNameMini}>{amigo.username}</Text>
                <View style={styles.sendIconMini}>
                  <Ionicons name="paper-plane" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity style={styles.cancelBtnFull} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdropCenter: {
    ...StyleSheet.absoluteFillObject, // 💡 Esto hace que cubra toda la pantalla
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
    zIndex: 9999, // 💡 Aseguramos que esté hasta el frente
    elevation: 9999,
  },
  sendChatCard: { backgroundColor: "#FFF", borderRadius: 35, padding: 30 },
  sheetSectionTitle: { fontSize: 20, fontWeight: "800", color: "#000" },
  emptyText: {
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },
  friendCardMini: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  friendAvatarMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 15,
    backgroundColor: "#E5E5EA",
  },
  friendNameMini: {
    flex: 1,
    fontWeight: "800",
    fontSize: 17,
    color: "#1C1C1E",
  },
  sendIconMini: {
    backgroundColor: "#007AFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnFull: {
    marginTop: 25,
    padding: 18,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    alignItems: "center",
  },
  cancelBtnText: { fontWeight: "800", color: "#8E8E93", fontSize: 16 },
});
