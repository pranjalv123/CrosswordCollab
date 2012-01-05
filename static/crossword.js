init ();
zerostr = "\n";

function registerFfi(name, val, argc) {
    window[name] = 
        function() {
            var f = val;
            for (var i = 0; i < argc; i++) {
                f = execF(f, arguments[i]);
            }
            execF(f, 0);
        };
}

function word(x, y, dir) {
    var w = new Object();
    w.x = x;
    w.y = y;
    w.dir = dir;
    return w;
}

function letter(x, y, c) {
    var l = new Object();
    l.x = x;
    l.y = y;
    l.c = c;
    return l;
}

function switchMode() {
    var b = document.getElementById("modeSelect");
    if (inputMode == "letter") {
        inputMode = "black";
        b.innerHTML = "Done adding black squares";
    } else {
        inputMode = "letter";
        b.innerHTML = "Add black squares";
    }
}

function init() {
    document.write("<canvas id=\"crossword\" width=\"500\" height=\"500\"></canvas>");
    document.write("<button id=\"modeSelect\" onclick=\"switchMode()\"></button>");
    inputMode = "letter";
    cursor = new Object();
    cursor.x = 0;
    cursor.y = 0;
    cursor.dir = "across";
    switchMode();
    var canvas = document.getElementById("crossword");
    canvas.addEventListener('click', ev_click, false);
    document.addEventListener('keydown', ev_keydown, false);
    grid = undefined;
    lastKeyTime = 0;
    localgrid = new Array();
}

function listToArray(ls) {
    var ar = [];
    while(ls) {
        ar.push(ls._1);
        ls = ls._2;
    }
    return ar;
}

function advanceCursor () {
    var x = cursor.x;
    var y = cursor.y;
    if (cursor.dir == "across") {
        x++;
        if (x == size_x) {
            x = 0; 
            y = (y + 1) % size_y;
        }
    }
    else if (cursor.dir == "down") {
        y++;
        if (y == size_y) {
            y = 0; 
            x = (x + 1) % size_x;
        }
    }
    cursor.x = x;
    cursor.y = y;
    if (grid[x][y] == zerostr) {
        advanceCursor();
    }

}

function showCursor() {
    if (grid == undefined) {
        return;
    } 
    redraw();
    var x = cursor.x;
    var y = cursor.y;
    ctx.fillStyle = "rgba(0, 0, 255, 0.25)";
    while (x < size_x && y < size_y && grid[x][y] != zerostr) {
        ctx.fillRect(x*cellsize, y*cellsize, cellsize, cellsize);
        ctx.fillStyle = "rgba(255, 255, 0, 0.25)";        
        if (cursor.dir == "across") {x++;}
        if (cursor.dir == "down") {y++;}
    }
    x = cursor.x;
    y = cursor.y;
    ctx.fillStyle = "rgba(255, 255, 0, 0)";        
    while (x >= 0 && y >= 0 && grid[x][y] != zerostr) {
        ctx.fillRect(x*cellsize, y*cellsize, cellsize, cellsize);
        ctx.fillStyle = "rgba(255, 255, 0, 0.25)";        
        if (cursor.dir == "across") {x--;}
        if (cursor.dir == "down") {y--;}
    }
}

function ev_click(ev) {
    var x = Math.floor(ev.offsetX/cellsize);
    var y = Math.floor(ev.offsetY/cellsize);
    console.log(x + " " + y);
    if (inputMode == "black") {
        addblack(x, y);
    } else if (inputMode == "letter") {
        if (cursor.x == x && cursor.y == y) {
            if (cursor.dir=="across") {cursor.dir="down";} 
            else {cursor.dir="across";}
        } else {
            cursor.x = x;
            cursor.y = y;
        }
        showCursor();
    }
}



