var kanbanCtrl = {};
const KanbanConst = {
  LEFT: 1,
  RIGHT: 2
}
var RagicKanban = (function () {
  "use strict";
  var do_not_render,
      warningMsg = {},
      listPos = {},
      changeDomainId = -1,
      apname = '',
      path = '',
      sheetIndex = -1,
      sortingDomainId = -1,
      sortingType = 'asc',
      fontFamily = '',
      fontSizeScale = 1,
      boundaryMargin = '';
  var kanban = {
    events : {},
    lang : {
      msg1: ''
    },
  };


  kanban.requireEventData = function (eventData) {
    this.events = eventData;
  };

  kanban.requireListData = function (lists) {
    this.catLists = lists;
  };

  kanban.loadConfig = function (config) {
    if (config.hasOwnProperty('warningMsg')) {
      warningMsg = JSON.parse(config.warningMsg);
    }
    if (config.hasOwnProperty('changeDomainId')) {
      changeDomainId = config.changeDomainId;
    }
    if (config.hasOwnProperty('apname')) {
      apname = config.apname;
    }
    if (config.hasOwnProperty('path')) {
      path = config.path;
    }
    if (config.hasOwnProperty('sheetIndex')) {
      sheetIndex = config.sheetIndex;
    }
    if (config.hasOwnProperty('fontFamily')) {
      fontFamily = config.fontFamily;
    }
    if (config.hasOwnProperty('fontSizeScale')) {
      fontSizeScale = config.fontSizeScale;
    }
    if (config.hasOwnProperty('boundaryMargin')) {
      boundaryMargin = config.boundaryMargin;
    }
    if (config.hasOwnProperty('sortingDomainId')) {
      sortingDomainId = config.sortingDomainId;
    }
    if (config.hasOwnProperty('sortingType')) {
      sortingType = config.sortingType;
    }
  };

  kanban.loadLanguage = function (lang) {
    this.lang = lang;
  };

  kanban.render = function () {

    var kanbanContent = document.createElement('DIV'),
        kanbanBoard = document.createElement('DIV');
    kanbanContent.id = 'kanbanContent';
    kanbanBoard.id = 'board';
    kanbanBoard.style.whiteSpace = 'nowrap';
    kanbanBoard.style.fontFamily = fontFamily;
    kanbanBoard.style.fontSize = Math.round(16*fontSizeScale) + "px";
    kanbanBoard.style.margin = boundaryMargin;
    kanbanContent.appendChild(kanbanBoard);

    if (warningMsg['overLimit']) {
      kanbanBoard.textContent = warningMsg['overLimit'];
      return kanbanContent;
    }

    kanbanContent.onmousedown = kanbanMouseDown;
    kanbanContent.onclick = kanbanClick;

    for (var i = 0; i < this.catLists.length; i++) {
      var category = this.catLists[i];
      var listEvents = this.events[category];
      var listView = new KanbanList(category, listEvents).render();
      kanbanBoard.appendChild(listView);
    }

    return kanbanContent;
  };

  /**
   * @deprecated use listWrapper.onmouseenter instead
   */
  kanban.loadListElementsPos = function() {
    return;
    var i = 0;
    var listElements = document.getElementsByClassName('list-wrapper');
    var reportContent = document.getElementById('v5Content').querySelector('.reportContent');
    var reportOuterContainer = document.getElementById('reportOuterContainer');
    for (; i < listElements.length; i++) {
      var listElement = listElements[i];
      var category = listElement.id.split('list_')[1];
      var bdr = listElement.getBoundingClientRect();
      var top = bdr.top + document.body.scrollTop + reportOuterContainer.scrollTop;
      var left = bdr.left + document.body.scrollLeft + reportOuterContainer.scrollLeft;
      var width = bdr.width;
      var height = bdr.height;
      listPos[category] = {"top": top, "left":left, "width":width, "height":height};
    }
  };

  kanban.getListPos = function() {
    return listPos;
  };

  kanban.getUpdateDomainId = function () {
    return changeDomainId;
  };

  kanban.getApname = function() {
    return apname;
  };

  kanban.getPath = function() {
    return path;
  };

  kanban.getSheetIndex = function () {
    return sheetIndex;
  };

  kanban.getSortingDomainId = function () {
    return sortingDomainId;
  };

  kanban.getSortingType = function () {
    return sortingType;
  };

  function KanbanList(category, entries) {
    this.category = category;
    this.entries = entries;
  }

  KanbanList.prototype.render = function () {
    var listWrapper = document.createElement('DIV'),
        listContent = document.createElement('DIV');

    listWrapper.classList.add('list-wrapper');
    listWrapper.id = 'list_' + this.category;
    listWrapper.dataset.category = this.category;
    listContent.classList.add('list');
    listWrapper.appendChild(listContent);
    listWrapper.addEventListener('mouseenter', listMouseEnter);
    listWrapper.addEventListener('mouseleave', listMouseLeave);

    this.drawHeader(listContent);
    this.drawEvents(listContent);

    return listWrapper;
  };

  KanbanList.prototype.drawHeader = function (content) {
    var listHeader = document.createElement('DIV');
    listHeader.classList.add('list-header');
    listHeader.textContent = this.category;
    content.appendChild(listHeader);
  };

  KanbanList.prototype.drawEvents = function (content) {
    const listCards = document.createElement('DIV');

    listCards.classList.add('list-cards');
    content.appendChild(listCards);
    if (!this.entries) return;

    this.entries.forEach(function (event) {
      const nodeId = event.nodeId;
      if (nodeId == null) return;

      const card = document.createElement('DIV');
      card.classList.add('list-card');
      card.id = 'card_' + nodeId;
      card.dataset.nodeid = nodeId;
      listCards.appendChild(card);

      if (event.displayValues) {
        event.displayValues.forEach(function(value) {
          let contentEle = document.createElement('P');
          contentEle.textContent = value;
          card.appendChild(contentEle);
        })
      }
    });
  };

  return kanban;
})();

