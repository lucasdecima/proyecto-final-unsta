//======================================================
// VARIABLES GLOBALES
//======================================================

const usuario =
    JSON.parse(
        localStorage.getItem("usuarioLogueado")
    );

if (!usuario) {

    window.location.href = "login.html";

}
const trips =
    JSON.parse(
        localStorage.getItem(`trips_${usuario.email}`)
    ) || [];

    trips.forEach(viaje => {

        if (!viaje.timestamp) {
    
            viaje.timestamp = Date.now();
    
        }
    
    });


// =========================
// CONFIGURACIÓN DE ALQUILER
// =========================

const MAX_TIEMPO_VIAJE = 60 * 60 * 1000; // 1 hora
const MAX_TIEMPO_DIARIO = 4 * 60 * 60 * 1000; // 4 horas

const claveViajeActivo = `viajeActivo_${usuario.email}`;

let viajeActivo = JSON.parse(
    localStorage.getItem(claveViajeActivo)
);

let relojIntervalo = null;




let estaciones = 
        JSON.parse(localStorage.getItem("estaciones"));
if (!estaciones) {
    estaciones = {
        "Plaza Independencia": { bicis: 0 },
        "Parque 9 de Julio": { bicis: 0 },
        "Terminal": { bicis: 0 }
    };
}


const distancias = {
    "Plaza Independencia": {
        "Parque 9 de Julio": 3.2,
        "Terminal": 2.8
    },
    "Parque 9 de Julio": {
        "Plaza Independencia": 3.2,
        "Terminal": 4.1
    },
    "Terminal": {
        "Plaza Independencia": 2.8,
        "Parque 9 de Julio": 4.1
    }
};

//======================================================
// FUNCIONES DE NAVEGACIÓN
//======================================================

function showSection(sectionId) {

    document
        .getElementById("home")
        .classList.add("d-none");

    document
        .getElementById("viajes")
        .classList.add("d-none");

    document
        .getElementById("perfil")
        .classList.add("d-none");

    document
        .getElementById(sectionId)
        .classList.remove("d-none");
}

//======================================================
// MAPA Y ESTACIONES
//======================================================

function obtenerDistancia(origen, destino) {
    if (origen === destino) return 0;
    return distancias[origen]?.[destino] ?? null;
}

function obtenerEstadoEstacion(cantidad){

    if(cantidad >= 3){

        return{

            texto:"🟢 Disponible",

            textoClase:"text-success",

            cardClase:"estado-disponible"

        };

    }

    if(cantidad >= 1){

        return{

            texto:"🟡 Pocas bicicletas",

            textoClase:"text-warning",

            cardClase:"estado-pocas"

        };

    }

    return{

        texto:"🔴 Sin disponibilidad",

        textoClase:"text-danger",

        cardClase:"estado-vacia"

    };

}

function renderEstaciones() {

    const mapa = document.getElementById("mapa");

    const plaza =
    obtenerEstadoEstacion(estaciones["Plaza Independencia"].bicis);

    const parque =
    obtenerEstadoEstacion(estaciones["Parque 9 de Julio"].bicis);

    const terminal =
    obtenerEstadoEstacion(estaciones["Terminal"].bicis);

    mapa.innerHTML = `
        <div class="row text-center">

            <div class="col-md-4">
                <div class="card shadow-sm card-estacion ${plaza.cardClase}">
                    <div class="card-body">
                        <h5>📍 Plaza Independencia</h5>
                        <p>🚲 ${estaciones["Plaza Independencia"].bicis} bicicletas</p>
                        <p class="${plaza.textoClase} fw-bold">${plaza.texto}</p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm card-estacion ${parque.cardClase}">
                    <div class="card-body">
                        <h5>📍 Parque 9 de Julio</h5>
                        <p>🚲 ${estaciones["Parque 9 de Julio"].bicis} bicicletas</p>
                        <p class="${parque.textoClase} fw-bold">${parque.texto}</p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm card-estacion ${terminal.cardClase}">
                    <div class="card-body">
                        <h5>📍 Terminal</h5>
                        <p>🚲 ${estaciones["Terminal"].bicis} bicicletas</p>
                        <p class="${terminal.textoClase} fw-bold">${terminal.texto}</p>
                    </div>
                </div>
            </div>

        </div>
    `;
}

