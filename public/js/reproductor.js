window.onload = inicio;

// URLs de videos a través del proxy
var videos = [
    "/proxy/video?url=https://filelu.com/m0d30qltjhyh",
    "/proxy/video?url=https://filelu.com/otrocodigo"
];

var vid;
var orden = [];
var videoActual = 0;
var tooltip;
var hls;

function inicio() {
    vid = document.querySelector("video");
    vid.src = videos[videoActual];
    
    // Configurar eventos de controles
    document.querySelector(".play").onclick = play;
    document.querySelector(".volumen").onclick = volumen;
    document.querySelector(".siguiente").onclick = siguiente;
    document.querySelector(".reiniciar").onclick = reiniciar;
    document.querySelector(".pantallacompleta").onclick = pantallacompleta;
    document.querySelector(".barra1").onclick = buscar;

    // Crear tooltip para la barra de progreso
    let existingTooltip = document.querySelector(".tooltip");
    if (existingTooltip) existingTooltip.remove();
    
    tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = "00:00";
    document.querySelector(".barra1").appendChild(tooltip);

    // Eventos para tooltip
    document.querySelector(".barra1").addEventListener("mousemove", mostrarTooltip);
    document.querySelector(".barra1").addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });

    // Reproducir o pausar con clic en el video
    vid.onclick = togglePlay;

    // Reproducir o pausar con barra espaciadora
    document.addEventListener("keydown", function(e) {
        if (e.code === "Space") {
            e.preventDefault();
            togglePlay();
        }
    });

    // Eventos de carga y actualización
    vid.addEventListener('loadedmetadata', function() {
        console.log('Duración del video:', vid.duration);
        actualizar();
    });

    vid.addEventListener('error', function(e) {
        console.error('Error loading video:', e);
        document.querySelector(".estado").innerHTML = "Error cargando video";
    });

    vid.addEventListener('waiting', function() {
        console.log('Video buffering...');
    });

    vid.addEventListener('canplay', function() {
        console.log('Video can play');
    });

    // Inicializar
    reordenar();
    vid.ontimeupdate = actualizar;
}

function play() {
    togglePlay();
    // Actualizar ícono de play/pausa
    document.querySelector(".play").src = vid.paused ? "img/play.svg" : "img/pausa.svg";
}

function togglePlay() {
    if (vid.paused) {
        vid.play().then(() => {
            document.querySelector(".play").src = "img/pausa.svg";
        }).catch(error => {
            console.error('Error al reproducir:', error);
            document.querySelector(".play").src = "img/play.svg";
        });
    } else {
        vid.pause();
        document.querySelector(".play").src = "img/play.svg";
    }
}

function volumen() {
    vid.muted = !vid.muted;
    this.src = `img/volumen${vid.muted ? 0 : 1}.svg`;
}

function reordenar() {
    orden = [];
    for (let i = 0; i < videos.length; i++) {
        let azar;
        do {
            azar = Math.floor(Math.random() * videos.length);
        } while (orden.includes(azar));
        orden.push(azar);
    }
    console.log('Orden de reproducción:', orden);
    reproducir();
}

function reproducir() {
    if (orden.length === 0) {
        console.error('No hay videos en la lista');
        return;
    }

    let videoseleccionado = orden[videoActual];
    console.log('Reproduciendo video:', videoseleccionado, videos[videoseleccionado]);
    
    vid.src = videos[videoseleccionado];
    
    vid.load(); // Forzar carga del nuevo video
    
    vid.play().then(() => {
        console.log('Video iniciado correctamente');
        document.querySelector(".play").src = "img/pausa.svg";
    }).catch(error => {
        console.error('Error al iniciar video:', error);
        document.querySelector(".play").src = "img/play.svg";
    });
}

function siguiente() {
    videoActual++;
    if (videoActual >= videos.length) {
        videoActual = 0;
    }
    console.log('Siguiente video:', videoActual);
    reproducir();
}

function reiniciar() {
    if (vid.duration && !isNaN(vid.duration)) {
        vid.currentTime = 0;
        console.log('Video reiniciado');
    }
}

function pantallacompleta() {
    const seccion = document.querySelector("section");
    
    if (!document.fullscreenElement) {
        // Entrar en pantalla completa
        if (seccion.requestFullscreen) {
            seccion.requestFullscreen();
        } else if (seccion.webkitRequestFullscreen) {
            seccion.webkitRequestFullscreen();
        } else if (seccion.msRequestFullscreen) {
            seccion.msRequestFullscreen();
        }
        document.querySelector(".pantallacompleta").src = "img/reducir.svg";
    } else {
        // Salir de pantalla completa
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        document.querySelector(".pantallacompleta").src = "img/expandir.svg";
    }
}

// Evento para detectar cambios en pantalla completa
document.addEventListener('fullscreenchange', updateFullscreenIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
document.addEventListener('msfullscreenchange', updateFullscreenIcon);

function updateFullscreenIcon() {
    const icon = document.querySelector(".pantallacompleta");
    if (document.fullscreenElement) {
        icon.src = "img/reducir.svg";
    } else {
        icon.src = "img/expandir.svg";
    }
}

function actualizar() {
    if (isNaN(vid.duration) || vid.duration === Infinity) {
        document.querySelector(".estado").innerHTML = "Cargando...";
        return;
    }

    document.querySelector(".estado").innerHTML = `${conversion(vid.currentTime)} / ${conversion(vid.duration)}`;
    
    let porcentaje = (100 * vid.currentTime) / vid.duration;
    document.querySelector(".barra2").style.width = `${porcentaje}%`;
}

function conversion(segundos) {
    if (isNaN(segundos) || segundos === Infinity) return "00:00";
    
    let minutos = Math.floor(segundos / 60);
    let segs = Math.floor(segundos % 60);
    
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
}

function buscar(e) {
    if (isNaN(vid.duration) || vid.duration === 0) return;
    
    let barra = document.querySelector(".barra1");
    let clickBarra = e.offsetX;
    let anchoNavegador = barra.offsetWidth;
    let porcentaje = (100 * clickBarra) / anchoNavegador;
    let posicion = (vid.duration * porcentaje) / 100;
    
    vid.currentTime = posicion;
}

function mostrarTooltip(e) {
    if (isNaN(vid.duration) || vid.duration === 0) return;
    
    let barra = document.querySelector(".barra1");
    let anchoNavegador = barra.offsetWidth;
    let posicionX = e.offsetX;
    let porcentaje = (100 * posicionX) / anchoNavegador;
    let segundos = (vid.duration * porcentaje) / 100;

    tooltip.style.display = "block";
    tooltip.textContent = conversion(segundos);
    tooltip.style.left = `${Math.max(0, Math.min(posicionX, anchoNavegador))}px`;
}

// Manejar la tecla Escape para salir de pantalla completa
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.fullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
});

// Manejar el fin del video
vid.addEventListener('ended', function() {
    console.log('Video terminado, pasando al siguiente');
    siguiente();
});

// Manejar errores de red
vid.addEventListener('stalled', function() {
    console.log('Video stalled, intentando reconectar...');
});

vid.addEventListener('suspend', function() {
    console.log('Video suspendido');
});
