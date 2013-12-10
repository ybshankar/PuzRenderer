$(function() {

	// Parsing from the .PUZ format
	// Check for the various File API support.
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.
	} else {
		alert('The File APIs are not fully supported in this browser.');
	}

	function readfile() {

		// check for file upload
		var files = document.getElementById('fileinput').files;
		if (!files.length) {
			alert('Please select a file!');
			return;
		}

		var file = files[0];
		if (file) {
			var reader = new FileReader();

			// If we use onloadend, we need to check the readyState.
			reader.onloadend = function(evt) {
				if (evt.target.readyState == FileReader.DONE) {// DONE == 2
					document.getElementById('content').textContent = evt.target.result;
					var content = evt.target.result;
					readAndDrawCrossword(content);
				}

			};
			reader.readAsText(file);
		}

	}

	function readAndDrawCrossword(content) {
		var checksum = extract(content, "0x00", "0x01");
		var fileMagic = extract(content, "0x02", "0x0D");
		var width = extract(content, "0x2C", "0x2C");
		var height = extract(content, "0x2D", "0x2D");
		var numClues = extract(content, "0x2E", "0x2F");
		var scrambledTag = extract(content, "0x32", "0x33");
		var gridDimen = width * height;
		var strtSolutionGrid = parseInt("0x33", 16) + 1;
		var endSolutionGrid = parseInt("0x33", 16) + gridDimen;
		var solutionGrid = extract(content, strtSolutionGrid, endSolutionGrid);

		var blankGrid = extract(content, endSolutionGrid + 1, endSolutionGrid + gridDimen);
		var bG = stringFromCode(blankGrid);
		var infoAndClues = content.substr(endSolutionGrid + gridDimen + 1);
		var locArInfoAndClues = getIndicesOf("\0", infoAndClues);

		var ArInfoAndClues = [];
		locArInfoAndClues.unshift(0);
		for (var i = 0; i < locArInfoAndClues.length; i++) {
			ArInfoAndClues.push(infoAndClues.substr(locArInfoAndClues[i], (locArInfoAndClues[i + 1] - locArInfoAndClues[i])));
		}
		var title = infoAndClues.substr(locArInfoAndClues[0], locArInfoAndClues[1]);
		var author = infoAndClues.substr(locArInfoAndClues[1], locArInfoAndClues[2]);
		var copyright = infoAndClues.substr(locArInfoAndClues[2], locArInfoAndClues[3]);

		var clues = ArInfoAndClues.slice(3, -2);

		var matBlank = fillbGrid(bG, width, height);
		var reqMatBlank = getReqMatBlank(matBlank, width, height);
		var w = Number(width) + 1, h = Number(height) + 1;
		var cluesAr = getClueNums(matBlank, w, h, clues);
		var numMat = cluesAr[0];
		var across = cluesAr[2];
		var down = cluesAr[3];

		manipulatehtml(across, down);
		var reqnumMat = getnumMat(numMat, width, height);
		var squareLength = 40;
		var gridSize = {
			x : height,
			y : width
		};
		var svgSize = getSvgSize(gridSize, squareLength);
		var map = buildMap(reqnumMat, width, height);

		var svgContainer = d3.select(".display").append("svg").attr("height", svgSize.height).attr("width", svgSize.width).attr("class", "chart");
		var scales = getScale(gridSize, svgSize);
		drawCells(svgContainer, scales, map.black, "black", squareLength);
		drawCells(svgContainer, scales, map.white, "white", squareLength);
		clueHighlight(map.white, width, height);

	}

	function extract(stringContent, strt, end) {
		arContent = [];
		c = 0;
		s = parseInt(strt);
		e = parseInt(end);
		for (var ind = s; ind <= e; ind++) {
			arContent.push(stringContent.substr(s, e).charCodeAt(c));
			c++;
		}
		return arContent;
	}

	function stringFromCode(ar) {
		return String.fromCharCode.apply(String, ar);
	}

	function getIndicesOf(searchStr, str) {
		var startIndex = 0, searchStrLen = searchStr.length;
		var index, loc = [];

		while (( index = str.indexOf(searchStr, startIndex)) > -1) {
			loc.push(index);
			startIndex = index + searchStrLen;
		}
		return loc;
	}

	function fillbGrid(blG, width, height) {
		var h = Number(height) + 1, w = Number(width) + 1;
		var c = 0, dim = w * h, mat = [];
		for (var x = 0; x <= w; x++) {
			mat[x] = [];
			for (var y = 0; y <= h; y++) {
				if (((x >= 1) && (x <= width)) && ((y >= 1) && (y <= height))) {
					while (c < dim) {
						mat[x][y] = blG[c];
						c++;
						break;
					}
				} else {
					mat[x][y] = '.';
				}
			}
		}
		return mat;
	}

	function getReqMatBlank(matBlank, width, height) {
		reqMatBlank = [];
		for (var x = 0; x < width; x++) {
			reqMatBlank[x] = [];
			for (var y = 0; y < height; y++) {
				reqMatBlank[x][y] = matBlank[x+1][y + 1];
			}
		}
		return reqMatBlank;
	}

	function getClueNums(mat, w, h, clues) {
		var nmat = [], num = 0;
		cluesAD = clues;
		var cN = [], across = [], down = [];
		//    var l = mat[x][y-1];r=mat[x][y+1];u=mat[x-1][y];d=mat[x+1][y];
		for (var x = 0; x <= w; x++) {
			nmat[x] = [];
			for (var y = 0; y <= h; y++) {
				if (mat[x][y] == '.') {
					// do nothing
					nmat[x][y] = '.';
				} else {
					if ((mat[x][y + 1] == '-') && (mat[x+1][y] == '-')) {
						if ((mat[x][y - 1] == '.') && (mat[x-1][y] == '.')) {
							num++;
							nmat[x][y] = '-' + num + 'AD';
							//across and down
							cN.push(num + 'AD');
							across.push(num + ". " + cluesAD.shift());
							down.push(num + ". " + cluesAD.shift());
						} else if ((mat[x][y - 1] == '.') && (mat[x-1][y] == '-')) {
							num++;
							nmat[x][y] = '-' + num + 'A';
							//across
							cN.push(num + 'A');
							across.push(num + ". " + cluesAD.shift());
						} else if ((mat[x][y - 1] == '-') && (mat[x-1][y] == '.')) {
							num++;
							nmat[x][y] = '-' + num + 'D';
							//down
							cN.push(num + 'D');
							down.push(num + ". " + cluesAD.shift());
						} else {
							nmat[x][y] = '-';
						}

					} else if ((mat[x][y + 1] == '.') && (mat[x+1][y] == '-')) {
						if ((mat[x][y - 1] == '.') && (mat[x-1][y] == '.')) {
							num++;
							nmat[x][y] = '-' + num + 'D';
							//down
							cN.push(num + 'D');
							down.push(num + ". " + cluesAD.shift());
						} else if ((mat[x][y - 1] == '-') && (mat[x-1][y] == '.')) {
							num++;
							nmat[x][y] = '-' + num + 'D';
							//down
							cN.push(num + 'D');
							down.push(num + ". " + cluesAD.shift());
						} else {
							nmat[x][y] = '-';
						}
					} else if ((mat[x][y + 1] == '-') && (mat[x+1][y] == '.')) {
						if ((mat[x][y - 1] == '.') && (mat[x-1][y] == '.')) {
							num++;
							nmat[x][y] = '-' + num + 'A';
							//across
							cN.push(num + 'A');
							across.push(num + ". " + cluesAD.shift());
						} else if ((mat[x][y - 1] == '.') && (mat[x-1][y] == '-')) {
							num++;
							nmat[x][y] = '-' + num + 'A';
							//across
							cN.push(num + 'A');
							across.push(num + ". " + cluesAD.shift());
						} else {
							nmat[x][y] = '-';
						}
					} else {
						nmat[x][y] = '-';
					}
				}
			}
		}
		cluesAr = [nmat, cN, across, down];
		return cluesAr;
	}

	function getnumMat(numMat, width, height) {
		reqnumMat = [];
		for (var x = 0; x < width; x++) {
			reqnumMat[x] = [];
			for (var y = 0; y < height; y++) {
				reqnumMat[x][y] = numMat[x+1][y + 1];
			}
		}
		return reqnumMat;
	}

	function getSvgSize(gridSize, squareLength) {
		var height = gridSize.x * squareLength;
		var width = gridSize.y * squareLength;
		return {
			height : height,
			width : width
		};
	}

	function buildMap(reqnumMat, width, height) {
		var map = {
			grid : [],
			white : [],
			black : []
		};
		for (var x = 0; x < height; x++) {
			map.grid[x] = [];
			var type = '';
			for (var y = 0; y < width; y++) {
				if (reqnumMat[x][y] == '.') {
					type = "black";
					dir = '';
					num = '';
				} else {
					type = "white";
					if (reqnumMat[x][y] == '-') {
						num = '';
						dir = '';
					} else {
						pattern = /-(\d+)([A-D]+)/g;
						result = pattern.exec(reqnumMat[x][y]);
						if (result !== null) {
							num = RegExp.$1;
							dir = RegExp.$2;
						}
					}
				}
				var cell = {
					x : y,
					y : x,
					type : type,
					num : num,
					dir : dir
				};
				map.grid[x][y] = cell;
				map[type].push(cell);
			}

		}
		return map;
	}

	function clueHighlight(data, width, height) {
		var clueCells = {
			grid : [],
			across : [],
			down : [],
			acrossdown : []
		};
		for (var x = 0; x < height; x++) {
			clueCells.grid[x] = [];
			for (var y = 0; y < width; y++) {
				clueCells.grid[x][y] = data[x][y];
				clueCells.across.push(clueCells.grid[x][y]);
			}
		}
	}

	function getScale(gridSize, svgSize) {
		var xScale = d3.scale.linear().domain([0, gridSize.x]).range([0, svgSize.height]);
		var yScale = d3.scale.linear().domain([0, gridSize.y]).range([0, svgSize.width]);
		return {
			x : xScale,
			y : yScale
		};
	}

	function drawCells(svgContainer, scales, data, cssClass, squareLength) {
		var gridGroup = svgContainer.append("g");
		var cells = gridGroup.selectAll("rect").data(data).enter().append("rect").attr("x", function(d) {
			return scales.x(d.x);
		}).attr("y", function(d) {
			return scales.y(d.y);
		}).attr("height", function(d) {
			return squareLength;
		}).attr("width", function(d) {
			return squareLength;
		}).attr("class", cssClass).attr("num", function(d) {
			return d.num;
		}).on('click', function(d) {
			d3.select(this).style('fill', '#C0C0C0');
		});

		if (cssClass == "white") {
			var text = cells.select("white").data(data).enter().append("text");

			var textAttributes = text.attr("x", function(d) {
				return scales.x(d.x + 0.05);
			}).attr("y", function(d) {
				return scales.y(d.y + 0.2);
			}).text(function(d) {
				return d.num;
			}).attr("font-family", "sans-serif").attr("dy", ".31em").attr("font-size", "10px").attr("fill", "red");
		}
	}

	function manipulatehtml(across, down) {
		a = document.getElementById("across");
		d = document.getElementById("down");
		a.innerHTML = across;
		d.innerHTML = down;
	}


	document.querySelector('.FileButtons').addEventListener('click', function(evt) {
		if (evt.target.tagName.toLowerCase() == 'button') {
			readfile();
		}
	}, false);

	window.onload = function onload() {
		
		var b64array = "ABCDEFGHIJKLMNOP" +
           "QRSTUVWXYZabcdef" +
           "ghijklmnopqrstuv" +
           "wxyz0123456789+/" +
           "=";

		defaultTextString = function decode64() {
			var input = document.getElementById("crosswordData").innerText;
			var output = "";
			var chr1, chr2, chr3 = "";
			var enc1, enc2, enc3, enc4 = "";
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			do {
				enc1 = b64array.indexOf(input.charAt(i++));
				enc2 = b64array.indexOf(input.charAt(i++));
				enc3 = b64array.indexOf(input.charAt(i++));
				enc4 = b64array.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

				chr1 = chr2 = chr3 = "";
				enc1 = enc2 = enc3 = enc4 = "";

			} while (i < input.length);

			return output;
		};
      readAndDrawCrossword(defaultTextString());

	};

});
