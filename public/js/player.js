var segmentStart=0;
var segmentEnd=0;
var spinners = {};
var player;
var saveStartTime=false;
var lyrics = [];
var currentTime=0;
var currentLine; //dom object of current lyric
var currentLineStartTime;
var currentLineEndTime = -1;

var currentLyric;
var lyricEditor;
var indexBeingModified = -1;

var activateLineTimer;


$(function(){

    $("#playLyric").click(playLyric);

    $("form").submit(function(e){
        e.preventDefault(e);
        saveLyric();
    });

    $("#cancel-dialog-btn").click(function (){
      $("#lyricEditor").hide();
    });

    $("#edit-mode-btn").click(function (){
        editMode=true;
        $(this).hide();
      });


    loadLyrics();

});

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
  //event.target.playVideo();


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

/*shows active lyric during playback */
function activateLine(){
  currentTime = player.getCurrentTime();

  if ((currentTime<currentLineStartTime) || (currentTime>currentLineEndTime))
  {
    $(currentLine).removeClass("current");
    currentLine = getLineFromTime(currentTime);
    $(currentLine).addClass("current");
    scrollIfOutOfView(currentLine);

  }

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

/* may not be needed */
function parseTimeString( str ) {

  var seconds = 0;
  var unit = 1;

  var parts = str.split(":");
  while(parts.length>0){
    var val=parts.pop();
    seconds += parseInt(val)*unit;
    unit *=60;
  }
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PAUSED) {
    if(indexBeingModified>-1) return;

    segmentStart = saveStartTime? segmentStart : segmentEnd;
    saveStartTime = false; //turn off switch
    segmentEnd = Math.floor(player.getCurrentTime());

    spinners["segmentStart"].setValue(segmentStart);
    spinners["segmentEnd"].setValue(segmentEnd);

    if(editMode)
      showNewLyricDialog();
    //pause timer
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
  $(currentLine).removeClass("current");
  player.seekTo(currentLineStartTime,true);

  if(editMode){
    saveStartTime = true;
    segmentStart = currentLineStartTime;
    player.playVideo();
    segmentEnd = parseInt($(this).data("end-time"));
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
                  //showEditDialog(i, startTime, endTime, text);
                }

              });
              newP.append(addHeadingBtn);
      }

      newP.prepend(editBtn);


      $('#lyricsDisplay').append(newP);
  })

}

function showNewLyricDialog(){
  $("#lyricEditor .originalText").hide().text('');
  $("#lyricEditor").show();
  //$("#lyric").val("");
  $("#save-lyric-btn").text("Add");
}

function showEditDialog(i, startTime, endTime, text){
  $("#lyricEditor").show();
  indexBeingModified = i;
  $("#lyricEditor .originalText").show().text('original: "' + text + '"');
  $("#lyric").val(text);
  segmentStart = startTime;
  segmentEnd = endTime;
  spinners["segmentStart"].setValue(segmentStart);
  spinners["segmentEnd"].setValue(segmentEnd);
  $("#save-lyric-btn").text("Update");
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
  //isHeading:
  startTime:
  endTime:
  deleted: false,
  text:
  heading: null || "string"
}

//id can change until annotated
revision: {
  user:
  songID:
  lineID:
  before: {
  startTime: x ||
  endTime: x ||
  content: x
   }
  change: {deleted: true ||
          startTime: x ||
          endTime: x ||
          content: }
}

*/

//todo: refactor, integrate with saveLyric
function saveHeading(text, idx){
  lyrics[idx].heading=text;

  storeLyrics();

  displayLyrics();
  indexBeingModified = -1;
  $("#lyricEditor").hide();

}

function saveLyric(){

  if(indexBeingModified>-1)
    updateLyric(indexBeingModified);
  else {
    addLyric()
  }

  $('#lyric').val("");
  lyrics.sort(function(a, b){
    return a.endTime-b.endTime;
  });

  storeLyrics();

  displayLyrics();
  indexBeingModified = -1;
  $("#lyricEditor").hide();

}

function addLyric(){
  lyrics.push({
    text: $('#lyric').val(),
    endTime: segmentEnd,
    deleted: false,
    //isHeading: false,
    id: lyrics.length,
    startTime: segmentStart,
    heading: null
  });

}

function updateLyric(idx){
  lyrics[idx].text=$("#lyric").val();
  lyrics[idx].startTime=segmentStart;
  lyrics[idx].endTime=segmentEnd;
}


function storeLyrics(){
  $.post("/", {videoID: songID, lyrics: lyrics});
}

/*


To do:

-error handling

*/
