//======================================================
// VARIABLES GLOBALES
//======================================================

let usuario = null;
let trips = [];
let tipoPlanSeleccionado = 'por_km';
let cargosPendientes = [];


function seleccionarPlan(tipo) {
    tipoPlanSeleccionado = tipo;
}

//======================================================
// MEMBRESÍAS
//======================================================

async function consultarMembresiaActiva() {

    const { data, error } = await supabaseClient
        .from("suscripciones")
        .select("id, fecha_inicio, fecha_fin, estado")
        .eq("usuario_id", usuario.id)
        .eq("estado", "activa")
        .lte("fecha_inicio", new Date().toISOString())
        .gt("fecha_fin", new Date().toISOString())
        .order("fecha_fin", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}


//======================================================
// PAGO SIMULADO DE MEMBRESÍA
//======================================================

function validarDatosTarjeta() {

    const numero = document.getElementById("numeroTarjeta").value
        .replace(/\s/g, "");

    const vencimiento = document.getElementById("vencimientoTarjeta").value.trim();

    const codigo = document.getElementById("codigoSeguridad").value.trim();

    // Validar los 16 dígitos de la tarjeta.
    if (!/^\d{16}$/.test(numero)) {
        return "El número de tarjeta debe contener exactamente 16 dígitos.";
    }

    // Validar formato MM/AA.
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimiento)) {
        return "Ingresá un vencimiento válido en formato MM/AA.";
    }

    // Validar que la tarjeta no esté vencida.
    const [mes, anio] = vencimiento.split("/").map(Number);

    const fechaVencimiento = new Date(2000 + anio, mes, 1);
    const fechaActual = new Date();
    const primerDiaMesActual = new Date(
        fechaActual.getFullYear(),
        fechaActual.getMonth(),
        1
    );

    if (fechaVencimiento <= primerDiaMesActual) {
        return "La tarjeta está vencida. Ingresá una fecha posterior al mes actual.";
    }

    // Validar código de seguridad.
    if (!/^\d{3}$/.test(codigo)) {
        return "El código de seguridad debe contener exactamente 3 dígitos.";
    }

    return null;
}


function validarDatosTarjetaPenalizaciones() {
    const numero = document.getElementById("numeroTarjetaPenalizaciones").value
        .replace(/\s/g, "");

    const vencimiento = document.getElementById("vencimientoTarjetaPenalizaciones").value.trim();
    const codigo = document.getElementById("codigoSeguridadPenalizaciones").value.trim();

    if (!/^\d{16}$/.test(numero)) {
        return "El número de tarjeta debe contener exactamente 16 dígitos.";
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimiento)) {
        return "Ingresá un vencimiento válido en formato MM/AA.";
    }

    const [mes, anio] = vencimiento.split("/").map(Number);
    const fechaVencimiento = new Date(2000 + anio, mes, 1);
    const fechaActual = new Date();
    const primerDiaMesActual = new Date(
        fechaActual.getFullYear(),
        fechaActual.getMonth(),
        1
    );

    if (fechaVencimiento <= primerDiaMesActual) {
        return "La tarjeta está vencida. Ingresá una fecha posterior al mes actual.";
    }

    if (!/^\d{3}$/.test(codigo)) {
        return "El código de seguridad debe contener exactamente 3 dígitos.";
    }

    return null;
}

async function procesarPagoMembresia() {

    const boton = document.getElementById("btnPagar");
    const mensajeError = document.getElementById("errorPago");

    mensajeError.classList.add("d-none");
    mensajeError.textContent = "";

    const errorValidacion = validarDatosTarjeta();

    if (errorValidacion) {
        mensajeError.textContent = errorValidacion;
        mensajeError.classList.remove("d-none");
        return;
    }

    boton.disabled = true;
    boton.textContent = "Procesando pago...";

    try {

        // Registrar el pago y activar la membresía en Supabase.
        const { data, error } = await supabaseClient.rpc(
            "procesar_pago_membresia_simulada"
        );

        if (error) throw error;

        console.log("Pago registrado:", data);

        // Cerrar el formulario de pago.
       const paymentModalElement = document.getElementById("paymentModal");

        const paymentModal = bootstrap.Modal.getInstance(paymentModalElement);

        if (paymentModal) {
            const modalCerrado = new Promise(resolve => {
                paymentModalElement.addEventListener(
                    "hidden.bs.modal",
                    resolve,
                    { once: true }
                );
            });
        
            paymentModal.hide();
        
            await modalCerrado;
        }

// Iniciar automáticamente el alquiler con el origen y destino seleccionados.
const alquilerIniciado = await rentBike();

        if (!alquilerIniciado) {
            throw new Error(
                "El pago fue aprobado, pero no se pudo iniciar el alquiler. La membresía quedó registrada."
            );
        }

        // Mostrar la confirmación del pago

        mostrarModal(
            "¡Transacción aprobada!",
            "Tu pago fue aprobado correctamente.",
            "success"
        );

        // Volver al inicio después de 5 segundos.
        setTimeout(() => {
            window.location.href = "index.html";
        }, 5000);

    } catch (error) {

        console.error("Error al procesar el pago:", error);

        mensajeError.textContent =
            error.message || "No se pudo procesar el pago. Intentá nuevamente.";

        mensajeError.classList.remove("d-none");

    } finally {

        boton.disabled = false;
        boton.textContent = "Pagar";

    }
}




