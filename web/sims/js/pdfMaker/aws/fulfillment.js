const { aws_resolve, aws_entitlement, saveCustomerDetails, errorPage } = require('./utils');

function fulfillment(req, res) {
    let reg_token;

    if(req.method !== 'POST'){
        
        res.setHeader('Content-Type', 'application/json');
        res.writeHeader(400);
        res.end(JSON.stringify({
            message: 'Only POST requests are supported at this endpoint'
        }));
        return;
    }

    let body = '';
    let customer_details = null;
    let customer_entitlements = null;

    req.on('data', function (chunk) {
        body += chunk;
    });

    
    req.on('end', async function(){

        let urlParams;

        try{
            urlParams = new URLSearchParams(body);
            reg_token = urlParams.get('x-amzn-marketplace-token');
        }catch(ex){
            // ignore exception
        }

        try{
            customer_details = await aws_resolve(reg_token);

            if(customer_details.CustomerIdentifier==null) throw new Error('AWS Has Returned No Valid Customer ID');
    
            customer_entitlements = await aws_entitlement(customer_details.CustomerIdentifier);

            if(customer_entitlements.Entitlements.length==0 || customer_entitlements.Entitlements==null) throw new Error('AWS Has Returned No Entitlements');
            
            saveCustomerDetails(customer_details.CustomerIdentifier, customer_entitlements);
            
            res.setHeader('Location' ,`/redirect?id=${customer_entitlements.Entitlements[0].CustomerIdentifier}`);
            res.writeHeader(302);
            res.end();
            
        }catch(err){
            res.writeHeader(404);
            let message = errorPage(err.message);
            res.end(message);
            return;
        }

    });
    
}


exports.fulfillment = fulfillment;
