function processResult(data) {
    console.log(data);
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

    if (action == "addID" || action == "reoveID") {
        jQuery.get(
            url,
            success=(data) => processResult(data)
        );
    } else {
        console.log("get rating query....");
        // TODO: undecided
    }
}


// Bind the submit action of the form to a handler function
jQuery("#action_form").submit((event) => submitLoginForm(event)); 