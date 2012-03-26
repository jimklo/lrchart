//Count by schema format. Count total. Count by creator. Count by submitter. Count by keyword.
(function($) {
	var dataTables = {};
	var services = [{svc:'submitter', x: 1000, y: 500}, {svc:'payload_schema', x: 1000, y: 500}, {svc:'curator', x: 1000, y: 500}, {svc:'keyword', x: 1000, y: 3000}]; //, 'keyword'];
	//var services = ['keyword'];//, 'keyword'];
	var resultCount = 0;
	var NODE_URL = "http://127.0.0.1:5984";
	var NODE_DB = "asn_paradata";
	var NODE_DDOC = "lr-stats";

	var ajaxPool = [];

	var charts = {};
	var options = {};
	var MAX_ROWS = 100;

	// $.ajaxSetup({
	// 	dataType: 'jsonp',
	// 	jsonp: 'callback'
	// });

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
				title: 'Learning Registry Usage Stats - ' + service + ', Loading Data...',
				vAxis: {
					title: 'Term',
					titleTextStyle: {
						color: 'red'
					}
				}
			};
			dataTables[service] = new google.visualization.DataTable();
			dataTables[service].addColumn('string', 'Term');
			dataTables[service].addColumn('number', '< 30 days');
			dataTables[service].addColumn('number', '30-60 days');
			dataTables[service].addColumn('number', '> 60 days');
			var div_name = 'chart-' + service;
			$('#charts').append('<div id=' + div_name + '></div>');
			charts[service] = new google.visualization.BarChart(document.getElementById(div_name));
			drawChart(service);
			startLoadingData(service);
		});
	}


	function getView(name) {
		return NODE_DDOC + "/" + name;
	}

	function startLoadingData(service) {
		callStats(service);
	}


	function callStats(service) {
		// var callObj = {
		// 	url : NODE_URL + '/resource_data/_design/lr-stats/_view/' + service,
		// 	dataType : 'jsonp',
		// 	jsonp : 'callback',
		// 	data : {
		// 		"reduce" : true,
		// 		"group" : true,
		// 		"group_level" : 1,
		// 	}
		// };
		// callObj.success = function(ajaxData) {
		// 	buildData(ajaxData, service);
		// };
		// callObj.error = function(jqXHR, textStatus, errorThrown) {
		// 	debug("ajax error: " + errorThrown);
		// 	debug("ajax error textStatus: " + textStatus);
		// 	debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
		// };
		// $.ajax(callObj);
		$.couch.db(NODE_DB).view(getView(service), {
			reduce: true,
			group: true,
			group_level: 1,
			success: function(ajaxData) {
				buildData(ajaxData, service);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				debug("ajax error: " + errorThrown);
				debug("ajax error textStatus: " + textStatus);
				debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
			}
		});

	}

	function buildData(ajaxData, service) {

		var rows = ajaxData.rows;
		var chartRows = [];

		//reverse sort by val


		function compareRows(row1, row2) {
			return row1.val - row2.val;
		}

		function insertRow(row) {
			var nextRow = chartRows[MAX_ROWS - 2];
			if (!nextRow) {
				debug("last row does not exist");
				return;
			}
			if (row.val < nextRow.val) {
				return;
			}
			var insertIndex = -1;
			$.each(chartRows, function(index, row) {
				nextRow = chartRows[index];
				if (nextRow) {
					var compare = compareRows(row, nextRow);
					if (compare >= 0) {
						insertIndex = index;
						return false;
					}
				} else {
					debug("no next row for index: " + index);
				}
			});
			if (insertIndex >= 0) {
				chartRows.splice(insertIndex, 0, row);
				chartRows = chartRows.slice(0, MAX_ROWS - 1);
			}
		}

		var TEST_MAX = 100000;
		$.each(rows, function(index, row) {
			if (row.key && row.value) {
				var chartRow = {
					key: row.key[0],
					val: row.value
				};
				if (index < MAX_ROWS) {
					chartRows.push(chartRow);
				} else if (index == MAX_ROWS) {
					chartRows.push(chartRow);
					chartRows.sort(compareRows);
				} else if (index < TEST_MAX) {
					insertRow(chartRow);
				} else {
					return false;
				}
			}
		});
		if (rows.length > MAX_ROWS) {
			options[service].title = 'Learning Registry Usage Stats - ' + service + ', Top ' + MAX_ROWS + " of " + rows.length;
		} else {
			options[service].title = 'Learning Registry Usage Stats - ' + service;
		}

		chartRows.sort(compareRows);

		buildDateBins(chartRows, service);
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


	function buildDateBins(chartRows, service) {
		var dateBinnedData = {};
		var resultCount = 0;
		var MAX_RESULTS = chartRows.length * 3;

		$.each(chartRows, function(index, row) {
			dateBinnedData[row.key] = [];
		});


		var dateBins = [];
		var form = "yyyy-MM-dd";
		var today = $.date();
		dateBins[0] = today.format(form); // end 1
		dateBins[1] = today.adjust("D", -30).format(form); // start 1
		dateBins[2] = today.adjust("D", -1).format(form);
		dateBins[3] = today.adjust("D", -30).format(form);
		dateBins[4] = today.adjust("D", -1).format(form);
		dateBins[5] = "";

		$.each(chartRows, function(index, row) {
			for (var i = 0; i < 3; i++) {
				//var startKey = [row.key,dateBins[2*i+1]];
				//var endKey = [row.key,dateBins[2*i]];

				// var startKey = '["' + row.key + '","' + dateBins[2 * i + 1] + '"]';
				// var endKey = '["' + row.key + '","' + dateBins[2 * i] + '"]';

				var startKey = [row.key, dateBins[2 * i + 1]];
				var endKey = [row.key, dateBins[2 * i]];
				callDateStats(service, startKey, endKey, row.key, i);
			}
		});

		function callDateStats(service, startKey, endKey, term, index) {


			//building the callObj with the params as data instead of in the URL fails for 
			//reasons I expect have something to do with quotation marks.
			/*var callObj = {
			url : NODE_URL + '/resource_data/_design/lrstats-' + service + '/_view/docs',
			dataType : 'jsonp',
			jsonp : 'callback',
			data : {
				"startkey" : startKey,
				"endkey" : endKey
			}
		};*/

			// var callObj = {
			// 	url : NODE_URL + '/resource_data/_design/lr-stats/_view/' + service +'?startkey='+startKey+'&endkey='+endKey,
			// 	dataType : 'jsonp',
			// 	jsonp : 'callback'
			// };		
			// callObj.success = function(ajaxData) {
			// 	var rows = ajaxData.rows;
			// 	if(ajaxData.rows[0]) {
			// 		dateBinnedData[term][index] = ajaxData.rows[0].value;
			// 	} else {
			// 		dateBinnedData[term][index] = 0;
			// 	}
			// 	resultCount++;
			// 	if(resultCount==MAX_RESULTS) {
			// 		buildChartData(dateBinnedData, service);
			// 	}
			// };
			// callObj.error = function(jqXHR, textStatus, errorThrown) {
			// 	debug("ajax error: " + errorThrown);
			// 	debug("ajax error textStatus: " + textStatus);
			// 	debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
			// };
			// $.ajax(callObj);

			$.couch.db(NODE_DB).view(getView(service), {
				startkey: startKey,
				endkey: endKey,
				success: function(ajaxData) {
					var rows = ajaxData.rows;
					if (ajaxData.rows[0]) {
						dateBinnedData[term][index] = ajaxData.rows[0].value;
					} else {
						dateBinnedData[term][index] = 0;
					}
					resultCount++;
					if (resultCount == MAX_RESULTS) {
						buildChartData(dateBinnedData, service);
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					debug("ajax error: " + errorThrown);
					debug("ajax error textStatus: " + textStatus);
					debug("ajax error jqXHR: " + JSON.stringify(jqXHR));
				}
			});

		}


	}

	function buildChartData(dateBinnedData, service) {
		//debug("computed dateBinnedData: " + JSON.stringify(dateBinnedData));
		//$.each fails on the dateBinnedData object for keywords, and I have no earthly idea why
		/*$.each(dateBinnedData, function(term, row) {
		debug("adding row: " + term + ", " + row[0] + ", " +row[1] + ", " +row[2]);
		dataTables[service].addRow([term, row[0], row[1], row[2]]);
	});*/

		for (term in dateBinnedData) {
			//debug("alt add row: " + term + ", " + dateBinnedData[term][0] + ", " +dateBinnedData[term][1] + ", " +dateBinnedData[term][2]);
			dataTables[service].addRow([term, dateBinnedData[term][0], dateBinnedData[term][1], dateBinnedData[term][2]]);
		}

		drawChart(service);
	}


	function drawChart(service) {
		charts[service].draw(dataTables[service], options[service]);
	}

})(jQuery);