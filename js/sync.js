/**
 * sync.js — versión FINAL DEFINITIVA
 * ----------------------------------------------------------------------------
 * - Carga capítulos de audio y transcripciones.
 * - Resalta texto sincronizado.
 * - Pausa SpeechRecognition mientras el audiolibro suena.
 * - NO reactiva SpeechRecognition (eso lo hace recognition.js).
 * - Salto de tiempo funcional sin interferencias.
 * - Advertencia de salida controlada globalmente.
 * ----------------------------------------------------------------------------
 */

// 🔥 VARIABLE GLOBAL REAL (visible desde chat.js y recognition.js)
window.advertenciaActiva = true;

document.addEventListener("DOMContentLoaded", () => {

    const audio = document.getElementById("audio-quijote");
    const textoContenedor = document.getElementById("texto-sincronizado");

    let segmentos = [];

    /* ==========================================================================
       PAUSAR RECOGNITION DURANTE EL AUDIO
       ========================================================================== */

    const esperarReconocimiento = setInterval(() => {
        if (window.recog && typeof window.escuchando !== "undefined") {
            clearInterval(esperarReconocimiento);

            audio.addEventListener("play", () => {
                console.log("🎧 [audio] Audiolibro reproduciéndose → Pausando reconocimiento...");
                if (window.escuchando) {
                    try {
                        window.recog.stop();
                        window.escuchando = false;
                    } catch (err) {
                        console.warn("⚠️ [audio] No se pudo pausar reconocimiento:", err);
                    }
                }
            });

            audio.addEventListener("pause", () => {
                console.log("🎧 [audio] Audiolibro pausado → NO reactivar reconocimiento (lo maneja recognition.js)");
            });

            audio.addEventListener("ended", () => {
                console.log("🎧 [audio] Audiolibro terminado → NO reactivar reconocimiento (lo maneja recognition.js)");
            });
        }
    }, 200);

    /* ==========================================================================
       CARGA DE AUDIO + JSON DEL CAPÍTULO
       ========================================================================== */
    /* ==========================================================================
       CARGA DE AUDIO + JSON DEL CAPÍTULO (Delegación de eventos)
       ========================================================================== */
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest("#chapter-container button");
        if (!btn) return;

        const audioFile = btn.dataset.audio;
        const jsonFile = btn.dataset.json;

        // Desactivar advertencia mientras se cambia de capítulo
        window.advertenciaActiva = false;

        console.log(`📖 [Cargando] Capítulo: ${audioFile} | ${jsonFile}`);

        try {
            audio.src = audioFile;
            audio.dataset.capitulo = jsonFile;

            await loadChapter(jsonFile);

            console.log("✅ [Éxito] Capítulo cargado correctamente.");
            audio.play();
        } catch (err) {
            console.error("❌ [Error Crítico] No se pudo cargar el capítulo:", err);
            alert(`Lo sentimos, el capítulo no pudo cargarse.\nError: ${err.message}`);
        }

        // Reactivar advertencia cuando el usuario esté en reposo
        setTimeout(() => window.advertenciaActiva = true, 500);
    });

    /* ==========================================================================
       CARGA DEL JSON Y RENDERIZADO DEL TEXTO SINCRONIZADO
       ========================================================================== */
    async function loadChapter(nombreJson) {
        try {
            const path = nombreJson.startsWith("./") ? nombreJson : `./capitulos/${nombreJson}`;
            const r = await fetch(path);

            if (!r.ok) {
                if (r.status === 404) {
                    throw new Error(`Archivo JSON no encontrado (404): ${path}`);
                }
                throw new Error(`Error al cargar el JSON (${r.status}): ${r.statusText}`);
            }

            const data = await r.json();

            segmentos = data;
            textoContenedor.innerHTML = "";

            segmentos.forEach(seg => {
                const span = document.createElement("span");
                span.textContent = seg.text + " ";
                span.dataset.inicio = seg.start;
                span.dataset.fin = seg.end;
                textoContenedor.appendChild(span);
            });

        } catch (err) {
            console.error("❌ Error en loadChapter:", err);
            throw err; // Re-lanzar para que el listener lo capture
        }
    }

    /* ==========================================================================
       SINCRONIZACIÓN DEL TEXTO CON EL AUDIO
       ========================================================================== */
    audio.addEventListener("timeupdate", () => {
        const tiempo = audio.currentTime;

        document.querySelectorAll("#texto-sincronizado span").forEach(span => {
            const inicio = parseFloat(span.dataset.inicio);
            const fin = parseFloat(span.dataset.fin);

            if (tiempo >= inicio && tiempo <= fin) {
                span.classList.add("highlight");
                span.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
                span.classList.remove("highlight");
            }
        });
    });

    /* ==========================================================================
       ADVERTENCIA AL CERRAR LA PESTAÑA (CONTROLADA CORRECTAMENTE)
       ========================================================================== */
    window.addEventListener("beforeunload", e => {

        // Si la advertencia está desactivada → no hacer nada
        if (!window.advertenciaActiva) return;

        // Si el audio está reproduciéndose → NO mostrar advertencia
        if (!audio.paused) return;

        // Si el reconocimiento está activo → NO mostrar advertencia
        if (window.escuchando) return;

        const tiempo = audio.currentTime;
        const tiempoTexto = new Date(tiempo * 1000).toISOString().substr(11, 8);
        const capitulo = audio.dataset.capitulo || "desconocido";

        const nombreCapitulo = capitulo.replace("chapter_", "Capítulo ").replace("_adjusted.json", "");
        e.preventDefault();
        e.returnValue =
            `⚠️ Te quedaste en el ${nombreCapitulo} en el tiempo ${tiempoTexto}.`;
    });

    /* ==========================================================================
       SALTAR A UN TIEMPO ESPECÍFICO (FUNCIONAL)
       ========================================================================== */
    document.getElementById("btn-salto-tiempo").addEventListener("click", () => {
        const input = document.getElementById("salto-tiempo").value.trim();
        const partes = input.split(":").map(Number);

        if (partes.length !== 3) {
            alert("Formato inválido. Usa HH:MM:SS");
            return;
        }

        const segundos = partes[0] * 3600 + partes[1] * 60 + partes[2];

        // Desactivar advertencia durante el salto
        window.advertenciaActiva = false;

        if (audio.readyState < 1) {
            console.log("⏳ Esperando metadata para saltar...");
            audio.addEventListener("loadedmetadata", () => {
                saltar(segundos);
            }, { once: true });
        } else {
            saltar(segundos);
        }
    });

    function saltar(segundos) {
        if (segundos > audio.duration) {
            alert("Ese tiempo excede la duración del capítulo.");
            return;
        }

        console.log("⏩ Saltando a:", segundos);

        audio.pause();
        audio.currentTime = segundos;

        audio.addEventListener("canplay", () => {
            audio.play();

            // Reactivar advertencia cuando todo esté estable
            setTimeout(() => window.advertenciaActiva = true, 500);

        }, { once: true });
    }

});