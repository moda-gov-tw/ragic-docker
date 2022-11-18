function Cal(maxY){
  this.maxY=maxY;
  this.fgsecs=[];
  this.xMarks=[];
  this.yMarks=[];
  this.tempSec=null;
  this.ruleDisabledSlots=[];
  this.userDisabledSlots=[];
}


/*
 *  Drawing main calendar
 */
Cal.prototype.resetSecs=function(){
  this.fgsecs=[];
};
Cal.prototype.addFGSec=function(sec){
  this.fgsecs.push(sec);
};
Cal.prototype.removeFGSec=function(id){
  for(var i=0;i<this.fgsecs.length;i++){
    var sec=this.fgsecs[i];
    if(sec['id']==id) {
      this.fgsecs.splice(i,1);
      i--;
    }
  }
};
Cal.prototype.getFGSec=function(id){
  for(var i=0;i<this.fgsecs.length;i++){
    var sec=this.fgsecs[i];
    if(sec['id']==id) return sec;
  }
  return null;
};
Cal.prototype.drawAll=function(){
  this.drawFGSecs();
};
Cal.prototype.drawFGSecs=function(){
  var calsec=document.getElementById('calsec');//todo remove this reference and move to obj variable
  calsec.innerHTML='';
  this._calcFGSecDimensions();
  var i,sec;

  //reset the old disabled slots
  for(i=0;i<this.userDisabledSlots.length;i++){
    var slot=this.userDisabledSlots[i];
    var cell=$('_sl_'+slot['x']+'_'+slot['y']);
    if(cell) cell.style.backgroundColor=null;
  }
  this.userDisabledSlots=[];

  //draw the fg secs and count the resources used in each slots
  var slotCount={};//x_y:count
  for(i=0;i<this.fgsecs.length;i++){
    sec=this.fgsecs[i];
    var div=this._drawFGSec(sec);
    calsec.appendChild(div);
    var x1=div.x1;
    var x2=div.x2;
    var y=div.y;
    for(var j=x1;j<x2;j++){
      var slot=slotCount[j+'_'+y];
      if(slot) slotCount[j+'_'+y]++;
      else{
        slotCount[j+'_'+y]=1;
      }
    }
  }

  //mark the used up slots
  var caltype=bookings.caltype;
//  debug(JSON.stringify(slotCount));
  for(var key in slotCount){
    var split=key.split('_');
    var x=parseInt(split[0]);
    var y=parseInt(split[1]);
    var resouceConfig=caltype.resources[getResourceIndex(y,caltype.deletedResources)];
    if(!resouceConfig) continue;

    var qty=resouceConfig['qty'];
    if(slotCount[key]>=qty){
      this.userDisabledSlots.push({'x':x,'y':y});
      var cell=$('_sl_'+x+'_'+y);
      if(cell) cell.style.backgroundColor='#eacece';
    }
  }
};
Cal.prototype._drawFGSec=function(sec){
  var div=document.createElement('div');
  div.className='fgsecout';
  div.x1=sec['x1'];
  div.x2=sec['x2'];
  div.y=sec['y'];
  div.setAttribute('sid',sec['id']);
  div.style.top=this.yMarks[sec['y']]+(70*(1/(sec['shared']))*sec['seq'])+"px";
  div.style.left=this.xMarks[sec['x1']]+"px";
  div.style.height=70*(1/sec['shared'])+"px";
  if(sec['x1']==sec['x2']) div.style.width=this.xMarks[sec['x2']+1] - this.xMarks[sec['x1']] -5 +"px";
  else div.style.width=this.xMarks[sec['x2']] - this.xMarks[sec['x1']] -5 +"px";
//  debug(JSON.stringify(sec));
  div.style.zIndex=sec['seq'];
  div.innerHTML='<div class="fgsec"><div class="fgsectextdiv"><span class="fgsectitle">'+(sec['title'] || '')+'</span><span class="fgsectext">'+(sec['text'] || '')+'</span></div></div>';
//  div.innerHTML='<div class="fgsec"><div class="fgsectextdiv"><span class="fgsectitle">'+sec['x1']+'</span><span class="fgsectext">'+sec['x2']+'</span></div></div>';


  //events
  div.onmousedown=function(e){
    if(ifRightMouse(e)) return true;

    move_mousedown(e,div);

    e.cancelBubble=true;
    return false;
  };


  div.onmouseup=function(e){
    if(!drag.actionType || (drag.actionType=='move' && !drag.reallymoved)) {
      bookings.showAddInfo(this);
    }
  };
//  div.onclick=function(e){
//    debug('click');
//  };

  //dragging resize
  div.innerHTML+='<table class="resizer1"><tr><td><div class="resizeIcon"></div></td></tr></table>' +
      '<table class="resizer2"><tr><td><div class="resizeIcon"></div></td></tr></table>';
  var dragLeft=div.childNodes[1];
  var dragRight=div.childNodes[2];
  dragLeft.div=div;
  dragRight.div=div;
  dragLeft.onmousedown=resize1Mousedown;
  dragRight.onmousedown=resize2Mousedown;
  return div;
};


