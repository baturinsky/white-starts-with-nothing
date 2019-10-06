/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@paradise.net.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * lives at http://p4wn.sf.net/
 *
 * @author Douglas Bagnall <douglas@paradise.net.nz>
 * @author Oliver Merkel <merkel.oliver@web.de>
 *
 */
/* The routines here draw the screen and handle user interaction */

function populateMenu() {
  var menu = document.getElementById("menu");
  menu.innerHTML = "";
  menu.innerHTML += "Start game:";
  for (let i = 0; i < modes.length; i++) {
    var mode = modes[i];
    menu.innerHTML +=
      "</br><button " +
      (i == mode_n ? "class='current-mode'" : "") +
      " onclick=start_mode(" +
      i +
      ")>" +
      mode.name +
      "</button>";
  }
}


var game;

function start_mode(n) {
  mode_n = n;
  populateMenu();
  if(game)
    game.game_over = "stopped";
  game = p4wnify("board-goes-here");
}

var mode_n = 0;
var P4WN_SQUARE_WIDTH = 30;
var P4WN_SQUARE_HEIGHT = 30;
var P4WN_WRAPPER_CLASS = "p4wn-wrapper";
var P4WN_BOARD_CLASS = "p4wn-board";
var P4WN_MESSAGES_CLASS = "p4wn-messages";
var P4WN_LOG_CLASS = "p4wn-log";
var P4WN_CONTROLS_CLASS = "p4wn-controls";
var P4WN_BLACK_SQUARE = "p4wn-black-square";
var P4WN_WHITE_SQUARE = "p4wn-white-square";

var USE_LOG = false;
var USE_CONTROLS = false;

var P4WN_ROTATE_BOARD = true;
var P4WN_LEVELS = [
  "stupid",
  "middling",
  "default",
  "slow",
  "slower",
  "slowest"
];
var P4WN_DEFAULT_LEVEL = 5;
var P4WN_ADAPTIVE_LEVELS = true;

var P4WN_IMAGE_DIR = "images";

var P4WN_IMAGE_NAMES = [
  "empty.gif",
  "", // 1 is unused
  "white_pawn.gif",
  "black_pawn.gif",
  "white_rook.gif",
  "black_rook.gif",
  "white_knight.gif",
  "black_knight.gif",
  "white_bishop.gif",
  "black_bishop.gif",
  "white_king.gif",
  "black_king.gif",
  "white_queen.gif",
  "black_queen.gif"
];

var modes = [
  {
    name: "Start With Nothing",
    bag: "KPRPBPNPQPNPBPRP",
    board: "rnbqkbnr/pppppppp/8/8/8/8/8/8 b - 0 1"
  },
  {
    name: "Human Wave",
    bag: "KPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP",
    board: "rnbqkbnr/pppppppp/8/8/8/8/8/8 b - 0 1"
  },
  {
    name: "Randomised",
    bag: "KPRPBPNPQPNPBPRP",
    board: "rnbqkbnr/pppppppp/8/8/8/8/8/8 b - 0 1",
    random: true
  },
  {
    name: "Double Nothing",
    //bag: "KpPrRpPbBpPnNpPqQpPnNpPbBpPrRpP",
    bag: "KpPrRpPbBpPnNpPqPpPnNpPbBpPrRpP",
    board: "4k3/8/8/8/8/8/8/8 b - 0 1"
  }
];

/*the next two should match*/
var P4WN_PROMOTION_STRINGS = ["queen", "rook", "knight", "bishop"];
var P4WN_PROMOTION_INTS = [P4_QUEEN, P4_ROOK, P4_KNIGHT, P4_BISHOP];

var lastMouseMove;

var _p4d_proto = {};

/* MSIE 6 compatibility functions */
function _add_event_listener(el, eventname, fn) {
  if (el.addEventListener === undefined) {
    el.attachEvent("on" + eventname, fn);
  } else {
    el.addEventListener(eventname, fn);
  }
}

