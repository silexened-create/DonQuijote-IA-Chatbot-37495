/**
 * voices.js
 * -----------------------------------------------
 * Script para listar todas las voces disponibles
 * en SpeechSynthesis y permitir probarlas.
 *
 * Uso:
 * 1. Incluye este archivo en tu index.html
 * 2. Abre la consola para ver la lista de voces
 * 3. Usa los botones generados para probar cada voz
 * -----------------------------------------------
 */

window.addEventListener("DOMContentLoaded", () => {
    const voiceContainer = document.createElement("div");
    voiceContainer.style.padding = "20px";
    voiceContainer.style.background = "#f0f0f0";
    voiceContainer.style.border = "1px solid #ccc";
    voiceContainer.style.margin = "20px";
    voiceContainer.style.borderRadius = "8px";

    const title = document.createElement("h2");
    title.textContent = "Prueba de Voces (SpeechSynthesis)";
    voiceContainer.appendChild(title);

    const info = document.createElement("p");
    info.textContent = "Haz clic en un botón para escuchar cómo suena cada voz.";
    voiceContainer.appendChild(info);

    document.body.prepend(voiceContainer);

    function cargarVoces() {
        const voices = speechSynthesis.getVoices();
        console.log("Voces disponibles:", voices);

        voices.forEach((voice, index) => {
            const btn = document.createElement("button");
            btn.textContent = `${index}: ${voice.name} (${voice.lang})`;
            btn.style.display = "block";
            btn.style.margin = "6px 0";
            btn.style.padding = "6px 10px";

            btn.addEventListener("click", () => {
                const utter = new SpeechSynthesisUtterance(
                    `Hola, soy la voz ${voice.name}. Puedes elegirme para tu proyecto del Quijote.`
                );
                utter.voice = voice;
                utter.lang = voice.lang;
                utter.rate = 1;
                utter.pitch = 1;
                speechSynthesis.speak(utter);
            });

            voiceContainer.appendChild(btn);
        });
    }

    // Algunos navegadores cargan las voces de forma asíncrona
    speechSynthesis.onvoiceschanged = cargarVoces;

    // Intento inicial
    cargarVoces();
});