// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

const SUPABASE_URL = "https://ovbiongsunezeclvjgpj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MgubmqHLwlwnxShupDsA0A_6YZt9T8K";

let supabaseClient = null;

if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
}

// ============================================
// MODALES
// ============================================

function mostrarModal(titulo, mensaje, tipo = "success") {
    const header = document.getElementById("messageHeader");
    const title = document.getElementById("messageTitle");
    const text = document.getElementById("messageText");

    if (!header || !title || !text) {
        alert(mensaje);
        return null;
    }

    header.className = "modal-header text-white";

    switch (tipo) {
        case "success":
            header.classList.add("bg-success");
            break;
        case "danger":
            header.classList.add("bg-danger");
            break;
        case "warning":
            header.classList.add("bg-warning");
            break;
        default:
            header.classList.add("bg-primary");
    }

    title.textContent = titulo;
    text.textContent = mensaje;

    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("messageModal")
    );

    modal.show();
    return modal;
}

function mostrarErrorConexion() {
    mostrarModal(
        "Error de conexión",
        "No se pudo conectar con Supabase. Verificá la conexión y volvé a intentarlo.",
        "danger"
    );
}

// ============================================
// VALIDACIONES
// ============================================

const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/;
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarNombre() {
    const nombre = document.getElementById("nombre").value.trim();
    const longitud = document.getElementById("nombreLongitud");
    const letras = document.getElementById("nombreLetras");

    if (nombre.length >= 3 && nombre.length <= 30) {
        longitud.textContent = "✔ Entre 3 y 30 caracteres";
        longitud.className = "validacion ok";
    } else {
        longitud.textContent = "✖ Entre 3 y 30 caracteres";
        longitud.className = "validacion";
    }

    if (nombre.length > 0 && regexNombre.test(nombre)) {
        letras.textContent = "✔ Solo letras y espacios";
        letras.className = "validacion ok";
    } else {
        letras.textContent = "✖ Solo letras y espacios";
        letras.className = "validacion";
    }
}

function validarEmail() {
    const email = document.getElementById("email").value.trim();
    const formato = document.getElementById("emailFormato");

    if (regexEmail.test(email)) {
        formato.textContent = "✔ Formato correcto";
        formato.className = "validacion ok";
    } else {
        formato.textContent =
            "✖ Debe tener formato usuario@dominio.com";
        formato.className = "validacion";
    }
}

// Supabase verifica si el correo puede registrarse.
// No consultamos usuarios ni contraseñas desde localStorage.
function validarEmailExiste() {
    const mensaje = document.getElementById("emailExiste");
    const email = document.getElementById("email").value.trim();

    if (!mensaje) return;

    if (email === "") {
        mensaje.textContent = "";
        mensaje.className = "validacion";
        return;
    }

    mensaje.textContent = "Se verificará al registrarte";
    mensaje.className = "validacion";
}

function validarPassword() {
    const password = document.getElementById("password").value;

    actualizarEstado(
        "passLongitud",
        password.length >= 8,
        "Mínimo 8 caracteres"
    );

    actualizarEstado(
        "passMayuscula",
        /[A-Z]/.test(password),
        "Al menos una mayúscula"
    );

    actualizarEstado(
        "passMinuscula",
        /[a-z]/.test(password),
        "Al menos una minúscula"
    );

    actualizarEstado(
        "passNumero",
        /\d/.test(password),
        "Al menos un número"
    );
}

function nombreValido(nombre) {
    return (
        nombre.length >= 3 &&
        nombre.length <= 30 &&
        regexNombre.test(nombre)
    );
}

function emailValido(email) {
    return regexEmail.test(email);
}

function passwordValida(password) {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password)
    );
}

function actualizarEstado(id, cumple, texto) {
    const elemento = document.getElementById(id);

    if (!elemento) return;

    if (cumple) {
        elemento.textContent = "✔ " + texto;
        elemento.className = "validacion ok";
    } else {
        elemento.textContent = "✖ " + texto;
        elemento.className = "validacion";
    }
}

function actualizarBotonRegistro() {
    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const formularioValido =
        nombreValido(nombre) &&
        emailValido(email) &&
        passwordValida(password);

    document.getElementById("btnRegistrar").disabled =
        !formularioValido;
}

// ============================================
// REGISTRO CON SUPABASE AUTH
// ============================================

