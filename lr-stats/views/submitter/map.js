function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;
    
    if(doc.identity.submitter && doc.node_timestamp) {
        emit([doc.identity.submitter, doc.node_timestamp.substring(0,10)], 1);
    }
}