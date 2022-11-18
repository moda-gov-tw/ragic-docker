const URL = require('url');
const fs = require('fs');
const path = require('path');

function check_entitlements(req, res){
    
    let query = URL.parse(req.url).query;
    let urlParams = new URLSearchParams(query);
    let filePath = path.join(__dirname, `/aws_customer_details/${urlParams.get('aws_customer_id')}.txt`);

    fs.readFile(filePath, (err, data)=>{
        if(err){
            res.setHeader('Content-Type', 'application/json');
            res.writeHeader(404);
            res.end(JSON.stringify({
                filePath: filePath,
                message: 'error while reading file with provided customer id, file may not exist'
            }));
            return ;
        }

        res.setHeader('Content-Type', 'application/json');
        res.writeHeader(200);
        res.end(data);
        
    })
}


exports.check_entitlements = check_entitlements;