const {
    nombreValido,
    emailValido,
    passwordValida
} = require("../js/auth.js");

test("Debe aceptar un nombre válido", () => {

    expect(
        nombreValido("Paula Barrionuevo")
    ).toBe(true);

});


test("Debe rechazar un nombre demasiado corto", () => {

    expect(
        nombreValido("Pa")
    ).toBe(false);

});


test("Debe rechazar un nombre con números", () => {

    expect(
        nombreValido("Paula123")
    ).toBe(false);

});


test("Debe aceptar un email válido", () => {

    expect(
        emailValido("paula@email.com")
    ).toBe(true);

});


test("Debe rechazar un email inválido", () => {

    expect(
        emailValido("paula@email")
    ).toBe(false);

});


test("Debe aceptar una contraseña válida", () => {

    expect(
        passwordValida("Paula123")
    ).toBe(true);

});


test("Debe rechazar una contraseña sin mayúscula", () => {

    expect(
        passwordValida("paula123")
    ).toBe(false);

});


test("Debe rechazar una contraseña sin número", () => {

    expect(
        passwordValida("PaulaABC")
    ).toBe(false);

});


test("Debe rechazar una contraseña de menos de 8 caracteres", () => {

    expect(
        passwordValida("Pa123")
    ).toBe(false);

});