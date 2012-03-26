function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;
    
    var date_stamp = doc.node_timestamp;
    date_stamp = date_stamp.substring(0,10);

    for each(var schema in doc.payload_schema) {
        emit([schema.toLowerCase(), date_stamp], 1);
    }
}