function _event_target(e) {
  /*e.srcElement is not quite equivalent, but nothing is closer */
  return e.currentTarget ? e.currentTarget : e.srcElement;
}

function P4wn_display(target) {
  this.mode = modes[mode_n];
  this.bag = this.mode.bag + "";
  this.current_turn = 1;
  this.ui = document.getElementById("ui");
  this.set_status();

  if (!this instanceof P4wn_display) {
    return new P4wn_display(target);
  }
  var container;
  if (typeof target == "string") container = document.getElementById(target);
  else if (target.jquery !== undefined) container = target.get(0);
  else container = target;
  container.innerHTML = "";
  var inner = p4d_new_child(container, "div", P4WN_WRAPPER_CLASS);
  this.elements = {};
  this.elements.inner = inner;
  this.elements.container = container;
  this.elements.board = p4d_new_child(inner, "div", P4WN_BOARD_CLASS);
  if (USE_LOG) this.elements.log = p4d_new_child(inner, "div", P4WN_LOG_CLASS);
  this.elements.messages = p4d_new_child(inner, "div", P4WN_MESSAGES_CLASS);
  if (USE_CONTROLS)
    this.elements.controls = p4d_new_child(
      container,
      "div",
      P4WN_CONTROLS_CLASS
    );
  this.start = 0;
  this.draw_offers = 0;
  this.board_state = p4_new_game();
  this.players = ["human", "human"]; //[white, black] controllers
  this.pawn_becomes = 0; //index into P4WN_PROMOTION_* arrays
  this.computer_level = P4WN_DEFAULT_LEVEL;
  this.buttons = {
    elements: [],
    refreshers: []
  };
  this.move_listeners = [];
  return this;
}

_p4d_proto.next_bag_piece = function() {
  if (this.bag.length == 0) return;

  if (this.mode.random && this.bag[0] != "K") {
    let n = Math.floor(Math.random() * this.bag.length);
    let piece = P4_PIECE_LUT[this.bag[n]];
    console.log(this.bag);
    this.bag = this.bag.substr(0, n) + this.bag.substr(n + 1);
    console.log(this.bag);
    this.current_bag_piece = piece;
  } else {
    this.current_bag_piece = P4_PIECE_LUT[this.bag[0]];
    this.bag = this.bag.substr(1);
  }

  return this.current_bag_piece;
};

_p4d_proto.square_clicked = function(square) {
  var board = this.board_state.board;
  var mover = this.board_state.to_play;

  if (this.players[mover] == "computer") {
    p4_log("not your turn!");
    return;
  }
  var piece = board[square];
  let delay = 1000;

  if (this.can_drop(square) && this.start < 0) {
    this.move(-this.current_bag_piece, square);
    this.stop_moving_piece();
    window.setTimeout(() => {
      this.computer_move();
      window.setTimeout(() => {
        this.computer_move();
        this.start_moving_piece(-1);
      }, delay);
    }, delay);

    if (!this.next_bag_piece()) {
      this.players = ["computer", "computer"];
      this.next_move();
    }
  }
  return;

  if (this.start == square) {
    //clicked back on previously chosen piece -- putting it down again
    this.stop_moving_piece();
  } else if (piece && mover == (piece & 1)) {
    //clicked on player's colour, so it becomes start
    this.start_moving_piece(square);
  } else if (this.move(this.start, square)) {
    /*If the move works, drop the piece.*/
    this.stop_moving_piece(square);
  }
};

