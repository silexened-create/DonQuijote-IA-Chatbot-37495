/**
 * animacionQuijote.js
 * --------------------------------------------------------------
 * Módulo encargado de inicializar y controlar el modelo 3D de 
 * Don Quijote, incluyendo su animación facial (movimiento de boca)
 * sincronizada con el audio del chatbot.
 *
 * Tecnologías:
 * - Three.js (r110)
 * - FBXLoader para cargar modelos animados
 *
 * Funciones exportadas:
 * - initQuijoteAnimacion(): Inicializa la escena 3D
 * - iniciarAnimacionBoca(): Activa la animación de la boca
 * - detenerAnimacionBoca(): Pausa la animación de la boca
 * --------------------------------------------------------------
 */

import * as THREE from "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r110/build/three.module.js";
import { FBXLoader } from "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r110/examples/jsm/loaders/FBXLoader.js";

// Elementos principales de la escena 3D
let container, scene, camera, renderer, mixer, talkAction;
const clock = new THREE.Clock();

/**
 * Inicializa la escena 3D, la cámara, las luces y el modelo FBX.
 * Se ejecuta una vez que el usuario cierra el modal de instrucciones.
 */
export function initQuijoteAnimacion() {
    container = document.getElementById("modelo-container");
    scene = new THREE.Scene();

    // Configuración de cámara
    camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 60, 170);

    // Renderizador WebGL
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Iluminación básica
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(11, 10, 0.5);
    scene.add(dir);

    // Carga del modelo FBX
    const loader = new FBXLoader();
    loader.load("talking.fbx", obj => {
        obj.scale.set(0.1, 0.1, 0.1);
        obj.position.set(20, -15, 15);
        scene.add(obj);

        // Configuración del sistema de animación
        mixer = new THREE.AnimationMixer(obj);
        talkAction = mixer.clipAction(obj.animations[0]);

        talkAction.loop = THREE.LoopRepeat;
        talkAction.play();
        talkAction.paused = true; // La boca inicia detenida

        // Indicador global para otros módulos
        window.modeloListo = true;

        console.log("Modelo 3D cargado y listo.");
    });

    // Inicia el ciclo de renderizado
    animate();

    // Ajuste automático al redimensionar ventana
    window.addEventListener("resize", onWindowResize);
}

/**
 * Bucle principal de animación.
 * Actualiza el mixer y renderiza la escena en cada frame.
 */
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}

/**
 * Ajusta la cámara y el renderizador cuando cambia el tamaño de la ventana.
 */
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * Activa la animación de la boca del modelo.
 * Se usa cuando el chatbot está hablando.
 */
export function iniciarAnimacionBoca() {
    if (window.modeloListo && talkAction) {
        talkAction.paused = false;
    }
}

/**
 * Pausa la animación de la boca del modelo.
 * Se usa cuando el chatbot deja de hablar.
 */
export function detenerAnimacionBoca() {
    if (window.modeloListo && talkAction) {
        talkAction.paused = true;
    }
}

/**
 * Evento inicial: cuando el usuario cierra el modal,
 * se muestra el contenido principal y se inicializa la animación 3D.
 */
document.getElementById("btn-aceptar").addEventListener("click", () => {
    document.getElementById("modal-instrucciones").style.display = "none";
    document.getElementById("contenido-principal").style.display = "block";
    initQuijoteAnimacion();
});