// =========================
// CONFIGURACIÓN DE ALQUILER
// =========================

const MAX_TIEMPO_VIAJE = 60 * 60 * 1000; // 1 hora por viaje

const MAX_TIEMPO_DIARIO_BASICO = 4 * 60 * 60; // 4 horas en segundos
const MAX_TIEMPO_DIARIO_MENSUAL = 8 * 60 * 60; // 8 horas en segundos

let claveViajeActivo = null;
let viajeActivo = null;

let relojIntervalo = null;
let intervaloTiempoDisponible = null;

let estaciones = {}

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




//======================================================
// ALQUILER DE BICICLETAS
//======================================================


async function rentBike() {

        // Verificar si el usuario tiene un viaje pendiente de devolución.
    if (viajeActivo) {
        mostrarModal(
            "Viaje pendiente de devolución",
            "Tenés una bicicleta pendiente de devolución. Finalizá tu viaje actual antes de iniciar otro alquiler.",
            "warning"
        );

        return false;
    }


        // Verificar el tiempo disponible del usuario para hoy.
    try {
        const tiempoDisponible = await actualizarTiempoDisponibleHoy();

        if (tiempoDisponible <= 0) {
    const membresia = await consultarMembresiaActiva();

    const limite = membresia ? "8 horas" : "4 horas";

    mostrarModal(
        "Límite diario alcanzado",
        `Alcanzaste el límite máximo de ${limite} de alquiler por día correspondiente a tu plan. Podrás volver a alquilar mañana.`,
        "warning"
    );

    return false;
    }

    } catch (error) {
        console.error("Error al verificar el tiempo disponible:", error);
        alert("No se pudo verificar el tiempo disponible. Intentá nuevamente.");
        return false;
    }



    const origen = document.getElementById("origen").value;
    const destino = document.getElementById("destino").value;
    const boton = document.getElementById("btnAlquilar");

    // Verificar membresía si seleccionó el plan mensual.
if (tipoPlanSeleccionado === "mensual") {

    try {
        const membresia = await consultarMembresiaActiva();

        if (!membresia) {

        const paymentModal = new bootstrap.Modal(
        document.getElementById("paymentModal")
        );

        paymentModal.show();

        return false;

        }

        console.log(
            "Membresía activa hasta:",
            new Date(membresia.fecha_fin).toLocaleDateString("es-AR")
        );

    } catch (error) {
        console.error("Error al consultar la membresía:", error);

        mostrarModal(
            "Error al consultar la membresía",
            "No pudimos verificar tu membresía. Intentá nuevamente.",
            "danger"
        );
        return false; 
    }
}


    if (origen === destino) {
        mostrarModal("Ruta inválida", "Elegí dos estaciones distintas.", "warning");
        return false;
    }

    if (!estaciones[origen] || estaciones[origen].bicis === 0) {
        mostrarModal(
            "Sin disponibilidad",
            "No hay bicicletas disponibles en esta estación.",
            "warning"
        );
        return false;
    }

    const km = obtenerDistancia(origen, destino);

    if (km === null) {
        mostrarModal(
            "Ruta no disponible",
            "No hay distancia registrada para esa ruta.",
            "danger"
        );
        return false;
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
            p_estacion_destino_id: estaciones[destino].id,
            p_tipo_plan: tipoPlanSeleccionado
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

        return true;

    } catch (error) {
        console.error("Error al iniciar el alquiler:", error);

        mostrarModal(
            "No se pudo realizar el alquiler",
            error.message || "Ocurrió un error al registrar el alquiler.",
            "danger"
        );

        return false;

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



async function cargarHistorialDesdeSupabase() {
    const { data: viajes, error } = await supabaseClient
        .from("viajes")
        .select(`
            id,
            bicicleta_id,
            estacion_origen_id,
            estacion_destino_id,
            inicio,
            fin,
            duracion_segundos,
            km,
            estado
        `)
        .eq("usuario_id", usuario.id)
        .eq("estado", "finalizado")
        .order("inicio", { ascending: false });

    if (error) throw error;

    if (!viajes || viajes.length === 0) {
        trips = [];
        return;
    }

    // Obtener los IDs de estaciones y bicicletas utilizados.
    const estacionesIds = [
        ...new Set(
            viajes.flatMap(viaje => [
                viaje.estacion_origen_id,
                viaje.estacion_destino_id
            ]).filter(id => id !== null)
        )
    ];

    const bicicletasIds = [
        ...new Set(viajes.map(viaje => viaje.bicicleta_id))
    ];

    // Consultar los nombres de las estaciones.
    const { data: estacionesDB, error: errorEstaciones } =
        await supabaseClient
            .from("estaciones")
            .select("id, nombre")
            .in("id", estacionesIds);

    if (errorEstaciones) throw errorEstaciones;

    // Consultar los códigos de las bicicletas.
    const { data: bicicletasDB, error: errorBicicletas } =
        await supabaseClient
            .from("bicicletas")
            .select("id, codigo")
            .in("id", bicicletasIds);

    if (errorBicicletas) throw errorBicicletas;

    // Crear mapas para relacionar los IDs con sus nombres.
    const nombresEstaciones = Object.fromEntries(
        estacionesDB.map(estacion => [
            estacion.id,
            estacion.nombre
        ])
    );

    const codigosBicicletas = Object.fromEntries(
        bicicletasDB.map(bicicleta => [
            bicicleta.id,
            bicicleta.codigo
        ])
    );

    // Adaptar los datos de Supabase al formato que utiliza la aplicación.
    trips = viajes.map(viaje => ({
        id: viaje.id,
        bicicletaId: viaje.bicicleta_id,
        bicicletaCodigo: codigosBicicletas[viaje.bicicleta_id] || "-",
        fecha: viaje.fin
            ? new Date(viaje.fin).toLocaleString("es-AR")
            : "-",
        timestamp: new Date(viaje.inicio).getTime(),
        origen: nombresEstaciones[viaje.estacion_origen_id] || "-",
        destino: nombresEstaciones[viaje.estacion_destino_id] || "-",
        km: Number(viaje.km) || 0,
        duracionSegundos: viaje.duracion_segundos || 0,
        inicio: viaje.inicio,
        fin: viaje.fin,
        estado: viaje.estado
    }));
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
        alerta.textContent =
            "🔴 ¡Tiempo máximo alcanzado! Se cumplió el límite de 60 minutos. Por favor, dirigite a una estación para devolver la bicicleta.";
    } else {
        alerta.className = "alert alert-success mt-3 mb-3";
        alerta.textContent =
            "🟢 Tiempo máximo por viaje: 60 minutos.";
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

        await actualizarTiempoDisponibleHoy();

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


//**********CARGOS PENDIENTES*******//


function formatearImporte(importe) {
    return Number(importe).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS"
    });
}


async function cargarCargosPendientesDesdeSupabase() {

    const lista = document.getElementById("listaCargosPendientes");
    const cantidad = document.getElementById("cantidadCargosPendientes");
    const total = document.getElementById("totalCargosPendientes");
    const boton = document.getElementById("btnPagarCargos");
    const mensaje = document.getElementById("mensajeCargosPendientes");

    boton.disabled = true;
    lista.innerHTML = `
        <p class="text-muted mb-0">
            Consultando cargos pendientes...
        </p>
    `;

    mensaje.classList.add("d-none");

    try {

        const { data, error } = await supabaseClient
            .from("penalizaciones")
            .select("id, viaje_id, minutos_excedidos, importe, fecha")
            .eq("usuario_id", usuario.id)
            .eq("estado", "pendiente")
            .order("fecha", { ascending: false });

        if (error) throw error;

        cargosPendientes = data || [];

        cantidad.textContent = cargosPendientes.length;

        const importeTotal = cargosPendientes.reduce(
            (acumulado, cargo) =>
                acumulado + Number(cargo.importe),
            0
        );

        total.textContent = formatearImporte(importeTotal);

        if (cargosPendientes.length === 0) {

            lista.innerHTML = `
                <p class="text-muted mb-0">
                    No tenés cargos pendientes de pago.
                </p>
            `;

            boton.disabled = true;
            return;
        }

        lista.innerHTML = cargosPendientes.map(cargo => {

            const fecha = new Date(cargo.fecha)
                .toLocaleString("es-AR");

            return `
                <div class="border rounded p-3 mb-2">
                    <div class="d-flex justify-content-between align-items-center">

                        <div>
                            <strong>Cargo por exceso de tiempo</strong>

                            <div class="text-muted small">
                                Viaje #${Number(cargo.viaje_id)}
                            </div>

                            <div class="text-muted small">
                                ${Number(cargo.minutos_excedidos)} minutos excedidos
                            </div>

                            <div class="text-muted small">
                                ${fecha}
                            </div>
                        </div>

                        <strong class="text-danger">
                            ${formatearImporte(cargo.importe)}
                        </strong>

                    </div>
                </div>
            `;

        }).join("");

        boton.disabled = false;

    } catch (error) {

        console.error("Error al consultar cargos pendientes:", error);

        cargosPendientes = [];

        cantidad.textContent = "0";
        total.textContent = formatearImporte(0);

        lista.innerHTML = `
            <p class="text-danger mb-0">
                No se pudieron consultar los cargos pendientes.
            </p>
        `;

        mensaje.textContent =
            error.message || "Ocurrió un error al consultar los cargos.";

        mensaje.className = "alert alert-danger mt-3";
        mensaje.classList.remove("d-none");

        boton.disabled = true;
    }
}

async function pagarCargosPendientes() {

    if (cargosPendientes.length === 0) {

        mostrarModal(
            "Sin cargos pendientes",
            "No tenés cargos pendientes para pagar.",
            "info"
        );

        return;
    }

    // Calcular el total de los cargos pendientes.
    const total = cargosPendientes.reduce(
        (acumulado, cargo) => acumulado + Number(cargo.importe),
        0
    );

    // Mostrar el importe en el nuevo modal.
    document.getElementById("totalPenalizacionesModal").textContent =
        formatearImporte(total);

    // Limpiar los campos de tarjeta.
    document.getElementById("numeroTarjetaPenalizaciones").value = "";
    document.getElementById("vencimientoTarjetaPenalizaciones").value = "";
    document.getElementById("codigoSeguridadPenalizaciones").value = "";

    // Limpiar errores anteriores.
    const errorPago = document.getElementById("errorPagoPenalizaciones");
    errorPago.textContent = "";
    errorPago.classList.add("d-none");

    // Abrir el modal de pago.
    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("penaltyPaymentModal")
    );

    modal.show();
}







