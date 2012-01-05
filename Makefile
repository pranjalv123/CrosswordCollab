URWEB = urweb
DBNAME = crossword.db
SQLFILE = crossword.sql
PROJNAME = crossword

all:
	$(URWEB) -dbms sqlite -db $(DBNAME) crossword
debug:
	$(URWEB) -debug -dbms sqlite -db $(DBNAME) crossword
database:
	rm $(DBNAME); sqlite3 $(DBNAME) < $(SQLFILE)
typecheck:
	$(URWEB) -tc -dbms sqlite -db $(DBNAME) crossword
timing:
	$(URWEB) -timing -dbms sqlite -db $(DBNAME) crossword