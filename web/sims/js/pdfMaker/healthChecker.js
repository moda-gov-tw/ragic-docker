function healthChecker(req, res) {
    res.setHeader('Content-Type' ,'text/plain;charset=utf-8');
    res.writeHeader(200);
    res.end("Still Alive...");
}
exports.healthChecker = healthChecker;