async function actualizarTiempoDisponibleHoy() {
    const ahora = new Date();

    // Obtener el inicio y el final del día actual.
    const inicioDia = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate()
    );

    const inicioManana = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + 1
    );

    // Consultar los viajes del usuario iniciados hoy.
    const { data: viajesHoy, error } = await supabaseClient
        .from("viajes")
        .select("inicio, fin, duracion_segundos, estado")
        .eq("usuario_id", usuario.id)
        .gte("inicio", inicioDia.toISOString())
        .lt("inicio", inicioManana.toISOString())
        .in("estado", ["finalizado", "en_curso"]);

    if (error) throw error;

    let tiempoUtilizado = 0;

    viajesHoy.forEach(viaje => {
        if (viaje.estado === "finalizado") {
            tiempoUtilizado += Number(viaje.duracion_segundos) || 0;
        } else if (viaje.estado === "en_curso") {
            tiempoUtilizado += Math.floor(
                (ahora.getTime() - new Date(viaje.inicio).getTime()) / 1000
            );
        }
    });

    // Determinar el límite diario según la membresía activa.
    const membresia = await consultarMembresiaActiva();

    const limiteDiario = membresia
    ? MAX_TIEMPO_DIARIO_MENSUAL
    : MAX_TIEMPO_DIARIO_BASICO;    
    const tiempoRestante = Math.max(0, limiteDiario - tiempoUtilizado);

    const horas = Math.floor(tiempoRestante / 3600);
    const minutos = Math.floor((tiempoRestante % 3600) / 60);

    document.getElementById("tiempoDisponibleHoy").textContent =
        `${horas} h ${minutos} min`;

    return tiempoRestante;
}

