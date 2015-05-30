var main = function () {

    var count = 60;
    var counter;
    var timer = function() {  
        count = count-1;
        if(count<0) {
            clearInterval(counter);
            return;
        }
        $('#time').html(count + ' secs');
    };
    
    $('#startTimer').on('click', function(event) {
        var counter = setInterval(timer, 1000);
        //timer();
    });
 
    var checkBingo = function() {
        
    };

    $("#board table tr td").toArray().forEach(function (element) {
        var $element = $(element);
        console.log('added stuff to array in js');
        $element.on('click', function() {

            //add in a check for accuracy on click

            console.log('clicked element');
            if($element.attr('class') !== 'active') {
                $element.addClass('active');
                checkBingo();
                console.log($element);
            } else {
                return;
            }   
        });
    }); 

};

$(document).ready(main);