function processResult(data) {

    if (data.startsWith('<!doctype html>')) {
        const newDoc = document.open("text/html", "replace");
        newDoc.write(data);
        newDoc.close();        
    } else {
        console.log(data);
        $('#message').text(data);
    }
}


function submitLoginForm(formSubmitEvent){
	console.log("User clicks the search button");
	
	// Important: disable the default action of submitting the form
    //   which will cause the page to refresh
    //   see jQuery reference for details: https://api.jquery.com/submit/
	formSubmitEvent.preventDefault();
	
    let select = document.getElementById('action-selection');
    let action = select.options[select.selectedIndex].value;
    let videoId = $('#video_id_input').val();

    let url = `/${action}/${videoId}`;
    jQuery.get(
        url,
        success=(data) => processResult(data)
    );
}


// Bind the submit action of the form to a handler function
jQuery("#action_form").submit((event) => submitLoginForm(event)); 