// firebase-admin.js
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) { // evita inicialização duplicada
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cleanhelmet-e55b7-default-rtdb.firebaseio.com"
  });

  console.log("✅ Firebase Admin inicializado com projeto:", serviceAccount.project_id);
} else {
  console.log("⚠️ Firebase Admin já estava inicializado, reutilizando instância existente");
}

module.exports = admin;
