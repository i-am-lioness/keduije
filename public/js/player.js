var segmentStart=0;
var segmentEnd=0;
var player;
var saveStartTime=false;
//var songID = 'kTWYQnbqN8I'; //ogene
var lyrics = [];
var currentTime=0;
var currentLine; //dom object of current lyric
var currentLineStartTime;
var currentLineEndTime = -1;

var currentLyric;
var lyricEditor;
var indexBeingModified = -1;

var host = "http://localhost:3000/"; //when connecting to local backend, but on separate server
var host = "https://keduije.herokuapp.com/"; //when connecting to remote backend instance
var host = "/"; //when backend on same host as front end
var activateLineTimer;


function onSpinnerCreated(element, variableName){
  var seconds = window[variableName];
  var timeDisplay = $('<span class="display '+ variableName +'"></span>').text(convertToTime(seconds));
  $(element).after(timeDisplay);
  $(element).data("variableName",variableName)
}

function updateDisplayedTime(seconds, element){
  var formatedTime = convertToTime(seconds);
  var variableName = $(element).data("variableName");
  $("span."+variableName).text(formatedTime);
  window[variableName]=seconds;
}

$(function(){
    $( "#segment-start" ).spinner({
      spin: function (event, ui){
        updateDisplayedTime(ui.value, this);
      },
      create: function () {
        onSpinnerCreated(this, "segmentStart");
      }
    });
    $( "#segment-end" ).spinner({
      spin: function (event, ui){
        updateDisplayedTime(ui.value, this);
      },
      create: function () {
        onSpinnerCreated(this, "segmentEnd");
      }
    });

    $("#playLyric").click(playLyric);

    if(editMode) $("#lyricEditor").show();

    $("form").submit(function(e){
        //alert('submit intercepted');
        e.preventDefault(e);
        saveLyric();
    });

    loadLyrics();

});

function loadLyrics(){
  $.get(host + "lyrics/"+songID, _loadLyrics);
}

function _loadLyrics(result){
  lyrics = result || [];

  displayLyrics();
  currentTime=0;
  currentLine = $('#lyricsDisplay p')[0];
  currentLineStartTime = lyrics[0].startTime;
  //currentLineEndTime = lyrics[0].endTime;
  //$(currentLine).addClass("current");
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    /*height: '390',
    width: '640',*/
    videoId: songID,
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
    $(player.a).wrap('<div class="embed-responsive embed-responsive-4by3"/>');
    $(player.a).addClass('embed-responsive-item');



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

    $( "#segment-start" ).spinner( "value", segmentStart );
    $( "#segment-end" ).spinner( "value", segmentEnd );
    updateDisplayedTime(segmentStart, "#segment-start");
    updateDisplayedTime(segmentEnd, "#segment-end");
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

  var time = $(this).data("start-time");
  player.seekTo(parseInt(time),true);

  //housekeeping, may not be necessary
  $(currentLine).removeClass("current");
  currentLine = this;
  $(currentLine).addClass("current");
  currentLineStartTime = time;
  currentLineEndTime = $(this).data("end-time");

  if(editMode){
    saveStartTime = true;
    segmentStart = time; //refactor?
    player.playVideo();
    segmentEnd = parseInt($(this).data("end-time"));
    setTimeout(checkForSegmentEnd,1000);
    $( "#segment-start" ).spinner( "value", segmentStart );
    $( "#segment-end" ).spinner( "value", segmentEnd );
    updateDisplayedTime(segmentStart, "#segment-start");
    updateDisplayedTime(segmentEnd, "#segment-end");
  }
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
      .append("<span>"+val.text+"</span>");

    var editBtn =$('<span class="glyphicon glyphicon-pencil" aria-hidden="true"></span>')
      .data("start-time", val.startTime)
      .data("end-time", val.endTime)
      .data("index",i)
      .data("text",val.text)
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
          var startTime = $(this).data("start-time");
          var endTime = $(this).data("start-end");
          var index = $(this).data("index");
          var text = $(this).data("text");
          showEditDialog(i, startTime, endTime, text);
        }

      });

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
  indexBeingModified = i;
  $("#lyricEditor .originalText").show().text('original: ' + text + '"');
  $("#lyric").val(text);
  segmentStart = startTime;
  segmentEnd = endTime;
  $( "#segment-start" ).spinner( "value", segmentStart );
  $( "#segment-end" ).spinner( "value", segmentEnd );
  updateDisplayedTime(segmentStart, "#segment-start");
  updateDisplayedTime(segmentEnd, "#segment-end");
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
  isHeading:
  startTime:
  endTime:
  deleted: false,
  text:
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
    isHeading: false,
    id: lyrics.length,
    startTime: segmentStart
  });

}

function updateLyric(idx){
  lyrics[idx].text=$("#lyric").val();
  lyrics[idx].startTime=segmentStart;
  lyrics[idx].endTime=segmentEnd;
}


function storeLyrics(){
  $.post(host, {videoID: songID, lyrics: lyrics});
}

/*


To do:
-allow user to cancel/exit edit dialoge
-allow user to add headings
-update spinner time markers when jumping around
-replace jquery spinners with react components

-implement editing by multiple ppl
-decide what happens when video finishes playing


-design UI
--https://rap.genius.com/
--https://soundcloud.com/freemedigital/phyno-e-sure-for-me-olisa-doo
--mobile friendly
-publish to github
-publish to socialyte
-adsense
-all by March

the beauty of igbo language, and indigenous languages in general is not in it's formality, but in it's familiarity
*/
