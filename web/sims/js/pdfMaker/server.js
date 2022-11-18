

function startServer(port, router, urlMapping) {
    let https = require('http');
    let url = require("url");
    const fs = require('fs');
    let options;
    const EventEmitter = require('events');
    const emitter = new EventEmitter();
    emitter.setMaxListeners(200);
    new Promise(function (resolve, reject) {
        options = {
            'host': 'localhost',
            'port': port
        };
        resolve();
    }).then(function () {
        require('events').EventEmitter.defaultMaxListeners = 40;

        let server = https.createServer(options, function(req, res){
            let pathname = url.parse(req.url).pathname;
            router(req, res, pathname, urlMapping);
        });

        server.listen(port);
    }).catch(function (e) {
        console.log('There are something wrong, please check the following situation: ');
        console.log('1. You have to start up nodeJs server under the Ragic root dir with command "node web/sims/js/pdfMaker/nodeJs.js 8888"');
        console.log('2. web/sims/js/pdfMaker/key.pem and web/sims/js/pdfMaker/cert.pem both exist');


        let fs = require('fs');
        let errorLogPath = './serverErr.log';
        let util = require('util');
        if (!fs.existsSync(errorLogPath)) {
            fs.writeFile(errorLogPath, "", {flag: 'wx'}, function (err) {
            });
        }

        let errorLog = fs.createWriteStream(errorLogPath, {flags: 'a'});
        errorLog.write(util.format(e) + '\n');
        errorLog.write(util.format(e.message) + '\n');
        errorLog.write(util.format(e.stack) + '\n');

        return;
    });
}

exports.startServer = startServer;