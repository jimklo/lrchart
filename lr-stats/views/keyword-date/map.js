function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;

    // !code lib/utils.js
    
    var date_stamp = convertDateToMillis(doc.node_timestamp.substring(0,10));

    var history = {};
    for each(var key in doc.keys) {
        var cleanKey = key.toLowerCase();
        cleanKey = cleanKey.replace(/^\s+/, "");
        cleanKey = cleanKey.replace(/\s+$/, "");
        if (!history[cleanKey]) {
            emit([date_stamp,cleanKey], null);
            history[cleanKey] = true;
        }
    }
}