function actualizarSelectEstaciones() {

    const origen =
        document.getElementById("origen");

    const destino =
        document.getElementById("destino");

    origen.innerHTML = "";
    destino.innerHTML = "";

    for (const nombre in estaciones) {

        origen.innerHTML += `
            <option value="${nombre}">
                ${nombre} (${estaciones[nombre].bicis} disponibles)
            </option>
        `;

        destino.innerHTML += `
            <option value="${nombre}">
                ${nombre} (${estaciones[nombre].bicis} disponibles)
            </option>
        `;
    }

}

function generarBicisAleatorias() {
    estaciones["Plaza Independencia"].bicis = Math.floor(Math.random() * 6) + 1;
    estaciones["Parque 9 de Julio"].bicis = Math.floor(Math.random() * 6) + 1;
    estaciones["Terminal"].bicis = Math.floor(Math.random() * 6) + 1;

    localStorage.setItem(
        "estaciones",
        JSON.stringify(estaciones)
    );

}

function actualizarDistancia() {

    const origen =
        document.getElementById("origen").value;

    const destino =
        document.getElementById("destino").value;

    const info =
        document.getElementById("distanceInfo");

    if (origen === destino) {
        info.textContent =
            "Elegí dos estaciones distintas";
        return;
    }

    const km = obtenerDistancia(origen, destino);

    const tiempoDisponibleHoy =
    obtenerTiempoRestanteHoy();

    viajeActivo = {

        bicicletaId,
    
        origen,
    
        destinoPrevisto: destino,
    
        kmEstimados: km,
    
        inicio: Date.now(),
    
        tiempoMaximo:
            Math.min(
                MAX_TIEMPO_VIAJE,
                tiempoDisponibleHoy
            )
    };

    info.textContent =
        km !== null
            ? `Distancia estimada : ${km} km`
            : "Distancia no disponible para esta ruta";
}

function guardarViajes() {

    localStorage.setItem(
        `trips_${usuario.email}`,
        JSON.stringify(trips)
    );

}

function guardarEstaciones() {

    localStorage.setItem(
        "estaciones",
        JSON.stringify(estaciones)
    );

}



//======================================================
// ALQUILER DE BICICLETAS
//======================================================

