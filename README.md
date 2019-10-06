# white-starts-with-nothing
Ludum Dare 45 entry. Chess where White side starts with no pieces.

Game is played by usual chess rules, but White start without any pieces. 

Instead, each turn you drop one piece (starting with White King) on any empty square of white half of the board. Pawns can't be dropped on the first row. 

Dropping pieces is the only thing that you can do, because moves for both sides are made automatically by AI.

Goal is, naturally, for White to win, preferably fast.

There are several scenarios, differing by starting position and how dropped pieces are selected.

Based on https://github.com/douglasbagnall/p4wn chess engine.