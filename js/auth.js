
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
function registrar() {

    const nombre =
        document.getElementById("nombre").value;

    const email =
        document.getElementById("email").value;

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

    let usuarios =
        JSON.parse(localStorage.getItem("usuarios")) || [];

    const existe =
        usuarios.find(u => u.email === email);

    if (existe) {

        mostrarModal(
    "Error",
    "Ese correo ya está registrado.",
    "danger"
);

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

   mostrarModal(
    "Bienvenido",
    `Hola ${usuario.nombre}`,
    "success"
);

document
    .getElementById("messageModal")
    .addEventListener("hidden.bs.modal", () => {

        window.location.href = "index.html";

    }, { once: true });

}



function cerrarSesion() {

    localStorage.removeItem("usuarioLogueado");

    window.location.href = "login.html";

}