function rentBike() {

    const origen =
        document.getElementById("origen").value;

    const destino =
        document.getElementById("destino").value;

    if (!origen || !destino) {
        mostrarModal(
            "Datos incompletos",
            "Seleccioná una estación de origen y una estación de destino.",
            "warning"
        );
        return;
    }

    if (origen === destino) {
        mostrarModal(
            "Estaciones iguales",
            "La estación de origen y destino deben ser diferentes.",
            "warning"
        );
        return;
    }

    // No permitir otro alquiler mientras haya uno activo
    if (viajeActivo) {
        mostrarModal(
            "Viaje en curso",
            "Primero debés devolver la bicicleta en una estación.",
            "warning"
        );
        return;
    }

    const tiempoUsadoHoy =
        obtenerTiempoUsadoHoy();

    // Verificar límite diario
    if (tiempoUsadoHoy >= MAX_TIEMPO_DIARIO) {

        mostrarModal(
            "Límite diario alcanzado",
            "Ya utilizaste las 4 horas disponibles para hoy. Podrás volver a alquilar mañana.",
            "warning"
        );

        return;
    }

    // Verificar bicicletas disponibles
    if (!estaciones[origen] || estaciones[origen].bicis <= 0) {

        mostrarModal(
            "Sin disponibilidad",
            "No hay bicicletas disponibles en la estación seleccionada.",
            "warning"
        );

        return;
    }

    const btn =
        document.getElementById("btnAlquilar");

    btn.disabled = true;

    btn.innerHTML = `
        <span class="spinner-border spinner-border-sm"></span>
        Iniciando alquiler...
    `;

    setTimeout(() => {

        const km =
            obtenerDistancia(origen, destino);

        // Generamos una identificación simple para la bicicleta
        const bicicletaId =
            `PB-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;

        // Crear viaje activo
        viajeActivo = {

            bicicletaId,

            origen,

            destinoPrevisto: destino,

            kmEstimados: km,

            inicio: Date.now()

        };

        // Guardar viaje activo
        localStorage.setItem(
            claveViajeActivo,
            JSON.stringify(viajeActivo)
        );

        // La bicicleta SALE de la estación
        estaciones[origen].bicis--;

        guardarEstaciones();

        actualizarSelectEstaciones();

        renderEstaciones();

        // Cerrar modal
        const modalElement =
            document.getElementById("rentBikeModal");

        const modal =
            bootstrap.Modal.getInstance(modalElement);

        if (modal) {
            modal.hide();
        }

        // Mostrar viaje activo
        mostrarViajeActivo();

        // Restaurar botón
        btn.disabled = false;

        btn.innerHTML =
            "🚲 Alquilar Bicicleta";

    }, 1000);
}

//======================================================
// PERFIL Y ESTADÍSTICAS
//======================================================


    function actualizarEstadisticas() {

        let km = 0;
    
        const contador = {};
        
        let viajeMasLargo = 0;

        const estacionesUtilizadas = new Set();

        trips.forEach(viaje => {
    
            km += viaje.km;
            if (viaje.km > viajeMasLargo) {

                viajeMasLargo = viaje.km;
            
            }
            
            estacionesUtilizadas.add(viaje.origen);
            estacionesUtilizadas.add(viaje.destino);
    
            contador[viaje.origen] =
                (contador[viaje.origen] || 0) + 1;
    
        });
    
        document.getElementById("kmTotales").textContent =
            km.toFixed(1);
    
        if (trips.length > 0) {
    
            document.getElementById("ultimoViaje").textContent =
                trips[trips.length - 1].fecha;
    
        } else {

            document.getElementById("ultimoViaje").textContent =
                "Sin viajes";
        
        }
    
        let favorita = "-";
    
        let max = 0;
    
        for (const estacion in contador) {
    
            if (contador[estacion] > max) {
    
                favorita = estacion;
                max = contador[estacion];
    
            }
    
        }
    
        document.getElementById("estacionFavorita").textContent =
            favorita;

        document.getElementById("viajeMasLargo").textContent =
            viajeMasLargo.toFixed(1);
        
        document.getElementById("promedioKm").textContent =
            trips.length
                ? (km / trips.length).toFixed(1)
                : "0";
        
        document.getElementById("estacionesUsadas").textContent =
            estacionesUtilizadas.size;
    
        if (trips.length === 0) {

            document.getElementById("kmTotales").textContent = "0";
            document.getElementById("viajeMasLargo").textContent = "0";
            document.getElementById("promedioKm").textContent = "0";
            document.getElementById("estacionesUsadas").textContent = "0";
            document.getElementById("estacionFavorita").textContent = "-";
        
        }
        
    }

//======================================================
// HISTORIAL DE VIAJES
//======================================================

function renderTrips() {

    const table =
        document.getElementById(
            "tripTable"
        );

    table.innerHTML = "";

    if (trips.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    No hay viajes registrados.
                </td>
            </tr>
        `;

        return;
    }

    trips.forEach(viaje => {

        table.innerHTML += `
            <tr>
                <td>${viaje.id}</td>
                <td>${viaje.fecha}</td>
                <td>${viaje.bicicletaId || "-"}</td>
                <td>${viaje.origen}</td>
                <td>${viaje.destino}</td>
                <td>${viaje.km} km</td>
                <td>${viaje.duracion || "-"}</td>
            </tr>
        `;
    });
}

function filtrarViajes() {

    const texto =
        document.getElementById("buscarViaje")
        .value
        .toLowerCase();

    const filas =
        document.querySelectorAll("#tripTable tr");

    filas.forEach(fila => {

        if (
            fila.textContent.toLowerCase().includes(texto)
        ) {

            fila.style.display = "";

        }

        else {

            fila.style.display = "none";

        }

    });

}


function ordenarViajes() {

    const criterio =
        document.getElementById("ordenViajes").value;

    switch (criterio) {

        case "recientes":

        trips.sort((a, b) => b.timestamp - a.timestamp);

        break;

        case "antiguos":

        trips.sort((a, b) => a.timestamp - b.timestamp);

        break;

        case "kmMayor":

            trips.sort(
                (a, b) => b.km - a.km
            );

            break;

        case "kmMenor":

            trips.sort(
                (a, b) => a.km - b.km
            );

            break;

    }
    guardarViajes();
    renderTrips();

}

function eliminarHistorial() {

    trips.length = 0;

    guardarViajes();

    renderTrips();
    actualizarEstadisticas();

    const modal =
        bootstrap.Modal.getInstance(
            document.getElementById("deleteHistoryModal")
        );

    if (modal) {

        modal.hide();

    }

    mostrarModal(
        "Historial eliminado",
        "Todos los viajes fueron eliminados correctamente.",
        "success"
    );

}


function obtenerInicioDelDia() {
    const ahora = new Date();

    return new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate()
    ).getTime();
}


