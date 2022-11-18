let https = require('https');

let url = require("url");
const fs = require('fs');
let options;

new Promise(function (resolve, reject) {
    console.log('Try to loading key and cert...');
    options = {
        'key': fs.readFileSync('privkey.pem','utf8'),
        'cert':fs.readFileSync('cert.pem','utf8'),
        'ca':fs.readFileSync('chain.pem','utf8')
    };
    resolve();
}).then(function () {
    console.log('Try to start server');
    require('events').EventEmitter.defaultMaxListeners = 40;

    let server = https.createServer(options, function(req, res){
        let pathname = url.parse(req.url).pathname;
        console.log('pathname: ' + pathname);
        res.writeHead(200);
        res.end('HTTPS SUCCESS!!');
    });

    server.listen(8998);

    console.log('Start success');
}).catch(function (e) {
    console.log(e);
    return;
});
