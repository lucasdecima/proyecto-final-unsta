//======================================================
// VARIABLES GLOBALES
//======================================================
let usuario = null;
let trips = [];
let tipoPlanSeleccionado = null;
let cargosPendientes = [];
let intentosVerificacionUbicacion = 0;
let ubicacionVerificada = false;
let bicicletaSeleccionada = null;
let qrVerificado = false;
let intentosQRPorBicicleta = {};
let pasoAlquilerActual = 1;

const PLANES_MEMBRESIA = {
    quincenal: {
        nombre: "Membresía quincenal",
        dias: 15,
        importe: 13000
    },
    mensual: {
        nombre: "Membresía mensual",
        dias: 30,
        importe: 20000
    }
};

function iconoBicicleta(clase = "") {
    return `
        <svg
            class="icono-bicicleta ${clase}"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 40"
            width="28"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <circle cx="13" cy="27" r="9"/>
            <circle cx="51" cy="27" r="9"/>
            <path d="M13 27 L23 11 L34 27 L13 27"/>
            <path d="M23 11 L40 11 L51 27"/>
            <path d="M34 27 L40 11"/>
            <path d="M19 11 H27"/>
            <path d="M37 7 H43"/>
        </svg>
    `;
}


function seleccionarPlan(tipo) {

    const botonContinuar = document.getElementById("btnContinuarPaso");

    if (!PLANES_MEMBRESIA[tipo]) {
        tipoPlanSeleccionado = null;
        botonContinuar.disabled = true;
        return;
    }

    tipoPlanSeleccionado = tipo;

    const plan = PLANES_MEMBRESIA[tipo];

    document.getElementById("tituloPagoMembresia").textContent =
        `💳 Pago de ${plan.nombre.toLowerCase()}`;

    document.getElementById("importeMembresiaModal").textContent =
        `${formatearImporte(plan.importe)} ARS`;

    document.getElementById("detalleMembresiaModal").textContent =
        `${plan.nombre} - ${plan.dias} días`;

    // Habilitar Continuar porque ya se seleccionó un plan.
    botonContinuar.disabled = false;
}

//======================================================
// MEMBRESÍAS
//======================================================

