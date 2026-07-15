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


function obtenerDistancia(origen, destino) {
    if (origen === destino) return 0;
    return distancias[origen]?.[destino] ?? null;
}
function renderEstaciones() {

    const mapa = document.getElementById("mapa");

    mapa.innerHTML = `
        <div class="row text-center">

            <div class="col-md-4">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h5>📍 Plaza Independencia</h5>
                        <p>🚲 ${estaciones["Plaza Independencia"].bicis} bicicletas</p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h5>📍 Parque 9 de Julio</h5>
                        <p>🚲 ${estaciones["Parque 9 de Julio"].bicis} bicicletas</p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h5>📍 Terminal</h5>
                        <p>🚲 ${estaciones["Terminal"].bicis} bicicletas</p>
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
            new Date()
                .toLocaleString(),

        origen,
        destino,
        km
    };

    trips.push(viaje);

    localStorage.setItem(
        `trips_${usuario.email}`,
        JSON.stringify(trips)
    );
    
    document.getElementById("cantidadViajes").textContent =
        trips.length;

    estaciones[origen].bicis--;
    estaciones[destino].bicis++;

    localStorage.setItem(
        "estaciones",
        JSON.stringify(estaciones)
    );


    renderTrips();
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
    function actualizarEstadisticas() {

        let km = 0;
    
        const contador = {};
    
        trips.forEach(viaje => {
    
            km += viaje.km;
    
            contador[viaje.origen] =
                (contador[viaje.origen] || 0) + 1;
    
        });
    
        document.getElementById("kmTotales").textContent =
            km.toFixed(1);
    
        if (trips.length > 0) {
    
            document.getElementById("ultimoViaje").textContent =
                trips[trips.length - 1].fecha;
    
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
    
    }


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
});