 import React from "react";
import { View, TextInput, FlatList, Pressable, Text, StyleSheet } from "react-native";

export default function SearchBox({
  placeholder,
  value,
  onChangeText,
  results,
  onSelect,
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.input}
      />

      {results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={results}
            keyExtractor={(item) => String(item.place_id)}
            renderItem={({ item }) => (
              <Pressable style={styles.item} onPress={() => onSelect(item)}>
                <Text numberOfLines={2} style={styles.itemText}>
                  {item.display_name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10, zIndex: 50 },
  input: {
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 15,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    maxHeight: 180,
    overflow: "hidden",
  },
  item: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f1f1" },
  itemText: { fontSize: 13, color: "#111" },
});