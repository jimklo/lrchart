//Count by schema format. Count total. Count by creator. Count by submitter. Count by keyword.
(function($) {
	var dataTables = {};
	var services = [{svc:'submitter', x: 800, y: 600}, {svc:'payload_schema', x: 800, y: 600}, {svc:'curator', x: 800, y: 600}, {svc:'keyword', x: 800, y: 1000}]; //, 'keyword'];
	//var services = ['keyword'];//, 'keyword'];
	var resultCount = 0;
	var NODE_URL = "http://127.0.0.1:5984";
	var NODE_DB = "resource_data_new";
	var NODE_DDOC = "lr-stats";

	var ajaxPool = [];

	var charts = {};
	var options = {};
	var MAX_ROWS = 15;
	var MILLIS_PER_DAY = 86400000;
	google.load("visualization", "1", {
		packages: ["corechart"]
	});

	google.setOnLoadCallback(init);

	function debug2(msg) {
		$('#debug2').html(msg + "<br>");
	}

	function debug(msg) {
		$('#debug').append(msg + "<br>");

	}

	function init() {
		$.couch.urlPrefix = NODE_URL;
		$.couch.defaultAjaxOpts = {
			dataType: 'jsonp',
			jsonp: 'callback'
		};
		$.each(services, function(index, servInfo) {
			var service = servInfo.svc;
			options[service] = {
				width: servInfo.x,
				height: servInfo.y,
				title: 'Learning Registry Usage Stats - ' + service,
				vAxis: {
					title: 'Term',
					titleTextStyle: {
						color: 'red'
					}
				},
				hAxis: {
					logScale:true
				}
			};
			dataTables[service] = new google.visualization.DataTable();
			dataTables[service].addColumn('string', 'Term');
			dataTables[service].addColumn('number', '< 30 days');
			dataTables[service].addColumn('number', '30-60 days');
			dataTables[service].addColumn('number', '60-90 days');
			dataTables[service].addColumn('number', '90-120 days');
			dataTables[service].addColumn('number', '120-150 days');
			var div_name = 'chart-' + service;
			var div_status = 'status-' + service;
			$('#charts').append('<div id="'+div_status+'">Updating!</div><div id="' + div_name + '"></div>');
			charts[service] = new google.visualization.BarChart(document.getElementById(div_name));
			drawChart(service);
			startLoadingData(service);
		});
	}


	function getView(name) {
		return NODE_DDOC + "/" + name;
	}

	function getList(name) {
		return NODE_DDOC + "/" + name;
	}

	function startLoadingData(service) {
		// callStats(service);
		buildDateBins(service);
	}


	// function callStats(service) {
	// 	$.couch.db(NODE_DB).list(getList("top-by-date"), "date-"+service, {
	// 		reduce: true,
	// 		group: true,
	// 		group_level: 1,
	// 		top_limit: MAX_ROWS,
	// 		success: function(ajaxData) {
	// 			buildData(ajaxData, service);
	// 		},
	// 		error: function(jqXHR, textStatus, errorThrown) {
	// 			debug("ajax error: " + errorThrown);
	// 			debug("ajax error textStatus: " + textStatus);
	// 			debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
	// 		}
	// 	});
	// }

	//// JOHN"S ORIGINIAL DESIGN
	// function callStats(service) {
	// 	$.couch.db(NODE_DB).view(getView(service), {
	// 		reduce: true,
	// 		group: true,
	// 		group_level: 1,
	// 		success: function(ajaxData) {
	// 			buildData(ajaxData, service);
	// 		},
	// 		error: function(jqXHR, textStatus, errorThrown) {
	// 			debug("ajax error: " + errorThrown);
	// 			debug("ajax error textStatus: " + textStatus);
	// 			debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
	// 		}
	// 	});
	// }

	// function buildData(ajaxData, service) {

	// 	var rows = ajaxData.rows;
	// 	var chartRows = [];

	// 	//reverse sort by val


	// 	function compareRows(row1, row2) {
	// 		return row1.val - row2.val;
	// 	}

	// 	function insertRow(row) {
	// 		var nextRow = chartRows[MAX_ROWS - 2];
	// 		if (!nextRow) {
	// 			debug("last row does not exist");
	// 			return;
	// 		}
	// 		if (row.val < nextRow.val) {
	// 			return;
	// 		}
	// 		var insertIndex = -1;
	// 		$.each(chartRows, function(index, row) {
	// 			nextRow = chartRows[index];
	// 			if (nextRow) {
	// 				var compare = compareRows(row, nextRow);
	// 				if (compare >= 0) {
	// 					insertIndex = index;
	// 					return false;
	// 				}
	// 			} else {
	// 				debug("no next row for index: " + index);
	// 			}
	// 		});
	// 		if (insertIndex >= 0) {
	// 			chartRows.splice(insertIndex, 0, row);
	// 			chartRows = chartRows.slice(0, MAX_ROWS - 1);
	// 		}
	// 	}

	// 	var TEST_MAX = 100000;
	// 	$.each(rows, function(index, row) {
	// 		if (row.key && row.value) {
	// 			var chartRow = {
	// 				key: row.key[0],
	// 				val: row.value
	// 			};
	// 			if (index < MAX_ROWS) {
	// 				chartRows.push(chartRow);
	// 			} else if (index == MAX_ROWS) {
	// 				chartRows.push(chartRow);
	// 				chartRows.sort(compareRows);
	// 			} else if (index < TEST_MAX) {
	// 				insertRow(chartRow);
	// 			} else {
	// 				return false;
	// 			}
	// 		}
	// 	});
	// 	if (rows.length > MAX_ROWS) {
	// 		options[service].title = 'Learning Registry Usage Stats - ' + service + ', Top ' + MAX_ROWS + " of " + rows.length;
	// 	} else {
	// 		options[service].title = 'Learning Registry Usage Stats - ' + service;
	// 	}

	// 	chartRows.sort(compareRows);

	// 	buildDateBins(chartRows, service);
	// }

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
 	function convertAge(millis) {
 		return millis/MILLIS_PER_DAY;
 	}

	function buildDateBins(service) {
		var dateBinnedData = {};
		var resultCount = 0;

		// var dateBins = [];
		var form = "yyyy-MM-dd";
		var today = $.date();
		
		var endKey = [convertDateToMillis(today.format(form)),{}];
		// var startKey = [today.adjust("D", -90).format(form)];
		var startKey = [0];

		// var dateBins = [
		// 	convertDateToMillis(today.format(form)),					// today
		// 	convertDateToMillis(today.adjust("D", -30).format(form)),	// -30 days
		// 	convertDateToMillis(today.adjust("D", -1).format(form)),	// -31 days
		// 	convertDateToMillis(today.adjust("D", -30).format(form)),	// -60 days
		// 	convertDateToMillis(today.adjust("D", -1).format(form)),	// -61 days
		// 	convertDateToMillis(today.adjust("D", -30).format(form)),	// -90 days
		// 	convertDateToMillis(today.adjust("D", -1).format(form)),	// -91 days
		// 	convertDateToMillis(today.adjust("D", -30).format(form)),	// -120 days
		// 	convertDateToMillis(today.adjust("D", -1).format(form)),	// -121 days
		// 	convertDateToMillis(today.adjust("D", -30).format(form))	// -150 days
		// 	// 0 															// epoch
		// ];


		////
		// Make it call every day for each day... and then redraw
		// the chart at the end of computation of each day...
		// this should make this thing appear faster....
		var numDays = 150,
			numCompleted = 150;
		for (var i=0; i<numDays; i++) {
			// var dateBins = [
			// 	convertDateToMillis(today.format(form)),					// today
			// 	convertDateToMillis(today.adjust("D", -1).format(form))
			// ]

			var dateMillis = convertDateToMillis(today.format(form));
			today.adjust("D", -1);
			startKey = [dateMillis];
			endKey = [dateMillis,{}];
			callDateStats(service, startKey, endKey);
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
				status.html("Progress for "+service+": "+(numDays-numCompleted)+" of "+numDays);
			}
		}

		function callDateStats(service, startKey, endKey) {
			$.couch.db(NODE_DB).list(getList("top-by-date"), "date-"+service, {
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

						if (!dateBinnedData[row]) {
							dateBinnedData[row.key[0]] = [0,0,0,0,0];
						}
						var rowage = convertAge(row.age);
						if (rowage <= 30) {
							dateBinnedData[row.key[0]][0]+=row.value;
						} else if (rowage <= 60) {
							dateBinnedData[row.key[0]][1]+=row.value;
						} else if (rowage <= 90) {
							dateBinnedData[row.key[0]][2]+=row.value;
						} else if (rowage <= 120)  {
							dateBinnedData[row.key[0]][3]+=row.value;
						} else /* if (rowage <= 180) */ {
							dateBinnedData[row.key[0]][4]+=row.value;
						}
						
					});
					// console.log(dateBinnedData);
					// options[service].title = 'Learning Registry Usage Stats - ' + service;
					buildChartData(dateBinnedData, service);
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


 	//// JOHN'S Original
	// function buildDateBins(chartRows, service) {
	// 	var dateBinnedData = {};
	// 	var resultCount = 0;
	// 	var MAX_RESULTS = chartRows.length * 3;

	// 	$.each(chartRows, function(index, row) {
	// 		dateBinnedData[row.key] = [];
	// 	});


	// 	var dateBins = [];
	// 	var form = "yyyy-MM-dd";
	// 	var today = $.date();
	// 	dateBins[0] = today.format(form); // end 1
	// 	dateBins[1] = today.adjust("D", -30).format(form); // start 1
	// 	dateBins[2] = today.adjust("D", -1).format(form);
	// 	dateBins[3] = today.adjust("D", -30).format(form);
	// 	dateBins[4] = today.adjust("D", -1).format(form);
	// 	dateBins[5] = "";

	// 	$.each(chartRows, function(index, row) {
	// 		for (var i = 0; i < 3; i++) {
	// 			var startKey = [row.key, dateBins[2 * i + 1]];
	// 			var endKey = [row.key, dateBins[2 * i]];
	// 			callDateStats(service, startKey, endKey, row.key, i);
	// 		}
	// 	});

	// 	function callDateStats(service, startKey, endKey, term, index) {
	// 		$.couch.db(NODE_DB).view(getViewOrList(service), {
	// 			startkey: startKey,
	// 			endkey: endKey,
	// 			success: function(ajaxData) {
	// 				var rows = ajaxData.rows;
	// 				if (ajaxData.rows[0]) {
	// 					dateBinnedData[term][index] = ajaxData.rows[0].value;
	// 				} else {
	// 					dateBinnedData[term][index] = 0;
	// 				}
	// 				resultCount++;
	// 				if (resultCount == MAX_RESULTS) {
	// 					buildChartData(dateBinnedData, service);
	// 				}
	// 			},
	// 			error: function(jqXHR, textStatus, errorThrown) {
	// 				debug("ajax error: " + errorThrown);
	// 				debug("ajax error textStatus: " + textStatus);
	// 				debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
	// 			}
	// 		});

	// 	}


	// }

	function buildChartData(dateBinnedData, service) {

		var numRows = dataTables[service].getNumberOfRows();
		dataTables[service].removeRows(0, numRows);
		$.each(dateBinnedData, function(term, binnedData) {
			dataTables[service].addRow([term].concat(binnedData));
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