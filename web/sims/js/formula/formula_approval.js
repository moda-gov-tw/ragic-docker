/***
 * see http://wiki.ragic.com/doku.php/%E7%B0%BD%E6%A0%B8%E5%85%AC%E5%BC%8F
 */

function APPROVAL() {
}

//####################################################################
//#                                                                  #
//#                            Workflow                              #
//#                                                                  #
//####################################################################

//APPROVAL.CURRENTSTEPINDEX

/**
 * Get the approval steps amount.
 * @return steps length
 */
APPROVAL.COUNT = function () {
    return wf.steps.length;
};


/**
 * Get the whole approval status.
 * N: New
 * P: PROCESSING
 * REJ: REJECTED
 * F: FINISH
 * @return status
 */
APPROVAL.STATUS = function () {
    return wf.status;
};

APPROVAL.RESP = function () {
    return wf.response;
};

APPROVAL.SUBMITDATE = function (utc) {
    return LocalDateTimeToLong(wf.submitDate, utc) / DAY_MILLI;
};

APPROVAL.SUBMITTER = function () {
    return wf.submitter || "";
};

APPROVAL.SUBMITTERNAME = function () {
    return wf.submitterName || "";
};

APPROVAL.FINISHDATE = function (utc) {
    return LocalDateTimeToLong(wf.finishDate, utc) / DAY_MILLI;
};

// 在執行 APPROVAL 底下的 formula 前要做的一些處理
APPROVAL._middlewares = [
    function approvalInListingPageCheck() {
        if (biffdata && biffdata.ifListingPage()) throw new Error('Approval Formula should be executed only in form page!');
    }
];



//####################################################################
//#                                                                  #
//#                          WorkflowStep                            #
//#                                                                  #
//####################################################################
let approvalStep = new APPROVALSTEP();

APPROVAL.STEP = function (stepIndex) {
    try {
        let currentWorkflowStep = wf.getWorkflowStep(fallbackStepIndex(stepIndex));
        return approvalStep._setWS(currentWorkflowStep);
    }
    catch (e) {
        return approvalStep._setWS(null); //ws is null, then call its function will produce ApprovalError
    }
};

function APPROVALSTEP(ws) {
    this.ws = ws;
    // 在執行 APPROVAL.STEP() 底下的 formula 前要做的一些處理
    this._middlewares = [
        (function workflowStepCheck() {
            let ws = this.ws;
            if (!ws || !(ws instanceof WorkflowStep)) throw new ApprovalError('notIncludeThisStep');
        }).bind(this)
    ];

    this._setWS = function (ws) {
        this.ws = ws;
        return this;
    }
    this.NAME = function () {
        return this.ws.stepName;
    };
    this.STATUS = function () {
        return this.ws.status;
    };
    this.RESP = function (email) {
        let ws = this.ws;
        if(this.ISMULTI() && email) {
            email = toRaw(email);

            if (ws.emails.includes(email)) {
                return ws.emailsSigningState[email];
            }
            else if (ws.userNames.includes(email)) {
                return ws.userNamesSigningState[email];
            }
        }
        return this.ws.response;
    };
    this.ISMULTI = function () {
        return this.ws.multiApprovers;
    };
    this.THRESHOLD = function () {
        return this.ws.threshold;
    };
    this.userNames = function () {
        return this.ws.userNames;
    }
    this.USERS = function () {
        return this.userNames().join("|");
    };
    this.ACTIONDATE = function (email, utc) {
        let ws = this.ws;
        let actionDateTime;
        if(this.ISMULTI()) {
            if(email && ws.signingDateTimes) {
                email = toRaw(email);
                actionDateTime = ws.signingDateTimes[email];
                if(!actionDateTime) {
                    actionDateTime = ws.signingDateTimes[ws.emails[ws.userNames.indexOf(email)]];
                }
                actionDateTime = LocalDateTimeToLong(actionDateTime, utc);
            }
            else {
                actionDateTime = LocalDateTimeToLong(ws.actionDate, utc);
            }
        }
        else {
            actionDateTime = LocalDateTimeToLong(ws.actionDate, utc);
        }
        return actionDateTime / DAY_MILLI;
    };
    this.UNSIGNEDUSERS = function () {
        let ws = this.ws;
        let userNames = this.userNames();
        if(!this.ISMULTI()) {
            let response = this.RESP();
            return response === "N" ? userNames[0] : "";
        }
        return Object.entries(ws.userNamesSigningState)
            .filter(function (pair) { return pair[1] === "unSigned"; })
            .map(function (pair) { return pair[0]; })
            .join("|");
    };
    this.SIGNEDUSERS = function () {
        let ws = this.ws;
        let userNames = this.userNames();
        if(!this.ISMULTI()) {
            let response = this.RESP();
            return response === "A" || response === "A_D" ? userNames[0] : "";
        }
        return Object.entries(ws.userNamesSigningState)
            .filter(function (pair) { return pair[1] === "signed" || pair[1] === "signed_by_deputy"; })
            .map(function (pair) { return pair[0]; })
            .join("|");
    };
    this.SIGNEDCOUNT = function () {
        return this.SIGNEDUSERS().splitIgnoreEmpty("|").length;
    };
    this.SIG = function (email) {
        let ws = this.ws;
        let url;
        if (this.ISMULTI()) {
            if (arguments.length === 0 && mode !== BUILDER) throw new ApprovalError("isMultiApprovers", 'email');
            url = ws.sigs[toRaw(email)];
            if (!url) {
                url = ws.sigs[ws.emails[ws.userNames.indexOf(toRaw(email))]];
            }
        } else {
            url = Object.values(ws.sigs)[0];
        }
        url = url || "";

        return url;
    };
    this.SIGIMG = function (email, width, height) {
        let args = [];
        if(email) args.push(email);
        let url = this.SIG.apply(this, args);

        if(!url) return "";
        if (isNumeric(width) && width > 0 && isNumeric(height) && height > 0) {
            return "[img=" + width + "X" + height + "]" + url + "[/img]";
        } else {
            return "[img=300X150]" + url + "[/img]";
        }
    };
    this.COMMENT = function (email) {
        let ws = this.ws;
        let comment = "";
        if(this.ISMULTI()) {
            if (arguments.length === 0 && mode !== BUILDER) throw new ApprovalError("isMultiApprovers", 'email');
            comment = ws.comments[toRaw(email)];
            if(!comment) {
                comment = ws.comments[ws.emails[ws.userNames.indexOf(toRaw(email))]];
            }
        }
        else {
            comment = Object.values(ws.comments)[0];
        }
        comment = comment || "";

        return comment;
    };
    this.COMMENTDATE = function (email, utc) {
        let ws = this.ws;
        let actionDateTime;
        if(this.ISMULTI()) {
            if (arguments.length === 0 && mode !== BUILDER) throw new ApprovalError("isMultiApprovers", 'email');

            if(email && ws.signingDateTimes) {
                email = toRaw(email);
                if(!this.COMMENT(email)) return "";
                actionDateTime = ws.signingDateTimes[email];
                if(!actionDateTime) {
                    actionDateTime = ws.signingDateTimes[ws.emails[ws.userNames.indexOf(email)]];
                }
                actionDateTime = LocalDateTimeToLong(actionDateTime, utc);
            }
        }
        else if(this.COMMENT()) {
            actionDateTime = LocalDateTimeToLong(ws.actionDate, utc);
        }
        return actionDateTime / DAY_MILLI;
    };

    //bind every function in APPROVAL
    for (let fn in this) {
        if (typeof this[fn] === 'function' && !fn.startsWith("_")) {
            this[fn] = addMiddlewareForApprovalFormula(this[fn], this, this._middlewares);
        }
    }//This must be put in the end of APPROVALSTEP
}