/*
 User Interaction:create
 */
var drag={};
Cal.prototype.initCalElement=function(calElement){
  this.calElement=calElement;
  calElement.cal=this;

  //init the related events
  calElement.onmousedown=function(e){
    if(ifRightMouse(e)) return true;

    var t;
    if(!e) e=window.event;
    if (e.target) t = e.target;
    else if (e.srcElement) t = e.srcElement;
    if (t.nodeType == 3) t = t.parentNode;// defeat Safari bug
    if(!t) return;

    drag.startX=parseInt(t.getAttribute('x'));
    drag.startY=parseInt(t.getAttribute('y'));
    drag.cal=this.cal;
    this.cal.drawFGTemp(
        drag.startX,
        drag.startX+1,
        drag.startY);
    drag.actionType='create';
  };
  document.body.onmousemove=function(e){
    if(drag.actionType=='resize'){
      resize_mousemove(e);
    }
    else if(drag.actionType=='move'){
      move_mousemove(e);
    }
    else if(drag.actionType=='create'){
      create_mousemove(e);
    }
  };
  document.body.onmouseup=function(e){
    if(drag.actionType=='resize'){
      resize_mouseup(e);
    }
    else if(drag.actionType=='move'){
      move_mouseup(e);
    }
    else if(drag.actionType=='create'){
      drag.cal.bookings.showAddInfo();
      drag.startX=null;
      drag.startY=null;
      drag.cal=null;
      drag.actionType=null;
    }
  };
};
function create_mousemove(e){
  var calElement=drag.cal.calElement;
  var calElementPos=findPos(calElement);
  var pos=drag.cal.getMouseoverCell(e.clientX-calElementPos[0], e.clientY-calElementPos[1]);

  //drag right
  if(pos[0]>drag.startX){
    drag.cal.drawFGTemp(
        drag.startX,
        pos[0]+1,
        drag.startY);
  }
  //drag left
  else{
    drag.cal.drawFGTemp(
        pos[0],
        drag.startX,
        drag.startY);
  }
}
Cal.prototype.getMouseoverCell=function(ex,ey){
  var calElement=this.calElement;
  var calOffsetX=calElement.offsetLeft;
  var calOffsetY=calElement.offsetTop;
  var x=ex-calOffsetX,y=ey-calOffsetY;
  var i;
  var row,col;
  for(i=0;i<this.xMarks.length;i++){
    if(this.xMarks[i]>x) {
      col=i-1;
      break;
    }
  }
  for(i=0;i<this.yMarks.length;i++){
    if(this.yMarks[i]>y) {
      row=i-1;
      break;
    }
  }
//  debug(this.yMarks+':'+y);
  return [col,row];
};

