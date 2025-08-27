import express from "express";
import basicAuth from "basic-auth";

const app = express();
const PORT = process.env.PORT || 3000;

// usuario y contraseña
const USER = "maxpower23";
const PASS = "6w(-DmlM+b4F";

// middleware autenticación
function auth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== USER || user.pass !== PASS) {
    res.set("WWW-Authenticate", 'Basic realm="401"');
    return res.status(401).send("Acceso denegado");
  }
  next();
}

// servir archivos estáticos
app.use(express.static("public")); // si pones tu index.html en /public
app.use("/videos", auth, express.static("videos")); // proteger carpeta de videos

// ruta raíz
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