function iniciarActualizacionTiempoDisponible() {

    // Evitar crear más de un intervalo.
    if (intervaloTiempoDisponible !== null) {
        clearInterval(intervaloTiempoDisponible);
    }

    // Actualizar el tiempo disponible cada 60 segundos.
    intervaloTiempoDisponible = setInterval(async () => {
        try {
            await actualizarTiempoDisponibleHoy();
        } catch (error) {
            console.error(
                "Error al actualizar el tiempo disponible:",
                error
            );
        }
    }, 60000);
}



function actualizarEstadisticas() {
    let km = 0;
    let viajeMasLargo = 0;

    const contador = {};
    const estacionesUtilizadas = new Set();

    trips.forEach(viaje => {
        const distancia = Number(viaje.km) || 0;

        km += distancia;

        if (distancia > viajeMasLargo) {
            viajeMasLargo = distancia;
        }

        estacionesUtilizadas.add(viaje.origen);
        estacionesUtilizadas.add(viaje.destino);

        contador[viaje.origen] =
            (contador[viaje.origen] || 0) + 1;
    });

    document.getElementById("cantidadViajes").textContent =
        trips.length;

    document.getElementById("kmTotales").textContent =
        km.toFixed(1);

    document.getElementById("viajeMasLargo").textContent =
        viajeMasLargo.toFixed(1);

    document.getElementById("promedioKm").textContent =
        trips.length ? (km / trips.length).toFixed(1) : "0";

    document.getElementById("estacionesUsadas").textContent =
        estacionesUtilizadas.size;

    // Obtener el último viaje por fecha de finalización.
    const ultimo = [...trips].sort(
        (a, b) => new Date(b.fin) - new Date(a.fin)
    )[0];

    document.getElementById("ultimoViaje").textContent =
        ultimo ? ultimo.fecha : "Sin viajes";

    // Obtener la estación de origen más utilizada.
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

//======================================================
// HISTORIAL DE VIAJES
//======================================================

function renderTrips() {
    const table = document.getElementById("tripTable");

    if (!table) return;

    table.innerHTML = "";

    // Copiamos el arreglo para no modificar el historial original.
    let viajesMostrar = [...trips];

    // Aplicar búsqueda.
    const buscador = document.getElementById("buscarViaje");

    const texto = buscador
        ? buscador.value.toLowerCase().trim()
        : "";

    if (texto) {
        viajesMostrar = viajesMostrar.filter(viaje =>
            [
                viaje.id,
                viaje.fecha,
                viaje.origen,
                viaje.destino,
                viaje.bicicletaCodigo,
                viaje.km
            ].join(" ").toLowerCase().includes(texto)
        );
    }

    // Aplicar ordenamiento.
    const orden = document.getElementById("ordenViajes")?.value;

    switch (orden) {
        case "recientes":
            viajesMostrar.sort(
                (a, b) => new Date(b.inicio) - new Date(a.inicio)
            );
            break;

        case "antiguos":
            viajesMostrar.sort(
                (a, b) => new Date(a.inicio) - new Date(b.inicio)
            );
            break;

        case "kmMayor":
            viajesMostrar.sort((a, b) => b.km - a.km);
            break;

        case "kmMenor":
            viajesMostrar.sort((a, b) => a.km - b.km);
            break;
    }

    if (viajesMostrar.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    No hay viajes registrados.
                </td>
            </tr>
        `;
        return;
    }

    viajesMostrar.forEach(viaje => {
        table.innerHTML += `
            <tr>
                <td>${viaje.id}</td>
                <td>${viaje.fecha}</td>
                <td>${viaje.origen}</td>
                <td>${viaje.destino}</td>
                <td>${viaje.km.toFixed(1)} km</td>
            </tr>
        `;
    });
}

function filtrarViajes() {
    renderTrips();
}

function ordenarViajes() {
    renderTrips();
}


function eliminarHistorial() {
    const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteHistoryModal")
    );

    if (modal) modal.hide();

    mostrarModal(
        "Historial protegido",
        "Los viajes registrados se conservan en la base de datos y no pueden eliminarse desde esta pantalla.",
        "warning"
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

    usuario = usuarioAutenticado;

    if (!usuario) {
        window.location.replace("login.html");
        return;
    }

    claveViajeActivo = null;
    viajeActivo = null;



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
        await cargarHistorialDesdeSupabase();
        await actualizarTiempoDisponibleHoy();
        iniciarActualizacionTiempoDisponible();

        } catch (error) {
        console.error("Error al cargar datos desde Supabase:", error);

        mostrarModal(
            "Error al cargar los datos",
            "No pudimos obtener la información de estaciones, bicicletas o historial. Revisá la conexión con Supabase y sus políticas de acceso.",
            "danger"
        );

        return;
    }

    // Consultar los cargos pendientes del usuario.
    await cargarCargosPendientesDesdeSupabase();

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
