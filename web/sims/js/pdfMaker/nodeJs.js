if(process.argv.length <= 2) {
    console.log('You should add port in your command, for instance:');
    console.log('node web/sims/js/pdfMaker/nodeJs.js 8888');
    return;
}

let port = process.argv[2];

let server = require("./server");
let router = require("./router");
let urlMapping = require("./urlMapping");

server.startServer(port, router.route, urlMapping.createUrlMapping());
server.timeout = 60000;
