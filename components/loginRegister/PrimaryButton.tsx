import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
} from "react-native";

interface Props extends TouchableOpacityProps {
  title: string;
}

export const PrimaryButton = ({ title, ...props }: Props) => {
  return (
    <TouchableOpacity style={styles.boton} {...props}>
      <Text style={styles.botonTexto}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  boton: {
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
