const {execSync, spawn} = require('child_process');
const path = require('path');
const fs = require('fs');

function restartRagicWindows(res) {
  let stdout;
  try {
    stdout = execSync('jps -lvm') + '';
  } catch (e) {
    printHTML(res, e, 500);
  }
  let pid;
  let lines = stdout.split('\n');
  for (let line of lines) {
    if (line.includes("RagicJetty")) {
        pid = line.split(/\s+/)[0];
        break;
    }
  }
  if (pid) {
    try {
      execSync(`taskkill /pid ${pid} /t`);
    } catch (e) {
      printHTML(res, e, 500);
    }
  }

  const ragicHome = path.resolve(__dirname, '..', '..', '..', '..');
  spawn(ragicHome + '\\bin\\ragic.bat', ['start'], {
    shell: false,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref();

  printHTML(res, 'Restarted!');
}

function restartRagicLinux(res) {
  let stdout = execSync('ps aux | grep java') + '';

  let lines = stdout.split('\n');
  try {
    for (let line of lines) {
      if (line.includes("RagicJetty")) {
          let pid = line.split(/\s+/)[1];
          execSync(`sudo kill ${pid}`);
      }
    }
  } catch(e) {
    printHTML(res, e, 500);
  }
  
  const ragicHome = path.resolve(__dirname, '..', '..', '..', '..');
  let bash = ragicHome + path.sep + "bin" + path.sep + "local.sh";
  try {
    if (!fs.existsSync(bash)) {
      bash = ragicHome + path.sep + "bin" + path.sep + "ragic.sh";
    }
  } catch(err) {
    bash = ragicHome + path.sep + "bin" + path.sep + "ragic.sh";
  }

  try {
    execSync('nohup ' + bash + ' manual &');
  } catch (e) {
    printHTML(res, e, 500);
  }
  printHTML(res, 'Restarted!');
}

function printHTML(res, html="", statusCode=200) {
  res.writeHead(statusCode, {'Content-Type':'text/html'});
  res.write(`<html><body>${html}</body></html>`);
  res.end();
}

function ragicRestarter(req, res) {
  if (process.platform === 'win32') {
    restartRagicWindows(res);
  } else {
    restartRagicLinux(res);
  }
}

exports.ragicRestarter = ragicRestarter;