_p4d_proto.move = function(start, end, promotion) {
  var promotion = P4WN_PROMOTION_INTS[this.pawn_becomes];
  var state = this.board_state;

  if (state.to_play == 0) {
    this.current_turn++;
    this.set_status();
  }

  var move_result = state.move(start, end, promotion);
  if (move_result.ok) {
    this.display_move_text(state.moveno, move_result.string);
    this.refresh();
    if (!(move_result.flags & P4_MOVE_FLAG_MATE)) {
      this.next_move_timeout = window.setTimeout(
        (function(p4d) {
          return function() {
            p4d.next_move();
          };
        })(this),
        1
      );
    }
  } else {
    p4_log("bad move!", start, end);
  }
  for (var i = 0; i < this.move_listeners.length; i++) {
    this.move_listeners[i](move_result);
  }

  console.log(move_result);

  if (move_result.flags & P4_MOVE_FLAG_MATE)
    this.game_over = ["Black", "White"][state.to_play] + " wins";
  else if (move_result.flags & P4_MOVE_FLAG_MATE) this.game_over = "Draw";

  if (this.game_over) this.set_status(this.game_over);

  return move_result.ok;
};

_p4d_proto.next_move = function() {
  var mover = this.board_state.to_play;
  if (
    this.players[mover] == "computer" &&
    this.auto_play_timeout === undefined
  ) {
    var timeout = this.players[1 - mover] == "computer" ? 500 : 10;
    var p4d = this;
    this.auto_play_timeout = window.setTimeout(function() {
      p4d.computer_move();
    }, timeout);
  }
};

_p4d_proto.computer_move = function() {
  if (this.game_over) return;
  this.set_status("Thinking...");
  setTimeout(() => {
    this.auto_play_timeout = undefined;
    var state = this.board_state;
    var mv;
    var depth = this.computer_level + 1;
    var start_time = Date.now();
    mv = state.findmove(depth);
    var delta = Date.now() - start_time;
    p4_log("findmove took", delta);
    if (P4WN_ADAPTIVE_LEVELS && depth > 2) {
      var min_time = 25 * depth;
      while (delta < min_time) {
        depth++;
        mv = state.findmove(depth);
        delta = Date.now() - start_time;
        p4_log("retry at depth", depth, " total time:", delta);
      }
    }
    this.move(mv[0], mv[1]);
    this.set_status();
  }, 10);
};

_p4d_proto.display_move_text = function(moveno, string) {
  var mn;
  if ((moveno & 1) == 0 || string == "??") {
    mn = "    ";
  } else {
    mn = (moveno >> 1) + 1 + " ";
    while (mn.length < 4) mn = " " + mn;
  }

  this.log(
    mn + string,
    "p4wn-log-move",
    (function(p4d, n) {
      return function(e) {
        p4d.goto_move(n);
      };
    })(this, moveno)
  );
};

_p4d_proto.log = function(msg, klass, onclick) {
  if (!this.elements.log) return;
  var div = this.elements.log;
  var item = p4d_new_child(div, "div");
  item.className = klass;
  if (onclick !== undefined) _add_event_listener(item, "click", onclick);
  item.innerHTML = msg;
  div.scrollTop = 999999;
};

_p4d_proto.goto_move = function(n) {
  var delta;
  if (n < 0) delta = -n;
  else delta = this.board_state.moveno - n;
  if (delta > this.board_state.moveno) delta = this.board_state.moveno;
  var div = this.elements.log;
  for (var i = 0; i < delta; i++) {
    div.removeChild(div.lastChild);
  }
  this.board_state.jump_to_moveno(n);
  this.refresh();
  this.next_move();
};

//refresh: redraw screen from board

_p4d_proto.refresh = function() {
  if(this.game_over == "stopped")
    return;
  var pieces = this.elements.pieces;
  var board = this.board_state.board;
  for (var i = 20; i < 100; i++) {
    if (board[i] != P4_EDGE) {
      var j = this.orientation ? 119 - i : i;
      pieces[j].src = P4WN_IMAGE_DIR + "/" + P4WN_IMAGE_NAMES[board[i]];
    }
  }
  let bag0 = this.elements.bag[0];
  if (this.current_bag_piece)
    bag0.src = P4WN_IMAGE_DIR + "/" + P4WN_IMAGE_NAMES[this.current_bag_piece];
  else bag0.style.display = "none";
};

