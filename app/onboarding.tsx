import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";

// Diapositivas simplificadas (sin texto)
const slides = [
  {
    id: "1",
    image: require("../assets/images/onboarding/step1.png"),
  },
  {
    id: "2",
    image: require("../assets/images/onboarding/step2.png"),
  },
  {
    id: "3",
    image: require("../assets/images/onboarding/step3.png"),
  },
  {
    id: "4",
    image: require("../assets/images/onboarding/step4.png"),
  },
  {
    id: "5",
    image: require("../assets/images/onboarding/step5.png"),
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = async () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@has_seen_onboarding", "true");
      router.replace("/(tabs)/mapa");
    } catch (error) {
      console.log("Error guardando estado de onboarding:", error);
      router.replace("/(tabs)/mapa");
    }
  };

  const Paginator = ({
    data,
    scrollX,
  }: {
    data: any[];
    scrollX: Animated.Value;
  }) => {
    return (
      <View style={styles.paginatorContainer}>
        {data.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: "clamp",
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              style={[styles.dot, { width: dotWidth, opacity }]}
              key={i.toString()}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Carrusel de imágenes a pantalla completa */}
      <FlatList
        data={slides}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
          },
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />

      {/* Botón Skip posicionado de forma absoluta arriba */}
      <View style={styles.headerAbsolute}>
        <TouchableOpacity
          onPress={finishOnboarding}
          activeOpacity={0.6}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Controles posicionados de forma absoluta abajo */}
      <View style={styles.footerAbsolute}>
        <Paginator data={slides} scrollX={scrollX} />

        <TouchableOpacity
          style={styles.button}
          onPress={scrollToNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? "Comenzar" : "Siguiente"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  slide: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  headerAbsolute: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 10,
  },
  skipButton: {
    // Fondo semitransparente para que el texto sea legible sin importar la imagen de fondo
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "600",
  },
  footerAbsolute: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    zIndex: 10,
  },
  paginatorContainer: {
    flexDirection: "row",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000000",
    marginHorizontal: 4,
  },
  button: {
    backgroundColor: "#000000",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    // Sombra sutil para separar el botón de la imagen de fondo
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
