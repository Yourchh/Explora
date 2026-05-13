import React from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

export const CustomInput = (props: TextInputProps) => {
  return (
    <TextInput style={styles.input} placeholderTextColor="#A9A9AC" {...props} />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#F2F2F7",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    color: "#000",
  },
});