function obtenerTiempoUsadoHoy() {

    const inicioDia = obtenerInicioDelDia();

    let tiempoTotal = 0;

    trips.forEach(viaje => {

        if (
            viaje.timestamp &&
            viaje.timestamp >= inicioDia &&
            viaje.duracionSegundos
        ) {
            tiempoTotal += viaje.duracionSegundos * 1000;
        }

    });

    // Si hay un viaje activo, también contamos su tiempo actual
    if (viajeActivo) {

        const tiempoActual =
            Date.now() - viajeActivo.inicio;

        tiempoTotal += Math.min(
            tiempoActual,
            MAX_TIEMPO_VIAJE
        );
    }

    return tiempoTotal;
}

function obtenerTiempoRestanteHoy() {

    const tiempoUsado =
        obtenerTiempoUsadoHoy();

    return Math.max(
        MAX_TIEMPO_DIARIO - tiempoUsado,
        0
    );
}


function formatearTiempo(milisegundos) {

    const totalSegundos =
        Math.floor(milisegundos / 1000);

    const horas =
        Math.floor(totalSegundos / 3600);

    const minutos =
        Math.floor((totalSegundos % 3600) / 60);

    const segundos =
        totalSegundos % 60;

    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}




function actualizarTiempoDisponibleHoy() {

    const elemento =
        document.getElementById("tiempoDisponibleHoy");

    if (!elemento) return;

    const utilizado =
        obtenerTiempoUsadoHoy();

    const restante =
        Math.max(
            MAX_TIEMPO_DIARIO - utilizado,
            0
        );

    elemento.textContent =
        formatearTiempo(restante);
}



function mostrarViajeActivo() {

    const tiempoDisponible =
    viajeActivo.tiempoMaximo ||
    MAX_TIEMPO_VIAJE;

    document.getElementById(
        "tiempoDisponibleViaje"
        ).textContent =
    formatearTiempo(tiempoDisponible);

    const card =
        document.getElementById("viajeActivoCard");

    if (!card || !viajeActivo) return;

    card.classList.remove("d-none");

    document.getElementById("bicicletaActiva")
        .textContent =
        viajeActivo.bicicletaId;

    document.getElementById("origenViaje")
        .textContent =
        viajeActivo.origen;

    document.getElementById("destinoViaje")
        .textContent =
        viajeActivo.destinoPrevisto;

    // Cargar estaciones de devolución
    actualizarEstacionesDevolucion();

    // Iniciar reloj
    iniciarRelojViaje();

    // Deshabilitar alquiler
    const botonesAlquiler =
        document.querySelectorAll(
            '[data-bs-target="#rentBikeModal"]'
        );

    botonesAlquiler.forEach(boton => {
        boton.disabled = true;
    });
}

//Estaciones de devolucion


function actualizarEstacionesDevolucion() {

    const select =
        document.getElementById("estacionDevolucion");

    if (!select) return;

    select.innerHTML = `
        <option value="">
            Seleccioná dónde devolver la bicicleta
        </option>
    `;

    Object.keys(estaciones).forEach(estacion => {

        const option =
            document.createElement("option");

        option.value = estacion;
        option.textContent = estacion;

        select.appendChild(option);

    });

    // Dejamos seleccionada por defecto
    // la estación de destino prevista
    if (viajeActivo) {

        select.value =
            viajeActivo.destinoPrevisto;
    }
}


//Reloj

function iniciarRelojViaje() {

    if (relojIntervalo) {
        clearInterval(relojIntervalo);
    }

    actualizarRelojViaje();

    relojIntervalo =
        setInterval(
            actualizarRelojViaje,
            1000
        );
}



function actualizarRelojViaje() {

    if (!viajeActivo) return;

    const reloj =
        document.getElementById("relojViaje");

    const alerta =
        document.getElementById("alertaTiempoViaje");

    if (!reloj || !alerta) return;

    const transcurrido =
        Date.now() - viajeActivo.inicio;



    const tiempoMaximo =
    viajeActivo.tiempoMaximo ||
    MAX_TIEMPO_VIAJE;
    
    const tiempoMostrar =
        Math.min(
            transcurrido,
            tiempoMaximo
        );
    reloj.textContent =
        formatearTiempo(tiempoMostrar);

    // Reiniciar clases
    reloj.classList.remove(
        "warning",
        "danger"
    );

    // Menos de 45 minutos
    if (transcurrido < 45 * 60 * 1000) {

        alerta.className =
            "alert alert-success mt-3 mb-3";

        alerta.textContent =
            "🟢 Tenés tiempo disponible para completar el viaje.";
    }

    // Entre 45 y 55 minutos
    else if (transcurrido < 55 * 60 * 1000) {

        reloj.classList.add("warning");

        alerta.className =
            "alert alert-warning mt-3 mb-3";

        alerta.textContent =
            "🟡 Recordá que el límite de este viaje es de 1 hora.";
    }

    // Entre 55 y 60 minutos
    else if (transcurrido < tiempoMaximo) {

        reloj.classList.add("danger");

        alerta.className =
            "alert alert-danger mt-3 mb-3";

        alerta.textContent =
            "⛔ Llegaste al límite de tiempo disponible. Devolvé la bicicleta en una estación.";
    }

    // Llegó al límite del viaje
    else {

        reloj.classList.add("danger");

        alerta.className =
            "alert alert-danger mt-3 mb-3";

        alerta.textContent =
            "⛔ Llegaste al límite de 1 hora. Devolvé la bicicleta en una estación.";

    }

    actualizarTiempoDisponibleHoy();
}



