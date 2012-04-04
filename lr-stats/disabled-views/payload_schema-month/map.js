function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;
    
    // !code lib/utils.js
    
    var date_stamp = new Date(doc.node_timestamp.substring(0,10)).getYearMonth();
    var history = {};
    for each(var schema in doc.payload_schema) {
        var clean_schema = schema.toLowerCase().trim();
        if (!history[clean_schema]) {
            emit([date_stamp,clean_schema], 1);
            history[clean_schema] = true;
        }
    }
}