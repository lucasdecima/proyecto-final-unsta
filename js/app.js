//======================================================
// VARIABLES GLOBALES
//======================================================

let usuario = null;
let trips = [];

// =========================
// CONFIGURACIÓN DE ALQUILER
// =========================

const MAX_TIEMPO_VIAJE = 60 * 60 * 1000; // 1 hora
const MAX_TIEMPO_DIARIO = 4 * 60 * 60 * 1000; // 4 horas

let claveViajeActivo = null;
let viajeActivo = null;

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

async function cargarEstacionesDesdeSupabase() {
    if (!supabaseClient) {
        throw new Error("El cliente de Supabase no está inicializado.");
    }

    const { data, error } = await supabaseClient
        .from("estaciones")
        .select("id, nombre");

    if (error) {
        throw error;
    }

    const { data: bicicletas, error: errorBicicletas } =
        await supabaseClient
            .from("bicicletas")
            .select("id, codigo, estacion_id, estado");

    if (errorBicicletas) {
        throw errorBicicletas;
    }

    const estacionesActualizadas = {};

    data.forEach(estacion => {
        const disponibles = bicicletas.filter(
            bicicleta =>
                bicicleta.estacion_id === estacion.id &&
                bicicleta.estado === "disponible"
        ).length;

        estacionesActualizadas[estacion.nombre] = {
            id: estacion.id,
            bicis: disponibles
        };
    });

    estaciones = estacionesActualizadas;

    return estaciones;
}




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

    if(!mapa) return;

    const nombres = Object.keys(estaciones);

    if(nombres.length === 0){
        mapa.innerHTML = `
            <p class="text center text-muted">
            No hay estaciones registradas.
            </p> `
            return;
    }

    mapa.innerHTML = `
        <div class="row text-center">
            ${nombres.map(nombre => {
                const cantidad = estaciones[nombre].bicis;
                const estado = obtenerEstadoEstacion(cantidad);

                return `
                    <div class="col-md-4 mb-3">
                        <div class="card shadow-sm card-estacion ${estado.cardClase}">
                            <div class="card-body">
                                <h5>📍 ${nombre}</h5>
                                <p>🚲 ${cantidad} bicicletas</p>
                                <p class="${estado.textoClase} fw-bold">
                                    ${estado.texto}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            }).join("")}
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


