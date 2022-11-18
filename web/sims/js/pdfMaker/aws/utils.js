const { MarketplaceEntitlementService } = require("@aws-sdk/client-marketplace-entitlement-service");
const { MarketplaceMetering } = require("@aws-sdk/client-marketplace-metering");
const fs = require('fs');
const path = require('path');

const errorLogPath = path.join(__dirname, '/awsErrorLog.log');
const errorFileStream = fs.createWriteStream(errorLogPath, {flags: 'a'});

const PRODUCT_PAGE_URL = 'http://aws.amazon.com/marketplace/pp/B09XYWGD7N';
const PRODUCT_CODE = '396efvelyxl19eo4xxjo4rnbh';
const REGION = 'us-east-1';
const ACCESS_KEY_ID = 'AKIA6HWSUZBOBFPJD3XL';
const SECRET_ACCESS_KEY = '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';
const CREDENTIALS = {
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY
    }
  };

const MAIN_SERVER_URL = 'www.ragic.com'; // test1.ragic.com  localhost  www.ragic.com

aws_resolve = async (token) => {
    const resolveCustomerParams = {
        RegistrationToken: token
    }

    const marketplacemetering = new MarketplaceMetering(CREDENTIALS);
    const resolveResponse = await marketplacemetering.resolveCustomer(resolveCustomerParams);
    
    return resolveResponse;
}

aws_entitlement = async (customerId) => {

    const entitlementParams = {
        ProductCode: PRODUCT_CODE,
        Filter: {
          CUSTOMER_IDENTIFIER: [customerId],
        }
    }

    const marketplaceEntitlementService = new MarketplaceEntitlementService(CREDENTIALS);
    const entitlementsResponse = await marketplaceEntitlementService.getEntitlements(entitlementParams);

    return entitlementsResponse;
}

errorPage = (message) => {
    let page = 
        `
        <html>
        <body>
            <p>${message} </p>
            <p>Please follow the link below back to our AWS Marketplace Main Page and retry the process. </p>
            <a href='${PRODUCT_PAGE_URL}'>${PRODUCT_PAGE_URL}</a>
            <p>If the problem persists, please email us at support@ragic.com with the error message, and we shall assist you with the problem. </p>
        </body>
        </html>
        `;
    
    return page;
}

saveCustomerDetails = (customerId, entitlementsResponse) => {
// should use try catch when using this function
    let fileName = customerId+'.txt';
    let dirName = 'aws_customer_details';
    let jsonStr = JSON.stringify(entitlementsResponse['Entitlements']);
    let options = {encoding: 'utf8'};
    let dirPath = path.join(__dirname, dirName);
    let filePath = path.join(__dirname, dirName, fileName);

    if(!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    try{
        fs.writeFileSync(filePath, jsonStr, options); 
    }catch(err){
        // modify error message to display on front end
        throw new Error('Error Saving Customer Entitlements');
    }
    
}

log2file = (content, logFileStream)=>{
    logFileStream.write(content + '\n');
}

module.exports = {
    aws_resolve: aws_resolve,
    aws_entitlement: aws_entitlement,
    errorPage: errorPage,
    saveCustomerDetails: saveCustomerDetails,
    log2file: log2file,
    errorFileStream: errorFileStream,
    MAIN_SERVER_URL: MAIN_SERVER_URL
}