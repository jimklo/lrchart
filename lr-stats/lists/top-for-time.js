function(head, req) {
    var top_vals = [];
    var top = {};
    var min = -1;
    var now = (new Date()).getTime();
    var MILLIS_PER_DAY = 86400000;

    // keys for this query are intended to be [time, millis]
    var limit = (req.query.top_limit)? req.query.top_limit : 10;

    var isDateCode = (req.query.datecode) ? req.query.datecode : false;

    var exclude = [];

    function parseRegexList(list) {
        if (Object.prototype.toString.apply(list) === "[object Array]") {

        }

    }

    try {
        if (req.query["exclude"]) {
            var parsed = JSON.parse(req.query.exclude);
            if (Object.prototype.toString.apply(parsed) === "[object Array]") {
                for (var i=0; i<parsed.length; i++) {
                    if (Object.prototype.toString.apply(parsed[i]) === "[object Array]") {
                        if (parsed[i].length === 2) {
                            exclude.push(new RegExp(parsed[i][0], parsed[i][1]));
                        } else if (parsed[i].length === 1) {
                            exclude.push(RegExp(parsed[i][0]));
                        }
                    } else if (Object.prototype.toString.apply(parsed[i]) === "[object String]") {
                        exclude.push(RegExp(parsed[i]));
                    }
                }
            }            
        }
    } catch (e) {
        send(JSON.stringify({ error: e}));
        return;
    }




    var default_age = 0,
        start_date = 0,
        end_date = now;

    if (req.query.endkey && Object.prototype.toString.apply(req.query.endkey) === "[object Array]") {
        if (Object.prototype.toString.apply(req.query.endkey[0]) === "[object Number]") {
            end_date = req.query.endkey[0];
        }
    }

    if (req.query.startkey && Object.prototype.toString.apply(req.query.startkey) === "[object Array]") {
        if (Object.prototype.toString.apply(req.query.startkey[0]) === "[object Number]") {
            start_date = req.query.startkey[0];
        }
    }

    if (start_date != end_date) {
        send(JSON.stringify({error: "keys are in [time, term] format and startkey[0] === endkey[0]!", start: start_date, end: end_date, head: head, req: req}));
        return;
    }

    // should be an average age when group_level is < 2...
    if (!isDateCode) {
        default_age = now - (start_date/2);
    }

    function compareRows(row1, row2) {
        return row1.value - row2.value;
    }

    function revSort(a, b) {
        return b-a;
    }

    function excludeTerm(term) {
        for (var i=0; i < exclude.length; i++) {
            if (exclude[i].test(term)) {
                return true;
            }
        }
        return false;
    }

    function excludeKey(row1) {
        if (row1.key.length >= 2) {
            return excludeTerm(row1.key[1]);
        } else {
            return false;
        }
    }


    // function addAge(row1) {
    //     try {
    //         row1.age = (new Date(row1.key[0])).getTime();
    //         if (row1.age === undefined) {
    //             log("row1.age: "+ row1.age);
    //             row1.age = (new Date(row1.key[1])).getTime();
    //         }

    //         if (row1.age !== undefined) {
    //             row1.age = (now - row1.age) / MILLIS_PER_DAY;
    //         }
    //         else {
    //             log("using default_age"+ row1.age);
    //             row1.age = default_age;
    //         }
    //     } catch(e) {
    //         log("age issue:"+e);
    //         row1.age = default_age;
    //     }
    // }

    function collateTop(row1) {

        if (row1.value >= min) {
            // this isn't currently in our top
            if (!top[row1.value.toString()]) {
                top_vals.push(row1.value);
                top_vals = top_vals.sort(revSort);

                // if the value we just put in is last and causes us to exceed the limit
                // we need to remove the last one.
                if (top_vals.length > limit) {

                    // if the last element is not the same as current row
                    // then we need to delete it from top.
                    if (top_vals[top_vals.length-1] !== row1.value) {
                        delete top[top_vals[top_vals.length-1]];
                    }

                    // delete the last item so we stay within limits
                    top_vals = top_vals.slice(0, limit-1);

                    // new min value
                    min = top_vals[top_vals.length-1];
                }

                // addAge(row1);
                top[row1.value.toString()] = [row1];
            // currently is a top value, so just add it to the list.
            } else {
                // addAge(row1);
                top[row1.value.toString()].push(row1);
            }

        }
    }

    var row;
    while( row = getRow()) {
        if (!excludeKey(row)){
            collateTop(row);
        }
    }  



    // log(JSON.stringify(top_vals));
    // log(JSON.stringify(top));
    send('{"rows":[');
    try {
        var first = true;
        for (var i=0; i<top_vals.length; i++) {
            var val = top_vals[i].toString();
            var val_set = top[val];
            for (var j=0; j < val_set.length; j++) {
                var prefix = (first)?"":",";
                if (first) {
                    first = false;
                }
                send(prefix);
                val_set[j].age = default_age;
                send(JSON.stringify(val_set[j]));
            }
        }
    } catch (error) {
        log("error:"+error);
        send(JSON.stringify({"error": error}));
    }

    send('],');
    send('"req":'+JSON.stringify(req)+",");
    send('"head":'+JSON.stringify(head));
    send('}');
}