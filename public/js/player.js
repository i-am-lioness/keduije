var segmentStart=0;
var segmentEnd=0;
var player;
//var songID = 'kTWYQnbqN8I'; //ogene
var lyrics = [];
var currentTime=0;
var currentLine; //dom object of current lyric
var currentLineTime; //end marker for lyric

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
  currentLineTime = parseInt($(currentLine).data('time'));
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
  setTimeout(activateLine, 1000);
  loadLyrics();
}

/*shows active lyric during playback */
function activateLine(){
  currentTime = player.getCurrentTime();

  if (currentTime>currentLineTime)
  {
    $(currentLine).removeClass("current");
    var nextLine = $(currentLine).next();
    if (nextLine.length>0) {
      currentLine = nextLine;
      $(currentLine).addClass("current");
      currentLineTime = parseInt($(currentLine).data('time'));
    }
  }

  setTimeout(activateLine, 1000);
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
  var time=0;
  var prev = $(this).prev(); //todo: refactor, get start time for current line with callback
  if(prev.length>0){
    time = parseInt($(prev).data("time"));
    currentLineTime = time;
    $(currentLine).removeClass("current");
    currentLine = $(prev);
  }
  player.seekTo(time,true);
}

function displayLyrics(){
  $('#lyricsDisplay').empty();
  var lyricHighlighted=false;
  $.each(lyrics,function(i, val){
    var newP = $("<p data-time='"+ val.time +"' data-index='"+i+"'><span>"+val.text+"</span></p>").click(jumpTo).addControls();

    if(currentTime<val.time && !lyricHighlighted){
      lyricHighlighted=true;
      currentLineTime = val.time;
      currentLine = newP;
    }
    $('#lyricsDisplay').append(newP);
  })

}

function addLyric(){
  lyrics.push({
    text: $('#lyric').val(),
    time: segmentEnd
  });
  $('#lyric').val("");
  lyrics.sort(function(a, b){
    return a.time-b.time;
  });

  storeLyrics();

  displayLyrics();

}

$('#addLyricBtn').click(addLyric);

function storeLyrics(){
  $.post(host, {videoID: songID, lyrics: lyrics});
}

/*
Feb 22-
-can play videos from youtube
-can attach lyrics to points in videos
-sorts lyrics by time
-highlights active lyrics during playback

Feb 23
-can jump to point in video based on clicked lyric
-locally stores lyrics
-locally store by video
-can edit lyric
-can delete lyric

feb 24
-UI: designed igbo keyboard

To do:
-allow user to manually insert/edit time markings
-allow user more flexibility in paragraph structure
--edit/store by line or by whole song?

-plan system architecture
-implement editing by multiple ppl



3 products to be released
1. lyric amaosu
2. igbo keyboard
3. igbo dictionary

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
