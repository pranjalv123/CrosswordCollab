table channels : {Client : client, Grid : int, 
                  Data : channel (list (int * int * string)),
                  Chat : channel (string*string)}

table crosswords : {Id : int, Height : int, Width : int}
                  PRIMARY KEY Id
table letter : {Grid : int, X : int, Y : int, L : string}

val zerostr = str1 (chr 10) (*newline*)

fun getGridId () = 
    me <- self;
    r <- oneRow (SELECT channels.Grid FROM channels WHERE channels.Client = {[me]});
    return r.Channels.Grid

fun getDataChannel () = 
    me <- self;
    r <- oneRow (SELECT channels.Data FROM channels WHERE channels.Client = {[me]});
    return r.Channels.Data

fun getChatChannel () =
    me <- self;
    r <- oneRow (SELECT channels.Chat FROM channels WHERE channels.Client = {[me]});
    return r.Channels.Chat

fun sendMulti channels data = 
    case channels of
        [] => return ()
      | x :: channels' => send x data; sendMulti channels' data

fun getSquares () : transaction  (list (int * int * string)) = 
    let 
        fun letToList l = (l.Letter.X, l.Letter.Y, l.Letter.L)
    in
        id <- getGridId ();
        raw <- queryL (SELECT * FROM letter WHERE Letter.Grid={[id]});
        return (List.mp letToList raw)
    end

fun sendSquares l =
    let
        fun extractChannels rows =
            List.mp (fn x => x.Channels.Data) rows
    in
        id <- getGridId ();
        rl <- queryL (SELECT channels.Data FROM channels
                                              WHERE channels.Grid = {[id]});
        sendMulti (extractChannels rl) l
    end

fun redraw () = 
    g <- getSquares ();
    Monad.ignore (sendSquares g)


fun addBlack (x:int) (y:int) = 
    id <- getGridId ();
    let 
        fun inserter f = 
            if f then
                black <- hasRows (SELECT * FROM letter 
                                           WHERE letter.Grid = {[id]}
                                             AND letter.X = {[x]} 
                                             AND letter.Y = {[y]} AND letter.L = {[zerostr]});
                if black then
                    dml(UPDATE letter SET L = ' ' 
                    WHERE Grid = {[id]} AND X={[x]} AND Y={[y]});
                    Monad.ignore (return (naughtyDebug "1"))
                else 
                    dml(UPDATE letter SET L = {[zerostr]}
                    WHERE Grid = {[id]} AND X={[x]} AND Y={[y]});
                    Monad.ignore (return (naughtyDebug "2"))
            else 
                dml(INSERT INTO letter (Grid, X, Y, L) VALUES ({[id]}, {[x]}, {[y]}, {[zerostr]}));
                Monad.ignore (return (naughtyDebug "3"))
    in
        filled <- hasRows (SELECT * FROM letter 
                                    WHERE letter.Grid = {[id]} 
                                      AND letter.X = {[x]} AND letter.Y = {[y]});
        inserter filled;
        redraw ()
    end

fun addBlack_client x y = 
    rpc (addBlack x y)

fun addLetter x y l = 
    id <- getGridId ();
    let 
        fun inserter f = 
            if f then
                dml (UPDATE letter SET L = {[l]} WHERE Grid = {[id]} AND X={[x]} AND Y={[y]})
            else
                dml(INSERT INTO letter (Grid, X, Y, L) VALUES ({[id]}, {[x]}, {[y]}, {[l]}))
    in
        filled <- hasRows (SELECT * FROM letter 
                                    WHERE letter.Grid = {[id]} 
                                      AND letter.X = {[x]} AND letter.Y = {[y]});
        inserter filled;
        redraw ()
    end
        
fun addLetter_client x y l = 
    rpc (addLetter x y l)

fun runjs () = 
    JsFfi.registerFfi "addblack" addBlack_client 2;
    JsFfi.registerFfi2 "addletter" addLetter_client 3

fun crossword () = 
    ch <- getDataChannel ();
    id <- (getGridId ());
    grid <- oneRow (SELECT * FROM crosswords WHERE Crosswords.Id = {[id]});
    let 
        fun receiver () = 
            l <- recv ch;
            JsFfi.draw grid.Crosswords.Height grid.Crosswords.Width l;
            receiver ()
    in
        return 
            <xml> 
              <body onload={runjs (); 
                            spawn (receiver ());
                            rpc (redraw ()) }>
                <p>Use this ID to invite collaborators: {[id]}</p>
              </body>
            </xml>
    end



fun genUniqueId () = 
    r <- rand;
    id <- return (r % 1000000);
(*    exists <- hasRows (SELECT * FROM crosswords WHERE crosswords.Id = {[id]});
    if exists then return id else genUniqueId ()*)
    return id

fun newCrossword r = 
    id <- genUniqueId ();
    me <- self;
    data <- channel;
    chat <- channel;
    dml (INSERT INTO crosswords (Id, Height, Width) 
         VALUES ({[id]}, {[readError r.Height]}, {[readError r.Width]}));
    dml (INSERT INTO channels (Client, Grid, Data, Chat) 
         VALUES ({[me]}, {[id]}, {[data]}, {[chat]}));
    crossword ()

fun loadCrossword r =
    me <- self;
    data <- channel;
    chat <- channel;
    dml (INSERT INTO channels (Client, Grid, Data, Chat) 
         VALUES ({[me]}, {[readError r.Id]}, {[data]}, {[chat]}));
    crossword ()
    

fun main x = 
    return 
        <xml>
          <head>
            <title>
              Crossword Editor
            </title>
          </head>
          <body>  
            Start a new puzzle:
            <form>
              Width: <textbox {#Width}/>
              Height: <textbox {#Height}/>
              <submit action={newCrossword}/>
            </form>
            Find a puzzle by ID:
            <form>
              <textbox {#Id}/>
              <submit action={loadCrossword}/>
            </form>
          </body>
        </xml>
