
var KeduIje = (function(ki){

var mediaPlayer;
var editMode = false;

var lyrics = [];
var lyricEditor = {
  state: {enabled: false},
  displayed: {enabled: false},
  show: function(){},
  hide: function(){},
};

var currentLine; //dom object of current lyric
var currentLineStartTime;
var currentLineEndTime = -1;

var songID = null;
var indexBeingModified = -1;

var activateLineTimer;

function loadLyrics(){
  $.get("/lyrics/"+songID, _loadLyrics);
}

function _loadLyrics(result){
  lyrics = result.lyrics;

  displayLyrics(result.html);
  currentTime=0;
  currentLine = $('#lyricsDisplay p')[0]; //todo: error handlig
  currentLineStartTime = lyrics[0].startTime;

}

function playLyric(){
  mediaPlayer.playSegment();
}

function getLineFromTime(time){
  for (var i=0; i<lyrics.length; i++){
    if(time<lyrics[i].endTime){
      currentLineStartTime = lyrics[i].startTime;
      currentLineEndTime = lyrics[i].endTime;
      var query = "p."+lyrics[i].startTime;
      return $(query)[0];
    }
  }
}

function stopHighlighting(){
  clearTimeout(activateLineTimer);
  $(".current").removeClass("current");
}

/*shows active lyric during playback */
function activateLine(){
  var currentTime = mediaPlayer.getCurrentTime();

  if ((currentTime<currentLineStartTime) || (currentTime>currentLineEndTime))
  {
    $(".current").removeClass("current");
    if(currentLine = getLineFromTime(currentTime)){
      $(currentLine).addClass("current");
      scrollIfOutOfView(currentLine);
    }
  }

  //only keep timer going if the video is playing
  if (mediaPlayer.isPlaying()&&(!editMode))
    activateLineTimer = setTimeout(activateLine, 1000);
}

//responsively adjusts scroll position of lyrics during playback
function scrollIfOutOfView(element){
  var position = $(element).offset().top;
  var windowTop = $(window).scrollTop();
  var height = $(window).height();
  var windowBottom = windowTop + height * 0.7;

  if ((position<windowTop) || (position > windowBottom))
    $("html,body").animate({scrollTop: position-height*0.2}, 800);
}

function jumpTo(){ //revisit

  currentLine = this;
  currentLineStartTime = parseInt($(currentLine).data("start-time"));
  currentLineEndTime = parseInt($(currentLine).data("end-time"));
  $(".current").removeClass("current");
  mediaPlayer.setState({segmentStart: currentLineStartTime});
  mediaPlayer.setState({segmentEnd: -1});

  if(editMode){
    mediaPlayer.setState({segmentEnd: currentLineEndTime});
  }else {
    $(currentLine).addClass("current");
  }
  mediaPlayer.playSegment();
}

function showEditHeaderDialog(idx){
  var headingText = prompt("Update Heading", lyrics[idx].heading);
  saveHeading(headingText, idx);
}

function displayLyrics(html){
  indexBeingModified = -1;
  lyricEditor.hide();

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

function showNewLyricDialog(){
  lyricEditor.show();
}

function showEditDialog(i, startTime, endTime, text){
  lyricEditor.show(text);
  mediaPlayer.freezeTimeMarks();
  indexBeingModified = i;
  mediaPlayer.setState({segmentStart: startTime});
  mediaPlayer.setState({segmentEnd: endTime});
}

function saveHeading(headingText, idx){

  updateLyric(null, idx, headingText);

}

function saveLyric(text){

  if(indexBeingModified>-1)
    updateLyric(text,indexBeingModified);
  else {
    addLyric(text)
  }

}

function addLyric(text){

  var newLyric = {
    text: $('#lyric').val(),
    endTime: mediaPlayer.state.segmentEnd,
    deleted: false,
    id: lyrics.length,
    startTime: mediaPlayer.state.segmentStart,
    heading: null
  };

  $.post("/lyrics/"+songID+"/addline", newLyric, function(res){
    loadLyrics();
  });
}

function updateLyric(text, idx, heading){

  var oldLyricObj = lyrics[idx];
  var updateObj = {};

  function appendIfChanged(field, variable){
    if((!variable)&&(!oldLyricObj[field])) //for empty, null, and undefined strings
      return;
    if(variable==parseInt(oldLyricObj[field])) //for integers
      return;
    if(variable==oldLyricObj[field]) //for matching strings
      return;

    updateObj[field]=variable;
  }

    if(heading){
    appendIfChanged("heading",heading);
    }else {
      appendIfChanged("text",text);
      appendIfChanged("startTime",mediaPlayer.state.segmentStart);
      appendIfChanged("endTime",mediaPlayer.state.segmentEnd);
    }

    var postData = {
      update: updateObj,
      original: oldLyricObj
    };
//todo: postdata should be validated
  $.post("/lyrics/"+songID+"/editline/"+lyrics[idx].id, postData, function(res){
        loadLyrics();
      });

}

  function setEditMode(val){
    editMode = val;
    if(editMode) stopHighlighting();
  }

  function onPause(segmentStart, segmentEnd){

      if(editMode)
        showNewLyricDialog();

      //stop timer
      clearTimeout(activateLineTimer);
  }

  function onResume(){
    //resume timer
    if(!editMode)
      activateLineTimer = setTimeout(activateLine, 1000);
  }

  ki.init = function (_songID){
    songID = _songID;
    loadLyrics();
  };
  ki.registerPlayer = function (component){
    mediaPlayer=component;
    component.onPaused = onPause;
    component.onResume = onResume;
  }
  ki.registerEditor = function (component){
    lyricEditor=component;
    component.saveLyric = saveLyric;
    component.playLyric = playLyric;
    component.setEditMode = setEditMode;
  }

  return ki;

})({});

/*

To do:

-play mp3s
-make sure that player loaded
-bug: after login, goes to http://localhost:3000/music/id/h01_dEXLqsk#_=_ (achikolo)

-bug: edit dialog stops showing up

-error handling

-start time should never be after end time

*/