function ApprovalError() {
    this.name = "ApprovalError";
    this.message = getBundleString(arguments[0], Array.from(arguments).slice(1));
}
ApprovalError.prototype = Object.create(Error.prototype);
ApprovalError.prototype.constructor = ApprovalError;


function isApprovalFormula(formula) {
    let upperCaseF = formula.toUpperCase();
    let approvalF = Object.keys(APPROVAL).join("|");
    return new RegExp("APPROVAL\\.(" + approvalF + ")\\(?.*\\)?").test(upperCaseF);
}


//helper
function fallbackStepIndex(stepIndex) {
    stepIndex = parseInt(stepIndex);
    let index;
    if(!isNumeric(stepIndex)) {
        index = APPROVAL.CURRENTSTEPINDEX;
    }
    else if(stepIndex < 0) {
        index = APPROVAL.CURRENTSTEPINDEX + stepIndex;
    }
    else {
        index = stepIndex;
    }
    return {
        stepIndex: index - 1,
        stepIndexIsZero: stepIndex === 0
    };
}


/**
 * fns:  do some function calls before call the wrapped function
 * @param fn
 * @param thisArg
 * @param fns
 * @returns {function(): *}
 */
function bindV2(fn, thisArg, middlewareFns) {
    return function wrap() {
        try {
            for (let j = 0; j < middlewareFns.length; j++) {
                middlewareFns[j]();
            }
            var args = new Array(arguments.length);
            for (var i = 0; i < args.length; i++) {
                args[i] = arguments[i];
            }
            return fn.apply(thisArg, args);
        }
        catch (e) {
            // if (e instanceof ApprovalError) {
                return "";
            // }
        }
    };
}

function addMiddlewareForApprovalFormula(fn, thisArg, middlewares) {
    return bindV2(fn, thisArg, middlewares);
}

;(function () {
    //bind every function in APPROVAL
    for (let fn in APPROVAL) {
        if (typeof APPROVAL[fn] === 'function' && !fn.startsWith("_")) {
            APPROVAL[fn] = addMiddlewareForApprovalFormula(APPROVAL[fn], null, APPROVAL._middlewares);
        }
    }
})();