async function consultarMembresiaActiva() {

    const { data, error } = await supabaseClient
        .from("suscripciones")
        .select("id, tipo_plan, fecha_inicio, fecha_fin, estado")
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


async function actualizarEstadoMembresiaHome() {

    const estado = document.getElementById("estadoMembresiaHome");

    if (!estado) return;

    try {

        const membresia = await consultarMembresiaActiva();

        if (membresia) {

            const plan = PLANES_MEMBRESIA[membresia.tipo_plan];

            estado.textContent =
                `${plan?.nombre || "Membresía activa"} - Vigente hasta el ${new Date(membresia.fecha_fin).toLocaleDateString("es-AR")}.`;

        } else {

            estado.textContent =
                "No tenés una membresía activa.";

        }

    } catch (error) {

        console.error(
            "Error al consultar la membresía del inicio:",
            error
        );

        estado.textContent =
            "No pudimos consultar tu membresía.";

    }
}

async function actualizarVistaMembresiaAlquiler() {
    const estadoMembresia = document.getElementById("estadoMembresiaAlquiler");
    const flujoAlquiler = document.getElementById("contenedorFlujoAlquiler");
    const planesMembresia = document.getElementById("contenedorPlanesMembresia");
    const btnAlquilar = document.getElementById("btnAlquilar");

    try {
        estadoMembresia.textContent = "Consultando tu membresía...";
        estadoMembresia.className = "alert alert-info";

        flujoAlquiler.classList.add("d-none");
        planesMembresia.classList.add("d-none");
        btnAlquilar.disabled = true;

        const membresia = await consultarMembresiaActiva();
        console.log("Membresía recibida por la interfaz:", membresia);

        if (membresia) {
            const plan = PLANES_MEMBRESIA[membresia.tipo_plan];

            estadoMembresia.textContent =
                `Tenés una ${plan?.nombre || "membresía activa"}. ` +
                `Vigente hasta el ${new Date(membresia.fecha_fin).toLocaleDateString("es-AR")}.`;

            estadoMembresia.className = "alert alert-success";

            flujoAlquiler.classList.remove("d-none");
            planesMembresia.classList.add("d-none");

        } else {
            estadoMembresia.textContent =
                "No tenés una membresía activa. Elegí un plan para comenzar a alquilar.";

            estadoMembresia.className = "alert alert-warning";

            flujoAlquiler.classList.add("d-none");
            planesMembresia.classList.remove("d-none");
        }

    } catch (error) {
        console.error("Error al consultar la membresía:", error);

        estadoMembresia.textContent =
            "No pudimos consultar tu membresía. Intentá nuevamente.";

        estadoMembresia.className = "alert alert-danger";

        flujoAlquiler.classList.add("d-none");
        planesMembresia.classList.add("d-none");
        btnAlquilar.disabled = true;
    }
}


function verificarUbicacion() {

    const estado = document.getElementById("estadoGeolocalizacion");
    const boton = document.getElementById("btnGeolocalizacion");

    const origen = document.getElementById("origen").value;

    // Validar que se haya seleccionado una estación.
    if (!origen) {
        estado.textContent =
            "Primero seleccioná una estación de origen.";

        estado.className = "alert alert-warning mt-2 mb-0";

        ubicacionVerificada = false;
        document.getElementById("btnContinuarPaso").disabled = true;

        return;
    }

    // Obtener las coordenadas de la estación seleccionada.
    const coordenadas = coordenadasEstaciones[origen];

    if (!coordenadas) {
    estado.textContent =
        "No encontramos las coordenadas de esta estación. Intentá nuevamente.";

    estado.className = "alert alert-danger mt-2 mb-0";

    ubicacionVerificada = false;
    document.getElementById("btnContinuarPaso").disabled = true;

    return;
    }

    boton.disabled = true;
    boton.textContent = "Verificando ubicación...";

    estado.textContent =
        "Comprobando tu proximidad a la estación...";

    estado.className = "alert alert-info mt-2 mb-0";

    // Contar el intento de verificación.
    intentosVerificacionUbicacion++;

    document.getElementById("btnContinuarPaso").disabled = true;

    const intento = intentosVerificacionUbicacion;

    // Simular la ubicación del usuario en la estación seleccionada.
    const ubicacionSimulada = {
        latitud: coordenadas[0],
        longitud: coordenadas[1]
    };

    console.log("Verificación de ubicación:", {
        intento: intento,
        estacion: origen,
        latitud: ubicacionSimulada.latitud,
        longitud: ubicacionSimulada.longitud
    });

    // Generar resultado aleatorio.
    const probabilidadFallo = Math.random();

    // Cada 4 intentos: posibilidad de advertencia.
    if (intento % 4 === 0 && probabilidadFallo < 0.75) {

        ubicacionVerificada = false;

        estado.textContent =
            "⚠️ No pudimos confirmar tu ubicación con precisión. Volvé a intentar la verificación.";

        estado.className = "alert alert-warning mt-2 mb-0";

        console.log("Advertencia simulada en el intento:", intento);

    }

    // Cada 2 intentos, excepto los múltiplos de 4: posibilidad de error.
    else if (
        intento % 2 === 0 &&
        intento % 4 !== 0 &&
        probabilidadFallo < 0.75
    ) {

        ubicacionVerificada = false;

        estado.textContent =
            "❌ No pudimos verificar tu ubicación. Parece que no estás cerca de una estación. Intentá nuevamente.";

        estado.className = "alert alert-danger mt-2 mb-0";

        console.log("Error simulado en el intento:", intento);

    }

    // Si no se activa ningún fallo, la verificación es exitosa.
    else {

        ubicacionVerificada = true;

        estado.textContent =
            "¡Ubicación verificada correctamente! Avanzando al siguiente paso...";

        estado.className = "alert alert-success mt-2 mb-0";

        console.log("Verificación exitosa en el intento:", intento);

        // Avanzar automáticamente al paso 2.
        setTimeout(() => {
            if (ubicacionVerificada) {
                avanzarPasoAlquiler();
            }
        }, 1200);
    }

    boton.disabled = false;

    boton.textContent = ubicacionVerificada
        ? "📍 Ubicación verificada"
        : "📍 Reintentar verificación";
}


function limpiarSeleccionBicicleta() {
    bicicletaSeleccionada = null;
    qrVerificado = false;

    document.getElementById("contenedorBicicletas").classList.add("d-none");
    document.getElementById("listaBicicletas").innerHTML = "";
    document.getElementById("contenedorQR").classList.add("d-none");

    const resultado = document.getElementById("resultadoQR");
    resultado.className = "alert d-none mt-2";
    resultado.textContent = "";

    const botonQR = document.getElementById("btnEscanearQR");
    botonQR.disabled = false;
    botonQR.innerHTML = "Escanear QR";

    document.getElementById("btnAlquilar").disabled = true;
}

function mostrarBicicletasDisponibles() {
    const origen = document.getElementById("origen").value;

    const contenedor = document.getElementById("contenedorBicicletas");
    const lista = document.getElementById("listaBicicletas");

    const estacion = estaciones[origen];

    lista.innerHTML = "";
    bicicletaSeleccionada = null;
    qrVerificado = false;

    document.getElementById("contenedorQR").classList.add("d-none");
    document.getElementById("btnAlquilar").disabled = true;
    document.getElementById("btnContinuarPaso").disabled = true;

    if (!estacion || !estacion.bicicletas || estacion.bicicletas.length === 0) {
        contenedor.classList.add("d-none");

        mostrarMensaje(
            "Sin bicicletas disponibles",
            "La estación seleccionada no tiene bicicletas disponibles. Elegí otra estación.",
            "warning"
        );

        return;
    }

    estacion.bicicletas.forEach(bicicleta => {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className =
        "btn btn-outline-success w-100 text-start mb-2 bicicleta-item";
        boton.innerHTML =
        `${iconoBicicleta("me-2")} ${bicicleta.codigo}`;

        boton.addEventListener("click", () => {
            seleccionarBicicleta(bicicleta);
        });

        lista.appendChild(boton);
    });

    contenedor.classList.remove("d-none");
}

function seleccionarBicicleta(bicicleta) {
    bicicletaSeleccionada = bicicleta;
    qrVerificado = false;

    document.getElementById("btnContinuarPaso").disabled = true;

    const botonQR = document.getElementById("btnEscanearQR");
    botonQR.disabled = false;
    botonQR.innerHTML = "Escanear código QR";

    // Inicializar contador para esta bicicleta si todavía no existe
    if (intentosQRPorBicicleta[bicicleta.id] === undefined) {
        intentosQRPorBicicleta[bicicleta.id] = 0;
    }

    // Marcar visualmente la bicicleta seleccionada
    document.querySelectorAll("#listaBicicletas .bicicleta-item")
    .forEach(elemento => {
        elemento.classList.remove(
            "active",
            "border-success",
            "btn-success",
            "text-white"
        );

        elemento.classList.add("btn-outline-success");
    });

    const botonSeleccionado = [...document.querySelectorAll("#listaBicicletas button")]
        .find(boton => boton.textContent.includes(bicicleta.codigo));

    if (botonSeleccionado) {
        botonSeleccionado.classList.add("active", "border-success");
    }

    // Mostrar código de bicicleta
    document.getElementById("codigoBicicletaSeleccionada").textContent =
        bicicleta.codigo;

    // Mostrar sección QR
    const contenedorQR = document.getElementById("contenedorQR");
    contenedorQR.classList.remove("d-none");

    // Desplazarse automáticamente hasta la verificación QR
    requestAnimationFrame(() => {
        contenedorQR.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    // Reiniciar resultado visual
    const resultado = document.getElementById("resultadoQR");
    resultado.className = "alert d-none mt-2";
    resultado.textContent = "";

    // Actualizar intentos disponibles
    actualizarIntentosQR();

    // Deshabilitar confirmación hasta completar las validaciones
    document.getElementById("btnAlquilar").disabled = true;

    console.log("Bicicleta seleccionada:", bicicleta);
}

function escanearQR() {
    if (!bicicletaSeleccionada || qrVerificado) return;

    const intentosRealizados =
        intentosQRPorBicicleta[bicicletaSeleccionada.id] || 0;

    if (intentosRealizados >= 3) return;

    document.getElementById("codigoBicicletaQRModal").textContent =
        bicicletaSeleccionada.codigo;

    const resultado = document.getElementById("resultadoQRModal");
    resultado.className = "alert d-none mt-3";
    resultado.textContent = "";

    document.getElementById("qrImagenContainer")
    .classList.add("d-none");

    const botonValidar = document.getElementById("btnValidarQRModal");
    botonValidar.disabled = false;
    botonValidar.innerHTML = "Validar QR";

    bootstrap.Modal.getOrCreateInstance(
        document.getElementById("qrScannerModal")
    ).show();
}

function actualizarIntentosQR() {
    if (!bicicletaSeleccionada) return;

    const intentosRealizados =
        intentosQRPorBicicleta[bicicletaSeleccionada.id] || 0;

    const disponibles = 3 - intentosRealizados;

    document.getElementById("intentosQR").textContent =
        `Intentos disponibles: ${disponibles}`;
}

function validarQRPopup() {
    if (!bicicletaSeleccionada || qrVerificado) return;

    const bicicleta = bicicletaSeleccionada;
    const boton = document.getElementById("btnValidarQRModal");
    const resultado = document.getElementById("resultadoQRModal");
    const imagenQR = document.getElementById("qrImagenContainer");

    const intentosRealizados =
        intentosQRPorBicicleta[bicicleta.id] || 0;

    if (intentosRealizados >= 3) return;

    // Mostrar la imagen QR y ocultar resultados anteriores.
    imagenQR.classList.remove("d-none");

    resultado.className = "alert d-none mt-3";
    resultado.textContent = "";

    boton.disabled = true;
    boton.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Escaneando...';

    // Simular el escaneo durante 5 segundos.
    setTimeout(() => {

        // Ocultar la imagen antes de mostrar el resultado.
        imagenQR.classList.add("d-none");

        const lecturaCorrecta = Math.random() < 0.75;

        intentosQRPorBicicleta[bicicleta.id] =
            (intentosQRPorBicicleta[bicicleta.id] || 0) + 1;

        const codigoLeido = lecturaCorrecta
            ? bicicleta.qr_codigo
            : "QR-INVALIDO";

        if (codigoLeido && codigoLeido === bicicleta.qr_codigo) {

            qrVerificado = true;

            resultado.className = "alert alert-success mt-3";
            resultado.textContent =
                "¡Código QR verificado correctamente!";

            boton.innerHTML = "✓ Verificado";

            document.getElementById("btnEscanearQR").innerHTML =
                "✓ QR verificado";

            document.getElementById("btnEscanearQR").disabled = true;

            actualizarIntentosQR();

        setTimeout(() => {
        
            bootstrap.Modal.getOrCreateInstance(
                document.getElementById("qrScannerModal")
            ).hide();
        
            const resultadoPrincipal =
                document.getElementById("resultadoQR");
        
            resultadoPrincipal.className =
                "alert alert-success mt-2";
        
            resultadoPrincipal.textContent =
                `¡QR verificado! Bicicleta ${bicicleta.codigo} identificada.`;
        
            // Habilitar la continuación y avanzar automáticamente al paso 3.
            document.getElementById("btnContinuarPaso").disabled = false;
        
            avanzarPasoAlquiler();
        
        }, 1200);

        } else {

            const intentosActuales =
                intentosQRPorBicicleta[bicicleta.id];

            actualizarIntentosQR();

            if (intentosActuales >= 3) {

                resultado.className = "alert alert-danger mt-3";
                resultado.textContent =
                    "Se agotaron los 3 intentos. Deberás seleccionar otra bicicleta.";

                boton.innerHTML = "Intentos agotados";

                setTimeout(() => {

                    bootstrap.Modal.getOrCreateInstance(
                        document.getElementById("qrScannerModal")
                    ).hide();

                    setTimeout(() => {

                        bicicletaSeleccionada = null;
                        qrVerificado = false;

                        document.getElementById("btnContinuarPaso").disabled = true;

                        document.getElementById("contenedorQR")
                            .classList.add("d-none");

                        mostrarBicicletasDisponibles();

                    }, 300);

                }, 1500);

            } else {

                resultado.className = "alert alert-warning mt-3";
                resultado.textContent =
                    `No se pudo validar el QR. Intento ${intentosActuales} de 3. Podés volver a intentar.`;

                boton.disabled = false;
                boton.innerHTML = "↻ Volver a validar";
            }
        }

        console.log("Resultado de validación QR:", {
            bicicleta: bicicleta.codigo,
            intentos: intentosQRPorBicicleta[bicicleta.id],
            verificado: qrVerificado
        });

    }, 5000);
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
        return "El número de tarjeta debe contener 16 dígitos.";
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
        return "El código de seguridad debe contener 3 dígitos.";
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


function formatearVencimiento(input) {
    let valor = input.value.replace(/\D/g, "");

    if (valor.length > 2) {
        valor = valor.substring(0, 2) + "/" + valor.substring(2, 4);
    }

    input.value = valor;
}


async function procesarPagoMembresia() {
    const boton = document.getElementById("btnPagar");
    const mensajeError = document.getElementById("errorPago");

    mensajeError.classList.add("d-none");
    mensajeError.textContent = "";

    if (!tipoPlanSeleccionado || !PLANES_MEMBRESIA[tipoPlanSeleccionado]) {
        mensajeError.textContent = "Seleccioná una membresía antes de continuar.";
        mensajeError.classList.remove("d-none");
        return;
    }

    const errorValidacion = validarDatosTarjeta();

    if (errorValidacion) {
        mensajeError.textContent = errorValidacion;
        mensajeError.classList.remove("d-none");
        return;
    }

    boton.disabled = true;
    boton.textContent = "Procesando pago...";

    try {
        const { data, error } = await supabaseClient.rpc(
            "procesar_pago_membresia_simulada",
            {
                p_tipo_plan: tipoPlanSeleccionado
            }
        );

        if (error) throw error;

        if (!data || !data.length) {
            throw new Error("No se recibió la confirmación del pago.");
        }

        console.log("Pago de membresía registrado:", data);

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

        // 1. Guardar los datos del plan contratado.
const plan = PLANES_MEMBRESIA[tipoPlanSeleccionado];

// 2. Limpiar los datos de la tarjeta.
document.getElementById("numeroTarjeta").value = "";
document.getElementById("vencimientoTarjeta").value = "";
document.getElementById("codigoSeguridad").value = "";

// 3. Actualizar el tiempo disponible.
// Si falla esta consulta, no debemos considerar fallido el pago.
try {
    await actualizarTiempoDisponibleHoy();
} catch (error) {
    console.error("Error al actualizar el tiempo disponible:", error);
}

// 4. Consultar nuevamente la membresía y habilitar el alquiler.
await actualizarVistaMembresiaAlquiler();

// 5. Preparar el primer paso del alquiler.
ubicacionVerificada = false;
pasoAlquilerActual = 1;

mostrarPasoAlquiler(1);

// 6. Limpiar el plan seleccionado.
tipoPlanSeleccionado = null;

// 7. Mostrar la confirmación del pago.
mostrarModal(
    "¡Membresía activada!",
    `Tu ${plan.nombre.toLowerCase()} fue registrada correctamente. Importe: ${formatearImporte(plan.importe)} ARS. Vigencia: ${plan.dias} días. Ya podés comenzar a alquilar una bicicleta.`,
    "success"
);

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

const MAX_TIEMPO_DIARIO = 8 * 60 * 60; // 8 horas en segundos

let claveViajeActivo = null;
let viajeActivo = null;

let relojIntervalo = null;
let intervaloTiempoDisponible = null;

let estaciones = {}

// ============================================
// CONFIGURACIÓN DEL MAPA INTERACTIVO
// ============================================

let mapaLeaflet = null;
let marcadoresEstaciones = {};


// Inicializar mapa interactivo
function inicializarMapa(publico = false) {

    const elementoMapa = document.getElementById("mapa");

    if (!elementoMapa || typeof L === "undefined") {
        console.error("No se pudo cargar Leaflet o encontrar el contenedor del mapa.");
        return;
    }

    if (mapaLeaflet) return;

    const opciones = publico
        ? {
            zoomControl: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            boxZoom: false,
            keyboard: false,
            minZoom: 14,
            maxZoom: 14
        }
        : {};

    mapaLeaflet = L.map(elementoMapa, opciones)
        .setView([-26.829, -65.195], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaLeaflet);
}


function crearIconoEstacionPublica() {
    return L.divIcon({
        className: "marcador-estacion-publica",
        html: `
            <svg width="42" height="52" viewBox="0 0 100 120"
                 xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M50 5 C25 5 8 23 8 47 C8 76 50 112 50 112
                       C50 112 92 76 92 47 C92 23 75 5 50 5Z"
                    fill="#16A34A"
                />
                <g fill="none" stroke="white" stroke-width="5"
                   stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="34" cy="65" r="10"/>
                    <circle cx="68" cy="65" r="10"/>
                    <path d="M34 65 L45 43 L57 65 L34 65
                             M45 43 L56 43 L68 65
                             M49 65 L68 65
                             M41 51 L45 43
                             M53 39 H60"/>
                </g>
            </svg>
        `,
        iconSize: [42, 52],
        iconAnchor: [21, 52],
        popupAnchor: [0, -48]
    });
}

// ============================================
// CREAR MARCADORES DE LAS ESTACIONES
// ============================================

function actualizarMarcadoresMapa() {

    if (!mapaLeaflet) {
        return;
    }

    // Eliminar los marcadores anteriores
    Object.values(marcadoresEstaciones).forEach(marcador => {
        mapaLeaflet.removeLayer(marcador);
    });

    marcadoresEstaciones = {};

    // Recorrer las estaciones disponibles
    Object.entries(estaciones).forEach(([nombre, datos]) => {

        const coordenadas = coordenadasEstaciones[nombre];

        // Si la estación no tiene coordenadas, no mostrarla
        if (!coordenadas) {
            console.warn("No hay coordenadas para la estación:", nombre);
            return;
        }

        const cantidad = datos.bicis;
        const estado = obtenerEstadoEstacion(cantidad);

        // Crear marcador personalizado
        const icono = L.divIcon({
            className: "marcador-bici-wrapper",
            html: `
                <div class="marcador-bici-contenido ${estado.cardClase}">
                    <span class="marcador-bici-icono">
                        ${iconoBicicleta()}
                    </span>
                    <span class="marcador-bici-cantidad">${cantidad}</span>
                </div>
            `,
            iconSize: [70, 50],
            iconAnchor: [35, 25],
            popupAnchor: [0, -25]
        });

        const marcador = L.marker(coordenadas, {
            icon: icono
        }).addTo(mapaLeaflet);

        marcador.bindPopup(`
            <div class="text-center">
                <strong>${nombre}</strong>
                <hr class="my-2">
                <div>
                    ${iconoBicicleta("me-1")}
                    ${cantidad} bicicletas disponibles
                </div>
                <div>${estado.texto}</div>
            </div>
        `);

        marcadoresEstaciones[nombre] = marcador;
    });
}


// Coordenadas de las estaciones cargadas desde Supabase
let coordenadasEstaciones = {};

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
// NAVEGACIÓN DEL FLUJO DE ALQUILER
//======================================================

function mostrarPasoAlquiler(paso) {

    pasoAlquilerActual = paso;

    // Mostrar únicamente el paso correspondiente.
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`pasoAlquiler${i}`)
            .classList.toggle("d-none", i !== paso);
    }

    // Actualizar indicadores.
    for (let i = 1; i <= 3; i++) {
        const indicador = document.getElementById(`indicadorPaso${i}`);

        indicador.classList.toggle("activo", i === paso);
        indicador.classList.toggle("completado", i < paso);
    }

    // Actualizar barra de progreso.
    document.getElementById("barraProgresoAlquiler").style.width =
        `${paso * 33.33}%`;

    // Mostrar u ocultar botones.
    const anterior = document.getElementById("btnPasoAnterior");
    const continuar = document.getElementById("btnContinuarPaso");
    const confirmar = document.getElementById("btnAlquilar");

    anterior.classList.toggle("d-none", paso === 1);
    continuar.classList.toggle("d-none", paso === 3);
    confirmar.classList.toggle("d-none", paso !== 3);

    // Habilitar los botones según las validaciones.
    if (paso === 1) {
        continuar.disabled = !ubicacionVerificada;
    }

    if (paso === 2) {
        continuar.disabled = !(
            bicicletaSeleccionada && qrVerificado
        );
    }

    if (paso === 3) {
        confirmar.disabled = !(
            bicicletaSeleccionada && qrVerificado
        );

        actualizarResumenAlquiler();
    }
}

function avanzarPasoAlquiler() {

    if (pasoAlquilerActual === 1) {

        if (!ubicacionVerificada) {
            mostrarModal(
                "Ubicación no verificada",
                "Primero necesitás verificar tu ubicación para continuar.",
                "warning"
            );
            return;
        }

        // Cargar las bicicletas de la estación seleccionada.
        mostrarBicicletasDisponibles();

        if (!estaciones[document.getElementById("origen").value]
            ?.bicicletas?.length) {
            return;
        }

        mostrarPasoAlquiler(2);
        return;
    }

    if (pasoAlquilerActual === 2) {

        if (!bicicletaSeleccionada || !qrVerificado) {
            mostrarModal(
                "Verificación pendiente",
                "Seleccioná una bicicleta y verificá su código QR para continuar.",
                "warning"
            );
            return;
        }

        mostrarPasoAlquiler(3);
    }
}


function retrocederPasoAlquiler() {

    if (pasoAlquilerActual === 2) {
        mostrarPasoAlquiler(1);
        return;
    }

    if (pasoAlquilerActual === 3) {
        mostrarPasoAlquiler(2);
    }
}


function actualizarResumenAlquiler() {

    if (!bicicletaSeleccionada) return;

    const origen = document.getElementById("origen").value;

    document.getElementById("resumenBicicleta").textContent =
        bicicletaSeleccionada.codigo;

    document.getElementById("resumenEstacion").textContent =
        origen;

    // Consultar el plan vigente para mostrarlo en el resumen.
    consultarMembresiaActiva()
        .then(membresia => {

            const nombrePlan =
                PLANES_MEMBRESIA[membresia?.tipo_plan]?.nombre;

            document.getElementById("resumenMembresia").textContent =
                nombrePlan || "Membresía activa";

        })
        .catch(error => {
            console.error("Error al consultar la membresía:", error);

            document.getElementById("resumenMembresia").textContent =
                "Membresía activa";
        });
}



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

    // Consultar las estaciones activas.
    const { data: estacionesDB, error: errorEstaciones } =
        await supabaseClient
            .from("estaciones")
            .select("id, nombre, latitud, longitud, capacidad_maxima, activa")
            .eq("activa", true)
            .order("id");

    if (errorEstaciones) {
        throw errorEstaciones;
    }

    // Consultar las bicicletas.
    const { data: bicicletasDB, error: errorBicicletas } =
        await supabaseClient
            .from("bicicletas")
            .select("id, codigo, estacion_id, estado, qr_codigo")

    if (errorBicicletas) {
        throw errorBicicletas;
    }

    const estacionesActualizadas = {};
    const coordenadasActualizadas = {};

    // Preparar las estaciones.
    estacionesDB.forEach(estacion => {

        estacionesActualizadas[estacion.nombre] = {
            id: estacion.id,
            bicis: 0,
            capacidad: estacion.capacidad_maxima,
            latitud: Number(estacion.latitud),
            longitud: Number(estacion.longitud),
            bicicletas: []
        };

        coordenadasActualizadas[estacion.nombre] = [
            Number(estacion.latitud),
            Number(estacion.longitud)
        ];
    });

    // Asociar las bicicletas disponibles a sus estaciones.
    bicicletasDB.forEach(bicicleta => {

        if (bicicleta.estado !== "disponible" ||
            bicicleta.estacion_id === null) {
            return;
        }

        const estacion = estacionesDB.find(
            item => String(item.id) === String(bicicleta.estacion_id)
        );

        if (!estacion) {
            return;
        }

        const estacionActual =
            estacionesActualizadas[estacion.nombre];

        estacionActual.bicicletas.push({
            id: bicicleta.id,
            codigo: bicicleta.codigo,
            qr_codigo: bicicleta.qr_codigo

        });

        estacionActual.bicis =
            estacionActual.bicicletas.length;
    });

    // Actualizar los datos globales.
    estaciones = estacionesActualizadas;
    coordenadasEstaciones = coordenadasActualizadas;

    console.log("Estaciones cargadas:", estaciones);

    return estaciones;
}


async function cargarEstacionesPublicasDesdeSupabase() {

    const { data, error } = await supabaseClient
        .from("estaciones")
        .select("id, nombre, latitud, longitud")
        .eq("activa", true)
        .order("id");

    if (error) throw error;

    estaciones = {};
    coordenadasEstaciones = {};

    data.forEach(estacion => {

        estaciones[estacion.nombre] = {
            id: estacion.id
        };

        coordenadasEstaciones[estacion.nombre] = [
            Number(estacion.latitud),
            Number(estacion.longitud)
        ];

    });

    console.log("Estaciones públicas cargadas:", estaciones);
}

function renderMapaPublico() {

    inicializarMapa(true);

    if (!mapaLeaflet) return;

    Object.entries(estaciones).forEach(([nombre]) => {

        const coordenadas = coordenadasEstaciones[nombre];

        if (!coordenadas) return;

        const marcador = L.marker(coordenadas, {
            icon: crearIconoEstacionPublica()
        }).addTo(mapaLeaflet);

        marcador.bindPopup(`<strong>${nombre}</strong>`);

    });
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

    if (!mapa) return;

    // Inicializar el mapa si todavía no existe.
    inicializarMapa();

    if (!mapaLeaflet) return;

    // Actualizar los marcadores con los datos de Supabase.
    actualizarMarcadoresMapa();
    iniciarBicicletasAnimadas();
}




function actualizarSelectEstaciones() {

    const origen = document.getElementById("origen");

    if (!origen) {
        return;
    }

    origen.innerHTML = `
        <option value="">Seleccioná una estación</option>
    `;

    Object.entries(estaciones).forEach(([nombre, datos]) => {

        const opcion = document.createElement("option");

        opcion.value = nombre;

        opcion.textContent =
            `${nombre} (${datos.bicis} disponibles)`;

        opcion.disabled = datos.bicis === 0;

        origen.appendChild(opcion);
    });

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

function actualizarBotonAlquiler() {

    const boton = document.getElementById("btnAbrirAlquiler");

    if (!boton) return;

    if (viajeActivo) {

        boton.disabled = true;
        boton.textContent = "Alquiler en curso";
        boton.title = "Primero debés devolver la bicicleta actual.";

    } else {

        boton.disabled = false;
        boton.textContent = "Alquilar Bicicleta";
        boton.title = "";

    }
}

async function rentBike() {

    const boton = document.getElementById("btnAlquilar");

    // 1. Verificar que no exista un viaje activo.
    if (viajeActivo) {
        mostrarModal(
            "Viaje pendiente de devolución",
            "Tenés una bicicleta pendiente de devolución. Finalizá tu viaje actual antes de iniciar otro alquiler.",
            "warning"
        );
        return false;
    }

    // 2. Validar estación de origen.
    const origen = document.getElementById("origen").value;

    if (!origen || !estaciones[origen]) {
        mostrarModal(
            "Seleccioná una estación",
            "Debés seleccionar una estación de origen.",
            "warning"
        );
        return false;
    }

    // 3. Validar ubicación.
    if (!ubicacionVerificada) {
        mostrarModal(
            "Ubicación no verificada",
            "Primero necesitás verificar tu ubicación en la estación seleccionada.",
            "warning"
        );
        return false;
    }

    // 4. Validar bicicleta seleccionada.
    if (!bicicletaSeleccionada) {
        mostrarModal(
            "Seleccioná una bicicleta",
            "Elegí una bicicleta disponible para continuar.",
            "warning"
        );
        return false;
    }

    // 5. Validar QR.
    if (!qrVerificado || !bicicletaSeleccionada.qr_codigo) {
        mostrarModal(
            "QR no verificado",
            "Necesitás verificar el código QR de la bicicleta antes de confirmar el alquiler.",
            "warning"
        );
        return false;
    }

    // 6. Consultar membresía activa.
    let membresia;

    try {
        membresia = await consultarMembresiaActiva();

    } catch (error) {
        console.error("Error al consultar la membresía:", error);

        mostrarModal(
            "Error al consultar la membresía",
            "No pudimos verificar tu membresía. Intentá nuevamente.",
            "danger"
        );

        return false;
    }

    if (!membresia) {
        mostrarModal(
            "Membresía vencida",
            "Necesitás una membresía activa para iniciar un alquiler.",
            "warning"
        );

        return false;
    }

    // 7. Verificar tiempo disponible del día.
    try {
        const tiempoDisponible =
            await actualizarTiempoDisponibleHoy();

        if (tiempoDisponible <= 0) {
            mostrarModal(
                "Límite diario alcanzado",
                "Alcanzaste el límite máximo de 8 horas de alquiler por día. Podrás volver a alquilar mañana.",
                "warning"
            );

            return false;
        }

    } catch (error) {
        console.error("Error al verificar el tiempo disponible:", error);

        mostrarModal(
            "Error al verificar el tiempo disponible",
            "No pudimos consultar tu tiempo de alquiler. Intentá nuevamente.",
            "danger"
        );

        return false;
    }

    // 8. Confirmar alquiler mediante Supabase.
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
                p_bicicleta_id: bicicletaSeleccionada.id,
                p_qr_codigo: bicicletaSeleccionada.qr_codigo
            }
        );

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                "Supabase no devolvió los datos del alquiler."
            );
        }

        const alquiler = data[0];

        // 9. Registrar el viaje activo en memoria.
        viajeActivo = {
            id: alquiler.viaje_id,
            bicicletaId: alquiler.bicicleta_id,
            bicicletaCodigo: alquiler.bicicleta_codigo,
            inicio: alquiler.inicio,
            origen: origen,
            destino: "A definir al devolver",
            estado: alquiler.estado
        };
        actualizarIndicadoresActividadHoy();

        console.log("Alquiler registrado correctamente:", alquiler);

        // 10. Actualizar estaciones y disponibilidad.
        await cargarEstacionesDesdeSupabase();

        actualizarSelectEstaciones();
        renderEstaciones();

        // 11. Limpiar selección y estado del QR.
        bicicletaSeleccionada = null;
        qrVerificado = false;

        // 12. Cerrar el modal de alquiler.
        const rentModalElement =
            document.getElementById("rentBikeModal");

        const rentModal =
            bootstrap.Modal.getInstance(rentModalElement);

        if (rentModal) {
            rentModal.hide();
        }

        // 13. Mostrar el viaje activo y actualizar el tiempo.
        mostrarViajeActivo();
        await actualizarTiempoDisponibleHoy();

        // 14. Mostrar confirmación.
        document.getElementById("bicicletaConfirmada").textContent =
        viajeActivo.bicicletaCodigo || `ID: ${viajeActivo.bicicletaId}`;

        const successModal = bootstrap.Modal.getOrCreateInstance(
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

        // Actualizar disponibilidad por si la bicicleta
        // fue alquilada por otro usuario.
        try {

            qrVerificado = false;

            await cargarEstacionesDesdeSupabase();
            actualizarSelectEstaciones();
            renderEstaciones();
            mostrarBicicletasDisponibles();
        } catch (errorActualizacion) {
            console.error(
                "Error al actualizar las bicicletas:",
                errorActualizacion
            );
        }

        return false;

    } finally {
        boton.innerHTML = "Confirmar Alquiler";
        boton.disabled = !(bicicletaSeleccionada && qrVerificado);
    }
}




