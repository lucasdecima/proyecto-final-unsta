function registrar() {

    const nombre =
        document.getElementById("nombre").value;

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    if (!nombre || !email || !password) {

        alert("Complete todos los campos.");

        return;
    }

    let usuarios =
        JSON.parse(localStorage.getItem("usuarios")) || [];

    const existe =
        usuarios.find(u => u.email === email);

    if (existe) {

        alert("Ese correo ya está registrado.");

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

    alert("Usuario registrado correctamente.");

    window.location.href = "login.html";

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

        alert("Usuario o contraseña incorrectos.");

        return;

    }

    localStorage.setItem(

        "usuarioLogueado",

        JSON.stringify(usuario)

    );

    window.location.href = "index.html";

}



function cerrarSesion() {

    localStorage.removeItem("usuarioLogueado");

    window.location.href = "login.html";

}