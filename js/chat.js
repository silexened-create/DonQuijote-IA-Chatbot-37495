/**
 * chat.js — Versión Dual Snicket/Quijote
 * Gestiona la comunicación con los dos backends especializados.
 */

import { addMsg, showSpinner, hideSpinner } from './ui.js';
import { speak } from './tts.js';

/* --- DETECCIÓN DE ENTORNO --- */
const isEnglishPage = window.location.pathname.includes('english.html');
const TUTOR_NAME = isEnglishPage ? "Lemony" : "Quijote";

/* --- CONFIGURACIÓN DE ENDPOINTS DINÁMICOS --- */
// 1. Detectamos si el código está corriendo en tu PC o ya subido en Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 2. Definimos la URL base de Render
const RENDER_URL = "https://don-quijote-backend.onrender.com";

/**
 * LÓGICA DE RUTAS:
 * - Si estamos en Render, usamos rutas relativas ("./archivo.php") para evitar problemas de CORS internos.
 * - Si estamos en Local, usamos la URL completa de Render para que los mensajes lleguen a la nube.
 */
const backendUrlLemony = isLocal ? `${RENDER_URL}/Lemony.php` : "./Lemony.php";
const backendUrlQuijote = isLocal ? `${RENDER_URL}/DonQuijoteChatbot.php` : "./DonQuijoteChatbot.php";

const BACKEND_URL = isEnglishPage ? backendUrlLemony : backendUrlQuijote;

console.log(`[🚀 Entorno]: ${isLocal ? 'DEVELOPMENT' : 'PRODUCTION (Render)'}`);
console.log(`[🔗 Endpoint]: ${BACKEND_URL}`);

/* --- MEMORIA DINÁMICA --- */
export let conversationHistory = [];
export let selectedModel = "trinity";

/**
 * Envía el mensaje al backend correspondiente
 * @param {string} texto 
 * @param {boolean} silent - Si es true, no añade el mensaje del usuario a la UI (útil para voz que ya lo añade)
 * @param {function} onSpeakEnd - Callback opcional para ejecutar al terminar el TTS
 */
export async function enviarMensaje(texto, silent = false, onSpeakEnd = null) {
    const mensajeLimpio = texto.trim();
    if (!mensajeLimpio) return;

    // 1. Interfaz y Memoria Local
    if (!silent) addMsg("Tú", mensajeLimpio);
    conversationHistory.push({ role: "user", content: mensajeLimpio });

    showSpinner();

    try {
        console.log(`[Fetch] Iniciando petición a: ${BACKEND_URL}`);
        console.log(`[Fetch] Payload a enviar:`, { message: mensajeLimpio, model: selectedModel, isEnglish: isEnglishPage });
        
        // 2. Petición al Servidor con Headers reforzados para evitar errores de CORS
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({
                message: mensajeLimpio,
                history: conversationHistory,
                model: selectedModel,
                isEnglish: isEnglishPage,
                isSummary: false
            })
        });

        if (!response.ok) {
            console.error(`[Fetch Error] Falló respuesta del servidor. Status HTTP: ${response.status} ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            console.error(`[Fetch Error] Detalles de error capturados (si existen):`, errorData);
            throw new Error(errorData.reply || `Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[Fetch Success] Datos recibidos exitosamente:`, data);

        if (data && data.reply) {
            const respuestaIA = data.reply;

            // 3. Actualización de métricas en UI
            actualizarMetricasUI(data.metrics);

            // 4. Respuesta visual, auditiva y memoria
            addMsg(TUTOR_NAME, respuestaIA);
            conversationHistory.push({ role: "assistant", content: respuestaIA });

            // Ejecutar TTS (Voz configurada en tts.js)
            // Pasamos un callback vacío para que el sistema de voz sepa cuándo termina si fuera necesario
            if (onSpeakEnd) {
                speak(respuestaIA, onSpeakEnd);
            } else {
                speak(respuestaIA);
            }

            // 5. Control de saturación (Resumen cada 10 mensajes)
            if (conversationHistory.length >= 10) {
                await resumirHistorial();
            }

            return respuestaIA; // Retornamos para que recognition.js pueda usarlo si necesita
        }

    } catch (err) {
        console.error("🔥 Error en comunicación:", err);
        const errorMsg = isEnglishPage
            ? `An unfortunate error has blocked our correspondence. (${err.message})`
            : `¡Pardiez! Un encantador ha cortado nuestra comunicación. (${err.message})`;
        addMsg("Error", errorMsg);
    } finally {
        hideSpinner();
    }
}

/**
 * Reduce el historial mediante IA
 */
async function resumirHistorial() {
    console.log("📜 Optimizando memoria del tutor...");
    try {
        const mensajesRecientes = conversationHistory.slice(-3);

        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: isEnglishPage ? "Summarize our progress." : "Resume nuestras aventuras.",
                history: conversationHistory,
                model: selectedModel,
                isSummary: true,
                isEnglish: isEnglishPage
            })
        });

        const data = await response.json();
        if (data.reply) {
            const prefijo = isEnglishPage ? "[Previous Records]: " : "[Memoria de mis andanzas]: ";
            conversationHistory = [
                { role: "assistant", content: prefijo + data.reply },
                ...mensajesRecientes
            ];
            console.log("✅ Memoria optimizada.");
        }
    } catch (err) {
        console.warn("Fallo al resumir, truncando historial manualmente.");
        conversationHistory = conversationHistory.slice(-5);
    }
}

/**
 * Actualiza los elementos de texto con los datos técnicos del servidor
 */
function actualizarMetricasUI(metrics) {
    if (!metrics) return;

    const metricsEl = document.getElementById("technical-metrics");
    if (metricsEl) {
        const msgCount = metrics.message_count || conversationHistory.length;
        metricsEl.textContent = `Status: Connected | Context: ${msgCount} msgs | Model: ${selectedModel}`;
    }

    const statPayload = document.getElementById("stat-payload");
    const statTokens = document.getElementById("stat-tokens");

    if (statPayload && metrics.payload_bytes) {
        statPayload.textContent = `${(metrics.payload_bytes / 1024).toFixed(2)} KB`;
    }
    if (statTokens && metrics.estimated_tokens) {
        statTokens.textContent = metrics.estimated_tokens;
    } else if (statTokens) {
        statTokens.textContent = Math.ceil((metrics.payload_bytes || 0) / 4);
    }
}

/* --- LISTENERS DE INTERFAZ --- */
const inputChat = document.getElementById("chat-input");
const btnEnviar = document.getElementById("send-btn");

if (btnEnviar && inputChat) {
    btnEnviar.addEventListener("click", () => {
        enviarMensaje(inputChat.value);
        inputChat.value = "";
    });

    inputChat.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            enviarMensaje(inputChat.value);
            inputChat.value = "";
        }
    });
}
