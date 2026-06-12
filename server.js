const express = require("express");
const cors = require("cors");
const { WebpayPlus } = require("transbank-sdk");
const { Options, IntegrationApiOptions, Environment } = require("transbank-sdk");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // carpeta con tu index.html

// ✅ Credenciales de PRUEBA (modo integración)
// Cuando tengas cuenta real, reemplaza por tus credenciales de producción
const tx = new WebpayPlus.Transaction(
  new Options(
    "597055555532",                          // Commerce Code pruebas
    "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1", // API Key pruebas
    Environment.Integration
  )
);

// 1️⃣ INICIAR PAGO
app.post("/api/pago/iniciar", async (req, res) => {
  try {
    const { orden, monto, items } = req.body;
    const buyOrder   = `OC-${orden}-${Date.now()}`.substring(0, 26);
    const sessionId  = `SES-${Date.now()}`;
    const returnUrl  = `${process.env.BASE_URL || "http://localhost:3000"}/api/pago/confirmar`;

    const response = await tx.create(buyOrder, sessionId, monto, returnUrl);

    res.json({
      ok: true,
      url: response.url,
      token: response.token
    });
  } catch (err) {
    console.error("Error iniciando pago:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2️⃣ CONFIRMAR PAGO (Transbank redirige aquí)
app.get("/api/pago/confirmar", async (req, res) => {
  try {
    const { token_ws } = req.query;

    if (!token_ws) {
      return res.redirect("/?pago=cancelado");
    }

    const response = await tx.commit(token_ws);

    if (response.status === "AUTHORIZED") {
      // Pago exitoso
      res.redirect(`/?pago=exitoso&orden=${response.buy_order}&monto=${response.amount}`);
    } else {
      res.redirect("/?pago=rechazado");
    }
  } catch (err) {
    console.error("Error confirmando pago:", err);
    res.redirect("/?pago=error");
  }
});

// 3️⃣ ESTADO DEL SERVIDOR
app.get("/api/status", (req, res) => {
  res.json({ ok: true, mensaje: "Servidor Repuestos Full Cars activo 🚗" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));
