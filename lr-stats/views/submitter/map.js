function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;
    
    // !code lib/utils.js
    
    if(doc.identity.submitter && doc.node_timestamp) {
        emit([doc.identity.submitter, convertDateToMillis(doc.node_timestamp.substring(0,10))], null);
    }
}