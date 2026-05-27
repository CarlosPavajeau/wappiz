BEGIN { in_table = 0; in_type = 0; n = 0; table = ""; type_file = dir "/000_types.sql" }

{ sub(/-->.*$/, "") }          # strip inline breakpoint markers
/^[[:space:]]*$/ { next }      # skip blank lines

/^CREATE TYPE "/ {
    print $0 >> type_file
    if ($0 !~ /;[[:space:]]*$/) in_type = 1
    next
}

in_type {
    print $0 >> type_file
    if (/;[[:space:]]*$/) {
        print "" >> type_file
        in_type = 0
    }
    next
}

/^CREATE TABLE "/ {
    s = $0; sub(/^CREATE TABLE "/, "", s); sub(/".*$/, "", s)
    table = s; n = 0; lines[++n] = $0; in_table = 1; next
}

in_table {
    lines[++n] = $0
    if (/^\);/) {
        f = dir "/" table ".sql"
        for (i = 1; i <= n; i++) print lines[i] > f
        print "" > f
        n = 0; in_table = 0; table = ""
    }
    next
}

/^ALTER TABLE "/ {
    s = $0; sub(/^ALTER TABLE "/, "", s); sub(/".*$/, "", s)
    if (s != "") print $0 >> (dir "/" s ".sql")
    next
}

/^CREATE.*INDEX.*ON "/ {
    s = $0; sub(/.*ON "/, "", s); sub(/".*$/, "", s)
    if (s != "") print $0 >> (dir "/" s ".sql")
    next
}
