import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imagenBase64 } = body;

    if (!imagenBase64) {
      return Response.json({ error: "No se recibió imagen" }, { status: 400 });
    }

    // Inicializamos Gemini con tu llave secreta
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Le damos instrucciones estrictas a la IA
    const prompt = `
      Eres un asistente experto en turismo y geografía.
      Analiza la imagen adjunta y devuelve ÚNICAMENTE un objeto JSON válido con estas 3 claves exactas:
      - "titulo": Un nombre corto y atractivo para el lugar (máximo 4 palabras).
      - "descripcion": Una descripción poética o atractiva de lo que hace especial a este lugar basándote en lo que ves.
      - "hashtags": 3 etiquetas relevantes separadas por espacios (ejemplo: #naturaleza #cascada #paz).
      
      No incluyas formato Markdown (como \`\`\`json), solo el texto crudo del objeto JSON.
    `;

    // Enviamos la imagen y el prompt
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imagenBase64,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const text = result.response.text();

    // Limpiamos la respuesta por si la IA le pone formato markdown por accidente
    const cleanJson = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Convertimos el texto a un objeto JavaScript
    const data = JSON.parse(cleanJson);

    // Se lo devolvemos a tu iPhone
    return Response.json(data);
  } catch (error) {
    console.error("Error en Gemini:", error);
    return Response.json(
      { error: "Fallo al procesar con IA" },
      { status: 500 },
    );
  }
}
