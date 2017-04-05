
var KeduIje = (function(ki){

  var songID = null;

  window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {

    if(window.location.hostname=="localhost") return;

      var msg = 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber
      + ' Column: ' + column + ' StackTrace: ' +  errorObj;

      $.post("/api/logError",{ width: screen.width, height: screen.height, msg: msg });
  }

  function getRevisions(cb){
    $.get("/api/revisions", cb);
  }

  function search(q, cb) {
    $.get("/api/search", {query: q}, cb);
  }

  function loadLyrics(cb){
    $.get("/api/lines/"+songID, cb);
  }

  function loadSongInfo(cb){
    $.get("/api/media/"+songID, cb);
  }

  function addLyric(newLyric, cb){
    $.post("/api/media/"+songID+"/addline", newLyric, cb);
  }

  function updateLyric(oldLyricObj, newLyricObj, cb){

    //todo: postdata should be validated
    var postData = {
      original: oldLyricObj,
      changes: newLyricObj,
      mediaID: songID
    };

    $.post("/api/lines/edit/"+oldLyricObj._id, postData, cb);

  }

  function saveSongInfo(original, changes, cb){

    //todo: postdata should be validated
    var postData = {
      original: original,
      changes: changes
    };

    $.post("/api/media/edit/"+songID, postData, cb);
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
  ki.loadSongInfo = loadSongInfo;
  ki.updateLyric = updateLyric;
  ki.addLyric = addLyric;
  ki.saveSongInfo = saveSongInfo;
  ki.scrollIfOutOfView = scrollIfOutOfView;
  ki.search = search;
  ki.getRevisions = getRevisions;
  ki.deleteSong = ()=>{}; //todo: implement

  return ki;

})({});
