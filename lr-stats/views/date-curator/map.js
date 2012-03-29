function(doc) {

    if (doc.doc_type != "resource_data" || !doc.node_timestamp) return;
    
    // !code lib/utils.js
        
    if(doc.identity.curator && doc.node_timestamp) {
        emit([convertDateToMillis(doc.node_timestamp.substring(0,10)),doc.identity.curator], null);
    }
}