async function cargarViajeActivoDesdeSupabase() {

    // 1. Buscar el viaje que todavía está en curso.
    const { data, error } = await supabaseClient
        .from("viajes")
        .select("*")
        .eq("usuario_id", usuario.id)
        .eq("estado", "en_curso")
        .maybeSingle();

    if (error) throw error;

    // Si no hay viaje activo, no hay nada que recuperar.
    if (!data) {
        viajeActivo = null;
        return null;
    }

    // 2. Consultar la bicicleta del viaje.
    const { data: bicicleta, error: errorBicicleta } =
        await supabaseClient
            .from("bicicletas")
            .select("codigo")
            .eq("id", data.bicicleta_id)
            .single();

    if (errorBicicleta) throw errorBicicleta;

    // 3. Consultar la estación de origen.
    const { data: origen, error: errorOrigen } =
        await supabaseClient
            .from("estaciones")
            .select("nombre")
            .eq("id", data.estacion_origen_id)
            .single();

    if (errorOrigen) throw errorOrigen;

    // 4. El destino todavía puede ser NULL si el viaje sigue activo.
    let nombreDestino = "A definir al devolver";

    if (data.estacion_destino_id !== null) {

        const { data: destino, error: errorDestino } =
            await supabaseClient
                .from("estaciones")
                .select("nombre")
                .eq("id", data.estacion_destino_id)
                .single();

        if (errorDestino) throw errorDestino;

        nombreDestino = destino.nombre;
    }

    // 5. Reconstruir el viaje activo.
    viajeActivo = {
        id: data.id,
        bicicletaId: data.bicicleta_id,
        bicicletaCodigo: bicicleta.codigo,
        inicio: data.inicio,
        origen: origen.nombre,
        destino: nombreDestino,
        estado: data.estado
    };

    return viajeActivo;
}