function ev_keydown (ev) {
    if (inputMode == "letter") {
        if (isAlpha(String.fromCharCode(ev.keyCode))){
            var d = new Date();          
            addletter(cursor.x, cursor.y, String.fromCharCode(ev.keyCode));
            localgrid[cursor.x][cursor.y] = new Object();
            localgrid[cursor.x][cursor.y].chr = String.fromCharCode(ev.keyCode);
            localgrid[cursor.x][cursor.y].time = d.getTime();
            advanceCursor();
            drawAll();
        }
        if (ev.keyCode == 9) { //tab
            if (cursor.dir == "across") {
                do {
                    x = cursor.x;
                    y = cursor.y;
                    advanceCursor();
                } while ((cursor.x - x) == 1 && y == cursor.y) 
            }
            if (cursor.dir == "down") {
                do {
                    x = cursor.x;
                    y = cursor.y;
                    advanceCursor();
                } while ((cursor.y - y) == 1 && x == cursor.x) 
            }
            showCursor();
        }
    }
}

function remakeLocal(x, y) {
    localgrid.length = x;
    for (var i = 0; i < x; i++) {
        localgrid[i] = new Array();
        localgrid[i].length = y;
    }
}

function genGrid(x, y, filled) {
    var grid = new Array();
    var nums = new Array();
    grid.length = x;
    nums.length = x;
    if (localgrid == undefined || localgrid.length != x) {
        remakeLocal(x, y);
    }
    console.log(filled);
    for (var i = 0; i < x; i++) {
        grid[i] = new Array();
        grid[i].length = y;
        nums[i] = new Array();
        nums[i].length = y;
    }
    for (var i = 0; i < filled.length; i++) {
        grid[filled[i][0]][filled[i][1]] = filled[i][2];
    }

    var n = 0;
    for(var j = 0; j < y; j++) {
        for(var i = 0; i < x; i++) {
            if (grid[i][j] == undefined) {
                grid[i][j] = " ";
            }
            if (grid[i][j] != zerostr) {
                nums[i][j] = " ";
                if (i == 0 || j == 0 || grid[i-1][j] == zerostr || grid[i][j-1] == zerostr) {
                    nums[i][j] = Number(n).toString();
                    n++;
                }
            }
        }
    }
    var ret = new Object();
    ret.grid = grid;
    ret.nums = nums;
    return ret;
}

function tupleToArray(t) {
    var r = new Array();
    r.push(t._1);
    r.push(t._2);
    r.push(t._3);
    return r;
}

function uw_draw(x, y, filled) {
    console.log(filled);
    return draw(x, y, listToArray(filled).map(tupleToArray));
}

function redraw() {
    ctx.font= "10pt Arial";
    ctx.fillStyle = "#000";
    ctx.textBaseline = "top";
    for (var i = 0; i < size_x; i++) {
        for (var j = 0; j < size_y; j++) {                
            ctx.clearRect(cellsize*i, cellsize*j, cellsize, cellsize);
            if (grid[i][j] == zerostr) {
                ctx.fillRect(cellsize*i, cellsize*j, cellsize, cellsize);
            } else {
                ctx.strokeRect(cellsize*i, cellsize*j, cellsize, cellsize);
                ctx.font= "20pt Arial";
                var d = new Date();
                if (localgrid[i][j] != undefined && d.getTime() - localgrid[i][j].time < 5000) {
                    ctx.fillText(localgrid[i][j].chr, cellsize*i+5, cellsize*j);
                } else {
                    ctx.fillText(grid[i][j], cellsize*i+5, cellsize*j);
                }
                if(nums[i][j]) {
                    ctx.font= "10pt Arial";
                    ctx.fillText(nums[i][j], cellsize*i+1, cellsize*j);
                }
            }
        }
    }
}
function drawAll() {
    showCursor ();
}

function draw(x, y, filled) {
    cellsize = 30;
    canvas = document.getElementById("crossword");
    size_x = x;
    size_y = y;
    gridnums = genGrid(x, y, filled);
    nums = gridnums.nums;
    grid = gridnums.grid;
    console.log(grid);
    canvas.setAttribute('width', cellsize*x);
    canvas.setAttribute('height', cellsize*y);
    if(canvas.getContext){
        ctx = canvas.getContext('2d');
        drawAll();
    }
}