_p4d_proto.start_moving_piece = function(position) {
  if(this.game_over == "stopped")
    return;
  /*drop the currently held one, if any*/
  this.stop_moving_piece();
  var img =
    position >= 0
      ? this.elements.pieces[this.orientation ? 119 - position : position]
      : this.elements.bag[-1 - position];
  this.elements.moving_img = img;
  var old_msie = /MSIE [56]/.test(navigator.userAgent);
  img.style.position = old_msie ? "absolute" : "fixed";
  img.style.display = "block";
  var yoffset = parseInt(P4WN_SQUARE_HEIGHT / 2);
  if (window.event) {
    img.style.left = window.event.clientX + 1 + "px";
    img.style.top = window.event.clientY - yoffset + "px";
  }
  this.start = position;
  let updatePos = e => {
    lastMouseMove = e;
    img.style.left = e.clientX + 1 + "px";
    img.style.top = e.clientY - yoffset + "px";
  };
  if (lastMouseMove) {
    updatePos(lastMouseMove);
  }
  document.onmousemove = updatePos;
};

_p4d_proto.stop_moving_piece = function() {
  var img = this.elements.moving_img;
  if (img) {
    img.style.position = "static";
    img.style.left = "auto";
    img.style.top = "auto";
  }
  this.elements.bag[0].style.display = "none";
  this.elements.bag[0].style.top = "-100px";
  this.start = 0;
  this.elements.moving_img = undefined;
  document.onmousemove = e => (lastMouseMove = e);
};

function p4d_new_child(element, childtag, className) {
  var child = document.createElement(childtag);
  element.appendChild(child);
  if (className !== undefined) child.className = className;
  return child;
}

_p4d_proto.can_drop = function(n) {
  if (this.board_state.board[n]) return false;
  if (this.current_bag_piece == P4_PAWN) return n < 60 && n >= 30;
  if (this.current_bag_piece == P4_PAWN + 1) return n >= 60 && n < 90;
  if (this.current_bag_piece % 2) return n >= 60;
  else return n < 60;
};

_p4d_proto.write_board_html = function() {
  var div = this.elements.board;
  var pieces = (this.elements.pieces = []);
  var table = p4d_new_child(div, "table");
  var tbody = p4d_new_child(table, "tbody");
  for (var y = 9; y > 1; y--) {
    var tr = p4d_new_child(tbody, "tr");
    for (var x = 1; x < 9; x++) {
      var i = y * 10 + x;
      var td = p4d_new_child(tr, "td");
      if (x == 9) continue;
      td.className = (x + y) & 1 ? P4WN_BLACK_SQUARE : P4WN_WHITE_SQUARE;
      _add_event_listener(
        td,
        "click",
        (function(p4d, n) {
          return function(e) {
            p4d.square_clicked(p4d.orientation ? 119 - n : n);
          };
        })(this, i)
      );
      _add_event_listener(
        td,
        "mousemove",
        (n => e =>
          (document.body.style.cursor = this.can_drop(n)
            ? "default"
            : "not-allowed"))(i)
      );
      var img = p4d_new_child(td, "img");
      pieces[i] = img;
      img.src = P4WN_IMAGE_DIR + "/" + P4WN_IMAGE_NAMES[0];
      img.width = P4WN_SQUARE_WIDTH;
      img.height = P4WN_SQUARE_HEIGHT;
    }
  }

  var img = p4d_new_child(div, "img");
  this.elements.bag = [img];
  img.src = P4WN_IMAGE_DIR + "/" + P4WN_IMAGE_NAMES[2];
  img.width = P4WN_SQUARE_WIDTH;
  img.height = P4WN_SQUARE_HEIGHT;
  img.className = "bag";
};

_p4d_proto.refresh_buttons = function() {
  var rf = this.buttons.refreshers;
  for (var i = 0; i < rf.length; i++) {
    var x = rf[i];
    x[0].call(this, x[1]);
  }
};

_p4d_proto.maybe_rotate_board = function() {
  var p = this.players;
  if (p[0] != p[1] && P4WN_ROTATE_BOARD) {
    this.orientation = p[0] == "computer" ? 1 : 0;
    this.refresh();
  }
};

