const { aws_entitlement, saveCustomerDetails } = require('./utils');
const URL = require('url');

function latest_entitlements(req, res){
    // customer id inside url query params
    
    let query = URL.parse(req.url).query;
    let urlParams = new URLSearchParams(query);

    (async()=>{
        try{
            let entitlementsResponse = await aws_entitlement(urlParams.get('aws_customer_id'));

            saveCustomerDetails(urlParams.get('aws_customer_id'), entitlementsResponse);

            res.setHeader('Content-Type', 'application/json');
            res.writeHeader(200);
            res.end(JSON.stringify(entitlementsResponse['Entitlements']));
        }catch(err){
            res.setHeader('Content-Type', 'application/json');
            res.writeHeader(404);
            res.end(JSON.stringify({
                error: 'update customer entitlements failed'
            }));
        }
    })()
}


exports.latest_entitlements = latest_entitlements;