function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;
    
    var date_stamp = doc.node_timestamp;
    date_stamp = date_stamp.substring(0,10);

    for each(var key in doc.keys) {
        var cleanKey = key.toLowerCase();
        cleanKey = cleanKey.replace(/^\s+/, "");
        cleanKey = cleanKey.replace(/\s+$/, "");
        emit([cleanKey, date_stamp], 1);
    }
}