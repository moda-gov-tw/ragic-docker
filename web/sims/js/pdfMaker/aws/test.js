const fs = require('fs');
const path = require('path');

function test (req, res){
    
    fs.readFile(path.join(__dirname+'/test.html'), function(error, data) {  
        if (error) {  
            res.writeHead(404);  
            res.write(error);  
            res.end();  
        } else {  
            res.writeHead(200, {  
                'Content-Type': 'text/html'  
            });  
            res.write(data);  
            res.end();  
        }  
    }); 
}


exports.test = test;