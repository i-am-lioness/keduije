var segmentStart=0;
var segmentEnd=0;
var player;
//var songID = 'kTWYQnbqN8I'; //ogene
var lyrics = [];
var currentTime=0;
var currentLine; //dom object of current lyric
var currentLineStartTime;
var currentLineEndTime;

var currentLyric;
var lyricEditor;

var host = "http://localhost:3000/"; //when connecting to local backend, but on separate server
var host = "https://keduije.herokuapp.com/"; //when connecting to remote backend instance
var host = "/"; //when backend on same host as front end

jQuery.fn.extend({
  addControls: function() {
    return this.hover(
      function(){
        /*
        $('<a><span class="glyphicon glyphicon-pencil" aria-hidden="true"></span></a>')
          .click(function(){

          currentLyric = $(this).parent();
          var text = currentLyric.children("span").hide().text();
          lyricEditor = $("<input>").val(text);
          var saveBtn = $("<button>save</button>").click(function(){
            var newVersion = lyricEditor.val();

            lyrics[currentLyric.data("index")].text=newVersion;
            storeLyrics();
            displayLyrics();
          });
          var cancelBtn = $("<button>cancel</button>").click(function(){
            displayLyrics();
          });
          $("<div></div>").append(lyricEditor).append(saveBtn).append(cancelBtn).appendTo(currentLyric);
          currentLyric.unbind('mouseenter');
          $(this).remove();

        }).appendTo(this);
        $('<a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a>')
          .click(function(){

            var index = $(this).parent().data("index");

            lyrics.splice(index,1);
            storeLyrics();
            displayLyrics();

          }).appendTo(this);
*/
        //$(this).append(btnGroup);

        //$(this).children("span").addClass("label label-success");
      },
      function (){
        $(this).children("a").remove();
        //$(this).children("span").removeClass("label label-success");
      });
  }
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
  currentLineEndTime = lyrics[0].endTime;
  $("p.0").addClass("current");
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

    loadLyrics(); //move document.ready()

}

function onPlayerReady(event) {
  //event.target.playVideo();
  setTimeout(activateLine, 1000);

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

  setTimeout(activateLine, 1000);
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
  var seconds = seconds%60;
  if (seconds<10) seconds = "0"+seconds;
  return Math.floor(seconds/60) + ":" + seconds;
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PAUSED) {
    segmentStart = segmentEnd;
    segmentEnd = Math.floor(player.getCurrentTime());
    $('#addLyricBtn').text(convertToTime(segmentStart) +  " to " + convertToTime(segmentEnd));
    $('#lyricInput').show();
    //pause timer

  }else if (event.data == YT.PlayerState.PLAYING) {
    //resume timer
    $('#lyricInput').hide();
  }
}

function jumpTo(){

  var time = $(this).data("start-time");
  player.seekTo(time,true);

  //housekeeping, may not be necessary
  $(currentLine).removeClass("current");
  currentLine = this;
  $(currentLine).addClass("current");
  currentLineStartTime = time;
  currentLineEndTime = $(this).data("end-time");
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
      .addControls()
      .append("<span>"+val.text+"</span>");

    $('#lyricsDisplay').append(newP);
  })

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
function addLyric(){
  lyrics.push({
    text: $('#lyric').val(),
    endTime: segmentEnd,
    deleted: false,
    isHeading: false,
    id: lyrics.length,
    startTime: segmentStart
  });

  $('#lyric').val("");
  lyrics.sort(function(a, b){
    return a.endTime-b.endTime;
  });

  storeLyrics();

  displayLyrics();

}

$('#addLyricBtn').click(addLyric);

function storeLyrics(){
  $.post(host, {videoID: songID, lyrics: lyrics});
}

/*


To do:
-allow user to manually insert/edit time markings
-allow user more flexibility in paragraph structure
--edit/store by line or by whole song?

-plan system architecture
-implement editing by multiple ppl


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
