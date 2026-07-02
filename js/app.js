const usuario =
    JSON.parse(
        localStorage.getItem("usuarioLogueado")
    );

if (!usuario) {

    window.location.href = "login.html";

}

const trips = [];


const estaciones = {
    "Plaza Independencia": { bicis: 0 },
    "Parque 9 de Julio": { bicis: 0 },
    "Terminal": { bicis: 0 }
};

// Distancias en km entre cada par de estaciones.
// Se asume simétrica (A -> B = B -> A) para simplificar.
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
            ? `Distancia estimada: ${km} km`
            : "Distancia no disponible para esta ruta";
}

function rentBike() {

    const origen =
        document.getElementById("origen").value;

    const destino =
        document.getElementById("destino").value;

    if (origen === destino) {
        alert("Elegí dos estaciones distintas");
        return;
    }

    const km = obtenerDistancia(origen, destino);

    if (km === null) {
        alert("No hay distancia registrada para esa ruta");
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
    estaciones[origen].bicis--;
    estaciones[destino].bicis++;
    renderTrips();
    renderEstaciones();

    // Cerrar modal de alquiler
    const rentModal =
        bootstrap.Modal.getInstance(
            document.getElementById("rentBikeModal")
        );

    rentModal.hide();

    // Mostrar modal de éxito
    const successModal =
        new bootstrap.Modal(
            document.getElementById("successModal")
        );

    successModal.show();

}

function renderTrips() {

    const table =
        document.getElementById(
            "tripTable"
        );

    table.innerHTML = "";

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

document.addEventListener("DOMContentLoaded", () => {

    // Mostrar el usuario logueado en el perfil
    document.getElementById("nombreUsuario").textContent =
        usuario.nombre;

    document
        .getElementById("origen")
        .addEventListener("change", actualizarDistancia);

    document
        .getElementById("destino")
        .addEventListener("change", actualizarDistancia);

    document
        .getElementById("rentBikeModal")
        .addEventListener("shown.bs.modal", actualizarDistancia);

    generarBicisAleatorias();
    renderEstaciones();
});