function actualizarIndicadoresActividadHoy() {
    const ahora = new Date();

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

    // Viajes finalizados durante el día de hoy.
    const alquileresFinalizadosHoy = trips.filter(viaje => {
        if (!viaje.fin) return false;

        const fechaFin = new Date(viaje.fin);

        return fechaFin >= inicioDia && fechaFin < inicioManana;
    }).length;

    // Viajes en curso del usuario actual.
    const alquileresEnCurso = viajeActivo ? 1 : 0;

    const elementoFinalizados =
        document.getElementById("alquileresFinalizadosHoy");

    const elementoEnCurso =
        document.getElementById("alquileresEnCurso");

    if (elementoFinalizados) {
        elementoFinalizados.textContent = alquileresFinalizadosHoy;
    }

    if (elementoEnCurso) {
        elementoEnCurso.textContent = alquileresEnCurso;
    }
}



function actualizarIndicadoresActividadHoy() {
    const ahora = new Date();

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

    // Contar viajes finalizados durante el día de hoy.
    const alquileresFinalizadosHoy = trips.filter(viaje => {
        if (!viaje.fin) return false;

        const fechaFin = new Date(viaje.fin);

        return fechaFin >= inicioDia && fechaFin < inicioManana;
    }).length;

    // Contar si el usuario tiene un alquiler actualmente en curso.
    const alquileresEnCurso = viajeActivo ? 1 : 0;

    const elementoFinalizados =
        document.getElementById("alquileresFinalizadosHoy");

    const elementoEnCurso =
        document.getElementById("alquileresEnCurso");

    if (elementoFinalizados) {
        elementoFinalizados.textContent = alquileresFinalizadosHoy;
    }

    if (elementoEnCurso) {
        elementoEnCurso.textContent = alquileresEnCurso;
    }
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
        actualizarBotonAlquiler();
        tarjeta.classList.add("d-none");
        detenerRelojViaje();
        return;
    }

    tarjeta.classList.remove("d-none");
    actualizarBotonAlquiler();

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
            <option value="${estacion.id}">
                ${nombre}
            </option>
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

    // Validar que la fecha de inicio sea correcta.
    if (!Number.isFinite(inicio)) {
        document.getElementById("relojViaje").textContent =
            "--:--:--";
        return;
    }

    // Evitar que una pequeña diferencia entre relojes
    // genere valores negativos.
    const transcurrido = Math.max(0, Date.now() - inicio);

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

        const viajeId = viajeActivo.id;

        const { data, error } = await supabaseClient.rpc(
            "finalizar_alquiler",
            {
                p_viaje_id: viajeId,
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
        actualizarBotonAlquiler();

        await actualizarTiempoDisponibleHoy();

        // Recargar el historial para incorporar el viaje recién finalizado.
        await cargarHistorialDesdeSupabase();

        // Actualizar los indicadores de actividad.
        actualizarIndicadoresActividadHoy();

        await cargarEstacionesDesdeSupabase();
        actualizarSelectEstaciones();
        renderEstaciones();

        document.getElementById("viajeActivoCard").classList.add("d-none");

        // Consultar si se generó una encuesta pendiente.
        let encuestaPendiente = null;

        try {

            const { data: encuestas, error: errorEncuestas } =
                await supabaseClient
                    .from("encuestas_satisfaccion")
                    .select("id")
                    .eq("viaje_id", viajeId)
                    .eq("usuario_id", usuario.id)
                    .eq("estado", "pendiente")
                    .maybeSingle();

            if (errorEncuestas) throw errorEncuestas;

            encuestaPendiente = encuestas;

            await cargarEncuestasPendientesDesdeSupabase();

        } catch (errorEncuestas) {

            console.error(
                "Error al actualizar las encuestas pendientes:",
                errorEncuestas
            );

        }

        // Preparar la espera antes de mostrar la confirmación.
        const modalDevolucion = document.getElementById("messageModal");

        const modalCerrado = encuestaPendiente
            ? new Promise(resolve => {
                modalDevolucion.addEventListener(
                    "hidden.bs.modal",
                    resolve,
                    { once: true }
                );
            })
            : null;

        // Mostrar confirmación de devolución.
        mostrarModal(
            "¡Devolución exitosa!",
            `La bicicleta fue devuelta correctamente. Distancia recorrida: ${resultado.km} km.`,
            "success"
        );

        // Invitar a responder únicamente después de cerrar el mensaje.
        if (encuestaPendiente) {
            await modalCerrado;
            invitarAResponderEncuesta(encuestaPendiente.id);
        }

    } catch (error) {

        console.error("Error al finalizar el viaje:", error);

        mostrarModal(
            "Error al finalizar el viaje",
            error.message || "No se pudo registrar la devolución. Intentá nuevamente.",
            "danger"
        );

    } finally {

        boton.disabled = false;
        boton.textContent = "Finalizar viaje";

    }
}



