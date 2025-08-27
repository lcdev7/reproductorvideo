const express = require('express');
const axios = require('axios');
const app = express();

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Middleware para logging de requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Proxy mejorado para FileLu que sigue redirecciones y obtiene enlaces directos
app.get('/proxy/video', async (req, res) => {
    try {
        const fileluUrl = req.query.url;
        
        if (!fileluUrl) {
            return res.status(400).send('URL parameter is required');
        }

        console.log('🔗 URL de FileLu recibida:', fileluUrl);

        // Configurar headers para simular un navegador real
        const browserHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        // 1. Hacer una request GET para obtener la página de FileLu
        const pageResponse = await axios.get(fileluUrl, {
            headers: browserHeaders,
            maxRedirects: 5,
            timeout: 15000,
            validateStatus: null // Aceptar todos los status codes
        });

        console.log('📄 Status de la página:', pageResponse.status);
        console.log('📄 Content-Type:', pageResponse.headers['content-type']);

        let directVideoUrl = null;

        // 2. Buscar el enlace directo del video en el HTML
        const html = pageResponse.data;
        
        // Patrones comunes para encontrar enlaces de descarga directa
        const downloadPatterns = [
            /<a[^>]*download[^>]*href="([^"]*)"/i,
            /<a[^>]*href="([^"]*)"[^>]*download/i,
            /window\.location\.href\s*=\s*['"]([^'"]*)['"]/,
            /<source[^>]*src="([^"]*)"[^>]*type="video\/mp4"/i,
            /"downloadUrl":"([^"]*)"/,
            /href="(https:\/\/[^"]*\.mp4[^"]*)"/i
        ];

        for (const pattern of downloadPatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                directVideoUrl = match[1];
                console.log('🎯 Enlace directo encontrado con patrón:', directVideoUrl);
                break;
            }
        }

        // 3. Si no encontramos en el HTML, intentar con HEAD para redirecciones
        if (!directVideoUrl) {
            console.log('🔍 No se encontró enlace directo en HTML, intentando con HEAD...');
            try {
                const headResponse = await axios.head(fileluUrl, {
                    headers: browserHeaders,
                    maxRedirects: 5,
                    timeout: 10000
                });
                
                directVideoUrl = headResponse.request.res.responseUrl || headResponse.config.url;
                console.log('🔗 URL después de redirecciones HEAD:', directVideoUrl);
            } catch (headError) {
                console.log('⚠️ Error en HEAD, intentando GET para redirección...');
                const getResponse = await axios.get(fileluUrl, {
                    headers: browserHeaders,
                    maxRedirects: 0, // No seguir redirecciones automáticamente
                    timeout: 10000,
                    validateStatus: null
                });
                
                if (getResponse.headers.location) {
                    directVideoUrl = getResponse.headers.location;
                    console.log('🔗 Redirección encontrada:', directVideoUrl);
                }
            }
        }

        if (!directVideoUrl) {
            throw new Error('No se pudo obtener el enlace directo del video');
        }

        // Asegurar que la URL sea absoluta
        if (directVideoUrl.startsWith('//')) {
            directVideoUrl = 'https:' + directVideoUrl;
        } else if (directVideoUrl.startsWith('/')) {
            const urlObj = new URL(fileluUrl);
            directVideoUrl = urlObj.origin + directVideoUrl;
        }

        console.log('🎬 URL final del video:', directVideoUrl);

        // 4. Configurar headers para la solicitud del video
        const videoHeaders = { ...browserHeaders };
        if (req.headers.range) {
            videoHeaders.Range = req.headers.range;
        }

        // 5. Hacer la request al enlace directo real del video
        const videoResponse = await axios({
            method: 'get',
            url: directVideoUrl,
            responseType: 'stream',
            headers: videoHeaders,
            timeout: 30000,
            maxRedirects: 5
        });

        // 6. Configurar headers de respuesta para streaming
        res.setHeader('Content-Type', videoResponse.headers['content-type'] || 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (videoResponse.headers['content-range']) {
            res.setHeader('Content-Range', videoResponse.headers['content-range']);
        }
        if (videoResponse.headers['content-length']) {
            res.setHeader('Content-Length', videoResponse.headers['content-length']);
        }

        if (videoResponse.status === 206) {
            res.status(206);
        }

        console.log('✅ Transmitiendo video...');

        // 7. Pipe del stream de video
        videoResponse.data.pipe(res);

        videoResponse.data.on('error', (err) => {
            console.error('❌ Error en el stream:', err);
            if (!res.headersSent) {
                res.status(500).send('Stream error');
            }
        });

        videoResponse.data.on('end', () => {
            console.log('✅ Transmisión completada');
        });

    } catch (error) {
        console.error('❌ Error en proxy:', error.message);
        console.error(error.stack);
        
        if (!res.headersSent) {
            if (error.response) {
                res.status(error.response.status).send(`Error from FileLu: ${error.response.status}`);
            } else if (error.request) {
                res.status(504).send('Connection to FileLu failed');
            } else {
                res.status(500).send('Internal server error: ' + error.message);
            }
        }
    }
});

// Ruta para debugging de redirecciones
app.get('/debug/redirect', async (req, res) => {
    try {
        const fileluUrl = req.query.url;
        if (!fileluUrl) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        const browserHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        const response = await axios.get(fileluUrl, {
            headers: browserHeaders,
            maxRedirects: 0,
            timeout: 10000,
            validateStatus: null
        });

        res.json({
            originalUrl: fileluUrl,
            status: response.status,
            location: response.headers.location,
            headers: response.headers,
            data: response.data.substring(0, 1000) + '...' // Primeros 1000 caracteres
        });

    } catch (error) {
        res.json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

// Ruta de salud para verificar que el servidor funciona
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'FileLu Video Proxy'
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('💥 Error global:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Debug: http://localhost:${PORT}/debug/redirect?url=FILELU_URL`);
    console.log(`🎥 Proxy: http://localhost:${PORT}/proxy/video?url=FILELU_URL`);
});
