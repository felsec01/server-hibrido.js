require("dotenv").config();
const admin = require("./firebase-admin");

async function syncClaims() {
  try {
    const snapshot = await admin.database().ref("usuarios").once("value");
    const usuarios = snapshot.val();

    if (!usuarios) {
      console.log("Nenhum usuário encontrado no Realtime Database.");
      return;
    }

    for (const uid in usuarios) {
      const usuario = usuarios[uid];
      const cargo = usuario.cargo;

      if (!cargo) {
        console.warn(`Usuário ${uid} sem cargo definido, ignorando...`);
        continue;
      }

      // Atualiza claims no Firebase Auth
      await admin.auth().setCustomUserClaims(uid, { cargo });

      console.log(`✅ Claims sincronizados para ${usuario.email} (${cargo})`);
    }

    console.log("🎯 Sincronização concluída!");
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
  }
}

syncClaims();