document.addEventListener('mouseup', kanbanMouseUp);
document.addEventListener('mousemove', kanbanMouseMove);
function kanbanMouseDown(e) {
  const card = e.target.closest('.list-card');
  if (card) {
    const cardRect = card.getBoundingClientRect();
    const listWrapper = card.closest('.list-wrapper');
    kanbanCtrl.startListElement = listWrapper;
    kanbanCtrl.dragStartX = e.clientX;
    kanbanCtrl.dragStartY = e.clientY;
    kanbanCtrl.dragging = card;
    kanbanCtrl.dragDiffX = kanbanCtrl.dragStartX - cardRect.left;
    kanbanCtrl.dragDiffY = kanbanCtrl.dragStartY - cardRect.top;

    const floatingCard = $('floatingCard');
    floatingCard.style.height = cardRect.height + 'px';
    floatingCard.style.width = cardRect.width + 'px';
    floatingCard.innerHTML = '';
    [].slice.call(card.childNodes).forEach(function(childNode) {
      const clone = childNode.cloneNode(true);
      floatingCard.appendChild(clone);
    });

    disableSelection(document.body);
  }
}

function kanbanMouseUp(e) {
  const floatingCard = $('floatingCard');
  const draggingCard = kanbanCtrl.dragging;
  if (floatingCard) floatingCard.style.display = 'none';
  if (!draggingCard) {
    resetKanbanStart();
    return;
  }
  draggingCard.classList.remove('dragging');
  
  const listElement = kanbanCtrl.currentListElement;
  if (!listElement) {
    resetKanbanStart();
    return;
  }
  listElement.classList.remove('dragin');
   
  let newCategory = listElement.dataset.category;
  let oldCategory = kanbanCtrl.startListElement.dataset.category;
  if (newCategory == oldCategory) {
    resetKanbanStart();
    return;
  }
  
  const nodeId = kanbanCtrl.dragging.dataset.nodeid;

  let updateValue = {};
  updateValue[RagicKanban.getUpdateDomainId()] = newCategory;

  postPromise('/sims/report/templates/ragic/kanban/saveEntry.jsp', {
      'a':RagicKanban.getApname(),
      'p':RagicKanban.getPath(),
      'si':RagicKanban.getSheetIndex(),
      'n':nodeId,
      'd':RagicKanban.getUpdateDomainId(),
      'nv':newCategory,
      'ov':oldCategory
    }).then(function(errorMsg) {
      if (errorMsg) {
        floatWin(null, errorMsg);
        return Promise.reject();
      }

      const oldCategoryArray = RagicKanban.events[oldCategory];
      let nodeIdsInNewCategory = [];
      if (oldCategoryArray) {
        for (let i = 0; i < oldCategoryArray.length; i++) {
          const entryObj = oldCategoryArray[i];
          if (entryObj.nodeId == nodeId) {
            oldCategoryArray.splice(i, 1);

            let newCategoryArray = RagicKanban.events[newCategory];
            if (!newCategoryArray) {
              newCategoryArray = [];
              RagicKanban.events[newCategory] = newCategoryArray;
            }
            newCategoryArray.push(entryObj);
            nodeIdsInNewCategory = newCategoryArray.map(function(e) {
              return e.nodeId;
            });
            break;
          }
        }
      }

      return postPromise('/sims/report/templates/ragic/kanban/sortEntries.jsp', {
        'a':RagicKanban.getApname(),
        'p':RagicKanban.getPath(),
        'si':RagicKanban.getSheetIndex(),
        'nids': nodeIdsInNewCategory
      });
      
    }).then(function(resp) {
      if (!resp) {
        return Promise.reject();
      }
      let sortedNodeIds;
      try {
        sortedNodeIds = JSON.parse(resp);
      } catch (error) {
        return Promise.reject(error);
      }

      const newCategoryArray = RagicKanban.events[newCategory];
      const sortedEventsArray = [];
      if (newCategoryArray) {
        sortedNodeIds.forEach(function(nodeId) {
          for (let i = 0; i < newCategoryArray.length; i++) {
            const entryObj = newCategoryArray[i];
            if (entryObj.nodeId == nodeId) {
              sortedEventsArray.push(entryObj);
              break;
            }
          }
        });
        RagicKanban.events[newCategory] = sortedEventsArray;
        
        let kanbanView = RagicKanban.render();
        $('eventKanban').innerHTML = '';
        $('eventKanban').appendChild(kanbanView);
      }
    }).catch(function(ignored) {
      console.log('catch, ', ignored);
    });


  resetKanbanStart();
  enableSelection(document.body);
}

