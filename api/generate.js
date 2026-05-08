export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  const { myth } = req.body;
  if (!myth) {
    return res.status(400).json({ error: "Missing myth in request body" });
  }

  const prompt = `You generate entries for "Capitalist Myths of the Day," a critical theory app exposing ideological assumptions that sustain capitalist systems.

Myth: "${myth.title}"
Tagline: "${myth.tagline}"
Categories: ${myth.cats.join(", ")}
Core Claim: "${myth.claim}"
Ideological Function: "${myth.fn}"

Respond with ONLY a valid JSON object, no markdown or extra text:
{
"s1": "Opening Reframe — 2-3 sentences that confront and invert the myth directly",
"s2": "Structural or Ideological Function — 2-3 sentences on how this myth serves existing power",
"s3": "Historical or Cultural Origin — 2-3 sentences with specific historical figures/events, use inline superscripts ¹²³",
"s4": "Material Consequences — 2-3 sentences on concrete harms this myth enables",
"s5": "Interconnection With Other Myths — 1-2 sentences naming specific related myths",
"s6": "Final Reversal — exactly one punchy sentence that exposes the myth",
"notes": ["Chicago-style citation 1","Chicago-style citation 2","Chicago-style citation 3","Chicago-style citation 4","Chicago-style citation 5"]
}`;

  try {
    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1000,
        },
      }),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: errText });
    }

    const data = await upstream.json();
    const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
    if (!txt) {
      return res.status(502).json({
        error: "Gemini response did not include generated text",
        details: data.promptFeedback || "No prompt feedback provided",
      });
    }
    const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
