import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// 👇 configura tus credenciales de FileLu (usa variables de entorno en Render)
const WEBDAV_URL = "https://filelu.com/webdav"; // URL base de tu almacenamiento FileLu
const WEBDAV_USER = process.env.WEBDAV_USER || "maxpower23"; // usuario FileLu
const WEBDAV_PASS = process.env.WEBDAV_PASS || "6w(-DmlM+b4F";   // contraseña FileLu

// middleware para CORS (para que tu HTML/JS pueda acceder desde cualquier dominio)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ruta para probar si funciona
app.get("/", (req, res) => {
  res.send("Servidor proxy funcionando 🚀");
});

// ruta para hacer streaming de un video
app.get("/stream/:file", async (req, res) => {
  const { file } = req.params;

  try {
    // construimos la URL al archivo en FileLu (carpeta raíz en WebDAV)
    const fileUrl = `${WEBDAV_URL}/${file}`;

    // headers básicos para autenticación
    const headers = {
      "Authorization": "Basic " + Buffer.from(`${WEBDAV_USER}:${WEBDAV_PASS}`).toString("base64"),
      "User-Agent": "Node.js Proxy"
    };

    // si el navegador pide un rango (para adelantar/pausar en streaming)
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    // hacemos fetch al archivo en FileLu
    const response = await fetch(fileUrl, { headers });

    if (!response.ok) {
      return res.status(response.status).send("Error al obtener el archivo desde FileLu");
    }

    // copiamos headers relevantes
    res.status(response.status);
    response.headers.forEach((val, key) => {
      if (["content-type", "content-length", "accept-ranges", "content-range"].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });

    // enviamos el stream al navegador
    response.body.pipe(res);
  } catch (error) {
    console.error("Error en el proxy:", error);
    res.status(500).send("Error interno en el servidor proxy");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
