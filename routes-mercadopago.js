// ===== BACKEND MERCADO PAGO INTEGRAÇÃO =====
import express from "express";
import fetch from "node-fetch"; // ou axios
const router = express.Router();

// Substitua pelo seu Access Token real do Mercado Pago
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "TEST-xxxxxxxxxxxxxxxxxxxxxx";

// Endpoint para criar preferência
router.post("/create-preference", async (req, res) => {
  try {
    const { items, back_urls, auto_return } = req.body;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items,
        back_urls,
        auto_return
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Erro Mercado Pago:", errorData);
      return res.status(500).json({ error: "Erro ao criar preferência", details: errorData });
    }

    const data = await response.json();
    console.log("✅ Preferência criada:", data.id);
    res.json({ id: data.id });
  } catch (error) {
    console.error("❌ Erro no backend:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
