function createTextbox(name,eid,value){
  return parseHeaderValue(name)+"<input type=text name='"+eid+"' value='"+value+"' />";
}
function createTextarea(name,eid,value){
  return parseHeaderValue(name)+"<textarea name='"+eid+"'>"+value+"</textarea>";
}
function createSelection(name,eid,value,options){
  var s=parseHeaderValue(name)+"<select name='"+eid+"'>'";
  s+='<option></option>';
  for(var i=0;i<options.length;i++){
    var o=options[i];
    s+='<option>'+o['v']+'</option>';
  }
  s+="</select>";
  return s;
}
$('widgetForm').action=RAGIC.widgetConfig['sysApiUrl'];


function processField(key,obj,ifTextarea){
  var fieldDiv=document.createElement('div');
  fieldDiv.className='fieldDiv';

  if(obj['type']=='D'){
    fieldDiv.innerHTML+=ifTextarea?
        (createTextarea(obj['name'],key.substr(3),'')+'<br/>'):
        (createTextbox(obj['name'],key.substr(3),''));
  }
  else if(obj['type']=='L'){
    fieldDiv.innerHTML+=createSelection(obj['name'],key.substr(3),'',obj['options']);
  }

  return fieldDiv;
}


function processFormDef(data){
  var canvas=$('canvasContent');
  var lastY;
  var heightInfo=processWidth(data)['height'];
  for(var key in data['fields']){
    var obj=data['fields'][key];
    if(key.substr(0,3)=='fid'){
      var fieldDiv=processField(key,obj,!!heightInfo[obj['y']]);
      canvas.appendChild(fieldDiv);
      if(lastY!=obj['y']) fieldDiv.style.clear='left';
      lastY=obj['y'];
    }
  }
}


function processListing(data){
  var canvas=$('canvasContent');
  var table='<table>';

  var headerPrinted=false;
  for(var key in data){
    var e=data[key];
    if(!headerPrinted){
      table+='<tr>';
      for(var name in e) table+='<td>'+name+'</td>';
      table+='</tr>';
      headerPrinted=true;
    }

    table+='<tr>';
    for(var name in e) {
      table+='<td nowrap>'+e[name]+'</td>';
    }
    table+='</tr>';
  }
  canvas.innerHTML=table;
}

//loading new entry form def
//RAGIC.api('','def&v=2',function(data){
//  processFormDef(data);
//});

//loading listing page form def
RAGIC.api('','listing&v=2',function(data){
  processListing(data);
});
