const puppeteer = require('puppeteer');

const formatSpec = {
    // unit inch
    "A4": [8.27, 11.7],
    "A3": [11.7, 16.5],
    "Letter": [8.5, 11],
    "Tabloid": [11, 17],
    "Ledger": [11, 17],
    "Legal": [8.5, 14]
};

const formatData = (input) => {
    if (input > 9) {
        return input;
    } else return `0${input}`;
};

const format24Hour = ({dd, mm, yyyy, hh, MM, SS}) => {
    return (`${yyyy}/${mm}/${dd} ${hh}:${MM}:${SS}`);
};

function dateFormating(date) {
    const format = {
        dd: formatData(date.getDate()),
        mm: formatData(date.getMonth() + 1),
        yyyy: date.getFullYear(),
        hh: formatData(date.getHours()),
        MM: formatData(date.getMinutes()),
        SS: formatData(date.getSeconds()),
    };

    return format24Hour(format);
}

const browserOptions = {
    'headless': true,
    'ignoreHTTPSErrors': true,
    'args': ['--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars']
};

let fs = require('fs');
let util = require('util');
let urlLogPath = './urlCaller.log';
let errorLogPath = './errorLog.log';

if (!fs.existsSync(urlLogPath)) {
    fs.writeFile(urlLogPath, "", {flag: 'wx'}, function (err) {
    });
}
if (!fs.existsSync(errorLogPath)) {
    fs.writeFile(errorLogPath, "", {flag: 'wx'}, function (err) {
    });
}

let urlLog = fs.createWriteStream(urlLogPath, {flags: 'a'});
let errorLog = fs.createWriteStream(errorLogPath, {flags: 'a'});

const log2file = function (v, logFile) {
    logFile.write(util.format(v) + '\n');
};

