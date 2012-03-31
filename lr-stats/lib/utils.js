function convertDateToSeconds(timestamp){
    return Math.floor(Date.parse(timestamp)/1000);
}
function convertDateToMillis(timestamp){
    return Date.parse(timestamp);
}

Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
}

Date.prototype.getUTCWeek = function() {
    var onejan = new Date(this.getUTCFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getUTCDay()+1)/7);
}

Date.prototype.getYearWeek = function() {
    return (this.getFullYear() * 100) + this.getWeek();
}

Date.prototype.getYearMonth = function() {
    return (this.getFullYear() * 100) + this.getMonth() + 1;
}