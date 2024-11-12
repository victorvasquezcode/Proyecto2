const express = require("express");
const router = express.Router();
const Exercise = require("../models/Exercise"); // Modelo de la base de datos

function generateValidationPrompt(
  problemDescription,
  userCode,
  expectedSolution
) {
  return `
    Eres un evaluador de código. Evalúa si el siguiente código del usuario resuelve correctamente el problema planteado.

    Problema:
    ${problemDescription}

    Código del Usuario:
    ${userCode}

    Solución Esperada:
    ${expectedSolution}

    Devuelve un JSON con el formato:
    {
        "isCorrect": true/false,
        "feedback": "Texto explicando si la solución es correcta o no."
    }
  `;
}

router.post("/validate-answer", async (req, res) => {
  const { code, userCode } = req.body;

  if (!code || !userCode) {
    return res.status(400).json({
      success: false,
      error: "Faltan campos requeridos: code o userCode.",
    });
  }

  try {
    // Buscar el ejercicio en la base de datos usando el código único
    const exercise = await Exercise.findOne({ code });
    if (!exercise) {
      return res.status(404).json({
        success: false,
        error: "No se encontró un ejercicio con el código proporcionado.",
      });
    }

    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: generateValidationPrompt(
          exercise.description,
          userCode,
          exercise.solution
        ),
        format: "json",
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en Ollama: ${response.statusText}`);
    }

    const { response: validationJson } = await response.json();
    const validationResult = JSON.parse(validationJson);

    res.json({ success: true, validation: validationResult });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