function pdfMaker(req, res) {
    try {
        if ('/restartPDFMaker' === req.url) {
            res.setHeader('Content-Type', 'text/plain;charset=utf-8');
            res.writeHeader(200);
            res.end("Restarting...");
            // process.exit(1);
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', function (data) {
                try {
                    body += data;
                } catch (e) {
                    log2file(e, errorLog);
                    log2file(e.message, errorLog);
                    log2file(e.stack, errorLog);
                }
            });

            req.on('end', function () {
                    try {
                        let urlParam = new URLSearchParams(body);
                        let fileName = urlParam.get('fileName');
                        let pdfContent = urlParam.get('pdfContent');
                        let pdfContentUrl = urlParam.get('pdfContentUrl');
                        let ifReport = urlParam.get('report') === 'true';

                        log2file(dateFormating(new Date()) + " : " + pdfContentUrl + "," + fileName, urlLog);
                        if (pdfContent && fileName) {
                            var orientation = urlParam.get('orientation');
                            var format = urlParam.get('pdfSize');
                        }

                        let tmpFolder = 'cust/tmp/';
                        let output = tmpFolder + fileName;
                        if (!fs.existsSync(tmpFolder)) {
                            fs.mkdir(tmpFolder, {recursive: true}, err => {
                                if (err) {
                                    log2file(err, errorLog);
                                    log2file(err.message, errorLog);
                                    log2file(err.stack, errorLog);
                                }
                            })
                        }

                        let ifNeedInit = urlParam.get("ifNeedInit");
                        let jsFiles = urlParam.getAll("jsFiles");
                        let tableElementId = urlParam.get("tableElementId");

                        let spec = formatSpec[format] ? formatSpec[format] : formatSpec['A4'];

                        const isLandscape = orientation === 'landscape';
                        const formatWidth = isLandscape ? spec[1] : spec[0];
                        const formatHeight = isLandscape ? spec[0] : spec[1];


                        (async () => {
                            let browser;
                            let page;
                            try {
                                browser = await puppeteer.launch(browserOptions);
                                page = await browser.newPage();
                                page.setDefaultTimeout(60000);

                                for (let i = 0; i < jsFiles.length; i++) {
                                    await page.addScriptTag({'url': jsFiles[i]});
                                }
                                await page.setContent(pdfContent, {waitUntil: 'networkidle0'});

                                if (ifNeedInit === 'true') {
                                    await page.evaluate(function () {
                                        init();
                                    });
                                }

                                if (ifReport) {
                                    try {
                                        await page.evaluate(_ => {
                                            showReportDescription();
                                        })
                                    } catch (e) {
                                    }
                                } else {
                                    try {
                                        await page.evaluate(_ => {
                                            adjustImgStyle();
                                        })
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }

                                let returnValue = await page.evaluate(function (formatWidth, formatHeight, tableElementId) {
                                    let div, body, entryNumber, isMultiEntry, container, tableWidth, psDpi, zoomFactor = 1;

                                    try {
                                        div = document.createElement("div");
                                        body = document.getElementsByTagName("body")[0];
                                        entryNumber = document.querySelectorAll("table.entryTable").length;
                                        isMultiEntry = entryNumber > 1;

                                        if (tableElementId) {
                                            container = document.getElementById(tableElementId);
                                            tableWidth = container.offsetWidth;
                                        } else {
                                            container = document.querySelector("body div table");
                                            tableWidth = container.offsetWidth;
                                        }

                                        div.style.width = "1in";
                                        body.appendChild(div);
                                        psDpi = div.offsetWidth;
                                        body.removeChild(div);

                                        //px = inch * dpi;
                                        let pdfWidth = formatWidth * psDpi;
                                        let pdfHeight = formatHeight * psDpi;

                                        if (container.offsetWidth > pdfWidth) {
                                            zoomFactor = pdfWidth / tableWidth;
                                        }

                                        if (isMultiEntry) {
                                            Array.from(body.querySelectorAll("table.entryTable")).forEach(function (table, index) {
                                                if (entryNumber !== index + 1) {
                                                    let pageBreaker = document.createElement("DIV");
                                                    pageBreaker.style.pageBreakAfter = 'always';
                                                    let thisFooter = body.querySelectorAll("footer")[index];
                                                    body.insertBefore(pageBreaker, thisFooter);
                                                }
                                            });
                                        }

                                        let waterMarkDivs = body.querySelectorAll(".waterMarkDiv");

                                        Array.from(waterMarkDivs).forEach(function (ele, i) {
                                            ele.style.width = tableWidth;

                                            let thisTable = ele.parentNode.querySelector("table.entryTable");

                                            //prevent that sometimes pdf might have extra empty page
                                            ele.style['overflow-y'] = 'hidden';
                                            ele.style.height = thisTable.offsetHeight;
                                            let waterMarkImg = ele.querySelector(".waterMarkImg");
                                            let waterMarkImgContainer = ele.querySelector(".waterMarkImgContainer");
                                            waterMarkImgContainer.style.padding = '450px 0';
                                            waterMarkImg.style.width = '75%';
                                            let cloneTimes = Math.ceil(thisTable.offsetHeight / waterMarkImgContainer.offsetHeight);

                                            while (cloneTimes > 1) {
                                                ele.appendChild(waterMarkImgContainer.cloneNode(true));
                                                cloneTimes--;
                                            }
                                        });

                                        let pageBreaks = body.querySelectorAll('.pageBreakTag');
                                        Array.from(pageBreaks).forEach(function (item) {
                                            item.closest("tr").classList.add('breakAfterTr');
                                        });
                                    } catch (e) {
                                        console.log(e);
                                        console.log(e.message);
                                        console.log(e.stack);
                                    }

                                    return {
                                        'zoomFactor': zoomFactor,
                                        'tableWidth': tableWidth,
                                        'dpi': psDpi,
                                        'isMultiEntry': isMultiEntry,
                                    };
                                }, formatWidth, formatHeight, tableElementId);

                                let scale = returnValue.zoomFactor;
                                if (scale > 2) scale = 2;
                                else if (scale < 0.1) scale = 0.1;

                                await page.pdf({
                                    'path': output,
                                    'format': format,
                                    'scale': scale,
                                    'margin': {
                                        'left': '0.39in',
                                        'right': '0.39in',
                                        'top': '0.39in',
                                        'bottom': '0.39in'
                                    },
                                    'printBackground': true,
                                    'landscape': isLandscape
                                });
                                try {
                                    let fs = require('fs');
                                    let count = 0;
                                    while(!fs.existsSync(output) && count < 5) {
                                        fs.writeFile(output, "", {flag: 'wx'}, function (err) {
                                        });
                                        count++;
                                    }

                                    let file = fs.createReadStream(output);
                                    if(fs.existsSync(output)) {
                                        let stat = fs.statSync(output);
                                        res.setHeader('Content-Length', stat.size);
                                        res.setHeader('Content-Type', 'application/pdf');
                                        res.setHeader('Content-Disposition', 'attachment');
                                        res.setHeader("Cache-Control", "no-cache"); //HTTP 1.1
                                        res.setHeader("Pragma", "no-cache"); //HTTP 1.0
                                        res.writeHeader(200);
                                        file.pipe(res);
                                        fs.unlinkSync(file.path);
                                    }
                                } catch (err) {
                                    console.error(err)
                                }
                            } catch (e) {
                                log2file(e, errorLog);
                                log2file(e.message, errorLog);
                                log2file(e.stack, errorLog);
                            } finally {
                                try {
                                    await page.goto('about:blank');
                                    await page.close();
                                    await browser.close()
                                } catch (e) {
                                    log2file(dateFormating(new Date()) + ":" + e, errorLog);
                                }
                            }
                        })();
                    } catch (e) {
                        log2file(e, errorLog);
                        log2file(e.message, errorLog);
                        log2file(e.stack, errorLog);
                    }
                }
            );
        }
    } catch (e) {
        log2file("special error  " + dateFormating(new Date()) + " : " + e, errorLog);
    }

}

exports.pdfMaker = pdfMaker;