function kanbanMouseMove(e) {
  //[NOTICE!] mousemove triggered after mouseup, even when the mouse is not moving
  if (!kanbanCtrl.dragStartX || !kanbanCtrl.dragStartY) return;
  if (Math.abs(kanbanCtrl.dragStartX - e.clientX) + Math.abs(kanbanCtrl.dragStartY - e.clientY) > 10) {
    const floatingCard = $('floatingCard');
    floatingCard.style.display = '';
    floatingCard.style.left = e.clientX - kanbanCtrl.dragDiffX + 'px';
    floatingCard.style.top = e.clientY - kanbanCtrl.dragDiffY + 'px';

    const draggingCard = kanbanCtrl.dragging;
    draggingCard.classList.add('dragging');

    const reportOuterContainerWidth = $('reportOuterContainer').getBoundingClientRect().width;
    if (e.clientX - kanbanCtrl.oldx > 0) kanbanCtrl.movingDirection = KanbanConst.RIGHT;
    else if (e.clientX - kanbanCtrl.oldx < 0) kanbanCtrl.movingDirection = KanbanConst.LEFT;
    const movingDirection = kanbanCtrl.movingDirection;
    if (movingDirection === KanbanConst.RIGHT && reportOuterContainerWidth - e.clientX < 100) {
      scrollRight();
    }
    else if (movingDirection === KanbanConst.LEFT && e.clientX < 100) {
      scrollLeft();
    }
  }
  kanbanCtrl.oldx = e.clientX;
}

function kanbanClick(e) {
  const card = e.target.closest('.list-card');
  if (card) {
    try {
      const nodeId = parseInt(card.dataset.nodeid);
      showFpClick(RagicKanban.getApname() + RagicKanban.getPath() + '/' + RagicKanban.getSheetIndex(), nodeId);
    } catch (err) {}
    
  }
}

/**
   * @deprecated use listWrapper.onmouseenter instead
   */
function getMouseOverCardList(x, y) {
  var listPos = RagicKanban.getListPos();
  var reportContent = document.getElementById('v5Content').querySelector('.reportContent');
  var oldx = x, oldy = y;
  x += document.body.scrollLeft + reportContent.scrollLeft;
  y += document.body.scrollTop;
  
  for (var category in listPos) {
    var pos = listPos[category];
    if (x > pos.left && x - pos.left < pos.width && y > pos.top && y - pos.top < pos.height) {
      var elementId = 'list_' + category;
      return document.getElementById('list_' + category);
    }
  }
  return null;
}

function resetKanbanStart() {
  if (kanbanCtrl) {
    kanbanCtrl.startListElement = null;
    kanbanCtrl.dragStartX = null;
    kanbanCtrl.dragStartY = null;
    kanbanCtrl.dragging = null;
    kanbanCtrl.currentListElement = null;
    kanbanCtrl.movingDirection = null;
  }
}

function listMouseEnter (e) {
  if (!kanbanCtrl.dragging) return;
  const listWrapper = e.target;
  listWrapper.classList.add('dragin');
  kanbanCtrl.currentListElement = listWrapper;
}

function listMouseLeave(e) {
  if (!kanbanCtrl.dragging) return;
  const listWrapper = e.target;
  listWrapper.classList.remove('dragin');
  kanbanCtrl.currentListElement = null;
}

function scrollRight() {
  if (!kanbanCtrl.dragging || kanbanCtrl.movingDirection !== KanbanConst.RIGHT) return;
  $('reportOuterContainer').scrollBy(1, 0);
  setTimeout(scrollRight, 50);
}
function scrollLeft() {
  if (!kanbanCtrl.dragging || kanbanCtrl.movingDirection !== KanbanConst.LEFT) return;
  $('reportOuterContainer').scrollBy(-1, 0);
  setTimeout(scrollLeft, 50);
}