_p4d_proto.flip_player = function(i) {
  this.players[i] = this.players[i] == "human" ? "computer" : "human";
  this.refresh_buttons();
  this.maybe_rotate_board();
  this.next_move();
};
/*Button set up data. The *_wrap ones expect the display object and
 * return a this-agnostic function.
 * onclick_wrap()       -- makes a click handler.
 * move_listener_wrap() -- makes a function to be alerted to each move
 * refresh()            -- dynamic label, called in _p4d_proto context
 * label                -- static label
 * id                   -- button is known thus in this.elements
 * debug                -- only drawn if P4_DEBUG is true
 * hidden               -- created but not shown by default
 */
var P4WN_CONTROLS = [
  {
    /*white player */
    onclick_wrap: function(p4d) {
      return function(e) {
        p4d.flip_player(0);
      };
    },
    refresh: function(el) {
      var s = this.players[0];
      el.innerHTML =
        'white <img src="' +
        P4WN_IMAGE_DIR +
        "/" +
        s +
        '.png" alt="' +
        s +
        '">';
    }
  },
  {
    /*black player */
    onclick_wrap: function(p4d) {
      return function(e) {
        p4d.flip_player(1);
      };
    },
    refresh: function(el) {
      var s = this.players[1];
      el.innerHTML =
        'black <img src="' +
        P4WN_IMAGE_DIR +
        "/" +
        s +
        '.png" alt="' +
        s +
        '">';
    }
  },
  {
    /*swap sides */
    onclick_wrap: function(p4d) {
      return function(e) {
        var p = p4d.players;
        var tmp = p[0];
        p[0] = p[1];
        p[1] = tmp;
        if (p[0] != p[1] && P4WN_ROTATE_BOARD)
          p4d.orientation = 1 - p4d.orientation;

        p4d.refresh_buttons();
        p4d.maybe_rotate_board();
        p4d.next_move();
      };
    },
    refresh: function(el) {
      if (this.players[0] != this.players[1]) el.innerHTML = "<b>swap</b>";
      else el.innerHTML = "swap";
    }
  },
  {
    /* undo*/
    onclick_wrap: function(p4d) {
      return function(e) {
        p4d.goto_move(-3);
      };
    },
    label: "<b>undo</i>"
  },
  {
    /* pawn promotion*/
    onclick_wrap: function(p4d) {
      return function(e) {
        var x = (p4d.pawn_becomes + 1) % P4WN_PROMOTION_STRINGS.length;
        p4d.pawn_becomes = x;
        _event_target(e).innerHTML =
          "pawn promotes to <b>" + P4WN_PROMOTION_STRINGS[x] + "</b>";
      };
    },
    refresh: function(el) {
      el.innerHTML =
        "pawn promotes to <b>" +
        P4WN_PROMOTION_STRINGS[this.pawn_becomes] +
        "</b>";
    }
  },
  {
    /*computer level*/
    onclick_wrap: function(p4d) {
      return function(e) {
        var x = (p4d.computer_level + 1) % P4WN_LEVELS.length;
        p4d.computer_level = x;
        _event_target(e).innerHTML =
          "computer level: <b>" + P4WN_LEVELS[x] + "</b>";
      };
    },
    refresh: function(el) {
      el.innerHTML =
        "computer level: <b>" + P4WN_LEVELS[this.computer_level] + "</b>";
    }
  },
  {
    /*draw button -- hidden unless a draw is offered */
    id: "draw_button",
    label: "<b>Draw?</b>",
    onclick_wrap: function(p4d) {
      return function(e) {
        window.clearTimeout(p4d.next_move_timeout);
        window.clearTimeout(p4d.auto_play_timeout);
        p4d.refresh_buttons();
        p4d.log("DRAW");
        p4_log(p4_state2fen(p4d.board_state));
        p4d.auto_play_timeout = undefined;
        p4d.next_move_timeout = undefined;
      };
    },
    move_listener_wrap: function(p4d) {
      return function(move_result) {
        var draw_button = p4d.elements.draw_button;
        if (move_result.flags & P4_MOVE_FLAG_DRAW) {
          draw_button.style.display = "inline-block";
          if (p4d.draw_offered || p4d.draw_offers > 5) {
            draw_button.style.color = "#c00";
          }
          p4d.draw_offered = true;
          p4d.draw_offers++;
        } else {
          p4d.draw_offered = false;
          draw_button.style.color = "#000";
          draw_button.style.display = "none";
        }
      };
    },
    hidden: true
  }
];

