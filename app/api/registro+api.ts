export async function POST(request: Request) {
  try {
    const { historial } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!historial || historial.length === 0) {
      return Response.json({
        resumen: "Aún no hay suficientes datos para un resumen.",
      });
    }

    const textoHistorial = historial
      .map((h: any) => `- ${h.nota} (${h.clasificacion})`)
      .join("\n");

    const prompt = `Analiza este historial de ubicaciones de la semana y genera un resumen motivacional de 3 frases:
    ${textoHistorial}
    Destaca qué tipo de actividades prefiere el usuario y dale un consejo para explorar su ciudad.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    const aiData = await response.json();
    const resumen = aiData.candidates[0].content.parts[0].text;

    return Response.json({ resumen });
  } catch (error) {
    return Response.json(
      { resumen: "No pudimos generar tu resumen en este momento." },
      { status: 500 },
    );
  }
}
