var editMode = false;
var segmentStart=0;
var segmentEnd=0;
var maxTime = 300; //default for now
var spinners = {};
var player;
var saveStartTime=false;
var lyrics = [];
var lyricEditor = null;
var currentTime=0;
var currentLine; //dom object of current lyric
var currentLineStartTime;
var currentLineEndTime = -1;

var songID = null;
var user = null;
var currentLyric;
var indexBeingModified = -1;

var activateLineTimer;

function loadLyrics(){
  $.get("/lyrics/"+songID, _loadLyrics);
}

function _loadLyrics(result){
  lyrics = result || [];

  displayLyrics();
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
    currentLine = getLineFromTime(currentTime);
    $(currentLine).addClass("current");
    scrollIfOutOfView(currentLine);

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

function convertToTime(seconds){
  var minutes = seconds/60;
  var seconds = seconds%60;
  if (seconds<10) seconds = "0"+seconds;
  return Math.floor(minutes) + ":" + seconds;
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

function displayLyrics(){
  indexBeingModified = -1;
  lyricEditor.hide();

  lyrics.sort(function(a, b){
    return a.endTime-b.endTime;
  });

  $('#lyricsDisplay').empty();
  $.each(lyrics,function(i, val){

      var newP = $("<p></p>")
        .addClass(val.startTime.toString())
        .data("start-time", val.startTime)
        .data("end-time", val.endTime)
        .data("index",i)
        .click(jumpTo)
        .hover(
          function(){
            if(editMode)
              $(this).find(".glyphicon").css("opacity", "1");
          },
          function(){
            $(this).find(".glyphicon").css("opacity", "0");
          }
        )
        .append("<span>"+val.text+"</span>");

      var editBtn =$('<span class="glyphicon glyphicon-pencil" aria-hidden="true"></span>')
        .data("start-time", val.startTime)
        .data("end-time", val.endTime)
        .data("index",i)
        .data("text",val.text)
        .click(function(){
          if ( $(this).css('opacity')=="1" && editMode ){
            var startTime = $(this).data("start-time");
            var endTime = $(this).data("start-end");
            var index = $(this).data("index");
            var text = $(this).data("text");
            var isHeader = $(this).data("is-header");
            if(isHeader)
              showEditHeaderDialog(index);
            else
              showEditDialog(i, startTime, endTime, text);
          }

        });

        if((val.heading)){
          var h4 = $("<h4></h4>")
            .text(val.heading)
            .data("index",i)
            .hover(
              function(){
                if(editMode)
                  $(this).find(".glyphicon").css("opacity", "1");
              },
              function(){
                $(this).find(".glyphicon").css("opacity", "0");
              }
            );

            $(editBtn).clone(true)
            .data("is-header",true)
            .prependTo(h4);

            $('#lyricsDisplay').append(h4);

            newP.addClass("has-heading");
          }else {

            var addHeadingBtn = $('<a href="#" class="add-heading-btn">Add Heading</a>')
              .prepend('<span class="glyphicon glyphicon-plus" aria-hidden="true"></span>')
              .data("index",i)
              .hover(
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
              newP.append(addHeadingBtn);
      }

      newP.prepend(editBtn);


      $('#lyricsDisplay').append(newP);
  })

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
/*

//each line must begin with a time marker

no free text editing. editing is line by line.
can add headings or lyrics
[chorus]
<0:00> olisa doo olisa doo
<0:13>* Nna dubem oo nye m ude gi oh
<0:15> Aga m agbachazi nbo gbara aka laa
<>Imana mu na Chi m so

lyric_line {
  id: num_of_bars
  startTime:
  endTime:
  deleted: false,
  text:
  heading: null || "string",
  lastEdit: {dateTime}
  lastEditBy: null || "userID" //null, if never revised by another
}

//id can change until annotated or edited
revision: {
  user:
  songID:
  lineID:
  date: {dateTime}
  change: {deleted: true ||
          startTime: x ||
          endTime: x ||
          content: }
}

*/

//todo: refactor, integrate with saveLyric
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
    lyrics.push(newLyric); //or re-render display
    displayLyrics();
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

//  console.log(updateObj);

  $.post("/lyrics/"+songID+"/editline/"+lyrics[idx].id, updateObj, function(res){

        //or re-render display
        for(k in updateObj){
          lyrics[idx][k]=updateObj[k];
        }

        displayLyrics();
      });

}

/*

To do:

-multi user edit tracking
--save creator for each song
--track date created and last edit
--track if revision has been made for each line

-edit button should not show if not logged in
-refactoring
-error handling

*/