function finalizarViaje() {

    if (!viajeActivo) {
        return;
    }

    const select =
        document.getElementById("estacionDevolucion");

    const estacionDevolucion =
        select.value;

    if (!estacionDevolucion) {

        mostrarModal(
            "Seleccioná una estación",
            "Debés indicar en qué estación dejaste la bicicleta.",
            "warning"
        );

        return;
    }

    const fin =
        Date.now();

    const duracionMilisegundos =
        fin - viajeActivo.inicio;

    const duracionSegundos =
        Math.floor(
            duracionMilisegundos / 1000
        );

    const km =
        obtenerDistancia(
            viajeActivo.origen,
            estacionDevolucion
        );

    // Crear viaje finalizado
    const viaje = {

        id: trips.length + 1,

        fecha:
            new Date().toLocaleString("es-AR"),

        timestamp: fin,

        origen:
            viajeActivo.origen,

        destino:
            estacionDevolucion,

        km,

        bicicletaId:
            viajeActivo.bicicletaId,

        duracionSegundos,

        duracion:
            formatearTiempo(
                duracionMilisegundos
            )
    };

    // Guardar viaje en historial
    trips.push(viaje);

    guardarViajes();

    // La bicicleta vuelve a la estación
    estaciones[estacionDevolucion].bicis++;

    guardarEstaciones();

    // Eliminar viaje activo
    localStorage.removeItem(
        claveViajeActivo
    );

    viajeActivo = null;

    // Detener reloj
    if (relojIntervalo) {

        clearInterval(relojIntervalo);

        relojIntervalo = null;
    }

    // Actualizar interfaz
    document
        .getElementById("viajeActivoCard")
        .classList.add("d-none");

    const botonesAlquiler =
        document.querySelectorAll(
            '[data-bs-target="#rentBikeModal"]'
        );

    botonesAlquiler.forEach(boton => {
        boton.disabled = false;
    });

    actualizarSelectEstaciones();

    renderEstaciones();

    renderTrips();

    actualizarEstadisticas();

    actualizarTiempoDisponibleHoy();

    // Mostrar confirmación
    mostrarModal(
        "Viaje finalizado",
        `🚲 Bicicleta ${viaje.bicicletaId} devuelta correctamente en ${estacionDevolucion}. Duración: ${viaje.duracion}.`,
        "success"
    );
}
//======================================================
// INICIALIZACIÓN
//======================================================

document.addEventListener("DOMContentLoaded", () => {

    // Mostrar el usuario logueado, Email y cantidad de viajes en el perfil
    document.getElementById("nombreUsuario").textContent =
    usuario.nombre;

    document.getElementById("emailUsuario").textContent =
    usuario.email;

    document.getElementById("cantidadViajes").textContent =
    trips.length;

    document
        .getElementById("origen")
        .addEventListener("change", actualizarDistancia);

    document
        .getElementById("destino")
        .addEventListener("change", actualizarDistancia);

    document
        .getElementById("rentBikeModal")
        .addEventListener("shown.bs.modal", actualizarDistancia);

        if (!localStorage.getItem("estaciones")) {

            generarBicisAleatorias();
        
        };

    document
        .getElementById("buscarViaje")
        .addEventListener(
            "keyup",
            filtrarViajes
        );

    renderTrips();
    actualizarEstadisticas();
    renderEstaciones();

    document
    .getElementById("ordenViajes")
    .addEventListener(
        "change",
        ordenarViajes
    );

    document.getElementById("fechaRegistro").textContent =
    usuario.fechaRegistro || "-";

    actualizarSelectEstaciones();


    if (viajeActivo) {
        mostrarViajeActivo();
    }
    
    actualizarTiempoDisponibleHoy();
});