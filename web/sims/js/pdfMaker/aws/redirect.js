const fs = require('fs');
const path = require('path');

function redirect (req, res){
    fs.readFile(path.join(__dirname+'/redirect.html'), function(error, data) {  
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


exports.redirect = redirect;