//======================================================
// ENCUESTAS DE SATISFACCIÓN
//======================================================

async function cargarEncuestasPendientesDesdeSupabase() {

    const { data, error } = await supabaseClient
        .from("encuestas_satisfaccion")
        .select("id, viaje_id, fecha_creacion, estado")
        .eq("usuario_id", usuario.id)
        .eq("estado", "pendiente")
        .order("fecha_creacion", { ascending: false });

    if (error) {
        throw error;
    }

    console.log("Resultado de consulta de membresía:", {
        usuarioId: usuario?.id,
        membresiaEncontrada: data,
        fechaActual: new Date().toISOString()
    });

    mostrarEncuestasPendientes(data || []);
}


function mostrarEncuestasPendientes(encuestas) {

    const lista = document.getElementById("listaEncuestasPendientes");
    const cantidad = document.getElementById("cantidadEncuestasPendientes");

    if (!lista || !cantidad) {
        console.error("No se encontraron los elementos HTML de encuestas.");
        return;
    }

    // Actualizar el contador de encuestas pendientes.
    cantidad.textContent = encuestas.length;

    // Mostrar un mensaje si no hay encuestas pendientes.
    if (encuestas.length === 0) {

        lista.innerHTML = `
            <p class="text-muted mb-0">
                No tenés encuestas pendientes. ¡Gracias por utilizar P&L BIKE!
            </p>
        `;

        return;
    }

    // Mostrar cada encuesta pendiente.
    lista.innerHTML = encuestas.map(encuesta => {

        const fecha = new Date(encuesta.fecha_creacion)
            .toLocaleDateString("es-AR");

        return `
            <div class="border rounded p-3 mb-3">

                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">

                    <div>
                        <strong>Encuesta del viaje #${encuesta.viaje_id}</strong>

                        <div class="text-muted small">
                            Fecha: ${fecha}
                        </div>

                        <span class="badge bg-warning text-dark mt-2">
                            Pendiente
                        </span>
                    </div>

                    <button
                        type="button"
                        class="btn btn-success btn-sm"
                        onclick="abrirEncuesta(${encuesta.id})"
                    >
                        <i class="bi bi-star me-1"></i>
                        Responder encuesta
                    </button>

                </div>

            </div>
        `;

    }).join("");
}


