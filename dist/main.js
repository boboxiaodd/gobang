(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
module.exports = {
  searchDeep: 6,  //搜索深度
  deepDecrease: .85, //按搜索深度递减分数，为了让短路径的结果比深路劲的分数高
  countLimit: 24, //gen函数返回的节点数量上限，超过之后将会按照分数进行截断
  checkmateDeep:  5,  //算杀深度
  log: true,
  cache: false,  //是否使用效率不高的置换表
}

},{}],2:[function(require,module,exports){
var S = require("./score.js");
var R = require("./role.js");
var W = require("./win.js");
var config = require('./config.js'); //readonly

var Board = function(container, status) {
  this.container = container;
  this.status = status;
  this.step = this.container.width() * 0.065;
  this.offset = this.container.width() * 0.044;
  this.steps = [];  //存储

  this.started = false;


  var self = this;
  this.container.on("click", function(e) {
    if(self.lock || !self.started) return;
    var y = e.offsetX, x = e.offsetY;
    x = Math.floor((x+self.offset)/self.step) - 1;
    y = Math.floor((y+self.offset)/self.step) - 1;

    self.set(x, y, R.hum);
  });

  this.worker = new Worker("./dist/bridge.js?r="+(+new Date()));

  this.worker.onmessage = function(e) {
    self._set(e.data[0], e.data[1], R.com);
    self.lock = false;
    self.setStatus("电脑下子("+e.data[0]+","+e.data[1]+"), 用时"+((new Date() - self.time)/1000)+"秒");
  }
  this.setStatus("请点击开始按钮");

}

Board.prototype.start = function() {

  if(this.started) return;
  this.initBoard();
  
  this.draw();

  this.setStatus("欢迎加入五子棋游戏");

  this.started = true;

  this.worker.postMessage({
    type: "START"
  });

  var self = this;

  $.modal({
    title: "请选择选手",
    buttons: [
      {
        text: "电脑先手",
        onClick: function(){
          self.worker.postMessage({
            type: "BEGIN"
          });
        }
      },
      {
        text: "玩家先手",
        onClick: function(){
        }
      }
    ]
  });
}

Board.prototype.stop = function() {
  if(!this.started) return;
  this.setStatus("请点击开始按钮");
  this.started = false;
}
Board.prototype.initBoard = function() {
  this.board = [];
  for(var i=0;i<15;i++) {
    var row = [];
    for(var j=0;j<15;j++) {
      row.push(0);
    }
    this.board.push(row);
  }
  this.steps = [];
}

Board.prototype.draw = function() {
  var container = this.container;
  var board = this.board;
  
  container.find(".chessman, .indicator").remove();

  for(var i=0;i<this.steps.length;i++) {
    var chessman = $("<div class='chessman'><span class='nu'>" + (i+1) + "</span></div>").appendTo(container);
    var s = this.steps[i]
    if(this.board[s[0]][s[1]] == 1) chessman.addClass("black");
    chessman.css("top", this.offset + s[0]*this.step);
    chessman.css("left", this.offset + s[1]*this.step);
  }

  if(this.steps.length > 0) {
    var lastStep = this.steps[this.steps.length-1];
    $("<div class='indicator'></div>")
      .appendTo(container)
      .css("top", this.offset + this.step * lastStep[0])
      .css("left", this.offset + this.step * lastStep[1])
  }

}

Board.prototype._set = function(x, y, role) {
  this.board[x][y] = role;
  this.steps.push([x,y]);
  this.draw();
  var winner = W(this.board);
  var self = this;
  if(winner == R.com) {
    $.alert("电脑赢了！", function() {
      self.stop();
    });
  } else if (winner == R.hum) {
    $.alert("恭喜你赢了！", function() {
      self.stop();
    });
  }
}

Board.prototype.set = function(x, y, role) {
  if(this.board[x][y] !== 0) {
    throw new Error("此位置不为空");
  }
  this._set(x, y, role);
  this.com(x, y, role);
}

Board.prototype.com = function(x, y, role) {
  this.lock = true;
  this.time = new Date();
  this.worker.postMessage({
    type: "GO",
    x: x,
    y: y
  });
  this.setStatus("电脑正在思考...");
}

Board.prototype.setStatus = function(s) {
  this.status.text(s);
}

Board.prototype.back = function(step) {
  if(this.lock) {
    this.setStatus("电脑正在思考，请稍等..");
    return;
  }
  step = step || 1;
  while(step && this.steps.length >= 2) {
    var s = this.steps.pop();
    this.board[s[0]][s[1]] = R.empty;
    s = this.steps.pop();
    this.board[s[0]][s[1]] = R.empty;
    step --;
  }
  this.draw();
  this.worker.postMessage({
    type: "BACK"
  });
}


Board.prototype.setConfig = function(c) {
  this.worker.postMessage({
    type: "CONFIG",
    config: c
  });
}


var b = new Board($("#board"), $(".status"));
$("#start").click(function() {
  b.start();
});

$("#fail").click(function() {
  $.confirm("确定认输吗?", function() {
    b.stop();
  });
});

$("#back").click(function() {
  b.back();
});

$('#slider1').slider(function (percent) {
  console.log(percent)
})

// settings
function counter(el, _default, MIN, MAX, cb){
  el.find('input').val(_default)
  el.parents('.weui-cell').find('.range').html(MIN+'~'+MAX)
  el.find('.weui-count__decrease').click(function (e) {
    var $input = $(e.currentTarget).parent().find('.weui-count__number');
    var number = parseInt($input.val() || "0") - 2
    if (number < MIN) number = MIN;
    $input.val(number)
    cb(number)
  })
  el.find('.weui-count__increase').click(function (e) {
    var $input = $(e.currentTarget).parent().find('.weui-count__number');
    var number = parseInt($input.val() || "0") + 2
    if (number > MAX) number = MAX;
    $input.val(number)
    cb(number)
  })
}

counter($('#depth'), config.searchDeep, 4, 8, function (n) {
  b.setConfig({
    searchDeep: n
  })
})
counter($('#breadth'), config.countLimit, 12, 60, function (n) {
  b.setConfig({
    countLimit: n
  })
})
counter($('#checkmate'), config.checkmateDeep, 0, 15, function (n) {
  b.setConfig({
    checkmateDeep: n
  })
})

$("#show-nu").change(function () {
  $(document.body).toggleClass('show-nu')
})

},{"./config.js":1,"./role.js":3,"./score.js":4,"./win.js":5}],3:[function(require,module,exports){
module.exports = {
  com: 1,
  hum: 2,
  empty: 0,
  reverse: function(r) {
    return r == 1 ? 2 : 1;
  }
}

},{}],4:[function(require,module,exports){
/*
 * 棋型表示
 * 用一个6位数表示棋型，从高位到低位分别表示
 * 连五，活四，眠四，活三，活二/眠三，活一/眠二, 眠一
 */

module.exports = {
  ONE: 10,
  TWO: 100,
  THREE: 1000,
  FOUR: 100000,
  FIVE: 1000000,
  BLOCKED_ONE: 1,
  BLOCKED_TWO: 10,
  BLOCKED_THREE: 100,
  BLOCKED_FOUR: 10000
}

},{}],5:[function(require,module,exports){
var R = require("./role.js");
var isFive = function(board, p, role) {
  var len = board.length;
  var count = 1;

  var reset = function() {
    count = 1;
  }

  for(var i=p[1]+1;true;i++) {
    if(i>=len) break;
    var t = board[p[0]][i];
    if(t !== role) break;
    count ++;
  }


  for(var i=p[1]-1;true;i--) {
    if(i<0) break;
    var t = board[p[0]][i];
    if(t !== role) break;
    count ++;
  }

  if(count >= 5) return true;

  //纵向
  reset();

  for(var i=p[0]+1;true;i++) {
    if(i>=len) {
      break;
    }
    var t = board[i][p[1]];
    if(t !== role) break;
    count ++;
  }

  for(var i=p[0]-1;true;i--) {
    if(i<0) {
      break;
    }
    var t = board[i][p[1]];
    if(t !== role) break;
    count ++;
  }


  if(count >= 5) return true;
  // \\
  reset();

  for(var i=1;true;i++) {
    var x = p[0]+i, y = p[1]+i;
    if(x>=len || y>=len) {
      break;
    }
    var t = board[x][y];
    if(t !== role) break;
      
    count ++;
  }

  for(var i=1;true;i++) {
    var x = p[0]-i, y = p[1]-i;
    if(x<0||y<0) {
      break;
    }
    var t = board[x][y];
    if(t !== role) break;
    count ++;
  }

  if(count >= 5) return true;

  // \/
  reset();

  for(var i=1; true;i++) {
    var x = p[0]+i, y = p[1]-i;
    if(x<0||y<0||x>=len||y>=len) {
      break;
    }
    var t = board[x][y];
    if(t !== role) break;
    count ++;
  }

  for(var i=1;true;i++) {
    var x = p[0]-i, y = p[1]+i;
    if(x<0||y<0||x>=len||y>=len) {
      break;
    }
    var t = board[x][y];
    if(t !== role) break;
    count ++;
  }

  if(count >= 5) return true;

  return false;

}


var w = function(board) {
  for(var i=0;i<board.length;i++) {
    for(var j=0;j<board[i].length;j++) {
      var t = board[i][j];
      if(t !== R.empty) {
        var r = isFive(board, [i, j], t);
        if(r) return t;
      }
    }
  }
  return false;
}

module.exports = w;

},{"./role.js":3}]},{},[2]);
