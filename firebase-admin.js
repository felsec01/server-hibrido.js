// firebase-admin.js
const admin = require("firebase-admin");

// Carrega credenciais do Firebase via variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cleanhelmet-e55b7-default-rtdb.firebaseio.com"
});

module.exports = admin;