function abrirEncuesta(encuestaId) {

    // Guardar el ID de la encuesta seleccionada.
    document.getElementById("encuestaId").value = encuestaId;

    // Limpiar las respuestas anteriores.
    document.getElementById("calificacionGeneral").value = "";
    document.getElementById("estadoBicicleta").value = "";
    document.getElementById("experienciaEstacion").value = "";
    document.getElementById("comentarioEncuesta").value = "";

    // Limpiar mensajes de error anteriores.
    const error = document.getElementById("errorEncuesta");

    error.textContent = "";
    error.classList.add("d-none");

    // Restablecer el botón.
    const boton = document.getElementById("btnGuardarEncuesta");

    boton.disabled = false;
    boton.textContent = "Enviar encuesta";

    // Abrir el modal de respuesta.
    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("encuestaRespuestaModal")
    );

    modal.show();
}


function invitarAResponderEncuesta(encuestaId) {

    const modal = document.getElementById("encuestaInvitacionModal");

    modal.dataset.encuestaId = encuestaId;

    const instancia = bootstrap.Modal.getOrCreateInstance(modal);

    instancia.show();
}


function responderEncuestaInvitacion() {

    const modal = document.getElementById("encuestaInvitacionModal");

    const encuestaId = modal.dataset.encuestaId;

    modal.addEventListener(
        "hidden.bs.modal",
        function () {
            abrirEncuesta(encuestaId);
        },
        { once: true }
    );

    bootstrap.Modal.getInstance(modal).hide();
}


