
var KeduIje = (function(ki){

  var songID = null;
  var changesetID = null;

  window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {

    if(window.location.hostname=="localhost") return;

      var msg = 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber
      + ' Column: ' + column + ' StackTrace: ' +  errorObj;

      $.post("/api/logError",{ width: screen.width, height: screen.height, msg: msg });
  }

  function getRevisions(changeset, cb){
    $.get("/api/revisions", {changeset: changeset}, cb);
  }

  function search(q, cb) {
    $.get("/api/search", {query: q}, cb);
  }

  function loadLyrics(cb){
    $.get("/api/lines/"+songID, cb);
  }

  function myLines(changeset, cb){
    $.get("/api/myLines/", {changeset: changeset}, cb);
  }

  function listMedia(cb){
    $.get("/api/media/list", cb);
  }

  function getChangesets(cb){
    $.get("/api/changesets/list", cb);
  }

  function startEditSession(isStart, cb){
    if(isStart)
      $.get("/api/start_edit/" + songID, (resp)=>{changesetID=resp}).fail((err)=>{cb && cb(err);});
    else
      changesetID=null;
  }

  function loadSongInfo(cb){
    getMediaInfo(songID, cb);
  }

  function getMediaInfo(mediaID, cb){
    $.get("/api/media/"+mediaID, cb);
  }

  function getMediaByChangeset(cs, cb){
    $.get("/api/media", {changeset: cs}, cb);
  }

  function addLyric(newLyric, cb){
    newLyric.changeset = changesetID;
    $.post("/api/media/"+songID+"/addline", newLyric, cb);
  }

  function updateLyric(oldLyricObj, newLyricObj, cb){

    //todo: postdata should be validated
    var postData = {
      original: oldLyricObj,
      changes: newLyricObj,
      mediaID: songID,
      changeset: changesetID
    };

    $.post("/api/lines/edit/"+oldLyricObj._id, postData, cb);

  }

  function deleteLyric(oldLyricObj, cb){
    updateLyric(oldLyricObj, {deleted: true}, cb);
  }

  function saveSongInfo(original, changes, cb){

    //todo: postdata should be validated
    var postData = {
      original: original,
      changes: changes,
      changeset: changesetID,
      mediaID: songID //for easy querying
    };

    $.post("/api/media/edit/"+songID, postData, cb);
  }

  function createSong(songInfo, cb){

    $.post("/api/media/new", songInfo, cb);
  }

  function deleteSong(original){

    saveSongInfo(original, {status: "deleted"}, ()=>{window.location="/";});
    //todo: catch error
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
    seconds=parseInt(seconds);
    var minutes = seconds/60;
    var seconds = seconds%60;
    if (seconds<10) seconds = "0"+seconds;
    return Math.floor(minutes) + ":" + seconds;
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
  ki.myLines = myLines;
  ki.getMediaInfo = getMediaInfo;
  ki.convertToTime = convertToTime;
  //ki.listMedia = listMedia;
  ki.startEditSession = startEditSession;
  ki.getChangesets = getChangesets;
  ki.deleteLyric = deleteLyric;
  ki.deleteSong = deleteSong;
  ki.createSong = createSong;
  ki.getMediaByChangeset = getMediaByChangeset;

  return ki;

})({});
