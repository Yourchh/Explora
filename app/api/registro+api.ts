export async function POST(request: Request) {
  const { titulo, descripcion } = await request.json();

  const prompt = `Actúa como un experto en geografía y turismo. Analiza el lugar "${titulo}" con la descripción "${descripcion}". 
  Responde ÚNICAMENTE un JSON con este formato: {"categoriaIA": "emoji + categoría corta"}. 
  Ejemplo: "🍽️ Restaurante Local" o "🌲 Parque Natural".`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=TU_API_KEY_AQUI`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    const data = await res.json();
    const textoRespuesta = data.candidates[0].content.parts[0].text;
    return Response.json(JSON.parse(textoRespuesta));
  } catch (e) {
    return Response.json({ categoriaIA: "📍 Punto Registrado" });
  }
}
