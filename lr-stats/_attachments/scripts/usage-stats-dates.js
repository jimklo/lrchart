//Count by schema format. Count total. Count by creator. Count by submitter. Count by keyword.
(function($) {
	var dataTables = {};
	var services = [{svc:'submitter', x: 1200, y: 1000}, {svc:'payload_schema', x: 1200, y: 1000}, {svc:'curator', x: 1200, y: 1000}, {svc:'keyword', x: 1200, y: 3000}]; //, 'keyword'];
	//var services = ['keyword'];//, 'keyword'];
	var resultCount = 0;
	var NODE_URL = "http://learnreg1.sri.com:5984";
	var NODE_DB = "resource_data_only";

	// var NODE_URL = "http://localhost:5984";
	// var NODE_DB = "resource_data_new";

	var NODE_DDOC = "lr-stats";

	var ajaxPool = [];

	var charts = {};
	var options = {};
	var MAX_ROWS = 15;
	var MAX_WEEKS = 25;
	var MILLIS_PER_DAY = 86400000;
	google.load("visualization", "1", {
		packages: ["corechart", "treemap"]
	});

	google.setOnLoadCallback(initTreeMap);

	Date.prototype.getWeek = function() {
	    var onejan = new Date(this.getFullYear(),0,1);
	    return Math.ceil((((this - onejan) / MILLIS_PER_DAY) + onejan.getDay()+1)/7);
	}

	Date.prototype.getYearWeek = function() {
	    return (this.getFullYear() * 100) + this.getWeek();
	}

	Date.prototype.getYearMonth = function() {
	    return (this.getFullYear() * 100) + this.getMonth() + 1;
	}

	function debug2(msg) {
		$('#debug2').html(msg + "<br>");
	}

	function debug(msg) {
		$('#debug').append(msg + "<br>");

	}
	function initTreeMap() {
		if (NODE_URL) {
			$.couch.urlPrefix = NODE_URL;
		}
		$.couch.defaultAjaxOpts = {
			dataType: 'jsonp',
			jsonp: 'callback'
		};

		$.each(services, function(index, servInfo) {
			var service = servInfo.svc;
			options[service] = {
				title: 'Learning Registry Usage Stats - ' + service,
				headerHeight: 15,
				fontColor: 'black',
				showScale: true,
				minColorValue: 1,
				minColor: "#AED0F2",
				maxColor: "#F00"

			};
			dataTables[service] = new google.visualization.DataTable();
			dataTables[service].addColumn('string', 'Term');
			dataTables[service].addColumn('string', 'Range');
			dataTables[service].addColumn('number', 'Total');
			dataTables[service].addColumn('number', 'Frequency');

			var div_name = 'chart-' + service;
			var div_status = 'status-' + service;
			$('#charts').append('<div id="'+service+'_box" class="chart_box"><div id="'+div_status+'" class="status">Updating!</div><div id="' + div_name + '" class="treeMap"></div><div class="info"></div><div class="clear"/></div>');
			charts[service] = new google.visualization.TreeMap(document.getElementById(div_name));
			drawChart(service);


			google.visualization.events.addListener(charts[service], 'onmouseover', function(rowIndex) {
				// console.log(JSON.stringify(rowIndex));
				var term = dataTables[service].getValue(rowIndex.row, 0);
				var count = dataTables[service].getValue(rowIndex.row, 2);
				// console.log(term + ": "+ count);
				$('#'+service+'_box div.info').html('<b>'+term+'</b><br/>Count: '+count);
				options[service].title = service+': '+term+' - count: '+count;
				// console.log(JSON.stringify(dataTables[service].getRowProperties(rowIndex.row)));
				// console.log($('#'+service+'_box div.info').html());
			});


			google.visualization.events.addListener(charts[service], 'onmouseout', function(rowIndex) {
				$('#'+service+'_box div.info').html('');
				options[service].title = 'Learning Registry Usage Stats - ' + service;
				// console.log("tooltip off");
			});
			startLoadingData(service);
		});
	}


	// function init() {
	// 	$.couch.urlPrefix = NODE_URL;
	// 	$.couch.defaultAjaxOpts = {
	// 		dataType: 'jsonp',
	// 		jsonp: 'callback'
	// 	};
	// 	$.each(services, function(index, servInfo) {
	// 		var service = servInfo.svc;
	// 		options[service] = {
	// 			width: servInfo.x,
	// 			height: servInfo.y,
	// 			title: 'Learning Registry Usage Stats - ' + service,
	// 			vAxis: {
	// 				title: 'Term',
	// 				titleTextStyle: {
	// 					color: 'red'
	// 				}
	// 			},
	// 			hAxis: {
	// 				logScale:true
	// 			},
	// 			legend: {
	// 				position: 'none'
	// 			}
	// 		};
	// 		dataTables[service] = new google.visualization.DataTable();
	// 		dataTables[service].addColumn('string', 'Term');
			
	// 		var dateToday = new Date();
	// 		var today = $.date();
	// 		var form = "yyyy-MM-dd";

	// 		var weekOf = today.adjust("D", -dateToday.getDay());
	// 		var weekEnding = weekOf.clone().adjust("D", 6);


	// 		for (var i=0; i<MAX_WEEKS; i++) {
	// 			var mesg = " weeks ago";
	// 			if (i===0) {
	// 				mesg = "This week";
	// 			} else if (i===1) {
	// 				mesg = "1 week ago";
	// 			} else {
	// 				mesg = i + mesg;
	// 			}

	// 			dataTables[service].addColumn('number', weekOf.format(form) + " - "+ weekEnding.format(form));
	// 			weekOf.adjust("D", -7);
	// 			weekEnding.adjust("D", -7);
	// 		}
			
	// 		var div_name = 'chart-' + service;
	// 		var div_status = 'status-' + service;
	// 		$('#charts').append('<div id="'+div_status+'">Updating!</div><div id="' + div_name + '"></div>');
	// 		charts[service] = new google.visualization.BarChart(document.getElementById(div_name));
	// 		drawChart(service);
	// 		startLoadingData(service);
	// 	});
	// }


	function getView(name) {
		return NODE_DDOC + "/" + name;
	}

	function getList(name) {
		return NODE_DDOC + "/" + name;
	}

	function startLoadingData(service) {
		// callStats(service);
		// buildDateBins(service);
		buildTreeMap(service);
	}

	// http://127.0.0.1:5984/resource_data/_design/lrstats-payload_schema/_view/docs?reduce=true&group=true&group_level=2
	/*
 * 
 * http://127.0.0.1:5984/resource_data/_design/lrstats-payload_schema/_view/docs?startkey=[%22lom%22,%222011-10-27%22]&endkey=[%22lom%22,%222012-01-03%22]
 * {"rows":[
{"key":null,"value":20393}
]}

http://127.0.0.1:5984/resource_data/_design/lrstats-payload_schema/_view/docs?startkey=[%22lom%22,%222011-10-27%22]&endkey=[%22lom%22,%222012-01-02%22]
 * 
 * 
 * 
 */

function buildTreeMap(service) {
		var treeMapData = {};  // { term: { total: xx, range: [date, value] } } 


		var resultCount = 0;

		// var dateBins = [];
		var form = "yyyy-MM-dd";
		var today = $.date();
		var todaysDate =  new Date(today.format(form));
		var todaysYearWeek = todaysDate.getYearWeek();

		var weekStart = today.clone().adjust("D", -(todaysDate.getDay()+1));
		var weekEnding = today.clone().adjust("D", 5-todaysDate.getDay());


		var endKey, startKey;


		////
		// Make it call every day for each day... and then redraw
		// the chart at the end of computation of each day...
		// this should make this thing appear faster....
		var num = MAX_WEEKS,
			numCompleted = MAX_WEEKS,
			columnCount = MAX_WEEKS;

		for (var i=0; i<num; i++) {
			// var dateBins = [
			// 	convertDateToMillis(today.format(form)),					// today
			// 	convertDateToMillis(today.adjust("D", -1).format(form))
			// ]
			var curDate = new Date(today.format(form));
			var yearWeek = curDate.getYearWeek();
			today.adjust("D", -7);
			startKey = [yearWeek];
			endKey = [yearWeek,{}];

			var range = weekStart.format(form) + " - "+ weekEnding.format(form);
			weekStart.adjust("D", -7);
			weekEnding.adjust("D", -7);
			// console.log(JSON.stringify([service, yearWeek, range]));
			callDateStats(service, startKey, endKey, range, i);
		}
		
		function completed(service) {
			var status = $('#status-' + service);
			numCompleted--;
			if (numCompleted === 0) {
				status.html("Done!");
				status.fadeOut(1000, function(){
					$(this).remove();
				});

			} else {
				status.html("Progress for "+service+": "+(num-numCompleted)+" of "+num);
			}
		}

		function callDateStats(service, startKey, endKey, range, column) {
			$.couch.db(NODE_DB).list(getList("top-for-time"), service+"-week", {
				startkey: startKey,
				endkey: endKey,
				group_level:2,
				reduce:true,
				top_limit: MAX_ROWS,
				stale:"update_after",

				success: function(ajaxData) {
					var rows = ajaxData.rows;
					$.each(rows, function(index, row){
						// console.log(row);

						if (!treeMapData[row.key[1]]) {
							treeMapData[row.key[1]] = { total: row.value, range: [[range, row.value]]}
						} else {
							treeMapData[row.key[1]].total += row.value;
							treeMapData[row.key[1]].range.push([range, row.value]);
						}
						
					});
					// console.log(dateBinnedData);
					// options[service].title = 'Learning Registry Usage Stats - ' + service;
					
					buildTreeMapData(treeMapData, service);

					// buildChartData(dateBinnedData, service, weekNum);
					completed(service);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					debug("ajax error: " + errorThrown);
					debug("ajax error textStatus: " + textStatus);
					debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
					completed(service);
				}
			});

		}
	}

	function wrap(clazz, obj) {
		return obj;
	}

	function buildTreeMapData(treeMapData, service) {
		var numRows = dataTables[service].getNumberOfRows();
		dataTables[service].removeRows(0, numRows);
		dataTables[service].addRow([service, null, 0, 0]);
		
		// dataTables[service].removeRows(0, numRows);
		var tmp;
		$.each(treeMapData, function(term, data) {
			if (data.total > 0) {
				tmp = [term, service, data.total, 0];
				// console.log(JSON.stringify(tmp));
				dataTables[service].addRow(tmp);

				$.each(data.range, function(idx, element) {
					if (element[1] == 0 ) {
						// console.log(JSON.stringify({idx: idx, element: element, treeMapData: treeMapData}));
					} else {
						tmp = [term + " : " +element[0], term, element[1], data.range.length];
						// console.log(JSON.stringify(tmp))
						dataTables[service].addRow(tmp);
					}
				});
			}
		});
		drawChart(service);
	}

	function buildDateBins(service) {
		var dateBinnedData = {};
		var resultCount = 0;

		// var dateBins = [];
		var form = "yyyy-MM-dd";
		var today = $.date();
		var todaysDate =  new Date(today.format(form));
		var todaysYearWeek = todaysDate.getYearWeek();

		var endKey, startKey;


		////
		// Make it call every day for each day... and then redraw
		// the chart at the end of computation of each day...
		// this should make this thing appear faster....
		var num = MAX_WEEKS,
			numCompleted = MAX_WEEKS,
			columnCount = MAX_WEEKS;

		for (var i=0; i<num; i++) {
			// var dateBins = [
			// 	convertDateToMillis(today.format(form)),					// today
			// 	convertDateToMillis(today.adjust("D", -1).format(form))
			// ]
			var curDate = new Date(today.format(form));
			var yearWeek = curDate.getYearWeek();
			today.adjust("D", -7);
			startKey = [yearWeek];
			endKey = [yearWeek,{}];
			callDateStats(service, startKey, endKey, yearWeek, i);
		}
		
		function completed(service) {
			var status = $('#status-' + service);
			numCompleted--;
			if (numCompleted === 0) {
				status.html("Done!");
				status.fadeOut(1000, function(){
					$(this).remove();
				});

			} else {
				status.html("Progress for "+service+": "+(num-numCompleted)+" of "+num);
			}
		}

		function zeroArray(size) {
			var a = [];
			for (var i = 0; i < size; i++) {
				a.push(0);
			}
			return a;
		}

		function callDateStats(service, startKey, endKey, weekNum, column) {
			$.couch.db(NODE_DB).list(getList("top-for-time"), service+"-week", {
				startkey: startKey,
				endkey: endKey,
				group_level:2,
				reduce:true,
				top_limit: MAX_ROWS,
				stale:"update_after",

				success: function(ajaxData) {
					var rows = ajaxData.rows;
					var total = 0;
					$.each(rows, function(index, row){
						// console.log(row);

						if (!dateBinnedData[row.key[1]]) {
							dateBinnedData[row.key[1]] = zeroArray(num);
						}
						total += row.value;
						dateBinnedData[row.key[1]][column]+=row.value;
						
					});
					// console.log(dateBinnedData);
					// options[service].title = 'Learning Registry Usage Stats - ' + service;

					buildChartData(dateBinnedData, service, weekNum);
					completed(service);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					debug("ajax error: " + errorThrown);
					debug("ajax error textStatus: " + textStatus);
					debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
					completed(service);
				}
			});

		}
	}

	function buildChartData(dateBinnedData, service, weekNum) {

		var numRows = dataTables[service].getNumberOfRows();
		dataTables[service].removeRows(0, numRows);
		$.each(dateBinnedData, function(term, binnedData) {
			var rowData = [term].concat(binnedData);
			if (rowData.length != (MAX_WEEKS+1)) {
				// console.log("weekNum: "+ weekNum);
				// console.log("service: "+ service);
				// console.log("row: "+ JSON.stringify(rowData));
			}
			dataTables[service].addRow(rowData);
		});
		drawChart(service);
	}


	function drawChart(service) {
		charts[service].draw(dataTables[service], options[service]);
	}

	function convertDateToMillis(timestamp){
    	return Date.parse(timestamp);
	}

})(jQuery);