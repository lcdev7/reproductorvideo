window.onload = inicio;

// URL base (Render te dará algo como https://tuapp.onrender.com)
const RENDER_URL = window.location.origin;

// Lista de videos que servirás desde server.js
var videos = [
  `${RENDER_URL}/video/video1.mp4`,
  `${RENDER_URL}/video/video2.mp4`
];

var vid;
var videoActual = 0;

function inicio() {
  vid = document.querySelector("video");
  vid.src = videos[videoActual];

  // Botón Play / Pause
  document.querySelector(".play").onclick = function () {
    if (vid.paused) {
      vid.play();
      this.src = "img/pause.svg"; // cambia el ícono
    } else {
      vid.pause();
      this.src = "img/play.svg"; // vuelve al ícono de play
    }
  };

  // Botón Siguiente
  document.querySelector(".siguiente").onclick = function () {
    videoActual = (videoActual + 1) % videos.length;
    vid.src = videos[videoActual];
    vid.play();
    document.querySelector(".play").src = "img/pause.svg";
  };

  // Botón Reiniciar
  document.querySelector(".reiniciar").onclick = function () {
    vid.currentTime = 0;
    vid.play();
    document.querySelector(".play").src = "img/pause.svg";
  };

  // Botón Volumen (mute/unmute)
  document.querySelector(".volumen").onclick = function () {
    vid.muted = !vid.muted;
    if (vid.muted) {
      this.src = "img/volumen0.svg"; // ícono mute
    } else {
      this.src = "img/volumen1.svg"; // ícono volumen normal
    }
  };

  // Pantalla completa
  document.querySelector(".pantallacompleta").onclick = function () {
    if (!document.fullscreenElement) {
      vid.requestFullscreen();
      this.src = "img/reducir.svg"; // ícono de salir
    } else {
      document.exitFullscreen();
      this.src = "img/ampliar.svg"; // ícono de entrar
    }
  };

  // Actualizar barra de progreso
  vid.ontimeupdate = function () {
    let barra = document.querySelector(".barra2");
    let porcentaje = (vid.currentTime / vid.duration) * 100;
    barra.style.width = porcentaje + "%";
  };

  // Click en barra para adelantar/retroceder
  document.querySelector(".barra1").onclick = function (e) {
    let ancho = this.offsetWidth;
    let posicion = e.offsetX;
    let porcentaje = posicion / ancho;
    vid.currentTime = porcentaje * vid.duration;
  };
}
