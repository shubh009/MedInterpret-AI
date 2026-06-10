const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "google/gemini-2.5-flash";

/**
 * Sends patient text to OpenRouter to interpret Kannada speech to medical English.
 * @param {string} patientText - Kannada speech transcription
 * @returns {Promise<{languageDetected: string, symptoms: string[], doctorExplanation: string}>}
 */
export async function interpretPatientSpeech(patientText, patientLanguage = "Kannada") {
  if (!patientText || !patientText.trim()) {
    throw new Error("Patient text is empty");
  }

  const systemPrompt = `You are a medical interpreter assistant.

The patient may speak in ${patientLanguage} or informal local language.

Your task:
1. Understand the patient's symptoms.
2. Convert informal speech into medically understandable English.
3. Keep explanations concise and clinical.
4. Do not diagnose diseases or suggest medicines.
5. Focus only on symptoms and complaints.

Return ONLY valid JSON in this format:
{
  "languageDetected": "Name of language (e.g. ${patientLanguage})",
  "symptoms": ["symptom1", "symptom2"],
  "doctorExplanation": "Clinical description of the complaint"
}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Medical AI Interpreter"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: patientText }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        // Enforce JSON output if supported
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Clean markdown code block wraps (```json ... ```) if Gemini returns it
    let cleanJson = content;
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const result = JSON.parse(cleanJson);
    
    // Ensure all required fields exist
    return {
      languageDetected: result.languageDetected || "Kannada",
      symptoms: Array.isArray(result.symptoms) ? result.symptoms : [],
      doctorExplanation: result.doctorExplanation || "Patient reported symptoms."
    };
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    throw error;
  }
}

/**
 * Translates clinical explanations into Hindi or Marathi on the fly.
 * @param {string} text - English clinical explanation
 * @param {string} targetLanguage - Target language name (e.g. Hindi, Marathi)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLanguage) {
  if (!text || !text.trim()) return "";
  
  const systemPrompt = `You are a professional medical translator.
Your task is to translate the clinical explanation into the requested target language (${targetLanguage}).
Maintain the clinical and professional medical tone. Do not add any conversational remarks or explanations. Output ONLY the translated text.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Medical AI Interpreter"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
}