Cal.prototype.drawFGTemp=function(x1,x2,y){
  if(isNaN(x1) || isNaN(x2) || isNaN(y)) return;
  if(!this.tempSec){
    this.tempSec=document.createElement('div');
    this.tempSec.className='fgsecout';
    this.tempSec.innerHTML='<div class="fgsec"><div class="fgsectext"></div></div>';
    this.calElement.appendChild(this.tempSec);
  }
  this.tempSec.style.display='';
  this.tempSec.setAttribute('x1',x1);
  this.tempSec.setAttribute('x2',x2);
  this.tempSec.setAttribute('y',y);
  this.tempSec.style.top=this.yMarks[y]+"px";
  this.tempSec.style.left=this.xMarks[x1]+"px";
  this.tempSec.style.height=80-2+"px";
  this.tempSec.style.width=Math.max(1,x2-x1)*this.slotWidth-2+"px";

  //if the section is in the original editDiv, then no need to check, remove related userDisabledSlots
  var editDiv=drag.editDiv;
  if(!drag.tempUserDisabledSlots){
    //init tempUserDisabledSlots
    drag.tempUserDisabledSlots=[];
    for(var i=0;i<this.userDisabledSlots.length;i++){
      var slot=this.userDisabledSlots[i];
      //within edit div, no copy
      if(editDiv && editDiv.y==slot['y'] && slot['x']>=editDiv.x1 && slot['x']<editDiv.x2) continue;
      //add the slot to the tempUserDisabledSlots
      drag.tempUserDisabledSlots.push(slot);
    }

    //mark the editDiv, the location and size as available
    if(editDiv){
      for(i=editDiv.x1;i<editDiv.x2;i++){
        var cell=$('_sl_'+i+'_'+editDiv.y);
        if(cell) cell.style.backgroundColor=null;
      }
    }
  }

  //check if hover over disabled slots
  var invalid=false;
  for(var i=0;i<this.ruleDisabledSlots.length;i++){
    var slot=this.ruleDisabledSlots[i];
    if(y==slot['y']){
      if(slot['x']>=x1 && slot['x']<x2) invalid=true;
      if(x1==x2 && x1==slot['x']) invalid=true;
    }

  }
  for(var i=0;i<drag.tempUserDisabledSlots.length;i++){
    var slot=drag.tempUserDisabledSlots[i];
    if(y==slot['y']){
      if(slot['x']>=x1 && slot['x']<x2) invalid=true;
      if(x1==x2 && x1==slot['x']) invalid=true;
    }
  }


  if(invalid){
    this.tempSec.style.opacity=0.2;
    this.tempSec.setAttribute('state',1);
  }
  else{
    this.tempSec.style.opacity=0.8;
    this.tempSec.setAttribute('state',2);
  }
};


/*
 User Interaction:resize
 */
function move_mousedown(e,div){
  var cal=bookings.caltype.cal;
  var calElement=cal.calElement;
  var calElementPos=findPos(calElement);
  var pos=cal.getMouseoverCell(e.clientX-calElementPos[0], e.clientY-calElementPos[1]);

  //reset first
  if(cal.tempSec) cal.tempSec.style.display='none';

  //hide the original one
//  div.style.display='none';

  drag.editDiv=div;
  drag.cal=cal;
  drag.actionType='move';
  drag.reallymoved=false;
  drag.widthSlots=div.x2-div.x1;
  drag.xoffset=pos[0]-div.x1;
}
function move_mousemove(e){
  drag.reallymoved=true;
  var calElement=drag.cal.calElement;
  var calElementPos=findPos(calElement);
  var pos=drag.cal.getMouseoverCell(e.clientX-calElementPos[0], e.clientY-calElementPos[1]);

  var startX=pos[0]-drag.xoffset;

  //check boundaries
  if(startX<1) startX=1;
  if(startX+drag.widthSlots>drag.cal.maxXIndex) startX=drag.cal.maxXIndex-drag.widthSlots;

  drag.cal.drawFGTemp(
      startX,
      startX+drag.widthSlots,
      pos[1]);
}
function move_mouseup(e){
  //update booking
  if(drag.reallymoved){
    bookings.updateBookingItem(drag.editDiv.getAttribute('sid'));
  }
  if(bookings.caltype.cal.tempSec) bookings.caltype.cal.tempSec.style.display='none';

  //reset variables
  drag.reallymoved=false;
  drag.editDiv=null;
  drag.cal=null;
  drag.actionType=null;
  drag.widthSlots=null;
  drag.xoffset=null;
  drag.tempUserDisabledSlots=null;
}
function resize_mousemove(e){
  var calElement=drag.cal.calElement;
  var calElementPos=findPos(calElement);
  var pos=drag.cal.getMouseoverCell(e.clientX-calElementPos[0], e.clientY-calElementPos[1]);

  //begin resizing
  if(!drag.startX){
    //hide the existing one from cal
    drag.editDiv.style.display='none';

    //to the left
    if(drag.resizingDir==1) drag.startX=drag.editDiv.x2;
    //to the right
    else if(drag.resizingDir==2) drag.startX=drag.editDiv.x1;
    drag.startY=drag.editDiv.y;
  }

  //check boundaries
  if(pos[0]<1) pos[0]=1;
  if(pos[0]>this.maxXIndex) pos[0]=this.maxXIndex;

  //to the left
  if(drag.resizingDir==1){
    drag.cal.drawFGTemp(
        pos[0],
        drag.startX,
        drag.startY);
  }
  //to the right
  else if(drag.resizingDir==2){
    drag.cal.drawFGTemp(
        drag.startX,
        pos[0]+1,
        drag.startY);
  }
}
function resize_mouseup(e){
  //update booking
  bookings.updateBookingItem(drag.editDiv.getAttribute('sid'));
  bookings.caltype.cal.tempSec.style.display='none';

  //reset variables
  drag.editDiv=null;
  drag.resizingDir=null;
  drag.cal=null;
  drag.actionType=null;
  drag.startX=null;
  drag.startY=null;
  drag.tempUserDisabledSlots=null;
}
function resize1Mousedown(e){
  if(ifRightMouse(e)) return true;
  drag.editDiv=this.div;
  drag.resizingDir=1;//to the left
  drag.cal=bookings.caltype.cal;
  drag.actionType='resize';

  e.cancelBubble=true;
  return false;
}
function resize2Mousedown(e){
  if(ifRightMouse(e)) return true;
  drag.editDiv=this.div;
  drag.resizingDir=2;//to the right
  drag.cal=bookings.caltype.cal;
  drag.actionType='resize';

  e.cancelBubble=true;
  return false;
}




