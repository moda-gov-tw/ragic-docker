var __doc=document;
function $(id){return __doc.getElementById(id);}
function disableSelection(target){
  if(!target) return;

  if (typeof target.onselectstart!="undefined") { //IE route
    target.onselectstart=function(e){
      return false;
    }
  }
  if (typeof target.style.MozUserSelect!="undefined") {//Firefox route
    target.style.MozUserSelect="none"
  }
  else{
    //All other route (ie: Opera)
    //This will cause Chrome not able to use any input
    //target.onmousedown=function(){return false}
  }
  target.style.cursor = "default"
}
function enableSelection(target){
  if(!target) return;
  if (typeof target.onselectstart!="undefined"){
    //IE route
    target.onselectstart=null;
  }
  else if (typeof target.style.MozUserSelect!="undefined") {//Firefox route
    target.style.MozUserSelect=null;
  }
  else{ //All other route (ie: Opera)
//    target.onmousedown=null;
  }
  target.style.cursor = '';
}
function findPos(obj) {
  if(!obj) return null;
  var curleft=obj.offsetLeft;
  var curtop=obj.offsetTop;
  var lastObj=obj;
  while (obj = obj.offsetParent){//assignment operator, not mistake
    lastObj=obj;
    curleft += obj.offsetLeft;
    curtop += obj.offsetTop;
  }
  return [curleft,curtop];
}



disableSelection(document.getElementById('cal'));
disableSelection(document.getElementById('datepicker'));
disableSelection(document.getElementById('calnext'));


var ctrl={};
window.onresize=function(){
  updateBodySize();
};
function updateBodySize(){
  ctrl.bodyWidth=document.body.clientWidth;
  ctrl.bodyHeight=document.body.clientHeight;
  var cal=document.getElementById('cal');
  var pos=findPos(cal);
  var calhead=document.getElementById('calhead');
  var calnext=document.getElementById('calnext');
  cal.style.height=ctrl.bodyHeight-70+'px';
  calhead.style.width=cal.clientWidth+'px';

  var caltable=document.getElementById('caltable');
  if(caltable && caltable.cal) caltable.cal.drawAll();
}

document.body.onkeydown=function(e){
  if (!e) e = window.event;
  var kcode=e.keyCode;
  var alt=e['altKey'];
  var ctrlKey=e['ctrlKey'];

  switch(kcode){
    case 13://enter
      var info=document.getElementById('info');
      if(info && info.style.display=='') bookings.doAddInfo();
      break;
    case 27://esc
      bookings.closeInfo();
      break;
  }
};

function ifRightMouse(e){
  //process right click for firefox
  var rightclick;
  if (e.which) {
    rightclick = (e.which == 3);
  }
  else if (e.button){
    rightclick = (e.button == 2);
  }
  return rightclick;
}

function cloneObj(obj){
  if(!obj) return null;
  var result={};
  for(var key in obj) result[key]=obj[key];
  return result;
}


var ragic_state=null;
function initState(){
  ragic_state=JSON.parse(RagicStorage.localStorage.getItem('state'+apname));
  if(!ragic_state){
    ragic_state={
      format:'formatDaily',
      cursorDate:simpleFormatDate(new Date())
    };
    RagicStorage.localStorage.setItem('state'+apname,JSON.stringify(ragic_state));
  }
}
function getState(name){
  if(!ragic_state) initState();
  return ragic_state[name];
}
function setState(name,value){
  if(!ragic_state) initState();
  ragic_state[name]=value;
  RagicStorage.localStorage.setItem('state'+apname,JSON.stringify(ragic_state));
}


function addResource(){
  spaceConfig['resources'].push({name:'New Resource',qty:1});
  saveConfig();
  initBooking();
}
function updateResouceQty(index,oldQty){
  var newQty=prompt('Number of available resource for booking:',oldQty);
  if(!newQty || isNaN(newQty)) return;

  spaceConfig['resources'][index]['qty']=parseInt(newQty);
  saveConfig();
  initBooking();
}
function delResouce(index){
  if(confirm('Are you sure you want to delete this resource?')){
    spaceConfig['resources'][index]['delete']=true;
    saveConfig();
    initBooking();
  }
}
function getUIIndex(resourceIndex,ary){
  var count=0;
  resourceIndex=parseInt(resourceIndex);
  for(var i=0;i<ary.length && i<=resourceIndex;i++){
    if(ary[i]) count++;
  }
  return resourceIndex-count;
}
function getResourceIndex(y,ary){
  var count=0;
  for(var i=0;i<ary.length;i++){
    if(i>y+count) break;
    if(ary[i]) count++;
  }
  return y+count;
}

function builderHelperPanelSwitch(num){
  switch(num){
    case 1:
      renderDailyConfig();
      $('designHelperMode1').className='selectedDesignHelperMode';
      $('designHelperMode2').className='';
      $('designHelperMode3').className='';
      $('designHelperMode4').className='';
      $('designHelperMode5').className='';
      break;
    case 2:
      renderWeeklyConfig();
      $('designHelperMode1').className='';
      $('designHelperMode2').className='selectedDesignHelperMode';
      $('designHelperMode3').className='';
      $('designHelperMode4').className='';
      $('designHelperMode5').className='';
      break;
    case 3:
      renderMonthlyConfig();
      $('designHelperMode1').className='';
      $('designHelperMode2').className='';
      $('designHelperMode3').className='selectedDesignHelperMode';
      $('designHelperMode4').className='';
      $('designHelperMode5').className='';
      break;
    case 4:
      renderYearlyConfig();
      $('designHelperMode1').className='';
      $('designHelperMode2').className='';
      $('designHelperMode3').className='';
      $('designHelperMode4').className='selectedDesignHelperMode';
      $('designHelperMode5').className='';
      break;
    case 5:
      renderGeneralConfig();
      $('designHelperMode1').className='';
      $('designHelperMode2').className='';
      $('designHelperMode3').className='';
      $('designHelperMode4').className='';
      $('designHelperMode5').className='selectedDesignHelperMode';
      break;
  }
}
