
var KeduIje = (function(ki){


var editMode = false;
var segmentStart=0;
var segmentEnd=0;
var maxTime = 300; //default for now
var spinners = {};
var player;
var saveStartTime=false;
var lyrics = [];
var lyricEditor = {
  state: {enabled: false},
  displayed: {enabled: false},
  show: function(){},
  hide: function(){},
};
var currentTime=0;
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
  currentLine = $('#lyricsDisplay p')[0];
  currentLineStartTime = lyrics[0].startTime;

}

function onYouTubeIframeAPIReady() {
  var iframe = $("iframe.embed-responsive-item")[0];
  player = new YT.Player(iframe, {
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });

}

function onPlayerReady(event) {

  maxTime = player.getDuration();

}

function playLyric(){
  player.seekTo(segmentStart,true);
  player.playVideo();
  saveStartTime = true;
  setTimeout(checkForSegmentEnd,1000);
}

function checkForSegmentEnd(){
  currentTime = player.getCurrentTime();
  if (currentTime > segmentEnd){
    player.pauseVideo();
  }else {
    setTimeout(checkForSegmentEnd, 1000);
  }
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
  currentTime = player.getCurrentTime();

  if ((currentTime<currentLineStartTime) || (currentTime>currentLineEndTime))
  {
    $(".current").removeClass("current");
    if(currentLine = getLineFromTime(currentTime)){
      $(currentLine).addClass("current");
      scrollIfOutOfView(currentLine);
    }
  }

  //only keep timer going if the video is playing
  if ((player.getPlayerState()==YT.PlayerState.PLAYING)||(!editMode))
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

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PAUSED) {
    if(indexBeingModified>-1) return; //revisit

    segmentStart = saveStartTime? segmentStart : segmentEnd;
    saveStartTime = false; //turn off switch
    segmentEnd = Math.floor(player.getCurrentTime());

    if(lyricEditor.state.enabled && lyricEditor.state.displayed){
      spinners["segmentStart"].setValue(segmentStart);
      spinners["segmentEnd"].setValue(segmentEnd);
    }

    if(editMode)
      showNewLyricDialog();

    //stop timer
    clearTimeout(activateLineTimer);

  }else if (event.data == YT.PlayerState.PLAYING) {
    //resume timer
    if(!editMode)
      activateLineTimer = setTimeout(activateLine, 1000);
  }
}

function jumpTo(){

  currentLine = this;
  currentLineStartTime = parseInt($(currentLine).data("start-time"));
  currentLineEndTime = parseInt($(currentLine).data("end-time"));
  $(".current").removeClass("current");
  player.seekTo(currentLineStartTime,true);

  if(editMode){
    saveStartTime = true;
    segmentStart = currentLineStartTime;
    player.playVideo();
    segmentEnd = currentLineEndTime;
    setTimeout(checkForSegmentEnd,1000);
    spinners["segmentStart"].setValue(segmentStart);
    spinners["segmentEnd"].setValue(segmentEnd);
  }else {
    $(currentLine).addClass("current");
  }
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

  $('#lyricsDisplay span.glyphicon-pencil').click(function(){
    if ( $(this).css('opacity')=="1" && editMode ){
      var startTime = $(this).data("start-time");
      var endTime = $(this).data("start-end");
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
  indexBeingModified = i;
  segmentStart = startTime;
  segmentEnd = endTime;
  spinners["segmentStart"].setValue(segmentStart);
  spinners["segmentEnd"].setValue(segmentEnd);
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
    endTime: segmentEnd,
    deleted: false,
    id: lyrics.length,
    startTime: segmentStart,
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
      appendIfChanged("startTime",segmentStart);
      appendIfChanged("endTime",segmentEnd);
    }

    var postData = {
      update: updateObj,
      original: oldLyricObj
    };

  $.post("/lyrics/"+songID+"/editline/"+lyrics[idx].id, postData, function(res){
        loadLyrics();
      });

}

  function setEditMode(val){
    editMode = val;
    if(editMode) stopHighlighting();
  }
  function getTime(variableName){
    switch(variableName) {
      case "segmentStart":
        return segmentStart;
      case "segmentEnd":
        return segmentEnd;
    }
  }
  function setTime(variableName, val){
    switch(variableName) {
      case "segmentStart":
        segmentStart = val;
        break;
      case "segmentEnd":
        segmentEnd = val;
        break;
    }
  }
  function registerSpinner(component){
    if(component){
      spinners[component.props.variableName]=component;
      component.maxTime = maxTime;
      component.timeController = {
        get: getTime,
        set: setTime
      };
      component.setState({seconds: getTime(component.props.variableName)});
    }
  }

  ki.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  ki.init = function (_songID){
    songID = _songID;
    loadLyrics();
  };
  ki.registerEditor = function (component){
    lyricEditor=component;
    component.maxTime = maxTime;
    component.saveLyric = saveLyric;
    component.playLyric = playLyric;
    component.setEditMode = setEditMode;
    component.registerSpinner = registerSpinner;
  }

  return ki;

})({});

/*

To do:

-make sure that player loaded
-bug: after login, goes to http://localhost:3000/music/id/h01_dEXLqsk#_=_ (achikolo)

-refactoring
-error handling

-start time should never be after end time

*/
