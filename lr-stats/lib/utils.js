function convertDateToSeconds(timestamp){
    return Math.floor(Date.parse(timestamp)/1000);
}
function convertDateToMillis(timestamp){
    return Date.parse(timestamp);
}