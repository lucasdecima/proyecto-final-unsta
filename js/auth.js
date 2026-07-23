
function mostrarModal(titulo, mensaje, tipo = "success") {

    const header = document.getElementById("messageHeader");
    const title = document.getElementById("messageTitle");
    const text = document.getElementById("messageText");

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

    const modal = new bootstrap.Modal(
        document.getElementById("messageModal")
    );

    modal.show();

    return modal;
}

    const regexNombre =
        /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/;

    const regexEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarNombre() {

    const nombre =
        document.getElementById("nombre").value.trim();

    const longitud =
        document.getElementById("nombreLongitud");

    const letras =
        document.getElementById("nombreLetras");

    if (nombre.length >= 3 && nombre.length <= 30) {

        longitud.textContent = "✔ Entre 3 y 30 caracteres";
        longitud.className = "validacion ok";

    } else {

        longitud.textContent = "✖ Entre 3 y 30 caracteres";
        longitud.className = "validacion";

    }

    if (regexNombre.test(nombre)) {

        letras.textContent = "✔ Solo letras y espacios";
        letras.className = "validacion ok";

    } else {

        letras.textContent = "✖ Solo letras y espacios";
        letras.className = "validacion";

    }

}


function validarEmail() {

    const email =
        document.getElementById("email").value.trim();

    const formato =
        document.getElementById("emailFormato");

    if (regexEmail.test(email)) {

        formato.textContent =
            "✔ Formato correcto";

        formato.className =
            "validacion ok";

    } else {

        formato.textContent =
            "✖ Debe tener formato usuario@dominio.com";

        formato.className =
            "validacion";

    }

}

function validarEmailExiste(){

    const email =
        document.getElementById("email").value.trim();


    const mensaje =
        document.getElementById("emailExiste");

        if(email === ""){

            mensaje.textContent = "";
        
            mensaje.className = "validacion";
        
            return;
        }
    
    let usuarios =
        JSON.parse(localStorage.getItem("usuarios")) || [];


    const existe =
        usuarios.some(
            usuario => usuario.email.toLowerCase() === email.toLowerCase()
        );


    if(existe){

        mensaje.textContent =
            "✖ Este correo ya está registrado";

        mensaje.className =
            "validacion";

    } else {

        mensaje.textContent =
            "✔ Correo disponible";

        mensaje.className =
            "validacion ok";

    }

}

function validarPassword() {

    const password =
        document.getElementById("password").value;

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

function nombreValido(nombre){

    return (
        nombre.length >= 3 &&
        nombre.length <= 30 &&
        regexNombre.test(nombre)
    );

}

function emailValido(email){

    return regexEmail.test(email);

}


function passwordValida(password){

    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password)
    );

}

function actualizarBotonRegistro(){

    const nombre =
        document.getElementById("nombre").value.trim();

    const email =
    document.getElementById("email").value.trim();
    
        if(email === ""){
            document.getElementById("btnRegistrar").disabled = true;
            return;
        }


    const password =
        document.getElementById("password").value;


    const usuarios =
        JSON.parse(localStorage.getItem("usuarios")) || [];


    const emailExiste =
        usuarios.some(
            usuario => 
            usuario.email.toLowerCase() === email.toLowerCase()
        );


    const formularioValido =
        nombreValido(nombre) &&
        emailValido(email) &&
        passwordValida(password) &&
        !emailExiste;


    document.getElementById("btnRegistrar").disabled =
        !formularioValido;

}

function actualizarEstado(id, cumple, texto) {

    const elemento =
        document.getElementById(id);

    if (cumple) {

        elemento.textContent =
            "✔ " + texto;

        elemento.className =
            "validacion ok";

    } else {

        elemento.textContent =
            "✖ " + texto;

        elemento.className =
            "validacion";

    }

}

function registrar() {

    const nombre =
    document.getElementById("nombre").value.trim();

    const email =
    document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

        if (!nombre || !email || !password) {

            mostrarModal(
                "Campos incompletos",
                "Complete todos los campos.",
                "warning"
            );
        
            return;
        }
        
        
        if(!nombreValido(nombre)){
        
            mostrarModal(
                "Nombre inválido",
                "Ingrese un nombre correcto.",
                "warning"
            );
        
            return;
        
        }
        
        
        if(!emailValido(email)){
        
            mostrarModal(
                "Email inválido",
                "Ingrese un correo válido.",
                "warning"
            );
        
            return;
        
        }
        
        
        if(!passwordValida(password)){
        
            mostrarModal(
                "Contraseña inválida",
                "La contraseña no cumple los requisitos.",
                "warning"
            );
        
            return;
        
        }

    let usuarios =
        JSON.parse(localStorage.getItem("usuarios")) || [];

    const existe =
    usuarios.some(
        u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existe) {

        document.getElementById("emailExiste").textContent =
            "✖ Este correo ya está registrado";

        document.getElementById("emailExiste").className =
            "validacion";

        return;
    }

    usuarios.push({

        nombre,
        email,
        password

    });

    localStorage.setItem(
        "usuarios",
        JSON.stringify(usuarios)
    );

    const modal = mostrarModal(
        "Registro exitoso",
        "Usuario registrado correctamente.",
        "success"
    );

    document
        .getElementById("messageModal")
        .addEventListener("hidden.bs.modal", () => {

            window.location.href = "login.html";

        }, { once: true });
}



function login() {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    const usuarios =
        JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuario =
        usuarios.find(

            u =>

            u.email === email &&
            u.password === password

        );

    if (!usuario) {

                mostrarModal(
            "Acceso denegado",
            "Usuario o contraseña incorrectos.",
            "danger"
        );      

        return;

    }

    localStorage.setItem(

        "usuarioLogueado",

        JSON.stringify(usuario)

    );

const footer =
    document.getElementById("messageFooter");

footer.classList.add("d-none");

const modal = mostrarModal(
    "",
    "Bienvenido",
    "success"
);

setTimeout(() => {

    modal.hide();

    footer.classList.remove("d-none");

    window.location.href = "index.html";

}, 2000);
}

function cerrarSesion() {

    const modal = new bootstrap.Modal(
        document.getElementById("logoutModal")
    );

    modal.show();

}

function confirmarCerrarSesion() {

    localStorage.removeItem("usuarioLogueado");

    window.location.href = "login.html";

}


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
    }

});