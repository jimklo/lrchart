function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;
    
    // !code lib/utils.js
    
    var date_stamp = convertDateToMillis(doc.node_timestamp.substring(0,10));
    var history = {};
    for each(var schema in doc.payload_schema) {
        var clean_schema = schema.toLowerCase().trim();
        if (!history[clean_schema]) {
            emit([clean_schema, date_stamp], null);
            history[clean_schema] = true;
        }
    }
}