async function guardarRespuestaEncuesta() {

    const encuestaId = document.getElementById("encuestaId").value;
    const calificacionGeneral = document.getElementById("calificacionGeneral").value;
    const estadoBicicleta = document.getElementById("estadoBicicleta").value;
    const experienciaEstacion = document.getElementById("experienciaEstacion").value;
    const comentario = document.getElementById("comentarioEncuesta").value.trim();

    const errorEncuesta = document.getElementById("errorEncuesta");
    const btnGuardar = document.getElementById("btnGuardarEncuesta");

    errorEncuesta.classList.add("d-none");
    errorEncuesta.textContent = "";

    // Validar campos obligatorios.
    if (
        !encuestaId ||
        !calificacionGeneral ||
        !estadoBicicleta ||
        !experienciaEstacion
    ) {
        errorEncuesta.textContent = "Completá las tres calificaciones antes de continuar.";
        errorEncuesta.classList.remove("d-none");
        return;
    }

    if (comentario.length > 1000) {
        errorEncuesta.textContent = "El comentario no puede superar los 1000 caracteres.";
        errorEncuesta.classList.remove("d-none");
        return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {

        const { error } = await supabaseClient.rpc("responder_encuesta", {
            p_encuesta_id: Number(encuestaId),
            p_calificacion_general: Number(calificacionGeneral),
            p_estado_bicicleta: Number(estadoBicicleta),
            p_experiencia_estacion: Number(experienciaEstacion),
            p_comentario: comentario || null
        });

        if (error) {
            throw error;
        }

        // Cerrar el modal.
        const modalElemento = document.getElementById("encuestaRespuestaModal");
        const modal = bootstrap.Modal.getInstance(modalElemento);

        if (modal) {
            modal.hide();
        }

        // Actualizar la lista de encuestas pendientes.
        await cargarEncuestasPendientesDesdeSupabase();

        // Informar que la respuesta se guardó correctamente.
        const mensaje = document.getElementById("mensajeEncuestas");
        mensaje.textContent = "¡Gracias por compartir tu opinión!";
        mensaje.classList.remove("d-none", "alert-danger");
        mensaje.classList.add("alert-success");

    } catch (error) {

        console.error("Error al guardar la encuesta:", error);

        errorEncuesta.textContent =
            error.message || "No se pudo guardar la encuesta. Intentá nuevamente.";

        errorEncuesta.classList.remove("d-none");

    } finally {

        btnGuardar.disabled = false;
        btnGuardar.textContent = "Enviar respuesta";

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



async function procesarPagoPenalizaciones() {

    const boton = document.getElementById("btnConfirmarPagoPenalizaciones");
    const mensajeError = document.getElementById("errorPagoPenalizaciones");

    mensajeError.textContent = "";
    mensajeError.classList.add("d-none");

    // Validar los datos ingresados.
    const errorValidacion = validarDatosTarjetaPenalizaciones();

    if (errorValidacion) {
        mensajeError.textContent = errorValidacion;
        mensajeError.classList.remove("d-none");
        return;
    }

    boton.disabled = true;
    boton.textContent = "Procesando pago...";

    try {

        // Procesar el pago mediante la función de Supabase.
        const { data, error } = await supabaseClient.rpc(
            "procesar_pago_penalizaciones"
        );

        if (error) throw error;

        const resultado = data[0];

        console.log("Pago de penalizaciones registrado:", resultado);

        // Cerrar el modal de pago.
        const modalElemento = document.getElementById("penaltyPaymentModal");
        const modal = bootstrap.Modal.getInstance(modalElemento);

        if (modal) {
            const modalCerrado = new Promise(resolve => {
                modalElemento.addEventListener(
                    "hidden.bs.modal",
                    resolve,
                    { once: true }
                );
            });

            modal.hide();

            await modalCerrado;
        }

        // Actualizar los cargos pendientes.
        await cargarCargosPendientesDesdeSupabase();

        // Mostrar confirmación.
        mostrarModal(
        "¡Pago aprobado!",
        `Se pagaron ${resultado.cantidad_penalizaciones} penalizaciones por ${formatearImporte(resultado.importe_total)}.`,
        "success"
        );

    } catch (error) {

        console.error("Error al procesar el pago de penalizaciones:", error);

        mensajeError.textContent =
            error.message || "No se pudo procesar el pago. Intentá nuevamente.";

        mensajeError.classList.remove("d-none");

    } finally {

        boton.disabled = false;
        boton.textContent = "Confirmar pago";

    }
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

    // Consultar los viajes iniciados hoy.
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

            tiempoUtilizado +=
                Number(viaje.duracion_segundos) || 0;

        } else if (viaje.estado === "en_curso") {

            tiempoUtilizado += Math.floor(
                (ahora.getTime() - new Date(viaje.inicio).getTime()) / 1000
            );

        }

    });

    // Consultar la membresía activa.
    const membresia = await consultarMembresiaActiva();

    // Ambas membresías tienen el mismo límite diario.
    const limiteDiario = membresia
        ? MAX_TIEMPO_DIARIO
        : 0;

    const tiempoRestante = Math.max(
        0,
        limiteDiario - tiempoUtilizado
    );

    const horas = Math.floor(tiempoRestante / 3600);

    const minutos = Math.floor(
        (tiempoRestante % 3600) / 60
    );

    const elementoTiempoHome =
        document.getElementById("tiempoDisponibleHoyHome");

    const elementoTiempoPerfil =
        document.getElementById("tiempoDisponibleHoyPerfil");

    const textoTiempo = !membresia
        ? "Requiere membresía activa"
        : `${horas} h ${minutos} min`;

    if (elementoTiempoHome) {
        elementoTiempoHome.textContent = textoTiempo;
    }

    if (elementoTiempoPerfil) {
        elementoTiempoPerfil.textContent = textoTiempo;
    }

    return tiempoRestante;
}


