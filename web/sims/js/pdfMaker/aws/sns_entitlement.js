const { saveCustomerDetails, aws_entitlement, log2file, errorFileStream, MAIN_SERVER_URL } = require('./utils');
const https = require('https');


function sns_entitlement(req, res){
    if(req.method !== 'POST'){
        
        res.setHeader('Content-Type', 'application/json');
        res.writeHeader(400);
        res.end(JSON.stringify({
            message: 'Only POST requests are supported at this endpoint'
        }));
        return;
    }

    let body = '';
    let jsonBody = null;

    req.on('data', function (chunk) {
        body += chunk;
    });

    req.on('end', async ()=>{
        let customer_id = null;
        try{
            jsonBody = JSON.parse(body);
            let message = JSON.parse(jsonBody['Message']);
            customer_id = message['customer-identifier'];
            
        }catch(err){

            log2file(err, errorFileStream);
            log2file(err.message, errorFileStream);
            log2file(err.stack, errorFileStream);
            res.setHeader('Content-Type', 'application/json');
            res.writeHeader(400);
            res.end(JSON.stringify({
                message: 'failed to process sns JSON data'
            }));
            return;
        }

        try{
            let customer_entitlements = await aws_entitlement(customer_id);
            
            // send new entitlements to main server api, so they know there is an entitlement update
            let options = {
                host: MAIN_SERVER_URL,
                path: '/sims/aws/snsEntitlement.jsp',
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                }
            };

            // this is so that request works on localhost, no SSL certificate
            if(MAIN_SERVER_URL.includes('localhost')) options.rejectUnauthorized = false;
            
            let request = https.request(options, (res)=>{});

            request.write(JSON.stringify(customer_entitlements['Entitlements']));

            request.on('error', (err)=>{
                log2file(err, errorFileStream);
            });

            request.end();

            saveCustomerDetails(customer_id, customer_entitlements);
            
            // response
            res.setHeader('Content-Type', 'application/json');
            res.writeHeader(200);
            res.end(JSON.stringify({
                message: `${customer_id} entitlement updated successfully`
            }));

        }catch(err){
            log2file(err, errorFileStream);
            log2file(err.message, errorFileStream);
            log2file(err.stack, errorFileStream);
            res.setHeader('Content-Type', 'application/json');
            res.writeHeader(404);
            res.end(JSON.stringify({
                message: `failed to update entitlement for ${customer_id}`
            }));
        }
    })

    
    

}

exports.sns_entitlement = sns_entitlement;