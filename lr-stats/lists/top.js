function(head, req) {
    var top_vals = [];
    var top = {};
    var min = -1;
    var now = (new Date()).getTime();
    var MILLIS_PER_DAY = 86400000;

    var limit = (req.query.top_limit)? req.query.top_limit : 10;
    
    var default_age = 0,
        start_date = 0,
        end_date = now;

    if (req.query.endkey && Object.prototype.toString.apply(req.query.endkey) === "[Object Array]") {
        if (Object.prototype.toString.apply(req.query.endkey[1]) === "[Object Number]") {
            end_date = req.query.endkey[1];
        }
    }

    if (req.query.startkey && Object.prototype.toString.apply(req.query.startkey) === "[Object Array]") {
        if (Object.prototype.toString.apply(req.query.startkey[1]) === "[Object Number]") {
            start_date = req.query.startkey[1];
        }
    }

    // should be an average age when group_level is < 2...
    default_age = now - ((start_date + end_date)/2);

    function compareRows(row1, row2) {
        return row1.value - row2.value;
    }

    function revSort(a, b) {
        return b-a;
    }

    function addAge(row1) {
        try {
            row1.age = (new Date(row1.key[0])).getTime();
            if (row1.age === undefined) {
                log("row1.age: "+ row1.age);
                row1.age = (new Date(row1.key[1])).getTime();
            }

            if (row1.age !== undefined) {
                row1.age = (now - row1.age) / MILLIS_PER_DAY;
            }
            else {
                log("using default_age"+ row1.age);
                row1.age = default_age;
            }
        } catch(e) {
            log("age issue:"+e);
            row1.age = default_age;
        }
    }

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

                addAge(row1);
                top[row1.value.toString()] = [row1];
            // currently is a top value, so just add it to the list.
            } else {
                addAge(row1);
                top[row1.value.toString()].push(row1);
            }

        }
    }

    var row;
    while( row = getRow()) {
        collateTop(row);
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