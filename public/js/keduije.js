
var KeduIje = (function(ki){

  var songID = null;

  window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {

    if(window.location.hostname=="localhost") return;

      var msg = 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber
      + ' Column: ' + column + ' StackTrace: ' +  errorObj;

      $.post("/api/logError",{ width: screen.width, height: screen.height, msg: msg });
  }

  function search(q, cb) {
    $.get("/api/search", {query: q}, cb);
  }

  function loadLyrics(cb){
    $.get("/api/lyrics/"+songID, cb);
  }

  function addLyric(newLyric, cb){
    $.post("/api/lyrics/"+songID+"/addline", newLyric, cb);
  }

  function updateLyric(oldLyricObj, newLyricObj, cb){

    //todo: postdata should be validated
    $.post("/api/lyrics/"+songID+"/editline/"+oldLyricObj.id, newLyricObj, cb);

  }

  function saveSongInfo(songInfo, cb){
    $.post("/api/song/edit/"+songID, songInfo, cb);
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

  ki.init = function (_songID){
    songID = _songID;
  };

  ki.loadLyrics = loadLyrics;
  ki.updateLyric = updateLyric;
  ki.addLyric = addLyric;
  ki.saveSongInfo = saveSongInfo;
  ki.scrollIfOutOfView = scrollIfOutOfView;
  ki.search = search;

  return ki;

})({});