async function rentBike() {
    const origen = document.getElementById("origen").value;
    const destino = document.getElementById("destino").value;
    const boton = document.getElementById("btnAlquilar");

    if (origen === destino) {
        mostrarModal("Ruta inválida", "Elegí dos estaciones distintas.", "warning");
        return;
    }

    if (!estaciones[origen] || estaciones[origen].bicis === 0) {
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

    boton.disabled = true;
    boton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Alquilando bicicleta...
    `;

    try {
        const { data, error } = await supabaseClient.rpc(
            "iniciar_alquiler",
            {
                p_estacion_origen_id: estaciones[origen].id,
                p_estacion_destino_id: estaciones[destino].id
            }
        );

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("Supabase no devolvió los datos del alquiler.");
        }

        const alquiler = data[0];

        // Guardamos temporalmente los datos del viaje activo en memoria.
        viajeActivo = {
            id: alquiler.viaje_id,
            bicicletaId: alquiler.bicicleta_id,
            bicicletaCodigo: alquiler.bicicleta_codigo,
            inicio: alquiler.inicio,
            origen: origen,
            destino: destino,
            estado: alquiler.estado
        };

        await cargarEstacionesDesdeSupabase();
        actualizarSelectEstaciones();
        renderEstaciones();

        const rentModal = bootstrap.Modal.getInstance(
            document.getElementById("rentBikeModal")
        );

        if (rentModal) rentModal.hide();

        mostrarViajeActivo();

        const successModal = new bootstrap.Modal(
            document.getElementById("successModal")
        );

        successModal.show();

        setTimeout(() => {
            successModal.hide();
        }, 2500);

    } catch (error) {
        console.error("Error al iniciar el alquiler:", error);

        mostrarModal(
            "No se pudo realizar el alquiler",
            error.message || "Ocurrió un error al registrar el alquiler.",
            "danger"
        );

    } finally {
        boton.disabled = false;
        boton.innerHTML = "Confirmar Alquiler";
    }
}


async function cargarViajeActivoDesdeSupabase() {
    const { data, error } = await supabaseClient
        .from("viajes")
        .select("*")
        .eq("usuario_id", usuario.id)
        .eq("estado", "en_curso")
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        viajeActivo = null;
        return null;
    }

    const { data: bicicleta, error: errorBicicleta } =
        await supabaseClient
            .from("bicicletas")
            .select("codigo")
            .eq("id", data.bicicleta_id)
            .single();

    if (errorBicicleta) throw errorBicicleta;

    const { data: origen, error: errorOrigen } =
        await supabaseClient
            .from("estaciones")
            .select("nombre")
            .eq("id", data.estacion_origen_id)
            .single();

    if (errorOrigen) throw errorOrigen;

    const { data: destino, error: errorDestino } =
        await supabaseClient
            .from("estaciones")
            .select("nombre")
            .eq("id", data.estacion_destino_id)
            .single();

    if (errorDestino) throw errorDestino;

    viajeActivo = {
        id: data.id,
        bicicletaId: data.bicicleta_id,
        bicicletaCodigo: bicicleta.codigo,
        inicio: data.inicio,
        origen: origen.nombre,
        destino: destino.nombre,
        estado: data.estado
    };

    return viajeActivo;
}


function mostrarViajeActivo() {
    const tarjeta = document.getElementById("viajeActivoCard");
    const selector = document.getElementById("estacionDevolucion");

    if (!viajeActivo) {
        tarjeta.classList.add("d-none");
        detenerRelojViaje();
        return;
    }

    tarjeta.classList.remove("d-none");

    document.getElementById("bicicletaActiva").textContent =
        viajeActivo.bicicletaCodigo;

    document.getElementById("origenViaje").textContent =
        viajeActivo.origen;

    document.getElementById("destinoViaje").textContent =
        viajeActivo.destino;

    // Cargamos las estaciones disponibles como lugares de devolución.
    selector.innerHTML = `
        <option value="">Seleccioná dónde devolver la bicicleta</option>
    `;

    Object.entries(estaciones).forEach(([nombre, estacion]) => {
        selector.innerHTML += `
            <option value="${estacion.id}">${nombre}</option>
        `;
    });

    selector.value = "";

    iniciarRelojViaje();
}


function iniciarRelojViaje() {
    detenerRelojViaje();

    actualizarRelojViaje();

    relojIntervalo = setInterval(() => {
        actualizarRelojViaje();
    }, 1000);
}


function detenerRelojViaje() {
    if (relojIntervalo) {
        clearInterval(relojIntervalo);
        relojIntervalo = null;
    }
}


function actualizarRelojViaje() {
    if (!viajeActivo) return;

    const inicio = new Date(viajeActivo.inicio).getTime();
    const transcurrido = Date.now() - inicio;

    const horas = Math.floor(transcurrido / 3600000);
    const minutos = Math.floor((transcurrido % 3600000) / 60000);
    const segundos = Math.floor((transcurrido % 60000) / 1000);

    document.getElementById("relojViaje").textContent =
        [horas, minutos, segundos]
            .map(valor => String(valor).padStart(2, "0"))
            .join(":");

    const alerta = document.getElementById("alertaTiempoViaje");

    if (transcurrido >= MAX_TIEMPO_VIAJE) {
        alerta.className = "alert alert-danger mt-3 mb-3";
        alerta.textContent = "🔴 Se superó el límite de 1 hora de viaje.";
    } else if (transcurrido >= MAX_TIEMPO_VIAJE * 0.8) {
        alerta.className = "alert alert-warning mt-3 mb-3";
        alerta.textContent = "🟡 Tu viaje está cerca del límite de 1 hora.";
    } else {
        alerta.className = "alert alert-success mt-3 mb-3";
        alerta.textContent = "🟢 Tenés hasta 1 hora para completar este viaje.";
    }
}


async function finalizarViaje() {
    if (!viajeActivo) {
        mostrarModal(
            "No hay un viaje activo",
            "No encontramos un viaje pendiente de devolución.",
            "warning"
        );
        return;
    }

    const selector = document.getElementById("estacionDevolucion");
    const estacionId = Number(selector.value);

    if (!estacionId) {
        mostrarModal(
            "Seleccioná una estación",
            "Debés indicar dónde devolvés la bicicleta.",
            "warning"
        );
        return;
    }

    const boton = document.getElementById("btnFinalizarViaje");

    boton.disabled = true;
    boton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Finalizando viaje...
    `;

    try {
        const { data, error } = await supabaseClient.rpc(
            "finalizar_alquiler",
            {
                p_viaje_id: viajeActivo.id,
                p_estacion_devolucion_id: estacionId
            }
        );

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("Supabase no devolvió los datos de la devolución.");
        }

        const resultado = data[0];

        viajeActivo = null;
        detenerRelojViaje();

        await cargarEstacionesDesdeSupabase();
        actualizarSelectEstaciones();
        renderEstaciones();

        document.getElementById("viajeActivoCard").classList.add("d-none");

        mostrarModal(
            "¡Devolución exitosa!",
            `La bicicleta fue devuelta correctamente. Distancia recorrida: ${resultado.km} km.`,
            "success"
        );

    } catch (error) {
        console.error("Error al finalizar el viaje:", error);

        mostrarModal(
            "No se pudo finalizar el viaje",
            error.message || "Ocurrió un error al registrar la devolución.",
            "danger"
        );

    } finally {
        boton.disabled = false;
        boton.innerHTML = "🚲 Finalizar viaje";
    }
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


 //======================================================
 // INICIALIZACIÓN
 //======================================================

document.addEventListener("DOMContentLoaded", async () => {

    // Verificar la sesión real de Supabase.
    const sesionValida = await verificarSesion();

    if (!sesionValida) {
        return;
    }

    usuario = JSON.parse(
        localStorage.getItem("usuarioLogueado")
    );

    if (!usuario) {
        window.location.replace("login.html");
        return;
    }

    claveViajeActivo = null;
    viajeActivo = null;

    // Carga temporal: los viajes todavía están en localStorage.
    trips = JSON.parse(
        localStorage.getItem(`trips_${usuario.email}`)
    ) || [];

    trips.forEach(viaje => {
        if (!viaje.timestamp) {
            viaje.timestamp = Date.now();
        }
    });

    // Mostrar los datos del perfil.
    document.getElementById("nombreUsuario").textContent =
        usuario.nombre;

    document.getElementById("emailUsuario").textContent =
        usuario.email;

    document.getElementById("cantidadViajes").textContent =
        trips.length;

    document.getElementById("fechaRegistro").textContent =
        usuario.fechaRegistro || "-";

    // Eventos de alquiler.
    document
        .getElementById("origen")
        .addEventListener("change", actualizarDistancia);

    document
        .getElementById("destino")
        .addEventListener("change", actualizarDistancia);

    document
        .getElementById("rentBikeModal")
        .addEventListener("shown.bs.modal", actualizarDistancia);

    
    try {
        await cargarEstacionesDesdeSupabase();
        await cargarViajeActivoDesdeSupabase();

    } catch (error) {
        console.error("Error al cargar estaciones desde Supabase:", error);

        mostrarModal(
            "Error al cargar estaciones",
            "No pudimos obtener las estaciones y bicicletas. Revisá la conexión con Supabase y sus políticas de acceso.",
            "danger"
        );

        return;
    }

    // Búsqueda y ordenamiento del historial.
    document
        .getElementById("buscarViaje")
        .addEventListener("keyup", filtrarViajes);

    document
        .getElementById("ordenViajes")
        .addEventListener("change", ordenarViajes);

    // Renderizado de la aplicación.
    renderTrips();
    actualizarEstadisticas();
    renderEstaciones();
    actualizarSelectEstaciones();
    mostrarViajeActivo();
});
