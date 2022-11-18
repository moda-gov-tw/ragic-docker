const fs = require('fs');
const path = require('path');

let isDistr = false;
try{
    let licenseFile = path.join(__dirname, './../../../../cust/license.xml');
    let license = fs.readFileSync(licenseFile, {encoding:'utf8', flag:'r'});

    if(license && license.includes('type=\"DISTR\"')){
        isDistr = true;
    }
}catch(ignore){
    // ragic node servers may not have license.xml
}

let pdfMaker = require('./pdfMaker');
let ragicRestarter = require('./ragicRestarter');
let healthChecker = require('./healthChecker');

let fulfillment;
let redirect;
let check_entitlements;
let latest_entitlements;
let sns_entitlement;
// let test;
let awsTest = !process.env.NOAWSTEST;

if(!isDistr && awsTest){
    fulfillment = require('./aws/fulfillment');
    redirect = require('./aws/redirect');
    check_entitlements = require('./aws/checkEntitlements');
    latest_entitlements = require('./aws/latest_entitlements');
    sns_entitlement = require('./aws/sns_entitlement');
    // test = require('./aws/test');
}


function createUrlMapping() {
    let urlMapping = {};
    urlMapping['/'] = pdfMaker.pdfMaker;
	urlMapping['/restartRagic'] = ragicRestarter.ragicRestarter;
	urlMapping['/restartPDFMaker'] = pdfMaker.pdfMaker;
	urlMapping['/healthChecker'] = healthChecker.healthChecker;

    if (!isDistr && awsTest) {
        urlMapping['/fulfillment'] = fulfillment.fulfillment;
        urlMapping['/redirect'] = redirect.redirect;
        urlMapping['/check_entitlements'] = check_entitlements.check_entitlements;
        urlMapping['/update_entitlements'] = latest_entitlements.latest_entitlements;
        urlMapping['/sns_entitlement'] = sns_entitlement.sns_entitlement;
        // urlMapping['/test'] = test.test;
    }

    return urlMapping;
}

exports.createUrlMapping = createUrlMapping;