async function registrar() {
    if (!supabaseClient) {
        mostrarErrorConexion();
        return;
    }

    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!nombre || !email || !password) {
        mostrarModal(
            "Campos incompletos",
            "Completá todos los campos.",
            "warning"
        );
        return;
    }

    if (!nombreValido(nombre)) {
        mostrarModal(
            "Nombre inválido",
            "Ingresá un nombre de entre 3 y 30 caracteres, usando solo letras y espacios.",
            "warning"
        );
        return;
    }

    if (!emailValido(email)) {
        mostrarModal(
            "Email inválido",
            "Ingresá un correo electrónico válido.",
            "warning"
        );
        return;
    }

    if (!passwordValida(password)) {
        mostrarModal(
            "Contraseña inválida",
            "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.",
            "warning"
        );
        return;
    }

    const boton = document.getElementById("btnRegistrar");
    boton.disabled = true;

    try {
        const { data, error } =
        await supabaseClient.auth.getSession();

        if (error) {
            console.error(
                "Error al obtener la sesión de Supabase:",
                error
            );
        
            return false;
        }

        if (!data.session) {
            localStorage.removeItem("usuarioLogueado");
            window.location.replace("login.html");
            return false;
        }

        const mensaje = data.session
            ? "Tu cuenta fue creada correctamente. Ya podés iniciar sesión."
            : "Tu cuenta fue creada. Revisá tu correo para confirmar el registro antes de iniciar sesión.";

        mostrarModal(
            "Registro exitoso",
            mensaje,
            "success"
        );

        document
            .getElementById("messageModal")
            .addEventListener("hidden.bs.modal", () => {
                window.location.href = "login.html";
            }, { once: true });

    } catch (error) {
        console.error("Error durante el registro:", error);
        mostrarErrorConexion();
    } finally {
        boton.disabled = !(
            nombreValido(document.getElementById("nombre").value.trim()) &&
            emailValido(document.getElementById("email").value.trim()) &&
            passwordValida(document.getElementById("password").value)
        );
    }
}

// ============================================
// TRADUCCIÓN DE ERRORES DE AUTENTICACIÓN
// ============================================

function traducirErrorAuth(mensaje) {
    const error = (mensaje || "").toLowerCase();

    if (
        error.includes("already registered") ||
        error.includes("already been registered") ||
        error.includes("user already exists")
    ) {
        return "No se pudo crear la cuenta con esos datos. Si ya tenés una cuenta, intentá iniciar sesión.";
    }

    if (error.includes("password")) {
        return "La contraseña no cumple los requisitos de Supabase.";
    }

    if (error.includes("invalid email")) {
        return "El correo electrónico no tiene un formato válido.";
    }

    if (error.includes("rate limit")) {
        return "Se realizaron demasiados intentos. Esperá unos minutos y volvé a intentarlo.";
    }

    return mensaje || "Ocurrió un error inesperado. Intentá nuevamente.";
}

// ============================================
// INICIO DE SESIÓN CON SUPABASE AUTH
// ============================================

async function login() {
    if (!supabaseClient) {
        mostrarErrorConexion();
        return;
    }

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        mostrarModal(
            "Campos incompletos",
            "Ingresá tu correo y contraseña.",
            "warning"
        );
        return;
    }

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            let mensaje = "Verificá tu correo y contraseña e intentá nuevamente.";

            if (
                error.message.toLowerCase().includes("email not confirmed")
            ) {
                mensaje = "Primero tenés que confirmar tu correo electrónico. Revisá tu bandeja de entrada.";
            }

            mostrarModal("No se pudo iniciar sesión", mensaje, "danger");
            return;
        }

        const usuarioAuth = data.user;

        // Obtenemos el nombre guardado en el perfil de Supabase.
        const { data: perfil, error: errorPerfil } =
            await supabaseClient
                .from("profiles")
                .select("nombre, fecha_registro")
                .eq("id", usuarioAuth.id)
                .maybeSingle();

        if (errorPerfil) {
            console.error("No se pudo consultar el perfil:", errorPerfil);
        }

        const nombre =
            perfil?.nombre ||
            usuarioAuth.user_metadata?.nombre ||
            "Usuario";

        // Compatibilidad con el código existente de index.html.
        // Nunca guardamos la contraseña en localStorage.
        const usuarioLocal = {
            id: usuarioAuth.id,
            nombre: nombre,
            email: usuarioAuth.email,
            fechaRegistro: perfil?.fecha_registro || null
        };

        localStorage.setItem(
            "usuarioLogueado",
            JSON.stringify(usuarioLocal)
        );

        const modal = mostrarModal(
            "",
            `👋 ¡Bienvenido, ${nombre}!`,
            "success"
        );

        const header = document.getElementById("messageHeader");
        const footer = document.getElementById("messageFooter");
        const closeButton = document.getElementById("messageClose");

        if (header) header.classList.add("d-none");
        if (footer) footer.classList.add("d-none");
        if (closeButton) closeButton.classList.add("d-none");

        if (!modal) {
            window.location.href = "index.html";
            return;
        }

        document
            .getElementById("messageModal")
            .addEventListener("hidden.bs.modal", () => {
                if (header) header.classList.remove("d-none");
                if (footer) footer.classList.remove("d-none");
                if (closeButton) closeButton.classList.remove("d-none");
                window.location.href = "index.html";
            }, { once: true });

        setTimeout(() => {
            modal.hide();
        }, 2000);

    } catch (error) {
        console.error("Error durante el inicio de sesión:", error);
        mostrarErrorConexion();
    }
}

