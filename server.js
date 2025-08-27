const express = require('express');
const axios = require('axios');
const app = express();

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Proxy para videos de FileLu con soporte para Range headers
app.get('/proxy/video', async (req, res) => {
  try {
    const fileluUrl = req.query.url;
    
    if (!fileluUrl) {
      return res.status(400).send('URL parameter is required');
    }

    // Configurar headers para la solicitud a FileLu
    const headers = {};
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await axios({
      method: 'get',
      url: fileluUrl,
      responseType: 'stream',
      headers: headers,
      timeout: 30000 // 30 segundos timeout
    });

    // Configurar headers de respuesta para streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Copiar headers de content-range si existen
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    // Manejar códigos de estado
    if (response.status === 206) {
      res.status(206);
    } else {
      res.status(200);
    }

    // Pipe del stream de video
    response.data.pipe(res);

    // Manejar errores en el stream
    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    if (error.response) {
      // Error de respuesta de FileLu
      res.status(error.response.status).send('Error from FileLu');
    } else if (error.request) {
      // Error de conexión
      res.status(504).send('Connection to FileLu failed');
    } else {
      // Error general
      res.status(500).send('Internal server error');
    }
  }
});

// Ruta principal - servir el reproductor
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Proxy available at: http://localhost:${PORT}/proxy/video?url=FILELU_URL`);
});
