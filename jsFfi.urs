val init: unit -> transaction unit
val draw: int -> int -> list (int * int * string) -> transaction unit
val registerFfi: string -> (int -> int -> transaction unit) -> int -> transaction unit
val registerFfi2: string -> (int -> int -> string -> transaction unit) -> int -> transaction unit
