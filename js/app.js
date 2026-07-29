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
                        <p class="${plaza.clase} fw-bold">${plaza.texto}</p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm card-estacion ${parque.cardClase}">
                    <div class="card-body">
                        <h5>📍 Parque 9 de Julio</h5>
                        <p>🚲 ${estaciones["Parque 9 de Julio"].bicis} bicicletas</p>
                        <p class="${parque.clase} fw-bold">${parque.texto}</p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm card-estacion ${terminal.cardClase}">
                    <div class="card-body">
                        <h5>📍 Terminal</h5>
                        <p>🚲 ${estaciones["Terminal"].bicis} bicicletas</p>
                        <p class="${terminal.clase} fw-bold">${terminal.texto}</p>
                    </div>
                </div>
            </div>

        </div>
    `;
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

    if (origen === destino) {
        mostrarModal(
            "Ruta inválida",
            "Elegí dos estaciones distintas.",
            "warning"
        );
    
        return;
    }


    if (estaciones[origen].bicis === 0) {

            mostrarModal(
                "Sin disponibilidad",
                "No hay bicicletas disponibles en esta estación.",
                "warning"
            );

            return;
        }

        const km = obtenerDistancia(origen, destino);

        if (km === null) {

            mostrarModal(
                "Ruta no disponible",
                "No hay distancia registrada para esa ruta.",
                "danger"
            );
        
            return;
        }

        const viaje = {

            id: trips.length + 1,
        
            fecha:
                new Date().toLocaleString("es-AR"),
        
            timestamp:
                Date.now(),
        
            origen,
            destino,
            km
        
        };

    trips.push(viaje);

    guardarViajes();
    
    document.getElementById("cantidadViajes").textContent =
        trips.length;

    estaciones[origen].bicis--;
    estaciones[destino].bicis++;

    guardarEstaciones();


    ordenarViajes();
    actualizarEstadisticas();
    renderEstaciones();

const rentModal =
    bootstrap.Modal.getInstance(
        document.getElementById("rentBikeModal")
    );

if (rentModal) {
    rentModal.hide();
}

// Mostrar el modal de éxito
const successModal =
    new bootstrap.Modal(
        document.getElementById("successModal")
    );

successModal.show();
setTimeout(() => {

    successModal.hide();

    showSection("home");

}, 3500);


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
                <td>${viaje.origen}</td>
                <td>${viaje.destino}</td>
                <td>${viaje.km} km</td>
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
});