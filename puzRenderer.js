
// Class for crossword
//function crossWord(){
	
	function readfile() {		
		// check for file upload
	    var files = document.getElementById('fileinput').files;
	    if (!files.length) {
	        alert('Please select a file!');
	        return;
	    }
	    var file = files[0];
	    if(file){
	    	
	    	var reader = new FileReader();
	    	reader.onloadend = function(evt) {
	    		if (evt.target.readyState == FileReader.DONE) { 
	    			document.getElementById('content').textContent = evt.target.result;
	    			content = evt.target.result;	
	    			
		    	}
	    		   	
	    	};
		    reader.readAsText(file);
		}
	    
	    
	}
	var content;
	document.querySelector('.FileButtons').addEventListener('click',function(evt){
		if(evt.target.tagName.toLowerCase() == 'button'){
			readfile();

			alert(content);
		}
		}, false);
	

	
//}
//crossWord.readfile();