_p4d_proto.write_controls_html = function(lut) {
  var div = this.elements.controls;
  if (!div) return;
  var buttons = this.buttons;
  for (var i = 0; i < lut.length; i++) {
    var o = lut[i];
    if (o.debug && !P4_DEBUG) continue;
    var span = p4d_new_child(div, "span");
    span.className = "p4wn-control-button";
    buttons.elements.push(span);
    _add_event_listener(span, "click", o.onclick_wrap(this));
    if (o.label) span.innerHTML = o.label;
    if (o.move_listener_wrap)
      this.move_listeners.push(o.move_listener_wrap(this));
    if (o.hidden) span.style.display = "none";
    if (o.refresh) buttons.refreshers.push([o.refresh, span]);
    if (o.id) this.elements[o.id] = span;
  }
  this.refresh_buttons();
};

function parse_query(query) {
  if (query === undefined) query = window.location.search.substring(1);
  if (!query) return [];
  var args = [];
  var re = /([^&=]+)=?([^&]*)/g;
  while (true) {
    var match = re.exec(query);
    if (match === null) break;
    args.push([
      decodeURIComponent(match[1].replace(/\+/g, " ")),
      decodeURIComponent(match[2].replace(/\+/g, " "))
    ]);
  }
  return args;
}

_p4d_proto.interpret_query_string = function() {
  /*XXX Query arguments are not all sanitised.
   */
  var attrs = {
    start: function(s) {
      p4_fen2state(s, this.board_state);
    },
    level: function(s) {
      this.computer_level = parseInt(s);
    },
    player: function(s) {
      var players = {
        white: ["human", "computer"],
        black: ["computer", "human"],
        both: ["human", "human"],
        neither: ["computer", "computer"]
      }[s.toLowerCase()];
      if (players !== undefined) {
        this.players = players;
        this.maybe_rotate_board();
      }
    },
    debug: function(s) {
      P4_DEBUG = parseInt(s);
    }
  };
  var i;
  var query = parse_query();
  for (i = 0; i < query.length; i++) {
    var p = query[i];
    var fn = attrs[p[0]];
    if (fn !== undefined && attrs.hasOwnProperty(p[0])) {
      fn.call(this, p[1]);
      this.refresh_buttons();
    }
  }
};

_p4d_proto.render_elements = function(square_height, square_width) {
  var e = this.elements;
  var board_height = 8 * (square_height + 3) + "px";
  e.inner.style.height = board_height;
  if (e.log) e.log.style.height = board_height;
  e.board.style.height = board_height;
  if (e.controls) e.controls.style.width = 11 * square_width + "px";
};

_p4d_proto.set_status = function(text) {
  if(this.game_over == "stopped")
    return
  this.ui.innerHTML = "Turn: " + this.current_turn + " " + (text || "");
};

function p4wnify(id) {
  var p4d = new P4wn_display(id);
  p4d.render_elements(P4WN_SQUARE_HEIGHT, P4WN_SQUARE_WIDTH);
  p4d.write_board_html();
  p4d.write_controls_html(P4WN_CONTROLS);
  //p4d.interpret_query_string();
  p4_fen2state(p4d.mode.board, p4d.board_state);
  p4d.next_bag_piece();
  p4d.refresh();
  p4d.start_moving_piece(-1);
  p4d.next_move();  
  console.log(p4d);
  return p4d;
}

populateMenu();

P4wn_display.prototype = _p4d_proto;
