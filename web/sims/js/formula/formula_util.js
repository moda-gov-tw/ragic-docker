const NO_CHANGE_SIGNAL = {'t': 'No_Change'};
const formulaBuilder = {
    listenMapping: {}, // changedCellName : FormulaListener array
    lastExecute: new Date().getTime(),
    getFormulaVariables: _get_formula_variables,
    updateLastExecute: function () {
        //floatTinyWin(null,this.getIdle());
        formulaBuilder.lastExecute = new Date().getTime();
    },
    getIdle: function () {
        const now = new Date().getTime();
        if (now === this.lastExecute) return 1;
        return (now - this.lastExecute);
    },
    updateField: function (ip, formula) {
        let fMode = formulaMode.STRING,
            target = ip.biff,
            ipInSubTable = biffdata.ifSubtableDataBiff(target);
        let bNodeId = parseInt(target.nodeId);
        let bParentNodeId = parseInt(target.parentNodeId);
        // always recalculate dv_f when this is a new data (rootNodeId < 0)
        // we also recalculate dv_f when the biff hasn't saved yet (new empty biff) (b.nodeId < 0)
        if (target.attr['dv_f'] && isNumeric(bParentNodeId) && bParentNodeId >= 0) {
            if(target.IPType === SELECTOR || target.IPType === MSELECTOR) {
                if(isNumeric(bNodeId) && bNodeId >= 0) return;
            }
            else {
                if(bNodeId >= 0) return;
            }
        }
        this.updateLastExecute();
        if (target.attr) {
            if (target.attr['fmt_d']) fMode = formulaMode.DATE;
            else if (target.attr['fmt_n']) fMode = formulaMode.NUMBER;
        }
        let result = resolveFormula(formula, ipInSubTable ? target.y : 0, fMode);
        if (result === NO_CHANGE_SIGNAL) {
            this.updateLastExecute();
            return;
        }

        if (fMode === formulaMode.DATE && isNumeric(result)) {
            result = correctFormulaDateResult(result, target.attr.fmt_d);
        }

        let isFormulaOR = new RegExp("OR\\(.*\\)").test(formula),
            isFormulaAND = new RegExp("AND\\(.*\\)").test(formula),
            isFormulaISBLANK = new RegExp("ISBLANK\\(.*\\)").test(formula),
            isFormulaAPPROVAL_STEP_ISMULTI = new RegExp("APPROVAL.STEP\\(.*\\).ISMULTI\\(\\)").test(formula);
        let mayReturnFALSY = isFormulaOR || isFormulaAND || isFormulaISBLANK || isFormulaAPPROVAL_STEP_ISMULTI;

        if (result || (result === false && mayReturnFALSY) || result === 0) {
            let _resultStr = result.toString();
            if (ip.value !== _resultStr && ip.userInput !== _resultStr) {
                let doCheckEmptySubtableRow = ipInSubTable && (ip.value === '' || ip.userInput === '');
                if (ip.type === SELECTOR) {
                    if (target.hasAttribute('mvp')) {
                        //[BugId:08984] Setting notify = true needs to check if a field has other loaded fields, and it is actually already set in displayData();
                        //ip.notify = true;
                        ip.reloadNotify = true;

                        //write and load the value
                        //using .blur will make the current focus unclickable
                        ip._write(_resultStr, true);
                        let suggest = ip._getSuggest(true);
                        if (!ip.nodeIdSpecified || target.value !== suggest) {
                            let userInput = ip.userInput + "";
                            if (userInput && userInput.length > 0) ip.loadValue(suggest, false, 0, true);
                            else ip.loadValue('', false, 0, true);
                        }
                    }
                    else {
                        ip.loadValue(_resultStr, false, null, true);
                    }
                }
                else {
                    ip.loadValue(_resultStr, false, null, true);
                }
                // if (doCheckEmptySubtableRow) checkEmptySubtableRows(target); // [bug issue: 3331]
                target.valueChangedByFormula = true;
            }
        }
        else {
            ip.loadValue('', false, null, true);//[BugId:12496]
        }
        ip.render(false, true);
        nui._updateFocus();

        this.updateLastExecute();
    },
    updateAll: function () {
        const keys = Object.keys(this.listenMapping);
        for (let i = 0; i < keys.length; i++) {
            this.update(keys[i]);
        }
    },
    update: function (changedCellName, changedBiff, notRecalSameRowListeningIP) {
        if (!canSaveData() || !changedCellName) return;
        let y = changedBiff instanceof Biff ? changedBiff.y : undefined;
        let flArray = this.listenMapping[changedCellName];
        if (!flArray) {
            return;
        }
        for (let i = 0; i < flArray.length; i++) {
            let fl = flArray[i],
                ips = fl.listeningIPs,
                ip,
                ipCollection = [];
            //if both listening ip and changedBiff are subtable fields, means they are in the same subtable, so we recalculate only one biff at that row
            if (ips.hasOwnProperty(y) && biffdata.ifSubtableDataBiff(changedBiff) && biffdata.ifSubtableDataBiff(ips[y].biff)) {
                //[Bug issue #15590]: 有可能 ip.biff.y !== y
                if (ips[y].biff.y === y) {
                    ipCollection.push(ips[y]);
                }
            } else {
                ipCollection = Object.values(ips);
            }

            if (ipCollection.length === 0) continue;

            for (let ipi = ipCollection.length; ipi--;) {
                ip = ipCollection[ipi];
                if (ip.biff.isEmptyRow && !biffdata.ifListingPage()) continue;
                if ((ctrl.cloneAction && (ip.biff.value!=='' || !ip.biff.attr['noclone'])) || ctrl.draftLoading) continue; // #13823
                //if notRecalSameRowListeningIP == true, means we don't update the target ip's formula result if it is at the same subtable row of changedBiff
                if (notRecalSameRowListeningIP && biffdata.ifSubtableDataBiff(ip.biff) && ip.biff.y === y && biffdata.isSameSubtable(ip.biff, changedBiff)) continue;
                formulaBuilder.updateField(ip, fl.formula);
            }
        }
        ctrl.formulaResultCache = {};
    },
    _translateToDomainRef: function (formula) {
        if (!formula) return '';
        if (formula.substr(0, 1) === '=') formula = formula.substr(1);

        const refMapping = Object.values(builder.cellData)
            .filter(function (b) { return !!b; })
            .map(function (b) { return [getCellName(b.x, b.y), '_RD' + b.hash + 'RD_']; });

        return this.applyFormulaTextChange(formula, function (nonWrapped) {
            return refMapping.reduceRight(function (formula, s) { return formula.replace(new RegExp(s[0], 'gim'), s[1]); }, nonWrapped);
        });
    },
    _translateToSpreadsheetRef: function (formula) {
        if (!formula) return '';
        if (formula.substr(0, 1) === '=') formula = formula.substr(1);

        formula = Object.values(builder.cellData)
            .filter(function (b) { return !!b; })
            .map(function (b) { return [getCellName(b.x, b.y), '_RD' + b.hash + 'RD_']; })
            .reduceRight(function (formula, s) { return formula.replace(new RegExp(s[1], 'gim'), s[0]); }, formula);

        if (formula.includes('_RD') && formula.includes('RD_')) {
            return '';
        }
        //not finished translation
        else {
            return formula;
        }
    },
    /*
        May contains cellName in a string which should not be regarded as a field
        ex: formulaBuilder._findChangeCellNames("SUMIF(A4,'A5和牛',C4)") will return ['A4', 'A5', 'C4']
     */
    _findChangeCellNames: function (formula) {
        formula = formula || '';
        if (formula.substr(0, 1) === '=') formula = formula.substr(1);
        let result = [];
        let formulaNameStack = [];

        if (formula.includes("\"") || formula.includes("'")) {
            let subString = "";
            const charArray = formula.split("");
            let currentIdentifier = "";
            for (let i = 0, length = charArray.length; i < length; i++) {
                let char = charArray[i];
                subString += char;
                if (!currentIdentifier) {
                    if (char === "\"" || char === "'") {
                        currentIdentifier = char;
                        collectCellName(subString, result);
                        subString = "";
                    }
                    else if (char === "(") {
                        let formulaName = subString.match(/[a-zA-Z]+(?=\()/g);
                        if(Array.isArray(formulaName) && formulaName.length > 0)
                            formulaNameStack.push(formulaName[formulaName.length-1]); //formula ()
                        else
                            formulaNameStack.push("");  //normal ()
                    }
                    else if (char === ")" && formulaNameStack.length > 0) {
                        formulaNameStack.pop();
                    }
                }
                else if (char === currentIdentifier) {
                    if(formulaNameStack.length > 0) {
                        //cellName included in double/single quotes in SUMIFS、MAXIFS、MINIFS、COUNTIFS should be collected
                        if(isQuoteStringCellNameFormula(formulaNameStack[formulaNameStack.length-1])) {
                            collectCellName(subString, result);
                        }
                    }
                    currentIdentifier = "";
                    subString = "";
                }
            }

            if(subString.length) {
                collectCellName(subString, result);
            }
        }
        else {
            collectCellName(formula, result);
        }

        function collectCellName(formula, result) {
            let symbolReg = /[A-Z]+\d+/g;
            let matches = formula.match(symbolReg);
            if (Array.isArray(matches)) {
                matches.forEach(function (token) {
                    let alpha = token.replace(/[0-9]/g, '');
                    if(colNames.includes(alpha) && !result.includes(token)) {
                        result.push(token);
                    }
                });
            }
        }

        function isQuoteStringCellNameFormula(formulaName) {
            return /^(SUMIF(S)?|MAXIFS|MINIFS|COUNTIF(S)?)$/i.test(formulaName);
        }

        return result;
    },
    // only for builder.js cellName check
    _findChangeCellNamesInfo: function (formula) {
        formula = formula || '';
        if (formula.substr(0, 1) === '=') formula = formula.substr(1);
        let result = [];
        let formulaNameStack = [];

        if (formula.includes("\"") || formula.includes("'")) {
            let subString = "";
            const charArray = formula.split("");
            let currentIdentifier = "";
            for (let i = 0, length = charArray.length; i < length; i++) {
                let char = charArray[i];
                subString += char;
                if (!currentIdentifier) {
                    if (char === "\"" || char === "'") {
                        currentIdentifier = char;
                        collectCellName(subString, result);
                        subString = "";
                    }
                    else if (char === "(") {
                        let formulaName = subString.match(/[a-zA-Z]+(?=\()/g);
                        if(Array.isArray(formulaName) && formulaName.length > 0)
                            formulaNameStack.push(formulaName[formulaName.length-1]); //formula ()
                        else
                            formulaNameStack.push("");  //normal ()
                    }
                    else if (char === ")" && formulaNameStack.length > 0) {
                        formulaNameStack.pop();
                    }
                }
                else if (char === currentIdentifier) {
                    if(formulaNameStack.length > 0) {
                        //cellName included in double/single quotes in SUMIFS、MAXIFS、MINIFS、COUNTIFS should be collected
                        if(isQuoteStringCellNameFormula(formulaNameStack[formulaNameStack.length-1])) {
                            collectCellName(subString, result, true);
                        }
                    }
                    currentIdentifier = "";
                    subString = "";
                }
            }

            if(subString.length) {
                collectCellName(subString, result);
            }
        }
        else {
            collectCellName(formula, result);
        }

        function collectCellName(formula, result, isQuoted) {
            let shouldCheckExists = !isQuoted;
            // '>A5' '<A5' '=A5' '==A5' '===A5' => A5 代表欄位 A5，需檢查是否存在
            // if (/^(>|<|={1,3})[A-Z]+\d+["']$/.test(formula)) shouldCheckExists = true;
            let symbolReg = /[A-Z]+\d+/g;
            let matches = formula.match(symbolReg);
            if (Array.isArray(matches)) {
                matches.forEach(function (token) {
                    let alpha = token.replace(/[0-9]/g, '');
                    if(colNames.includes(alpha) && !result.includes(token)) {
                        result.push({cellName: token, shouldCheckExists: shouldCheckExists});
                    }
                });
            }
        }

        function isQuoteStringCellNameFormula(formulaName) {
            return /^(SUMIF(S)?|MAXIFS|MINIFS|COUNTIF(S)?)$/i.test(formulaName);
        }

        return result;
    },
    _basicCalHasDifferentDateFormatCells: function (formula, cellBoMap) {
        formula = formula || '';
        if (formula === '') return false;
        if (formula.substr(0, 1) === '=') formula = formula.substr(1);
        let matches = formula.matchAll(/([A-Z]+\d+)[+-\\*/%]([A-Z]+\d+)/g), nextMatch, matchesArr;
        let cell1, cell2, cd1, cd2;
        let hasDifferentFormat = false;

        nextMatch = matches.next();
        while(!nextMatch.done){
            matchesArr = nextMatch.value;
            cell1 = matchesArr[1];
            cell2 = matchesArr[2];

            if(Array.isArray(cellBoMap[cell1]) && Array.isArray(cellBoMap[cell2])){
                cd1 = builder.cellData[cellBoMap[cell1].join(",")];
                cd2 = builder.cellData[cellBoMap[cell2].join(",")];
            }
            if(cd1 instanceof BuilderObject && cd2 instanceof BuilderObject &&
                cd1.hasAttribute("fmt_d") && cd2.hasAttribute("fmt_d")){
                if(ifTimeOnly(cd1.attr["fmt_d"]) !== ifTimeOnly(cd2.attr["fmt_d"])) {
                    hasDifferentFormat = true;
                    break;
                }
            }

            nextMatch = matches.next();
        }

        return hasDifferentFormat;
    },
    add: function (affectedCellName, ip, formula) {
        //find the changeCellNames
        let changeCellNames = this._findChangeCellNames(formula);

        for (let i = 0; i < changeCellNames.length; i++) {
            this._add(changeCellNames[i], affectedCellName, ip, formula);
        }
    },
    _add: function (changedCellName, affectedCellName, ip, formula) {
        //check if mapping exists
        let flArray = this.listenMapping[changedCellName];
        if (!flArray) {
            flArray = [];
            this.listenMapping[changedCellName] = flArray;
        }

        //find the existing affectedCellName in the flArray
        let fl = flArray.find(function (_fl) {
            return _fl.affectedCellName === affectedCellName;
        });
        //if not exist, add one
        if (!fl) {
            fl = new FormulaListener(affectedCellName, formula);
            flArray.push(fl);
        }

        //see if the ip a single cell
        let single = !biffdata.ifSubtableDataBiff(ip.biff);

        //add the ip to the formulaListener
        fl.listeningIPs[(single ? 0 : ip.biff.y)] = ip;
    },
    remove: function (affectedCellName, ip, formula) {
        //find the changeCellNames
        let changeCellNames = this._findChangeCellNames(formula);

        for (let i = 0; i < changeCellNames.length; i++) {
            this._remove(changeCellNames[i], affectedCellName, ip);
        }
    },
    _remove: function (changedCellName, affectedCellName, ip) {
        //check if mapping exists
        let flArray = this.listenMapping[changedCellName];
        if (!flArray) {
            flArray = [];
            this.listenMapping[changedCellName] = flArray;
        }

        //find the existing affectedCellName in the flArray
        let fl = flArray.find(function (_fl) {
            return _fl.affectedCellName === affectedCellName;
        });
        //if not exist, return
        if (!fl) return;

        //see if the ip a single cell
        let single = !biffdata.ifSubtableDataBiff(ip.biff);

        //delete the ip to the formulaListener
        delete fl.listeningIPs[(single ? 0 : ip.biff.y)];
    },
    //strings surrounded with (double) quotes are not changed by changeFunction
    applyFormulaTextChange: function (formula, changeFunction) {
        if (formula.includes("\"") || formula.includes("'")) {
            let translated = "";
            let subString = "";
            const charArray = formula.split("");
            let currentIdentifier = "";
            for (let i = 0, length = charArray.length; i < length; i++) {
                let char = charArray[i];
                subString += char;
                if (!currentIdentifier) {
                    if (char === "\"" || char === "'") {
                        currentIdentifier = char;
                        translated += changeFunction(subString);
                        subString = "";
                    }
                } else if (char === currentIdentifier) {
                    currentIdentifier = "";
                    translated += subString;
                    subString = "";
                }
            }

            if (subString.length) {
                translated += changeFunction(subString);
            }
            return translated;
        } else {
            return changeFunction(formula);
        }
    }
};

function FormulaListener(affectedCellName, formula) {
    this.affectedCellName = affectedCellName;
    this.formula = formula;
    this.listeningIPs = {};// y : ip
}

const formulaMode = {
    STRING: 1,//result being string
    DATE: 2,//resulting being date
    NUMBER: 3//result being number
};

const fieldType = {
    STRING: "S",
    DATE: "D",
    NUMBER: "N"
}

function resolveFormula(formula, y, fMode) {
    let result;
    if (!fMode) fMode = formulaMode.NUMBER;
    result = _resolveFormula_vmode(formula, y, fMode);
    if (!result &&
        (result !== 0 || result === '0') &&
        fMode === formulaMode.STRING) {
        return _resolveFormula_vmode(formula, y, formulaMode.STRING);
    }
    else {
        return result;
    }
}

// For now we have lots of workarounds
// If someday we need to refractory, we can have a look at Shunting Yard Algorithm
function _get_formula_variables(fMode, y, formula) {
    let result = {},
        formulaMap = biffdata.formulaMap,
        originFMode = fMode,
        isFormulaIF = false,
        isFormulaMIN = false,
        isFormulaMAX = false,
        isFormulaAND = false,
        isFormulaOR = false;

    y = parseInt(y);

    try {
        isFormulaIF = new RegExp("IF([S])*\\(.*\\)").test(formula); // IF, IFS, UPDATEIF
        isFormulaMIN = new RegExp("MIN\\(.*\\)").test(formula);
        isFormulaMAX = new RegExp("MAX\\(.*\\)").test(formula);
        isFormulaAND = new RegExp("AND\\(.*\\)").test(formula);
        isFormulaOR = new RegExp("OR\\(.*\\)").test(formula);
    } catch (e) {
    }
    for (let key in formulaMap) {
        if (!key) continue;
        let total,
            totalRaw = '',
            max = NaN, min = NaN,
            first = '', last = '',
            firstNotEmpty = '', lastNotEmpty = '',
            count = 0,
            formulaFieldType,
            ifSubtableCell = false;

        fMode = originFMode; // fMode may vary and need to reset to the origin mode in the begin of every loops
        let fmObjArr = Object.values(formulaMap[key]);
        let analyzeObj = formulaMap[key][y] || fmObjArr.filter(function (fmObj) { return !!fmObj; })[0];
        if (analyzeObj) {
            if ((isFormulaIF || isFormulaAND || isFormulaOR) && analyzeObj.type === 'N') {
                fMode = formulaMode.NUMBER;
            }
            if (analyzeObj.isSubtableObj) {
                ifSubtableCell = true;
                total = [];
                if(fMode === formulaMode.STRING){
                    if (analyzeObj.type === 'N' && analyzeObj.strValue === (analyzeObj.numValue + "")) {
                        fMode = formulaMode.NUMBER;
                    }
                    //BBCode formulaReplaceHelper : y is NaN
                    else if (analyzeObj.type === 'S' && !y){
                        let isNumMode = fmObjArr.some(function (fmObj) {
                            return fmObj && fmObj.type === 'N' &&
                                fmObj.strValue === (fmObj.numValue + "");
                        });
                        if (isNumMode) fMode = formulaMode.NUMBER;
                    }
                }
            } else {
                total = fMode === formulaMode.STRING ? '' : 0;
            }

            formulaFieldType = analyzeObj.fieldType;
        }

        let isMultiImagesFiles = false;
        for (let k in formulaMap[key]) {
            let fmObj = formulaMap[key][k];
            if (!fmObj) continue;
            let fmValue, fmRaw = '',
                currentY = parseInt(k);
            isMultiImagesFiles = fmObj.isMultiImagesFiles;

            //DATE formula
            if (fMode === formulaMode.DATE) {
                fmRaw = fmObj.strValue;
                fmValue = fmObj.dateValue;
                if (isNaN(fmValue)) continue;
                else {
                    fmValue = fmObj.numValue;
                }
            }

            //STRING formula
            else if (fMode === formulaMode.STRING) {
                fmRaw = fmObj.strValue;
                fmValue = fmObj.strValue;
            }

            //NUMBER formula
            else {
                fmRaw = fmObj.strValue;
                fmValue = fmObj.numValue;

                //processing abnormal data
                //please reference the constructor of FormulaMapObject

                //number formula process dates as number of days from 1970/1/1
                //if not processed correctly
                if (fmObj.type === 'D') {
                    if (isNaN(fmValue)) {
                        //if this is the first value and value is already not parsable, we set it to NaN so that empty or non-number fields won't be regarded as 0
                        //0 can cause problem especially with date caculations calculating age from birthdates
                        //UPDATE 2013/08/29 [BugId:01344] We should only do this for date fields
                        if (count === 0) {
                            if (!Array.isArray(total) || y === currentY) total = NaN;
                        }
                    }
                }
                // //MIN, MAX should ignore empty value
                else if((isFormulaMAX || isFormulaMIN) && fmObj.type === 'S' && fmObj.strValue === "") {
                    fmValue = "";
                }
                else {//numeric
                    if (!isNumeric(fmValue) || (biffdata.keyField && fmObj.isSubtableObj && fmObj.isEmptyRow)) {
                        continue;
                    }
                }
            }

            //determine the value by the y position
            //if no y, it means that we are calculating value for a single field
            //if y available then it's referenced from a subtable, with the row y provided, so we only cal
            if (!y || !fmObj.isSubtableObj || y === currentY) {
                //if there is a numeric value and the current total is not numeric, probably means that in this subtable, first row of this field is empty or not a number
                //but if we have number in other rows, we can still count the total and count the first row field as 0
                let isNumber = isNumeric(fmValue);
                if (isNumber && !Array.isArray(total) && isNaN(total)) {
                    total = 0;
                }
                let fmtValue = fmValue;

                //now we calculate the total
                if (Array.isArray(total)) {
                    if (fmObj.isSubtableObj && (!biffdata.keyField || !fmObj.isEmptyRow)) {
                        if (fmObj.type === 'N' || /^\d+(\.\d+)?%$/.test(fmObj.strValue)) {
                            fmtValue = fmObj.numValue;
                        } else if (fmObj.type === 'D') {
                            fmtValue = fmObj.dateValue || (y === currentY ? fmObj.numValue : ''); //when dateValue is null, fmtValue should use numValue (NaN)
                        } else {
                            fmtValue = fmObj.strValue;
                        }
                        total.push({
                            "y": currentY,
                            "value": fmtValue,
                            "raw": fmRaw,
                            "subtableRowNum": fmObj.subtableRowNum
                        });

                        isNumber = isNumeric(fmtValue);
                    }
                } else {
                    total += fmtValue;
                }
                totalRaw += fmRaw;

                if (isNumber && (isNaN(min) || fmtValue < min)) {
                    min = fmtValue;
                }
                if (isNumber && (isNaN(max) || fmtValue > max)) {
                    max = fmtValue;
                }

                if (fmObj.isSubtableObj) {
                    if(!fmObj.isEmptyRow) count++;
                }
                else {
                    if(fmtValue || fmtValue === 0 && fmRaw !== "") count++;
                }
            }
        }
        //[#10491] Because a subtable may be sorted, we use parentNodeId to get FormulaMapObjects' original order so that we can get correct first and last results
        // only subtable need first, firstNotEmpty, last and lastNotEmpty
        if (ifSubtableCell) {
            let targetFMapObjs, targetFMapObjsNotEmpty;
            targetFMapObjs = Object.values(formulaMap[key]).filter(function (fMapObj) { return fMapObj && !fMapObj.isEmptyRow; });

            if(targetFMapObjs.length === 1) {
                first = firstNotEmpty = last = lastNotEmpty = (fMode === formulaMode.NUMBER && isNumeric(targetFMapObjs[0].strValue)
                                    ? targetFMapObjs[0].numValue
                                    : targetFMapObjs[0].strValue);
            }
            else if(targetFMapObjs.length > 1) {
                let savedFMapObjs = targetFMapObjs.filter(function (fMapObj) {
                    return isNumeric(fMapObj.parentNodeId) && fMapObj.parentNodeId >= 0;
                });
                let unSavedFMapObjs = targetFMapObjs.filter(function (fMapObj) {
                    return isNumeric(fMapObj.parentNodeId) && fMapObj.parentNodeId < 0;
                });
                savedFMapObjs.sort(function (f1, f2) {
                    return f1.parentNodeId - f2.parentNodeId;
                });
                targetFMapObjs = savedFMapObjs.concat(unSavedFMapObjs);
                targetFMapObjsNotEmpty = targetFMapObjs.filter(function (fMapObj) { return fMapObj && fMapObj.strValue !== ""; });

                if(targetFMapObjs.length > 0) {
                    let firstTarget = targetFMapObjs[0],
                        lastTarget = targetFMapObjs[targetFMapObjs.length - 1];
                    first = fMode === formulaMode.NUMBER && firstTarget.fieldType === fieldType.NUMBER
                                ? firstTarget.numValue
                                : firstTarget.strValue;
                    last = fMode === formulaMode.NUMBER && lastTarget.fieldType === fieldType.NUMBER
                                ? lastTarget.numValue
                                : lastTarget.strValue;
                }

                if(targetFMapObjsNotEmpty.length > 0) {
                    let firstTarget = targetFMapObjsNotEmpty[0],
                        lastTarget = targetFMapObjsNotEmpty[targetFMapObjsNotEmpty.length - 1];
                    firstNotEmpty = fMode === formulaMode.NUMBER && firstTarget.fieldType === fieldType.NUMBER
                                ? firstTarget.numValue
                                : firstTarget.strValue;
                    lastNotEmpty = fMode === formulaMode.NUMBER && lastTarget.fieldType === fieldType.NUMBER
                                ? lastTarget.numValue
                                : lastTarget.strValue;
                }
            }
        }

        //setting variables for formula processing, each cell is a variable
        result[key] = {
            "KEY": key,
            "SUM": total,
            "COUNT": count,
            "MIN": min,
            "MAX": max,
            "FIRST": first,
            "LAST": last,
            "FIRSTA": firstNotEmpty,
            "LASTA": lastNotEmpty,
            "RAW": totalRaw,
            "FMODE": fMode,
            "FTYPE": formulaFieldType,
            "toString": function () {
                if (!Array.isArray(this.SUM)) return this.SUM;
                if (this.FMODE === formulaMode.STRING && this.SUM.length <= 1) return this.RAW;

                let baseValue = "", calculateArr = this.SUM;
                let calSmameRow = y && this.SUM.length === 1;
                if (this.FMODE !== formulaMode.STRING) {
                    baseValue = 0;
                    calculateArr = this.SUM.filter(function (sumObj) {
                        //calculate same row subtable date field should regard empty value as NaN  [Bug issue: #13203]
                        return typeof sumObj.value !== 'string' && (calSmameRow && fMode === formulaMode.DATE || !isNaN(sumObj.value));
                    });
                }
                return calculateArr.reduce(function (accumulator, sumObj) {
                    if(isMultiImagesFiles && accumulator !== ""){
                        return accumulator + "|" + sumObj.value;
                    }
                    else return accumulator + sumObj.value;
                }, baseValue);
            }
        };
    }

    if (biffdata.globalConst) {
        for (let constKey in biffdata.globalConst) {
            result[constKey] = biffdata.globalConst[constKey];
        }
    }

    return result;
}

function executeFormula(formula) {
    // using Function is safer than eval
    return Function('"use strict";return (' + getStandardFormula(formula) + ')')();
}

function _resolveFormula_vmode(formula, y, fMode) {
    //prepare variables
    let variables = formulaBuilder.getFormulaVariables(fMode, y, formula),
        isFormulaAVG = new RegExp("AV([ERA]*)G([E]*)\\(.*\\)").test(formula),
        isFormulaOR = new RegExp("OR\\(.*\\)").test(formula),
        isFormulaAND = new RegExp("AND\\(.*\\)").test(formula),
        isFormulaHOUR = new RegExp("HOUR\\(.*\\)").test(formula),
        isFormulaMINUTE = new RegExp("MINUTE\\(.*\\)").test(formula),
        isFormulaSECOND = new RegExp("SECOND\\(.*\\)").test(formula),
        isFormulaISBLANK = new RegExp("ISBLANK\\(.*\\)").test(formula),
        isFormulaAPPROVAL_STEP_ISMULTI = new RegExp("APPROVAL.STEP\\(.*\\).ISMULTI\\(\\)").test(formula);

    for (let key in variables) {
        this[key] = variables[key];
    }

    let result = '';
    try {
        result = executeFormula(formula);
    } catch (ex) {
        if (ex instanceof SyntaxError) {
            return NO_CHANGE_SIGNAL;
        }
        // 每個簽核公式都有包裝成可以捕捉 ApprovalError 的 function 了，所以這裡絕不會捕捉到 ApprovalError
        // if (ex instanceof ApprovalError) {
        //     return "";
        // }
    }

    //process string result
    //When text field's result is 0 after applying AVG, COUNT formula, it should be changed to '0', not ''
    //2020/07/14 updated: it is reasonable when text field's result is "" when applying AVG, COUNT formula
    let mayReturnFALSY = isFormulaOR || isFormulaAND || isFormulaISBLANK || isFormulaAPPROVAL_STEP_ISMULTI ||    //false
                        isFormulaHOUR || isFormulaMINUTE || isFormulaSECOND;     //0
    if (fMode === formulaMode.STRING && !mayReturnFALSY) {
        return result ? result : '';
    }

    // use for description formula
    if (result === 0 || (isNaN(result) && isFormulaAVG)) result = '0';

    //non numeric
    if (!isNumeric(result)) return result;//string response for non string modes

    if (result === undefined || result === '') return null;
    //numeric
    else {
        if (fMode !== formulaMode.DATE && (result + "").includes(".")) {
            result = Math.round(result * 10000000) / 10000000;//7 digit precision [issue:07538]
        }
        return result;
    }
}

function correctFormulaDateResult(result, format) {
    let standardDateFormat = getStandardFormat(format);
    if (standardDateFormat === "HH:mm:ss") {
        // time addition/subtraction should base on TODAY as its date part.
        let d = new Date();
        d.setHours(0, 0, 0, 0);
        let todayInMinuteMilli = d.getTime() / MINUTE_MILLI;
        // max supported/min calculate result should be today +- 5day
        let supportedMaxLimit = todayInMinuteMilli + 7200;
        let supportedMinLimit = todayInMinuteMilli - 7200;
        let originalResult = result;

        while (result > supportedMaxLimit) {
            result -= todayInMinuteMilli;
        }
        while (result < supportedMinLimit) {
            result += todayInMinuteMilli;
        }

        if (result > supportedMaxLimit || result < supportedMinLimit) {
            // if result is still not in the range today +- 5 days
            // mean this formula should have date fields in it (because day part is not base on today)
            let accurateValue = parseInt((originalResult * DAY_MILLI).toFixed(0));
            result = formatDate(new Date(accurateValue), standardDateFormat);
        } else {
            let accurateValue = parseInt((result * MINUTE_MILLI).toFixed(0));
            result = formatDate(new Date(accurateValue), standardDateFormat);
        }
    } else {
        let accurateValue = parseInt((result * DAY_MILLI).toFixed(0));
        result = formatDate(new Date(accurateValue), standardDateFormat);
    }
    return result;
}

function FormulaMapObject(b) {
    let value = b.value;
    if (b.hasAttribute('ag') && (b.updateDisplayValue || b.updateDisplayValue === "")) value = b.updateDisplayValue;
    if (!value) value = '';
    //[BugId:09810]
    // if ((b.IPType === UPLOADER || b.IPType === GRAPHICS) && /^[^@]{8,10}@.+$/.exec(value)) {
    //     value = value.substring(value.indexOf("@") + 1);
    // }
    this.y = b.y;
    this.isSubtableObj = biffdata.keyField && b.isSubtableObj !== undefined ? b.isSubtableObj : biffdata.ifSubtableDataBiff(b);
    this.strValue = value + '';
    this.parentNodeId = parseInt(b.parentNodeId);
    this.isMultiImagesFiles = b.hasAttribute("multipleImages") || b.hasAttribute("multipleFiles");

    if (!canSaveData()) {
        let bNodeId = parseInt(b.nodeId);
        this.isEmptyRow = bNodeId < 0 || !bNodeId && bNodeId !== 0;  //b.nodeId == null or undefined in select user field
    } else {
        if (b.isEmptyRow === undefined) {
            let bNodeId = parseInt(b.nodeId);
            this.isEmptyRow = bNodeId < 0 || !bNodeId && bNodeId !== 0; //b.nodeId == null or undefined in select user field
        } else {
            this.isEmptyRow = b.isEmptyRow;
        }
    }

    if (this.isSubtableObj) {
        this.subtableRowNum = this.y - biffdata.findHeaderFromBiff(b).y;
    }

    if (b.hasAttribute('fmt_d')) {
        //we don't used formatted value for formula calculation because it may be inaccurate when doing >, < comparisons
        //UPDATE: this is needed because the formatted value is needed when referenced by formula from another cell
        //UPDATE: this is NOT needed because formatted value can be generated with formula TEXT(), while there's no other way to do >, < comparisons
        //        also this is consistent with the behavior we see on MS Excel
        this.dateValue = parseDateLong(value, b.attr['fmt_d']);
        if (!this.dateValue) this.dateValue = parseDateLong(value, 'yyyy/MM/dd');
        if (!this.dateValue) this.dateValue = parseDateLong(value, 'yyyy/MM/dd HH:mm:ss');
        if (!this.dateValue) this.dateValue = parseDateLong(value, 'HH:mm:ss');
        this.numValue = this.dateValue ? this.dateValue : NaN;
        this.type = 'D';
    }
    //this is a string
    else if (!isNumeric(value) || b.hasAttribute('phone') || b.hasAttribute('ag') || (this.strValue.length > 14 && !this.strValue.includes('.'))) {
        this.dateValue = 0;
        this.numValue = 0;
        this.type = 'S';

        if (/^\d+(\.\d+)?%$/.test(value)) {
            this.numValue = parseFloat(value) / 100.0;
        }
    }
    else {
        this.dateValue = 0;
        this.numValue = parseFloat(value);
        this.type = 'N';
    }

    if (b.hasAttribute('fmt_d')) {
        this.fieldType = fieldType.DATE;
    }
    else if (b.hasAttribute("fmt_n")) {
        this.fieldType = fieldType.NUMBER;
    }
    else {
        this.fieldType = fieldType.STRING;
    }
}


function parseDateLong(str, format) {
    if (!str) return null;
    let dateLong;
    if (format) {
        //use the standard format first
        dateLong = getDateFromFormat(str, getStandardFormat(format));
        //for older dates, the dates might be in old non standard formats, or the field might not be in a date format
        if (isNaN(dateLong)) dateLong = getDateFromFormat(str, format);
    }
    else {
        let date = smartParseDate(str, format);
        dateLong = date.getTime();
    }


    if (dateLong === 0) {
        if (!isNumeric(str)) return null;
        return parseInt(str);
    }
    else {
        let isTimeOnly = ifTimeOnly(format);
        if (isTimeOnly) {
//      return (date.getHours()*60*60+date.getMinutes()*60+date.getSeconds())/60;
            return (dateLong) / MINUTE_MILLI;
        }
        else {
            return (dateLong) / DAY_MILLI;
        }
    }
}

function ifTimeOnly(format) {
    if (!format) return false;
    return !format.includes('y') && !format.includes('M') && !format.includes('d') && !format.includes('E');
}

// Note: we should not create "global" cache for cellName
// Or we can not get the correct position after user change the column span of nearby cell
function getPositionFromCellName(cellName) {
    let alphabetPart = cellName.replace(/[0-9]/g, ''),
        digitPart = cellName.replace(/[A-Z]/g, ''),
        shiftedX = colNames.indexOf(alphabetPart),
        shiftedPositionStr = shiftedX + "," + digitPart;

    let position = Object.entries(builder.absolutePositions)
        .find(function (posArr) { return posArr[1] === shiftedPositionStr});
    if (!position) {
        return [-1, -1];
    } else {
        return position[0].split(",").map(Number);
    }
}

/**
 * Get cell name from cache created when loading header in BROWSER/UPDATE mode.
 * @param biff object
 * @returns {string} mapped cell name. if the biff is not involved in any formulas, will return empty string.
 */
function getCellNameFromDataCache(biff) {
    if (!biff || biff.IPType === FREE) return "";
    let domainId = biff.domainId;
    if (!biffdata.domainIdCellMapping.hasOwnProperty(domainId)) return "";
    if (biffdata.isDomainIdUnique(domainId)) {
        return biffdata.domainIdCellMapping[domainId];
    } else {
        let b=biffdata.findHeaderFromBiff(biff);
        if(!b) return "";
        return biffdata.domainIdCellMapping[domainId][biffdata.findHeaderFromBiff(biff).unique];
    }
}

function getStandardFormula(formula) {
    let formulaStr = formula.toString();
    return formulaBuilder.applyFormulaTextChange(formulaStr, function (nonWrapped) {
        return nonWrapped
            .replace(/([^=><:!+\-*/%])=(?!=)/ig, '$1==')
            .replace(/^(?![.])([a-z_{1}][a-z0-9_]+)(?=\()/g, TOUPPERCASE)        // to be compatible with lowercase function name usage [bug issue #7621]
            .replace(/([A-Z]{0,2}\d+(?:\.\d+)?)\^([A-Z]{0,2}\d+(?:\.\d+)?)/g, "Math.pow($1, $2)")
            .replace(/([^<:])<>(?!>)/g, '$1!=');
    });
}

function getPrecisedFloat(num) {
    return parseFloat(parseFloat(num).toFixed(7));
}

/*
 *  The following code will also be used in server-side formula recalculation,
 *  so we have to modify the variable "generalFunction" in APIEntry.java "recalculateFormula" when there are changes in the following code.
 *  _resolveFormula_vmode need to place lowercase formula names[bug issue:2983].
 */
/**
 * @return {Date}
 */
function getDateFromFormulaObject(arg) {
    let SUM = arg.toString();
    if (isNumeric(SUM)) {
        return new Date(parseInt((SUM * DAY_MILLI).toFixed(0)));
    }
    return new Date(SUM);
}
/**
 * @return {Date}
 */
function getDateTimeFromFormulaObject(arg) {
    let SUM = arg.toString();
    let dateString = arg.RAW;
    if (isNumeric(SUM) && dateString) {
        if(dateString.length > 18){  //yyyy/MM/dd HH:mm:ss
            return new Date(parseInt((SUM * DAY_MILLI).toFixed(0)));
        }
        else{
            if(new Date(dateString).isValid())   //yyyy/MM/dd HH:mm or yyyy/MM/dd
                return new Date(parseInt((SUM * DAY_MILLI).toFixed(0)));
            else              //HH:mm or HH:mm:ss
                return new Date(parseInt((SUM * MINUTE_MILLI).toFixed(0)));
        }
    }
    //SUM is a date string
    let date = new Date(SUM);
    if(!date.isValid()) date = new Date(getDateFromFormat(SUM, "HH:mm:ss"));
    if(!date.isValid()) date = new Date(getDateFromFormat(SUM, "HH:mm"));
    return date;
}

function retrieveFormulaFromDesc(s) {
    let reg = /\[formula\][\s]*(.+)\[\/formula\]/gim;
    let result = reg.exec(s);
    if (result && result.length > 1) return result[1];
    else return null;
}


//same as RegExp.quote in format.js
// function escapeRegExp(string) {
//     return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
// }

/**
 * To evaluate the correctness of formula
 * @constructor
 */
function FormulaRel() {
    let formulaCellMap = {}, relationModel;

    this.getFormulaCellMap = function () {
        return formulaCellMap;
    };

    this.addFCellRec = function (position, formula) { //format of position would be "x,y"
        formulaCellMap[position] = formula.toUpperCase();
    };

    this.delFCellRec = function (position) {
        delete formulaCellMap[position];
    };

    this.clearFCellRec = function () {
        formulaCellMap = {};
    };

    this.getOrder = function () {  // order of formula recalculation with domain ids
        let formulaCellCount = 0,
            children = {},            // reference cells, e.g. {A1: ['A2', 'B2'], B2: ['A2', 'C1']}
            referenceCount = {},      // numbers of reference to formula cells, e.g. {A1: 1, B2: 0}
            visited = {};

        for (let position in formulaCellMap) {
            if (formulaCellMap.hasOwnProperty(position)) {
                let posSet = position.split(","),
                    cellName = getCellName(parseInt(posSet[0]), parseInt(posSet[1]));
                children[cellName] = formulaBuilder._findChangeCellNames(formulaCellMap[position]);
                referenceCount[cellName] = 0;
                visited[cellName] = false;
                formulaCellCount++;
            }
        }

        for (let p in referenceCount) {
            // for each formula cell (name)
            if (referenceCount.hasOwnProperty(p)) {
                for (let i = children[p].length - 1; i >= 0; i--) {
                    // if its child is a formula cell
                    if (children.hasOwnProperty(children[p][i])) {
                        referenceCount[p]++;
                    }
                }
            }
        }
        let order = new Array(formulaCellCount);
        for (let index = 0; index < formulaCellCount; index++) {
            for (let parent in children) {
                // if a not-visited parent has no reference to formula cells
                if (children.hasOwnProperty(parent) && !visited[parent] && referenceCount[parent] === 0) {
                    order[index] = parent;
                    for (let pp in children) {
                        // if parent is a child of the other formula cell (pp)
                        if (children.hasOwnProperty(pp) && children[pp].includes(parent)) {
                            referenceCount[pp]--;
                        }
                    }
                    visited[parent] = true;
                    break;
                }
            }
        }
        let orderMap = {};
        order.forEach(function (cellName) {
            let pos = getPositionFromCellName(cellName);
            orderMap[cellName] = builder.cellData[pos[0] + ',' + pos[1]].domainId;
        });
        // return order.map(function (cellName) {
        //     let pos = getPositionFromCellName(cellName);
        //     return builder.cellData[pos[0] + ',' + pos[1]].domainId;
        // });

        return orderMap
    };

    this.check = function (x, y, _processHint) {
        resetRelationModel();

        //create a cellname - cell position mapping
        let cellBoMap = {}, posSet, _x, _y;
        _processHint = _processHint || $('formula__hint');
        for (let posKey in builder.cellData) {
            if (!posKey) continue;
            posSet = posKey.split(",");
            _x = parseInt(posSet[0]);
            _y = parseInt(posSet[1]);

            cellBoMap[getCellName(_x, _y)] = [_x, _y];
        }

        for (let position in formulaCellMap) {
            /*
             *  Method builder.ifAdjacent will try to return a builder object next to specified location,
             *  if there is no builder object next to itself, it will try to return the previous one.
             *
             *  If this method return nothing, that means this location(biff) is not in a subtable.
             */
            posSet = position.split(",");
            _x = parseInt(posSet[0]);
            _y = parseInt(posSet[1]);
            let formula = formulaCellMap[position];
            if(!builder.cellData[position]) continue; //the formula cell is removed

            let targetCellName = getCellName(_x, _y), targetValue = builder.cellData[position].value;
            let childrenIds = formulaBuilder._findChangeCellNames(formula),
                noCircular = setNode(targetCellName, childrenIds),   //check circular reference
                isSubTablePos = builder.ifAdjacent(_x, _y),
                subtableHeader = isSubTablePos ? builder.findSubtableHeadField(_x, _y) : null,
                hasDifferentFormat = formulaBuilder._basicCalHasDifferentDateFormatCells(formula, cellBoMap);


            for (let i = childrenIds.length; i--;) {
                let childPosSet = cellBoMap[childrenIds[i]];
                if (!childPosSet) continue;
                let childX = childPosSet[0], childY = childPosSet[1];
                if (isSubTablePos && builder.ifAdjacent(childX, childY)) {
                    if (_y === childY) {
                        if (builder.findSubtableHeadField(childX, childY) === subtableHeader) {
                            continue;
                        }
                    }

                    let message = lm['formulaMultiSubErr']
                        .replace('{0}', '('+targetCellName+')"'+targetValue+'"')
                        .replace('{1}', '('+getCellName(childX, childY)+')"'+builder.cellData[childX + "," + childY].value+'"');
                    if (_processHint && _processHint.style.display !== 'none') {
                        _processHint.textContent = message;
                    }
                    else {
                        floatWinWarning(message);
                    }
                    resetRelationModel();
                    return false;
                }
                let childCellData = builder.cellData[childX+","+childY];
                if (childCellData.IPType === "M" && x === _x && y === _y) {
                    if (_processHint && _processHint.style.display !== 'none') {
                        _processHint.textContent = lm['formulaRefToMultiSelectorErr'].replace('{0}', '('+childrenIds[i]+')"'+childCellData.value+'"');
                    }
                    else {
                        floatWinWarning(message);
                    }
                    resetRelationModel();
                    return true;
                }
            }

            if (!noCircular) {
                if (_processHint && _processHint.style.display !== 'none') {
                    _processHint.textContent = lm['formulaCircularRef'].replace('{0}', '('+targetCellName+')"'+targetValue+'"');
                }
                resetRelationModel();
                return false;
            }

            if (hasDifferentFormat && x === _x && y === _y) {
                let message = lm['formulaDateFormatConsistErr']
                    .replace('{0}', '('+targetCellName+')"'+targetValue+'"');

                if (_processHint && _processHint.style.display !== 'none') {
                    _processHint.textContent = message;
                }
                else {
                    floatWinWarning(message);
                }
                resetRelationModel();
                return true;
            }
        }

        return true;
    };

    /*
     *  Private method
     */
    function Node(id) {
        this._id = id;
        this.previous = [];
        this.next = [];
    }

    function findNode(id, node) {
        node = node || relationModel;
        if (node._id === id) return node;
        else {
            let _next = node.next,
                result;
            if (!_next.length) return null;

            for (let i = _next.length; i--;) {
                result = findNode(id, _next[i]);
                if (result) return result;
            }
            return result;
        }
    }

    function setNode(id, childrenIds) {
        if (childrenIds && childrenIds.length) {
            let _self = findNode(id);

            if (!_self) {
                _self = new Node(id);
                _self.previous.push(relationModel);
                relationModel.next.push(_self);
                relationModel.isInited = true;
            }
            for (let j = childrenIds.length; j--;) {
                let child = findNode(childrenIds[j]);
                if (!child) {
                    child = new Node(childrenIds[j]);
                }
                if (child.previous.includes(relationModel)) {
                    child.previous.pop();
                    relationModel.next.splice(relationModel.next.indexOf(child), 1);
                }
                child.previous.push(_self);
                if (!hasCircularRecursion(child) && _self !== child) {
                    if (!_self.next.includes(child)) _self.next.push(child);
                } else {
                    child.previous.pop();
                    return false;
                }
            }
        } else {
            deleteNode(id);
        }

        return true;
    }

    function deleteNode(id) {
        let _self = findNode(id);
        if (!_self) return;
        let _n = _self.next,
            _p = _self.previous,
            i;
        for (i = _n.length; i--;) {
            _n[i].previous.splice(_n[i].previous.indexOf(_self), 1);
            if (_n[i].previous.length === 0) _n[i].previous.push(relationModel);
        }
        for (i = _p.length; i--;) {
            _p[i].next.splice(_p[i].next.indexOf(_self), 1);
        }
    }

    function hasCircularRecursion(checkNode, currentNode) {
        if (checkNode === currentNode) return true;
        else {
            if (!currentNode) currentNode = checkNode;
            let prev = currentNode.previous,
                result;
            if (prev.length === 0) return false;
            for (let k = prev.length; k--;) {
                result = hasCircularRecursion(checkNode, prev[k]);
                if (result) return result;
            }
            return result;
        }
    }

    function resetRelationModel() {
        relationModel = new Node('');
        relationModel.isInited = false;
    }
}

function toRaw(arg) {
    if(arg.RAW) return arg.RAW;
    return arg + "";
}

function isInitLoadingFormula(formula) {
    formula = formula.toUpperCase();
    return /NOW(TZ)?\(\)/.test(formula) || /TODAY(TZ)?\(\)/.test(formula) || formula.includes("CHAR(");
}