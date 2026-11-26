
// ========================================
// PANEL DE ADMINISTRACIÓN - P&L BIKE
// ========================================


// 1. PROTECCIÓN Y DATOS DEL ADMINISTRADOR

document.addEventListener("DOMContentLoaded", async () => {

    const accesoPermitido = await verificarSesion();

    if (!accesoPermitido) return;

    if (!usuarioAutenticado || usuarioAutenticado.rol !== "admin") {
        window.location.replace("index.html");
        return;
    }

    document.getElementById("nombreAdministrador").textContent =
        usuarioAutenticado.nombre;

    document.getElementById("adminContenido").style.display = "block";

    // Cargar indicadores del panel.
    await cargarIndicadoresAdmin();

});


// ========================================
// 2. CARGAR INDICADORES ADMINISTRATIVOS
// ========================================

async function cargarIndicadoresAdmin() {

    try {

        // USUARIOS REGISTRADOS
        const { count: totalUsuarios, error: errorUsuarios } =
            await supabaseClient
                .from("profiles")
                .select("id", { count: "exact", head: true });

        if (errorUsuarios) throw errorUsuarios;


        // BICICLETAS
        const { count: totalBicicletas, error: errorBicicletas } =
            await supabaseClient
                .from("bicicletas")
                .select("id", { count: "exact", head: true });

        if (errorBicicletas) throw errorBicicletas;


       
        // ENCUESTAS RESPONDIDAS
        const { data: encuestas, count: totalEncuestas, error: errorEncuestas } =
        await supabaseClient
            .from("encuestas_satisfaccion")
            .select("calificacion_general", { count: "exact" })
            .eq("estado", "respondida");

        if (errorEncuestas) throw errorEncuestas;


        // ENCUESTAS PENDIENTES
        const { count: totalEncuestasPendientes, error: errorPendientes } =
        await supabaseClient
            .from("encuestas_satisfaccion")
            .select("id", { count: "exact", head: true })
            .eq("estado", "pendiente");

        if (errorPendientes) throw errorPendientes;

        
        // TOTAL DE ENCUESTAS RECIBIDAS
        const { count: totalEncuestasRecibidas, error: errorRecibidas } =
        await supabaseClient
            .from("encuestas_satisfaccion")
            .select("id", { count: "exact", head: true });

        if (errorRecibidas) throw errorRecibidas;



        // SATISFACCIÓN PROMEDIO
        const calificaciones = encuestas
            .map(encuesta => encuesta.calificacion_general)
            .filter(calificacion => calificacion !== null);

        let promedio = "—";

        if (calificaciones.length > 0) {

            const suma = calificaciones.reduce(
                (total, calificacion) => total + calificacion,
                0
            );

            promedio = (suma / calificaciones.length).toFixed(1);

        }


        // ========================================
// INDICADORES DE USUARIOS Y MEMBRESÍAS
// ========================================

// ADMINISTRADORES
const { count: totalAdmins, error: errorAdmins } =
await supabaseClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("rol", "admin");

if (errorAdmins) throw errorAdmins;


// USUARIOS COMUNES
const { count: totalUsuariosComunes, error: errorUsuariosComunes } =
await supabaseClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("rol", "usuario");

if (errorUsuariosComunes) throw errorUsuariosComunes;


// MEMBRESÍAS ACTIVAS
const { count: totalMembresiasActivas, error: errorMembresias } =
await supabaseClient
    .from("suscripciones")
    .select("id", { count: "exact", head: true })
    .eq("estado", "activa");

if (errorMembresias) throw errorMembresias;


// ========================================
// INDICADORES DE BICICLETAS Y ESTACIONES
// ========================================

// BICICLETAS DISPONIBLES
const { count: bicicletasDisponibles, error: errorDisponibles } =
await supabaseClient
    .from("bicicletas")
    .select("id", { count: "exact", head: true })
    .eq("estado", "disponible");

if (errorDisponibles) throw errorDisponibles;


// BICICLETAS ALQUILADAS
const { count: bicicletasAlquiladas, error: errorAlquiladas } =
await supabaseClient
    .from("bicicletas")
    .select("id", { count: "exact", head: true })
    .eq("estado", "alquilada");

if (errorAlquiladas) throw errorAlquiladas;


// ESTACIONES ACTIVAS
const { count: totalEstaciones, error: errorEstaciones } =
await supabaseClient
    .from("estaciones")
    .select("id", { count: "exact", head: true })
    .eq("activa", true);

if (errorEstaciones) throw errorEstaciones;


   // MOSTRAR RESULTADOS

// USUARIOS REGISTRADOS
document.getElementById("totalUsuariosAdmin").textContent =
totalUsuarios ?? 0;

// BICICLETAS (30 reales + 5 simuladas)
const totalBicicletasSistema = (totalBicicletas ?? 0) + 5;

document.getElementById("totalBicicletasAdmin").textContent =
    totalBicicletasSistema;


// TOTAL DE ENCUESTAS RECIBIDAS
document.getElementById("totalEncuestasRecibidasAdmin").textContent =
totalEncuestasRecibidas ?? 0;


// ENCUESTAS RESPONDIDAS
document.getElementById("totalEncuestasAdmin").textContent =
totalEncuestas ?? 0;


// ENCUESTAS PENDIENTES
document.getElementById("totalEncuestasPendientesAdmin").textContent =
totalEncuestasPendientes ?? 0;


// SATISFACCIÓN PROMEDIO
document.getElementById("promedioSatisfaccionAdmin").textContent =
promedio;

// USUARIOS Y MEMBRESÍAS
document.getElementById("totalAdminsAdmin").textContent =
    totalAdmins ?? 0;

document.getElementById("totalUsuariosComunesAdmin").textContent =
    totalUsuariosComunes ?? 0;

document.getElementById("totalMembresiasActivasAdmin").textContent =
    totalMembresiasActivas ?? 0;

// BICICLETAS Y ESTACIONES
document.getElementById("totalBicicletasDetalleAdmin").textContent =
    totalBicicletasSistema;

document.getElementById("bicicletasDisponiblesAdmin").textContent =
    bicicletasDisponibles ?? 0;

document.getElementById("bicicletasAlquiladasAdmin").textContent =
    (bicicletasAlquiladas ?? 0) + 5;


// VERIFICACIÓN
console.log("Indicadores administrativos cargados:", {
totalUsuarios,
totalBicicletas,
totalEncuestasRecibidas,
totalEncuestasRespondidas: totalEncuestas,
totalEncuestasPendientes,
promedioSatisfaccion: promedio
});

    } catch (error) {

        console.error(
            "Error al cargar los indicadores administrativos:",
            error
        );

    }

}
