# 🛡️ Don Quijote Chatbot: IA Literaria Multimodal

**ID del Proyecto:** 37495  
**Categoría:** Desarrollo de Software (DES)  
**Nivel:** Secundaria (SEC)

Este proyecto es una plataforma educativa interactiva que utiliza Inteligencia Artificial para facilitar la comprensión de *Don Quijote de la Mancha*. El sistema permite a los estudiantes interactuar mediante voz y texto con un hidalgo digital que mantiene una personalidad histórica coherente.

---

## 🚀 Características Técnicas

* **Interfaz Multimodal:** Control por voz (STT) y respuesta de voz (TTS).
* **Sincronización Dinámica:** Resaltado de texto en tiempo real sincronizado con el audio de la IA.
* **Backend Seguro:** Implementación de un Proxy en PHP para la gestión de API Keys y peticiones asíncronas.
* **Memoria de Aventura:** Sistema de gestión de historial que resume la conversación automáticamente para optimizar el contexto de la IA.
* **Arquitectura:** HTML5, CSS3, JavaScript (ES6+) y PHP.

---

## 🛠️ Requisitos e Instalación

### Pre-requisitos
1.  Servidor local con soporte PHP (XAMPP, WAMP o Laragon) o un hosting web.
2.  Conexión a internet para la API de OpenRouter.

### Configuración
1.  Clona o descarga este repositorio en tu carpeta `htdocs` o `public_html`.
2.  Crea un archivo `.env` en la raíz del proyecto (puedes basarte en `.env.example`).
3.  Agrega tu API Key de OpenRouter en el archivo `.env`:
    ```env
    OPENROUTER_API_KEY=tu_clave_aqui
    ```
4.  Asegúrate de que el servidor tenga permisos de lectura para la carpeta `/capitulos` y `/audio`.

---

## 📂 Estructura del Proyecto

* `DonQuijoteChatbot.php`: Backend encargado de la lógica, seguridad y conexión con OpenRouter.
* `index.html`: Interfaz de usuario y visor del modelo 3D.
* `js/`:
    * `chat.js`: Gestión de la conversación y lógica de memoria/resumen.
    * `recognition.js`: Implementación de la Web Speech API para comandos de voz.
    * `sync.js`: Lógica de sincronización entre hilos de audio y texto.
    * `tts.js`: Motor de síntesis de voz.
* `/capitulos`: Base de datos en JSON con el contenido de la obra.
* `/audio`: Repositorio de recursos multimedia para apoyo pedagógico.

---

## 🤖 Modelos Utilizados
El sistema está optimizado para modelos de lenguaje de gran tamaño (LLM) a través de OpenRouter, priorizando modelos con baja latencia para mejorar la experiencia del usuario.

---

## ⚖️ Licencia
Este proyecto se distribuye bajo la **Licencia MIT**. Siéntete libre de usarlo, estudiarlo y mejorarlo con fines educativos.

---

## 👨‍💻 Autor
Proyecto desarrollado para el concurso **Código Ciencia / Infomatrix 2026**.