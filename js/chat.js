/**
 * chat.js — Versión Amigable y Optimizada
 * ---------------------------------------------------------------------------
 * Gestiona la conversación y la memoria de Don Quijote.
 */

import { addMsg, showSpinner, hideSpinner } from './ui.js';
import { speak } from './tts.js';

/* --- CONFIGURACIÓN Y MEMORIA --- */
export let conversationHistory = [];
export let selectedModel = "trinity";
const BACKEND_URL = "https://don-quijote-backend.onrender.com/DonQuijoteChatbot.php";

/* --- FUNCIÓN PRINCIPAL: Enviar Mensaje --- */
export async function enviarMensaje(texto) {
    const mensajeLimpio = texto.trim();
    if (!mensajeLimpio) return;

    // 1. Mostrar en interfaz y guardar en memoria
    addMsg("Tú", mensajeLimpio);
    conversationHistory.push({ role: "user", content: mensajeLimpio });

    showSpinner();

    try {
        // 2. Llamada al Hidalgo (Backend)
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: mensajeLimpio,
                history: conversationHistory,
                model: selectedModel
            })
        });

        if (!response.ok) throw new Error(`Error de red: ${response.status}`);

        const data = await response.json();

        if (data && data.reply) {
            const respuestaQuijote = data.reply;

            // --- ESTE ES EL CAMBIO QUE DEBES PONER ---
            if (data.metrics) {
                const { payload_bytes, message_count, estimated_tokens } = data.metrics;

                // 1. Actualiza la etiqueta "Esperando conexión..." por el estado real
                const metricsEl = document.getElementById("technical-metrics");
                if (metricsEl) {
                    metricsEl.textContent = `● Sistema Conectado | Tráfico: ${payload_bytes} bytes | Contexto: ${message_count} msg`;
                    metricsEl.style.color = "#28a745"; // Lo pone en verde éxito
                }

                // 2. Actualiza los contadores globales en el footer
                const statPayload = document.getElementById("stat-payload");
                const statTokens = document.getElementById("stat-tokens");
                const statMessages = document.getElementById("stat-messages");

                if (statPayload) statPayload.textContent = `${payload_bytes}b`;
                if (statTokens) statTokens.textContent = estimated_tokens;
                if (statMessages) statMessages.textContent = message_count;
            }

            addMsg("Quijote", respuestaQuijote);
            conversationHistory.push({ role: "assistant", content: respuestaQuijote });
            speak(respuestaQuijote);
            
            // ... resto de tu código de resumen ...

            // 5. Gestión inteligente de memoria
            // Umbral: Más de 10 mensajes o más de 2000 caracteres en el historial
            const totalChars = conversationHistory.reduce((acc, m) => acc + m.content.length, 0);
            if (conversationHistory.length >= 10 || totalChars > 2000) {
                await resumirHistorial();
            }
        } else {
            throw new Error("Respuesta del servidor incompleta.");
        }

    } catch (err) {
        console.error("🔥 Error en la comunicación:", err);
        addMsg("Error", "¡Pardiez! Un encantador ha cortado nuestra comunicación o el mensaje era demasiado largo.");

        // Recuperación: Si el error es por tamaño, intentamos resumir preventivamente
        if (conversationHistory.length > 5) {
            console.warn("Intentando recuperación de historial saturado...");
            await resumirHistorial();
        }
    } finally {
        hideSpinner();
    }
}

/* --- RESUMEN DE AVENTURAS (Optimización de memoria) --- */
async function resumirHistorial() {
    console.log("📜 Optimizando la memoria del Hidalgo...");
    try {
        // Guardamos los últimos 3 mensajes para mantener la fluidez inmediata
        const mensajesRecientes = conversationHistory.slice(-3);
        const mensajesParaResumir = conversationHistory.slice(0, -3);

        if (mensajesParaResumir.length === 0) return;

        const textoParaResumir = mensajesParaResumir
            .map(m => `${m.role === 'user' ? 'Escudero' : 'Quijote'}: ${m.content}`)
            .join("\n");

        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Resume nuestras aventuras pasadas.",
                history: [{ role: "user", content: textoParaResumir }],
                model: selectedModel,
                isSummary: true
            })
        });

        const data = await response.json();

        if (data.reply) {
            // Reconstruimos el historial: Resumen + Ultimos 3 mensajes
            conversationHistory = [
                { role: "assistant", content: "[Memoria de mis andanzas]: " + data.reply },
                ...mensajesRecientes
            ];
            console.log("✅ Historial optimizado con éxito.");
        }
    } catch (err) {
        console.warn("No se pudo resumir el historial, truncando por seguridad.", err);
        // Fallback: Si falla la IA al resumir, simplemente truncamos
        conversationHistory = conversationHistory.slice(-5);
    }
}

/* --- GESTIÓN DE EVENTOS (Controles) --- */
const inputChat = document.getElementById("chat-input");
const btnEnviar = document.getElementById("send-btn");

// Click en el botón
btnEnviar.addEventListener("click", () => {
    enviarMensaje(inputChat.value);
    inputChat.value = "";
});

// Presionar tecla Enter
inputChat.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); // Evita recargas accidentales
        enviarMensaje(inputChat.value);
        inputChat.value = "";
    }

});