async function actualizarBicicletasAlquiladasHoy() {

    const ahora = new Date();

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

    const { count, error } = await supabaseClient
        .from("viajes")
        .select("id", { count: "exact", head: true })
        .gte("inicio", inicioDia.toISOString())
        .lt("inicio", inicioManana.toISOString())
        .in("estado", ["finalizado", "en_curso"]);

    if (error) throw error;

    const elemento = document.getElementById(
        "bicicletasAlquiladasHoy"
    );

    if (elemento) {
        elemento.textContent = count ?? 0;
    }
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



// ============================================
// BICICLETAS SIMULADAS EN MOVIMIENTO
// ============================================

let bicicletasAnimadas = [];
let intervaloBicicletas = null;

function iniciarBicicletasAnimadas() {

    // Evitar duplicar los cinco marcadores.
    if (bicicletasAnimadas.length > 0) return;

    if (!mapaLeaflet) return;

    // Tomar directamente las estaciones y coordenadas
    // cargadas desde Supabase.
    const estacionesRuta = Object.entries(coordenadasEstaciones)
        .filter(([nombre, coordenadas]) =>
            Array.isArray(coordenadas) &&
            coordenadas.length === 2 &&
            Number.isFinite(Number(coordenadas[0])) &&
            Number.isFinite(Number(coordenadas[1]))
        )
        .map(([nombre, coordenadas]) => ({
            nombre,
            lat: Number(coordenadas[0]),
            lng: Number(coordenadas[1])
        }));

    if (estacionesRuta.length < 2) {
        console.warn("No hay suficientes estaciones para animar bicicletas.");
        return;
    }

    // Crear cinco bicicletas simuladas.
    for (let i = 0; i < 5; i++) {

        const icono = L.divIcon({
            className: "bicicleta-movil-wrapper",
            html: `
                <div class="bicicleta-movil">
                    ${iconoBicicleta("bicicleta-en-movimiento")}
                </div>
            `,
            iconSize: [40, 30],
            iconAnchor: [20, 15]
        });

        const estacionInicial = estacionesRuta[i % estacionesRuta.length];

        const marcador = L.marker(
            [estacionInicial.lat, estacionInicial.lng],
            {
                icon: icono,
                zIndexOffset: 1000,
                interactive: true
            }
        ).addTo(mapaLeaflet);

        marcador.bindPopup(
            "<strong>Bicicleta en movimiento</strong><br>Recorrido simulado"
        );

        bicicletasAnimadas.push({
            marcador,
            estacionActual: i % estacionesRuta.length,
            progreso: i * 0.17
        });
    }

    // Iniciar el movimiento continuo.
    intervaloBicicletas = setInterval(
        moverBicicletasAnimadas,
        50
    );

    console.log("Cinco bicicletas animadas iniciadas.");
}


function moverBicicletasAnimadas() {

    const cantidadEstaciones = Object.keys(coordenadasEstaciones).length;

    const estacionesRuta = Object.values(coordenadasEstaciones)
        .filter(coordenadas =>
            Array.isArray(coordenadas) &&
            coordenadas.length === 2 &&
            Number.isFinite(Number(coordenadas[0])) &&
            Number.isFinite(Number(coordenadas[1]))
        );

    if (estacionesRuta.length < 2) return;

    bicicletasAnimadas.forEach(bicicleta => {

        const origen = estacionesRuta[bicicleta.estacionActual];

        const siguienteIndice =
            (bicicleta.estacionActual + 1) % estacionesRuta.length;

        const destino = estacionesRuta[siguienteIndice];

        bicicleta.progreso += 0.002;

        if (bicicleta.progreso >= 1) {
            bicicleta.progreso = 0;
            bicicleta.estacionActual = siguienteIndice;
        }

        const lat =
            Number(origen[0]) +
            (Number(destino[0]) - Number(origen[0])) *
            bicicleta.progreso;

        const lng =
            Number(origen[1]) +
            (Number(destino[1]) - Number(origen[1])) *
            bicicleta.progreso;

        bicicleta.marcador.setLatLng([lat, lng]);
    });
}

function moverBicicletasAnimadas() {

    bicicletasAnimadas.forEach(bicicleta => {

        const origen = bicicleta.coordenadas[bicicleta.tramo];

        const siguienteTramo =
            (bicicleta.tramo + 1) % bicicleta.coordenadas.length;

        const destino = bicicleta.coordenadas[siguienteTramo];

        // Velocidad de desplazamiento.
        bicicleta.progreso += 0.0015;

        if (bicicleta.progreso >= 1) {
            bicicleta.progreso = 0;
            bicicleta.tramo = siguienteTramo;

            const nuevoDestino =
                bicicleta.ruta[
                    (bicicleta.tramo + 1) % bicicleta.ruta.length
                ];

            bicicleta.marcador.setPopupContent(
                `<strong>🚲 Bicicleta en movimiento</strong>
                 <br>Destino estimado: ${nuevoDestino}`
            );
        }

        // Interpolación entre las coordenadas.
        const lat = origen.lat +
            (destino.lat - origen.lat) * bicicleta.progreso;

        const lng = origen.lng +
            (destino.lng - origen.lng) * bicicleta.progreso;

        bicicleta.marcador.setLatLng([lat, lng]);
    });
}



 //======================================================
 // INICIALIZACIÓN
 //======================================================

document.addEventListener("DOMContentLoaded", async () => {

    // Identificar si estamos en la aplicación privada.
    const rutaActual = window.location.pathname;

    const esPaginaPrivada =
        rutaActual.endsWith("/index.html") ||
        rutaActual === "/" ||
        rutaActual.endsWith("/");

    // ============================================
    // PÁGINA PÚBLICA: app.html
    // ============================================

    if (!esPaginaPrivada) {

    try {
        await cargarEstacionesPublicasDesdeSupabase();
        renderMapaPublico();

    } catch (error) {
        console.error(
            "Error al cargar el mapa público:",
            error
        );
    }

    return;
    }

    // ============================================
    // APLICACIÓN PRIVADA: index.html
    // ============================================

    const sesionValida = await verificarSesion();

    if (!sesionValida) {
        return;
    }

    usuario = usuarioAutenticado;

    if (!usuario) {
        window.location.replace("login.html");
        return;
    }

    actualizarEstadoMembresiaHome();
    claveViajeActivo = null;
    viajeActivo = null;




    // Actualizar el estado de membresía al abrir el modal.
    const rentBikeModal = document.getElementById("rentBikeModal");

    rentBikeModal.addEventListener("show.bs.modal", () => {
    actualizarVistaMembresiaAlquiler();
    mostrarPasoAlquiler(1);
    });


    // Mostrar los datos del perfil.
    document.getElementById("nombreUsuario").textContent =
        usuario.nombre;

    document.getElementById("emailUsuario").textContent =
        usuario.email;

    document.getElementById("cantidadViajes").textContent =
        trips.length;

    

    const fechaRegistro = usuario.fechaRegistro
    ? new Date(usuario.fechaRegistro)
    : null;

    document.getElementById("fechaRegistro").textContent =
    fechaRegistro && !isNaN(fechaRegistro.getTime())
        ? fechaRegistro.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "America/Argentina/Buenos_Aires"
        })
        : "-";

    // Eventos de alquiler.
    // La estación de origen se cargará dinámicamente desde Supabase.

    // Navegación entre los pasos del alquiler.
    
document
.getElementById("btnContinuarPaso")
.addEventListener("click", () => {

    const planesMembresia = document.getElementById("contenedorPlanesMembresia");
    const planesVisibles = !planesMembresia.classList.contains("d-none");

    // Si se están mostrando los planes, continuar hacia el pago.
    if (planesVisibles) {

        if (!tipoPlanSeleccionado) {
            mostrarModal(
                "Seleccioná una membresía",
                "Elegí un plan quincenal o mensual para continuar.",
                "warning"
            );
            return;
        }

        const paymentModal = bootstrap.Modal.getOrCreateInstance(
            document.getElementById("paymentModal")
        );

        paymentModal.show();
        return;
    }

    // Si hay una membresía activa, continuar con el alquiler.
    avanzarPasoAlquiler();
});


    document
        .getElementById("btnPasoAnterior")
        .addEventListener("click", retrocederPasoAlquiler);

    // Estado inicial del flujo.
    mostrarPasoAlquiler(1);

    try {
        await cargarEstacionesDesdeSupabase();
        await cargarViajeActivoDesdeSupabase();
        await cargarHistorialDesdeSupabase();
        await actualizarTiempoDisponibleHoy();
        iniciarActualizacionTiempoDisponible();
        actualizarIndicadoresActividadHoy();

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

    // Consultar las encuestas de satisfacción pendientes.
    try {
        await cargarEncuestasPendientesDesdeSupabase();
    } catch (error) {
        console.error("Error al cargar las encuestas pendientes:", error);

        const lista = document.getElementById("listaEncuestasPendientes");

        if (lista) {
            lista.innerHTML = `
                <p class="text-danger mb-0">
                    No se pudieron consultar las encuestas pendientes.
                </p>
            `;
        }
    }

    // Búsqueda y ordenamiento del historial.
    document
        .getElementById("buscarViaje")
        .addEventListener("keyup", filtrarViajes);

    document
        .getElementById("ordenViajes")
        .addEventListener("change", ordenarViajes);

    document
    .getElementById("btnGeolocalizacion")
    .addEventListener("click", verificarUbicacion); 
    
    
    document.getElementById("origen").addEventListener("change", () => {

        ubicacionVerificada = false;
        document.getElementById("btnContinuarPaso").disabled = true;
        limpiarSeleccionBicicleta();

        const estado = document.getElementById("estadoGeolocalizacion");
        const boton = document.getElementById("btnGeolocalizacion");

        estado.textContent =
            "Necesitamos verificar tu ubicación para continuar.";

        estado.className = "alert alert-info mt-2 mb-0";

        boton.disabled = false;
        boton.textContent = "📍 Verificar mi ubicación";
        mostrarPasoAlquiler(1);
        });

    document.getElementById("btnEscanearQR")
    .addEventListener("click", escanearQR);
    document.getElementById("btnValidarQRModal")
    .addEventListener("click", validarQRPopup);

    // Renderizado de la aplicación.
    renderTrips();
    actualizarEstadisticas();
    renderEstaciones();
    actualizarSelectEstaciones();
    mostrarViajeActivo();
    actualizarBotonAlquiler();

});
