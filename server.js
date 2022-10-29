const http = require('http');
const app = require('./app');
const port = process.env.PORT || 8000;

const server = http.createServer();
 
app.listen(port,() => console.log('Server is running on port ' + port));