// ============================================
// CIERRE DE SESIÓN
// ============================================

function cerrarSesion() {
    const elemento = document.getElementById("logoutModal");

    if (!elemento) {
        confirmarCerrarSesion();
        return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(elemento);
    modal.show();
}

async function confirmarCerrarSesion() {
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                console.error("Error al cerrar sesión:", error);
            }
        }

        localStorage.removeItem("usuarioLogueado");
        window.location.href = "login.html";

    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        mostrarModal(
            "Error",
            "No se pudo cerrar la sesión correctamente. Intentá nuevamente.",
            "danger"
        );
    }
}

// ============================================
// FONDO ANIMADO DE BICICLETAS
// ============================================

function crearFondoBicis() {
    const fondo = document.getElementById("fondoBicis");

    if (!fondo) return;

    fondo.innerHTML = "";

    const filas = 12;
    const espacioVertical = 8;
    const espacioHorizontal = 6.5;
    const columnas = Math.ceil(100 / espacioHorizontal) + 8;

    for (let fila = 0; fila < filas; fila++) {
        const offset = fila % 2 === 0
            ? 0
            : espacioHorizontal / 2;

        for (let col = -4; col < columnas; col++) {
            const bici = document.createElement("div");

            bici.className = "bici";
            bici.textContent = "🚲";
            bici.style.top = `${4 + fila * espacioVertical}%`;
            bici.style.left = `${col * espacioHorizontal + offset}%`;

            const duracion = 35;
            bici.style.animationDelay =
                `${-(col * (duracion / columnas))}s`;

            fondo.appendChild(bici);
        }
    }
}


//============================================
//  VERIFICACIÓN DE SESIÓN EN PÁGINAS PRIVADAS
//============================================ 

async function verificarSesion() {
    const esPaginaPrincipal =
        window.location.pathname.endsWith("/index.html") ||
        window.location.pathname.endsWith("/");

    if (!esPaginaPrincipal) {
        return true;
    }

    if (!supabaseClient) {
        localStorage.removeItem("usuarioLogueado");
        window.location.replace("login.html");
        return false;
    }

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error || !data.session) {
            localStorage.removeItem("usuarioLogueado");
            window.location.replace("login.html");
            return false;
        }

        const usuarioAuth = data.session.user;

        const { data: perfil, error: errorPerfil } =
            await supabaseClient
                .from("profiles")
                .select("nombre, fecha_registro")
                .eq("id", usuarioAuth.id)
                .maybeSingle();

        if (errorPerfil) {
            console.error(
                "Error al verificar el perfil:",
                errorPerfil
            );
        }

        const usuarioLocal = {
            id: usuarioAuth.id,
            nombre:
                perfil?.nombre ||
                usuarioAuth.user_metadata?.nombre ||
                "Usuario",
            email: usuarioAuth.email,
            fechaRegistro: perfil?.fecha_registro || null
        };

        localStorage.setItem(
            "usuarioLogueado",
            JSON.stringify(usuarioLocal)
        );

        return true;

    } catch (error) {
        console.error(
            "Error al verificar la sesión:",
            error
        );

        localStorage.removeItem("usuarioLogueado");
        window.location.replace("login.html");
        return false;
    }
}



// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("nombre")) {
        document
            .getElementById("nombre")
            .addEventListener("input", () => {
                validarNombre();
                actualizarBotonRegistro();
            });

        document
            .getElementById("email")
            .addEventListener("input", () => {
                validarEmail();
                validarEmailExiste();
                actualizarBotonRegistro();
            });

        document
            .getElementById("password")
            .addEventListener("input", () => {
                validarPassword();
                actualizarBotonRegistro();
            });

        validarNombre();
        validarEmail();
        validarPassword();
        actualizarBotonRegistro();
    }

    crearFondoBicis();

    // Permitir enviar con Enter.
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;

        if (document.getElementById("loginEmail")) {
            e.preventDefault();
            login();
            return;
        }

        if (document.getElementById("btnRegistrar")) {
            e.preventDefault();

            const boton = document.getElementById("btnRegistrar");

            if (!boton.disabled) {
                registrar();
            }
        }
    });
});