/*
 *   Calculation utilities
 */
Cal.prototype._calcGrid=function(){
  var table=this.calElement;
  this.xMarks=[];
  this.yMarks=[];
  var i,j;
  var rows=table.rows,row,cells,cell;
  for(i=0;i<rows.length;i++){
    row=rows[i];
    this.yMarks.push(row.offsetTop);
  }
  //we need the right border position of the last cell too
  this.yMarks.push(row.offsetTop+row.offsetHeight);

  this.slotHeight=rows[1].cells[1].offsetHeight;
  this.slotWidth=rows[1].cells[1].clientWidth+1;//1 for the border
  cells=rows[1].cells;
  for(j=0;j<cells.length;j++){
    cell=cells[j];
    this.xMarks.push(cell.offsetLeft);
  }
  //we need the right border position of the last cell too
  this.xMarks.push(cell.offsetLeft+cell.offsetWidth);
};
Cal.prototype._calcFGSecDimensions=function(){
  for(var i=0;i<=this.maxY;i++){
    this.calcRowFGSecDimensions(i);
  }
};
//每加一個都去從seq最小開始檢查一次有沒有空的地方可以放，有的話就重複該seq
//最後算seq用到多大，大家的寬度就是 1 / maxseq
Cal.prototype.calcRowFGSecDimensions=function(row){
  //set the seq of each secs
  var i, seq,maxseq=0,sec;
  var seqVsSecs=[];//2 dim array, index is seq and value is array of secs in the seq
  for(i=0;i<this.fgsecs.length;i++){
    sec=this.fgsecs[i];
    if(row!=sec['y']) continue;
    var foundSpace=false;
    for(seq=0;seq<seqVsSecs.length;seq++){
      var seqSecArray=seqVsSecs[seq];
      //check if space available in this seq for this sec, if not, next, if available, break

      //blocked, do nothing, go to next seq
      if(checkIfBlocked(sec,seqSecArray)) {
//        alert(sec.id+'blocked in seq:'+seq);
        continue;
      }
      //not blocked, add me
      else{
        seqSecArray.push(sec);
        sec['seq']=seq;
        foundSpace=true;
        break;
      }
    }
    if(!foundSpace){
      sec['seq']=seq;
      seqVsSecs.push([sec]);
    }
    if(seq>maxseq) maxseq=seq;
  }
  //set shared
  for(i=0;i<this.fgsecs.length;i++){
    sec=this.fgsecs[i];
    if(row!=sec['y']) continue;
    sec['shared']=maxseq+1;
  }
};
function checkIfBlocked(sec,ary){
  for(var i=0;i<ary.length;i++){
    var arySec=ary[i];
    if(arySec['x1']<sec['x1'] && arySec['x2']>sec['x1']) return true;
    if(arySec['x1']>=sec['x1'] && arySec['x1']<=sec['x2']) return true;
  }
  return false;
}
function debug(s){
  document.getElementById('debug').innerHTML=s?s:new Date().getTime();
}
