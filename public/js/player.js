
var KeduIje = (function(ki){

var songID = null;

function loadLyrics(cb){
  $.get("/lyrics/"+songID, cb || _loadLyrics);
}

function showEditHeaderDialog(idx){
  var headingText = prompt("Update Heading", lyrics[idx].heading);
  saveHeading(headingText, idx);
}

function displayLyrics(html){

  $('#lyricsDisplay').html(html);
  $('#lyricsDisplay p').click(jumpTo);
  $('#lyricsDisplay p,#lyricsDisplay h4').hover(
    function(){
      if(editMode)
        $(this).find(".glyphicon").css("opacity", "1");
    },
    function(){
      $(this).find(".glyphicon").css("opacity", "0");
    }
  );
  $('#lyricsDisplay .add-heading-btn').hover(
    function(){
      if(editMode)
        $(this).css("opacity", "1");
    },
    function(){
      $(this).css("opacity", "0");
    }
  )
  .click(function(){
    if ( $(this).css('opacity')=="1" && editMode ){
      var index = $(this).data("index");
      var headingText = prompt("Please enter heading", "[]");
      saveHeading(headingText, index);
    }

  });

  $('#lyricsDisplay span.glyphicon-pencil').click(function(event){
    event.stopPropagation();
    if ( $(this).css('opacity')=="1" && editMode ){
      var startTime = $(this).data("start-time");
      var endTime = $(this).data("end-time");
      var index = $(this).data("index");
      var text = $(this).data("text");
      var isHeader = $(this).data("is-header");
      if(isHeader)
        showEditHeaderDialog(index);
      else
        showEditDialog(index, startTime, endTime, text);
    }

  });

}


function saveHeading(headingText, idx){

  updateLyric(null, idx, headingText);

}

function addLyric(newLyric, cb){

  $.post("/lyrics/"+songID+"/addline", newLyric, cb);
}

function updateLyric(oldLyricObj, newLyricObj, cb){

    var postData = {
      new: newLyricObj,
      original: oldLyricObj
    };
//todo: postdata should be validated
  $.post("/lyrics/"+songID+"/editline/"+lyrics[idx].id, postData, cb);

}

  ki.init = function (_songID){
    songID = _songID;
  };

  ki.loadLyrics = loadLyrics;
  ki.updateLyric = updateLyric;
  ki.addLyric = addLyric;

  return ki;

})({});

/*

To do:
--explore integrating LyricDisplay component into MediaPlayer
-fully integrate audio
--new music form
--re-design data schema
--implement controls
--move timer controlls to hook

Backend
--remove "isHeading" field form lyrics

-UI design
--design control

-move pug rednering of lyric display to client side
--remove obsolete template

-bug: after login, goes to http://localhost:3000/music/id/h01_dEXLqsk#_=_ (achikolo)

-error handling
--make sure that youtube api loaded on time

-log visitors

*/
