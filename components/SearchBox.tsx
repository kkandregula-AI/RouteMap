import React from "react";
import { View, TextInput, FlatList, Pressable, Text } from "react-native";

export default function SearchBox({
  placeholder,
  results,
  onSearch,
  onSelect,
}) {
  return (
    <View>
      <TextInput
        placeholder={placeholder}
        onChangeText={onSearch}
        style={{
          backgroundColor: "#f2f2f2",
          padding: 10,
          borderRadius: 12,
        }}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.place_id)}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item)}>
            <Text style={{ padding: 8 }}>{item.display_name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}